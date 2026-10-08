<?php

namespace App\Http\Controllers\Client;

use App\Billing\BillingService;
use App\Models\Event;
use App\Models\Invoice;
use Illuminate\Http\Request;

// Client home page: subscription, what is owed, upcoming events and content at a glance.
class OverviewController extends ClientController
{
    public function __invoke(Request $request)
    {
        $tenant = $this->tenant($request);

        $subscription = $tenant->subscriptions()->with('plan')
            ->orderByRaw("FIELD(status, 'active', 'past_due', 'trial', 'cancelled')")->latest('starts_at')->first();

        $unpaid = $tenant->invoices()->where('status', 'unpaid')->orderBy('due_at')->get();
        $overdue = $unpaid->filter(fn (Invoice $i) => $i->due_at->lt(today()));

        $upcoming = $tenant->events()->where('status', 'scheduled')->where('starts_at', '>=', now())
            ->orderBy('starts_at')->limit(5)->get();

        $articles = $tenant->articles()->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status');

        return $this->item([
            'subscription' => $subscription ? [
                'id' => $subscription->cuid,
                'status' => $subscription->status,
                'planNameAr' => $subscription->plan?->name_ar,
                'planNameEn' => $subscription->plan?->name_en,
                'startsAt' => $subscription->starts_at->toDateString(),
                'endsAt' => $subscription->ends_at?->toDateString(),
                'daysLeft' => $subscription->ends_at ? max(0, (int) today()->diffInDays($subscription->ends_at, false)) : null,
            ] : null,
            'billing' => [
                'currency' => BillingService::settings()['currency'],
                'unpaidCount' => $unpaid->count(),
                'unpaidAmount' => round($unpaid->sum(fn (Invoice $i) => $i->balance()), 2),
                'overdueCount' => $overdue->count(),
                'nextDueAt' => $unpaid->first()?->due_at->toDateString(),
                'suspended' => $tenant->billing_suspended_at !== null,
            ],
            'upcomingEvents' => $upcoming->map(fn (Event $e) => [
                'id' => $e->cuid,
                'titleAr' => $e->title_ar,
                'titleEn' => $e->title_en,
                'startsAt' => $e->starts_at->toIso8601String(),
                'format' => $e->format,
            ])->values(),
            'content' => [
                'published' => (int) ($articles['published'] ?? 0),
                'drafts' => (int) ($articles['draft'] ?? 0),
                'total' => (int) $articles->sum(),
            ],
            'accountsCount' => $tenant->users()->where('status', 'active')->count(),
        ]);
    }
}
