<?php

namespace App\Http\Controllers\Api\Billing;

use App\Billing\BillingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\SubscriptionFormRequest;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function __construct(private BillingService $billing) {}

    public function index(Request $request)
    {
        $query = Subscription::with('tenant', 'plan');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->whereHas('tenant', fn ($q) => $q->where('name_ar', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%"));
        }

        if (in_array($status = $request->query('status'), Subscription::STATUSES, true)) {
            $query->where('status', $status);
        }

        if ($tenantId = $request->query('tenantId')) {
            $query->whereHas('tenant', fn ($q) => $q->where('cuid', $tenantId));
        }

        return $this->paginated(
            $query->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (Subscription $s) => $s->toPublicArray()
        );
    }

    public function show(Subscription $subscription)
    {
        $subscription->load('tenant', 'plan');

        return $this->item($subscription->toPublicArray() + [
            'invoices' => $subscription->invoices()->with('tenant')->orderByDesc('issued_at')->get()->map->toPublicArray(),
        ]);
    }

    // With trial days: a free trial, invoiced when it ends. Without: the first period is invoiced now.
    public function store(SubscriptionFormRequest $request)
    {
        $tenant = Tenant::where('cuid', $request->input('tenantId'))->first();

        if ($tenant->subscriptions()->whereIn('status', ['trial', 'active', 'past_due'])->exists()) {
            return $this->error('tenant_already_subscribed', 409);
        }

        $plan = Plan::where('cuid', $request->input('planId'))->first();
        $startsAt = Carbon::parse($request->input('startsAt') ?? today())->startOfDay();
        $trialDays = (int) $request->input('trialDays', 0);

        [$subscription, $invoice] = DB::transaction(function () use ($tenant, $plan, $startsAt, $trialDays) {
            $subscription = Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'status' => $trialDays > 0 ? 'trial' : 'active',
                'starts_at' => $startsAt,
                // Paid (or free) until this date; it moves forward when an invoice is paid.
                'ends_at' => $startsAt->copy()->addDays($trialDays),
            ]);

            $invoice = $trialDays > 0 ? null : $this->billing->invoiceNextPeriod($subscription);

            return [$subscription, $invoice];
        });

        Audit::log($request, [
            'action' => 'subscription.created',
            'actor' => $request->user(),
            'entity_type' => 'subscription',
            'entity_id' => $subscription->cuid,
            'metadata' => ['tenant' => $tenant->cuid, 'plan' => $plan->cuid, 'trialDays' => $trialDays, 'invoice' => $invoice?->number],
        ]);

        return $this->item($subscription->load('tenant', 'plan')->toPublicArray(), 201);
    }

    // Changes the plan (used from the next invoice) and, if given, the paid-until date.
    public function update(SubscriptionFormRequest $request, Subscription $subscription)
    {
        if ($subscription->status === 'cancelled') {
            return $this->error('subscription_cancelled', 409);
        }

        $plan = Plan::where('cuid', $request->input('planId'))->first();
        $data = ['plan_id' => $plan->id];
        if ($request->filled('endsAt')) {
            $data['ends_at'] = Carbon::parse($request->input('endsAt'))->startOfDay();
        }

        $subscription->update($data);

        Audit::log($request, [
            'action' => 'subscription.updated',
            'actor' => $request->user(),
            'entity_type' => 'subscription',
            'entity_id' => $subscription->cuid,
            'metadata' => ['plan' => $plan->cuid, 'endsAt' => optional($subscription->ends_at)->toDateString()],
        ]);

        return $this->item($subscription->load('tenant', 'plan')->toPublicArray());
    }

    // Stops renewals. The client keeps access until the paid period ends; unpaid invoices stay for finance to void.
    public function cancel(Request $request, Subscription $subscription)
    {
        if ($subscription->status === 'cancelled') {
            return $this->error('subscription_cancelled', 409);
        }

        $subscription->update(['status' => 'cancelled']);

        Audit::log($request, [
            'action' => 'subscription.cancelled',
            'actor' => $request->user(),
            'entity_type' => 'subscription',
            'entity_id' => $subscription->cuid,
        ]);

        return $this->item($subscription->load('tenant', 'plan')->toPublicArray());
    }
}
