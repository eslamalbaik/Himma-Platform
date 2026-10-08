<?php

namespace App\Http\Controllers\Api;

use App\Billing\BillingService;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Comment;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Invoice;
use App\Models\MessageReport;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Support\Ability;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

// Home page indicators (plan §9): revenue, subscriptions, what needs attention. Each block is only
// included for users who may read that section, so a broadcast moderator never sees revenue.
class BusinessStatsController extends Controller
{
    public function __invoke(Request $request)
    {
        $role = $request->user()->role;
        $can = fn (string $subject) => Ability::can($role, 'read', $subject);

        $data = [];
        if ($can('billing')) {
            $data['revenue'] = $this->revenue();
            $data['subscriptions'] = $this->subscriptions();
        }
        if ($can('tenants')) {
            $data['clients'] = $this->clients();
        }
        if ($can('events')) {
            $data['events'] = $this->events();
        }

        $attention = [];
        if ($can('content')) {
            $attention['articlesInReview'] = Article::where('status', 'in_review')->count();
            $attention['contentReportsOpen'] = ContentReport::where('status', 'open')->count();
            $attention['commentsPending'] = Comment::where('status', 'pending')->count();
        }
        if ($can('messages')) {
            $attention['messageReportsOpen'] = MessageReport::where('status', 'open')->count();
        }
        if ($can('billing')) {
            $attention['invoicesOverdue'] = $data['revenue']['overdueCount'];
        }
        if ($attention) {
            $data['attention'] = $attention;
        }

        return response()->json(['data' => $data])->header('Cache-Control', 'no-store');
    }

    private function revenue(): array
    {
        $now = Carbon::now();

        // Recurring revenue from subscriptions that are paying (trials and cancelled ones are left out).
        $mrr = Subscription::with('plan')->whereIn('status', ['active', 'past_due'])->get()
            ->sum(fn (Subscription $s) => $s->plan->interval === 'yearly' ? $s->plan->price / 12 : (float) $s->plan->price);

        $collected = fn (Carbon $from, Carbon $to) => (float) Payment::where('status', 'succeeded')
            ->whereBetween('paid_at', [$from, $to])->sum('amount');

        $monthly = collect(range(5, 0))->map(function ($i) use ($now, $collected) {
            $month = $now->copy()->startOfMonth()->subMonthsNoOverflow($i);

            return ['month' => $month->format('Y-m'), 'amount' => round($collected($month, $month->copy()->endOfMonth()), 2)];
        })->values();

        $overdue = Invoice::where('status', 'unpaid')->whereDate('due_at', '<', today())->get();
        $unpaid = Invoice::where('status', 'unpaid')->get();

        return [
            'currency' => BillingService::settings()['currency'],
            'mrr' => round($mrr, 2),
            'arr' => round($mrr * 12, 2),
            'collectedThisMonth' => $monthly->last()['amount'],
            'collectedLastMonth' => $monthly->slice(-2, 1)->first()['amount'],
            'monthly' => $monthly,
            'overdueCount' => $overdue->count(),
            'overdueAmount' => round($overdue->sum(fn (Invoice $i) => $i->balance()), 2),
            'unpaidAmount' => round($unpaid->sum(fn (Invoice $i) => $i->balance()), 2),
        ];
    }

    private function subscriptions(): array
    {
        $byStatus = Subscription::selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status');

        $endingSoon = Subscription::with('tenant', 'plan')
            ->whereIn('status', ['trial', 'active'])
            ->whereBetween('ends_at', [today(), today()->addDays(30)])
            ->orderBy('ends_at');

        return [
            'byStatus' => $byStatus->isEmpty() ? (object) [] : $byStatus,
            'endingSoonCount' => (clone $endingSoon)->count(),
            'endingSoon' => $endingSoon->limit(5)->get()->map(fn (Subscription $s) => [
                'id' => $s->cuid,
                'tenantId' => $s->tenant?->cuid,
                'tenantNameAr' => $s->tenant?->name_ar,
                'tenantNameEn' => $s->tenant?->name_en,
                'planNameAr' => $s->plan?->name_ar,
                'planNameEn' => $s->plan?->name_en,
                'status' => $s->status,
                'endsAt' => $s->ends_at->toDateString(),
            ])->values(),
        ];
    }

    private function clients(): array
    {
        $startOfMonth = Carbon::now()->startOfMonth();

        return [
            'active' => Tenant::where('status', 'active')->count(),
            'trial' => Tenant::where('status', 'trial')->count(),
            'suspended' => Tenant::where('status', 'suspended')->count(),
            'newThisMonth' => Tenant::where('created_at', '>=', $startOfMonth)->count(),
            // Churn: subscriptions cancelled this month.
            'churnedThisMonth' => Subscription::where('status', 'cancelled')->where('updated_at', '>=', $startOfMonth)->count(),
        ];
    }

    private function events(): array
    {
        $upcoming = Event::where('status', 'scheduled')->whereBetween('starts_at', [now(), now()->addDays(14)])->orderBy('starts_at');

        return [
            'liveNow' => Event::where('status', 'live')->count(),
            'upcomingCount' => (clone $upcoming)->count(),
            'upcoming' => $upcoming->limit(5)->get()->map(fn (Event $e) => [
                'id' => $e->cuid,
                'titleAr' => $e->title_ar,
                'titleEn' => $e->title_en,
                'startsAt' => $e->starts_at->toIso8601String(),
                'format' => $e->format,
            ])->values(),
        ];
    }
}
