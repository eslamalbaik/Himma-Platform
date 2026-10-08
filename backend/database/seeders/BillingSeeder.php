<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\BillingAlert;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

// Sample plans, subscriptions in every state, invoices (paid, partly paid, unpaid, overdue), payments,
// a manual gateway and a few dashboard alerts. Dates are relative to today so the states stay true.
// Rows are created directly, so seeding sends no emails.
class BillingSeeder extends Seeder
{
    public function run(): void
    {
        $today = today();

        $plans = [
            'basic' => Plan::updateOrCreate(['name_en' => 'Basic'], [
                'name_ar' => 'الأساسية', 'price' => 299, 'currency' => 'AED', 'interval' => 'monthly', 'is_active' => true,
                'features_ar' => "مساحة خاصة للجهة\nنشر المقالات\nحتى 50 عضواً", 'features_en' => "Own client space\nPublish articles\nUp to 50 members",
            ]),
            'pro' => Plan::updateOrCreate(['name_en' => 'Professional'], [
                'name_ar' => 'الاحترافية', 'price' => 2990, 'currency' => 'AED', 'interval' => 'yearly', 'is_active' => true,
                'features_ar' => "كل ما في الأساسية\nالفعاليات والبث المباشر\nتقارير الجهة", 'features_en' => "Everything in Basic\nEvents and live broadcasts\nClient reports",
            ]),
            'enterprise' => Plan::updateOrCreate(['name_en' => 'Enterprise'], [
                'name_ar' => 'المؤسسات', 'price' => 9900, 'currency' => 'AED', 'interval' => 'yearly', 'is_active' => true,
                'features_ar' => "كل ما في الاحترافية\nأدوات الذكاء الاصطناعي\nدعم مخصص", 'features_en' => "Everything in Professional\nAI tools\nDedicated support",
            ]),
            'legacy' => Plan::updateOrCreate(['name_en' => 'Legacy Starter'], [
                'name_ar' => 'البداية (قديمة)', 'price' => 149, 'currency' => 'AED', 'interval' => 'monthly', 'is_active' => false,
            ]),
        ];

        PaymentGateway::updateOrCreate(['driver' => 'manual', 'name_en' => 'Bank transfer'], [
            'name_ar' => 'تحويل بنكي', 'description_ar' => 'الحساب: بنك الإمارات دبي الوطني، آيبان AE00 0000 0000 0000 0000 000',
            'description_en' => 'Account: Emirates NBD, IBAN AE00 0000 0000 0000 0000 000', 'is_active' => true, 'sort_order' => 1,
        ]);
        PaymentGateway::updateOrCreate(['driver' => 'ziina', 'name_en' => 'Ziina (card)'], [
            'name_ar' => 'زينة (بطاقة)', 'is_active' => false, 'test_mode' => true, 'sort_order' => 2,
        ]);

        $staff = User::whereNull('tenant_id')->where('role', 'super_admin')->first();

        // [client slug, plan, subscription status, starts (days from today), ends (days from today), invoices]
        // invoices: [period start offset, due offset, paid amount (null = nothing paid), method]
        $rows = [
            ['al-birr-charity-association', 'pro', 'active', -200, 165, [[-200, -186, 2990, 'bank_transfer']]],
            ['al-wafa-volunteer-association', 'basic', 'trial', -5, 9, []],
            ['al-noor-private-school', 'basic', 'active', -23, 7, [[-23, -9, 299, 'card'], [7, 7, null, null]]],
            ['al-amal-international-school', 'basic', 'past_due', -50, -20, [[-50, -36, 299, 'cash'], [-20, -20, null, null]]],
            ['social-care-foundation', 'pro', 'active', -335, 30, [[-335, -321, 2990, 'bank_transfer'], [30, 30, 1000, 'bank_transfer']]],
            ['community-development-institution', 'basic', 'trial', -12, 2, []],
            ['ministry-of-human-resources-and-social-development', 'enterprise', 'active', -90, 275, [[-90, -76, 9900, 'bank_transfer']]],
            ['riyadh-region-municipality', 'basic', 'cancelled', -120, -60, [[-120, -106, 299, 'card']]],
            ['ehsan-charity-association', 'basic', 'past_due', -33, -3, [[-33, -19, 299, 'card'], [-3, -3, null, null]]],
            ['al-ibdaa-model-school', 'basic', 'active', 0, 60, [[0, 14, 299, 'online']]],
        ];

        $count = 0;
        foreach ($rows as [$slug, $planKey, $status, $start, $end, $invoices]) {
            $tenant = Tenant::where('slug', $slug)->first();
            if (! $tenant) {
                continue;
            }
            $plan = $plans[$planKey];

            $subscription = Subscription::updateOrCreate(['tenant_id' => $tenant->id], [
                'plan_id' => $plan->id, 'status' => $status,
                'starts_at' => $today->copy()->addDays($start), 'ends_at' => $today->copy()->addDays($end),
            ]);

            foreach ($invoices as [$periodOffset, $dueOffset, $paid, $method]) {
                $periodStart = $today->copy()->addDays($periodOffset);
                $periodEnd = $plan->interval === 'monthly' ? $periodStart->copy()->addMonthNoOverflow() : $periodStart->copy()->addYearNoOverflow();
                $fullyPaid = $paid !== null && $paid >= (float) $plan->price;

                $invoice = Invoice::updateOrCreate(
                    ['tenant_id' => $tenant->id, 'period_start' => $periodStart->toDateString()],
                    [
                        'subscription_id' => $subscription->id, 'period_end' => $periodEnd,
                        'amount' => $plan->price, 'currency' => $plan->currency,
                        'status' => $fullyPaid ? 'paid' : 'unpaid',
                        'issued_at' => Carbon::parse(min($periodStart->toDateString(), $today->toDateString()))->subDays(7),
                        'due_at' => $today->copy()->addDays($dueOffset),
                        'paid_at' => $fullyPaid ? $today->copy()->addDays($dueOffset - 2) : null,
                    ]
                );

                if ($paid !== null) {
                    Payment::updateOrCreate(['invoice_id' => $invoice->id, 'reference' => 'SEED-'.$invoice->id], [
                        'amount' => $paid, 'method' => $method, 'status' => 'succeeded',
                        'paid_at' => $today->copy()->addDays(min($dueOffset - 2, 0)), 'recorded_by' => $staff?->id,
                    ]);
                }
                $count++;
            }

            // A failed card attempt on Ehsan's overdue invoice, to show in payments and alerts.
            if ($slug === 'ehsan-charity-association') {
                $overdue = $tenant->invoices()->where('status', 'unpaid')->first();
                Payment::updateOrCreate(['invoice_id' => $overdue->id, 'reference' => 'SEED-FAILED-'.$overdue->id], [
                    'amount' => $overdue->amount, 'method' => 'online', 'status' => 'failed',
                ]);
            }

            if ($status === 'past_due' && $tenant->status === 'suspended') {
                $tenant->update(['billing_suspended_at' => $today->copy()->subDays(6)]);
            }
        }

        $this->seedAlerts();

        $this->command->info('Billing ready: '.count($plans).' plans, '.Subscription::count().' subscriptions, '.$count.' invoices.');
    }

