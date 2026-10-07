<?php

namespace Tests\Feature\Billing;

use App\Billing\BillingService;
use App\Mail\BillingNoticeMail;
use App\Models\BillingNotice;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\BillingAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BillingNoticesTest extends TestCase
{
    use RefreshDatabase;

    private function subscription(string $endsAt, array $tenant = []): Subscription
    {
        $plan = Plan::create(['name_ar' => 'شهرية', 'name_en' => 'Monthly', 'price' => 100, 'currency' => 'AED', 'interval' => 'monthly']);

        return Subscription::create([
            'tenant_id' => Tenant::factory()->create($tenant + ['status' => 'active', 'billing_email' => 'billing@client.test'])->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => '2026-01-01',
            'ends_at' => $endsAt,
        ]);
    }

    public function test_renewal_reminders_go_out_once_on_each_configured_day(): void
    {
        Mail::fake();
        $this->travelTo('2026-10-01');
        $this->subscription('2026-10-31'); // 30 days away

        $this->artisan('billing:run')->assertSuccessful();
        $this->artisan('billing:run')->assertSuccessful();

        Mail::assertQueued(BillingNoticeMail::class, fn ($mail) => $mail->kind === 'renewal_reminder' && $mail->hasTo('billing@client.test'));
        Mail::assertQueuedCount(1);
        $this->assertSame(1, BillingNotice::where('kind', 'renewal_reminder')->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'billing_notice.renewal_reminder']);
    }

    public function test_invoice_overdue_and_suspension_alert_the_client_and_billing_staff(): void
    {
        Mail::fake();
        Notification::fake();
        $finance = User::factory()->role('finance')->create();
        $editor = User::factory()->role('platform_editor')->create();

        $this->travelTo('2026-10-01');
        $subscription = $this->subscription('2026-10-05');
        $billing = app(BillingService::class);
        $billing->runDaily(); // issues the renewal invoice

        Mail::assertQueued(BillingNoticeMail::class, fn ($mail) => $mail->kind === 'invoice_issued');

        $this->travelTo('2026-10-06');
        $billing->runDaily();
        $billing->runDaily();
        $this->assertSame(1, BillingNotice::where('kind', 'invoice_overdue')->count());

        $this->travelTo('2026-10-20');
        $billing->runDaily();
        Mail::assertQueued(BillingNoticeMail::class, fn ($mail) => $mail->kind === 'tenant_suspended');

        Notification::assertSentTo($finance, BillingAlert::class, fn ($n) => $n->kind === 'invoice_overdue');
        Notification::assertSentTo($finance, BillingAlert::class, fn ($n) => $n->kind === 'tenant_suspended');
        Notification::assertNotSentTo($editor, BillingAlert::class);
        $this->assertSame('suspended', $subscription->tenant->fresh()->status);
    }

    public function test_payment_received_and_failed_emails(): void
    {
        Mail::fake();
        $subscription = $this->subscription('2026-12-01');
        $billing = app(BillingService::class);
        $invoice = $billing->issueInvoice($subscription->tenant, 50);

        $pending = Payment::create(['invoice_id' => $invoice->id, 'amount' => 50, 'method' => 'online', 'status' => 'pending']);
        $billing->applyPaymentStatus($pending, 'failed');
        Mail::assertQueued(BillingNoticeMail::class, fn ($mail) => $mail->kind === 'payment_failed');

        $billing->recordManualPayment($invoice, 50, 'cash', null, now(), User::factory()->create());
        Mail::assertQueued(BillingNoticeMail::class, fn ($mail) => $mail->kind === 'payment_received');
    }

    public function test_without_a_billing_email_the_client_users_are_emailed(): void
    {
        Mail::fake();
        $subscription = $this->subscription('2026-12-01', ['billing_email' => null]);
        User::factory()->create(['tenant_id' => $subscription->tenant_id, 'email' => 'member@client.test', 'role' => 'tenant_admin']);

        app(BillingService::class)->issueInvoice($subscription->tenant, 10);

        Mail::assertQueued(BillingNoticeMail::class, fn ($mail) => $mail->hasTo('member@client.test'));
    }

    public function test_an_alert_turned_off_is_not_sent(): void
    {
        Mail::fake();
        $this->signIn('super_admin');
        $settings = $this->getJson('/api/admin/settings/notifications')->assertOk()->json('data');
        $this->putJson('/api/admin/settings/notifications', ['invoice_issued' => false] + $settings)->assertOk();

        $subscription = $this->subscription('2026-12-01');
        app(BillingService::class)->issueInvoice($subscription->tenant, 10);

        Mail::assertNothingQueued();
    }

    public function test_the_email_is_in_both_languages(): void
    {
        $tenant = Tenant::factory()->create(['name_ar' => 'جمعية المعلمين', 'name_en' => 'Teachers Association']);
        $mail = new BillingNoticeMail('invoice_issued', [
            'number' => 'INV-2026-00001', 'amount' => '100.00', 'currency' => 'AED', 'dueAt' => '2026-10-15',
            'clientAr' => $tenant->name_ar, 'clientEn' => $tenant->name_en,
        ]);

        $html = $mail->render();
        $this->assertStringContainsString('جمعية المعلمين', $html);
        $this->assertStringContainsString('Teachers Association', $html);
        $this->assertStringContainsString('INV-2026-00001', $html);
        $this->assertStringContainsString('dir="rtl"', $html);
        $this->assertStringContainsString('New invoice INV-2026-00001', $mail->envelope()->subject);
    }

    public function test_notification_settings_routes(): void
    {
        $this->getJson('/api/admin/settings/notifications')->assertStatus(401);

        $this->signIn('broadcast_moderator');
        $this->getJson('/api/admin/settings/notifications')->assertStatus(403);

        $this->signIn('finance');
        $this->putJson('/api/admin/settings/notifications', [])->assertStatus(403);

        $this->signIn('super_admin');
        $settings = $this->getJson('/api/admin/settings/notifications')->assertOk()->json('data');
        $this->putJson('/api/admin/settings/notifications', ['reminderDays' => [7, 7]] + $settings)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_reminder_days');
        $this->putJson('/api/admin/settings/notifications', ['reminderDays' => [7, 30, 1]] + $settings)
            ->assertOk()->assertJsonPath('data.reminderDays', [30, 7, 1]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.notifications_updated']);
    }

    public function test_staff_read_and_mark_their_own_alerts(): void
    {
        $this->postJson('/api/admin/notifications/read', [])->assertStatus(401);

        $other = User::factory()->role('finance')->create();
        $other->notify(new BillingAlert('tenant_suspended', ['clientEn' => 'Other']));
        $me = $this->signIn('finance');
        $me->notify(new BillingAlert('payment_failed', ['number' => 'INV-1']));
        $me->notify(new BillingAlert('invoice_overdue', ['number' => 'INV-2']));

        $response = $this->getJson('/api/admin/notifications')->assertOk()->assertJsonPath('meta.unread', 2);
        $this->assertCount(2, $response->json('data'));
        $id = $response->json('data.0.id');

        $this->postJson('/api/admin/notifications/read', ['id' => $id])->assertOk();
        $this->getJson('/api/admin/notifications')->assertJsonPath('meta.unread', 1);

        $this->postJson('/api/admin/notifications/read', [])->assertOk();
        $this->getJson('/api/admin/notifications')->assertJsonPath('meta.unread', 0);
        $this->assertSame(1, $other->unreadNotifications()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'notifications.read']);
    }

    public function test_tenant_billing_email_is_validated_and_saved(): void
    {
        $this->signIn('super_admin');
        $payload = ['nameAr' => 'مدرسة', 'nameEn' => 'School', 'type' => 'school', 'status' => 'active'];

        $this->postJson('/api/admin/tenants', $payload + ['billingEmail' => 'not-an-email'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_billing_email');
        $this->postJson('/api/admin/tenants', $payload + ['billingEmail' => 'pay@school.test'])
            ->assertCreated()->assertJsonPath('data.billingEmail', 'pay@school.test');
    }
}