    // Bell alerts for staff who manage billing (only once: skipped when they already have some).
    private function seedAlerts(): void
    {
        $alerts = [];
        foreach ([
            ['ehsan-charity-association', 'payment_failed'],
            ['ehsan-charity-association', 'invoice_overdue'],
            ['al-amal-international-school', 'invoice_overdue'],
            ['al-amal-international-school', 'tenant_suspended'],
        ] as [$slug, $kind]) {
            $tenant = Tenant::where('slug', $slug)->first();
            $invoice = $tenant?->invoices()->where('status', 'unpaid')->first();
            if (! $tenant) {
                continue;
            }
            $alerts[] = new BillingAlert($kind, [
                'clientAr' => $tenant->name_ar, 'clientEn' => $tenant->name_en, 'clientId' => $tenant->cuid,
                'number' => $invoice?->number, 'invoiceId' => $invoice?->cuid,
                'amount' => number_format((float) ($invoice?->amount ?? 0), 2), 'currency' => $invoice?->currency ?? 'AED',
                'dueAt' => optional($invoice?->due_at)->toDateString(),
            ]);
        }

        User::whereNull('tenant_id')->whereIn('role', ['super_admin', 'finance'])->get()
            ->filter(fn (User $user) => $user->notifications()->doesntExist())
            ->each(fn (User $user) => collect($alerts)->each(fn ($alert) => $user->notify($alert)));
    }
}
