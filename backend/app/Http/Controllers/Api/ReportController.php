<?php

namespace App\Http\Controllers\Api;

use App\Billing\BillingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportPeriodRequest;
use App\Models\Article;
use App\Models\AuditLog;
use App\Models\Comment;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Invoice;
use App\Models\Issue;
use App\Models\MagazineSection;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Refund;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\TenantRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

// Reports section (/admin/reports/*). Each report needs `read reports` plus read access to the data it
// summarises (routes/api.php). All figures cover ?from..?to (ReportPeriodRequest); "now" figures say so.
class ReportController extends Controller
{
    public function revenue(ReportPeriodRequest $request)
    {
        $range = $request->range();
        $months = $request->months();

        // Gross: every payment received in the period, including ones refunded since.
        $payments = fn () => Payment::whereIn('payments.status', ['succeeded', 'refunded'])->whereBetween('payments.paid_at', $range);
        $refunds = fn () => Refund::where('status', 'completed')->whereBetween('updated_at', $range);
        $invoices = fn () => Invoice::where('status', '!=', 'void')->whereBetween('issued_at', [$range[0]->toDateString(), $range[1]->toDateString()]);

        $collected = (float) $payments()->sum('amount');
        $refunded = (float) $refunds()->sum('amount');

        $byPlan = $payments()
            ->join('invoices', 'invoices.id', '=', 'payments.invoice_id')
            ->leftJoin('subscriptions', 'subscriptions.id', '=', 'invoices.subscription_id')
            ->groupBy('subscriptions.plan_id')
            ->selectRaw('subscriptions.plan_id as plan_id, sum(payments.amount) as amount, count(*) as count')
            ->get();
        $plans = Plan::whereIn('id', $byPlan->pluck('plan_id')->filter())->get()->keyBy('id');

        $topClients = $payments()
            ->join('invoices', 'invoices.id', '=', 'payments.invoice_id')
            ->groupBy('invoices.tenant_id')
            ->selectRaw('invoices.tenant_id as tenant_id, sum(payments.amount) as amount, count(*) as count')
            ->orderByDesc('amount')->limit(10)->get();
        $tenants = Tenant::whereIn('id', $topClients->pluck('tenant_id'))->get()->keyBy('id');

        $unpaid = Invoice::where('status', 'unpaid')->get();
        $overdue = $unpaid->filter(fn (Invoice $i) => $i->due_at->lt(today()));

        return $this->item([
            'period' => $request->period(),
            'currency' => BillingService::settings()['currency'],
            'summary' => [
                'invoiced' => round((float) $invoices()->sum('amount'), 2),
                'invoiceCount' => $invoices()->count(),
                'collected' => round($collected, 2),
                'paymentCount' => $payments()->count(),
                'refunded' => round($refunded, 2),
                'net' => round($collected - $refunded, 2),
                // Now, whatever the period.
                'outstandingNow' => round($unpaid->sum(fn (Invoice $i) => $i->balance()), 2),
                'overdueNow' => round($overdue->sum(fn (Invoice $i) => $i->balance()), 2),
                'overdueCountNow' => $overdue->count(),
            ],
            'monthly' => $this->merge($months, [
                'invoiced' => $this->monthly($invoices(), 'issued_at', 'sum(amount)'),
                'collected' => $this->monthly($payments(), 'payments.paid_at', 'sum(payments.amount)'),
                'refunded' => $this->monthly($refunds(), 'updated_at', 'sum(amount)'),
            ]),
            'byMethod' => $payments()->groupBy('method')->selectRaw('method, sum(amount) as amount, count(*) as count')
                ->orderByDesc('amount')->get()
                ->map(fn ($row) => ['method' => $row->method, 'amount' => round((float) $row->amount, 2), 'count' => (int) $row->count]),
            'byPlan' => $byPlan->sortByDesc('amount')->values()->map(fn ($row) => [
                // null: payments on invoices issued by hand, outside any subscription.
                'planId' => $plans->get($row->plan_id)?->cuid,
                'nameAr' => $plans->get($row->plan_id)?->name_ar,
                'nameEn' => $plans->get($row->plan_id)?->name_en,
                'amount' => round((float) $row->amount, 2),
                'count' => (int) $row->count,
            ]),
            'topClients' => $topClients->map(fn ($row) => [
                'tenantId' => $tenants->get($row->tenant_id)?->cuid,
                'nameAr' => $tenants->get($row->tenant_id)?->name_ar,
                'nameEn' => $tenants->get($row->tenant_id)?->name_en,
                'amount' => round((float) $row->amount, 2),
                'count' => (int) $row->count,
            ]),
        ]);
    }

    public function tenants(ReportPeriodRequest $request)
    {
        $range = $request->range();

        $newTenants = fn () => Tenant::whereBetween('created_at', $range);
        $newSubscriptions = fn () => Subscription::whereBetween('created_at', $range);
        // Cancellations are read from the audit log: subscriptions have no cancelled_at of their own.
        $cancellations = fn () => AuditLog::where('action', 'subscription.cancelled')->whereBetween('created_at', $range);
        $requests = fn () => TenantRequest::whereBetween('created_at', $range);

        $reviewed = $requests()->whereNotNull('reviewed_at')->get(['created_at', 'reviewed_at']);
        $tenantUsers = fn () => User::whereNotNull('tenant_id');

        $topTenants = Tenant::withCount('users')
            ->withCount(['users as active_users_count' => fn (Builder $q) => $q->whereBetween('last_login_at', $range)])
            ->orderByDesc('active_users_count')->orderByDesc('users_count')->limit(10)->get();

        return $this->item([
            'period' => $request->period(),
            'summary' => [
                'newTenants' => $newTenants()->count(),
                'newSubscriptions' => $newSubscriptions()->count(),
                'cancellations' => $cancellations()->count(),
                'requests' => $requests()->count(),
                'newUsers' => $tenantUsers()->whereBetween('created_at', $range)->count(),
                'activeUsers' => $tenantUsers()->whereBetween('last_login_at', $range)->count(),
                'totalNow' => Tenant::count(),
            ],
            'monthly' => $this->merge($request->months(), [
                'newTenants' => $this->monthly($newTenants(), 'created_at'),
                'newSubscriptions' => $this->monthly($newSubscriptions(), 'created_at'),
                'cancellations' => $this->monthly($cancellations(), 'created_at'),
            ]),
            'byTypeNow' => $this->counts(Tenant::query(), 'type', Tenant::TYPES),
            'byStatusNow' => $this->counts(Tenant::query(), 'status', Tenant::STATUSES),
            'newByType' => $this->counts($newTenants(), 'type', Tenant::TYPES),
            'requestsByStatus' => $this->counts($requests(), 'status', ['pending', 'approved', 'rejected']),
            'averageReviewHours' => $reviewed->isEmpty() ? null
                : round($reviewed->avg(fn ($r) => $r->created_at->diffInMinutes($r->reviewed_at) / 60), 1),
            'topTenants' => $topTenants->map(fn (Tenant $t) => [
                'tenantId' => $t->cuid,
                'nameAr' => $t->name_ar,
                'nameEn' => $t->name_en,
                'type' => $t->type,
                'status' => $t->status,
                'users' => $t->users_count,
                'activeUsers' => $t->active_users_count,
            ]),
        ]);
    }

    public function content(ReportPeriodRequest $request)
    {
        $range = $request->range();

        $created = fn () => Article::whereBetween('created_at', $range);
        $published = fn () => Article::whereNotNull('published_at')->whereBetween('published_at', $range);
        $reports = fn () => ContentReport::whereBetween('created_at', $range);
        $comments = fn () => Comment::whereBetween('created_at', $range);

        $bySection = $published()->groupBy('section_id')->selectRaw('section_id, count(*) as count')->orderByDesc('count')->get();
        $sections = MagazineSection::whereIn('id', $bySection->pluck('section_id')->filter())->get()->keyBy('id');

        $resolved = $reports()->whereNotNull('resolved_at')->get(['created_at', 'resolved_at']);

        return $this->item([
            'period' => $request->period(),
            'summary' => [
                'created' => $created()->count(),
                'published' => $published()->count(),
                'withdrawn' => Article::whereBetween('withdrawn_at', $range)->count(),
                'issuesPublished' => Issue::where('status', 'published')->whereBetween('published_at', $range)->count(),
                'reports' => $reports()->count(),
                'comments' => $comments()->count(),
                'inReviewNow' => Article::where('status', 'in_review')->count(),
            ],
            'monthly' => $this->merge($request->months(), [
                'created' => $this->monthly($created(), 'created_at'),
                'published' => $this->monthly($published(), 'published_at'),
                'reports' => $this->monthly($reports(), 'created_at'),
            ]),
            'createdByStatus' => $this->counts($created(), 'status', Article::STATUSES),
            'publishedByLanguage' => $this->counts($published(), 'language', Article::LANGUAGES),
            'publishedByClassification' => $this->counts($published(), 'classification', Article::CLASSIFICATIONS),
            'publishedBySection' => $bySection->map(fn ($row) => [
                // null: articles outside any section.
                'sectionId' => $sections->get($row->section_id)?->cuid,
                'nameAr' => $sections->get($row->section_id)?->name_ar,
                'nameEn' => $sections->get($row->section_id)?->name_en,
                'count' => (int) $row->count,
            ]),
            'compliance' => $this->counts(
                Article::whereBetween('compliance_checked_at', $range), 'compliance_result', ['compliant', 'needs_review', 'non_compliant']
            ),
            'reportsByReason' => $this->counts($reports(), 'reason', ContentReport::REASONS),
            'reportsByStatus' => $this->counts($reports(), 'status', ContentReport::STATUSES),
            'averageResolutionHours' => $resolved->isEmpty() ? null
                : round($resolved->avg(fn ($r) => $r->created_at->diffInMinutes($r->resolved_at) / 60), 1),
            'commentsByStatus' => $this->counts($comments(), 'status', ['pending', 'approved', 'hidden']),
            'topAuthors' => $published()->groupBy('author_name')->selectRaw('author_name, count(*) as count')
                ->orderByDesc('count')->limit(10)->get()
                ->map(fn ($row) => ['name' => $row->author_name, 'count' => (int) $row->count]),
        ]);
    }

    public function events(ReportPeriodRequest $request)
    {
        $range = $request->range();

        $events = fn () => Event::whereBetween('starts_at', $range);
        $registrations = fn () => EventRegistration::whereIn('event_id', $events()->select('id'));

        $registered = $registrations()->where('status', '!=', 'cancelled')->count();
        $attended = $registrations()->where('status', 'attended')->count();
        // Attendance is only known once an event has ended.
        $endedRegistrations = EventRegistration::whereIn('event_id', $events()->where('status', 'ended')->select('id'))
            ->where('status', '!=', 'cancelled');
        $endedCount = (clone $endedRegistrations)->count();

        $topEvents = $events()->withCount([
            'registrations as registered_count' => fn (Builder $q) => $q->where('status', '!=', 'cancelled'),
            'registrations as attended_count' => fn (Builder $q) => $q->where('status', 'attended'),
        ])->orderByDesc('registered_count')->limit(10)->get();

        return $this->item([
            'period' => $request->period(),
            'summary' => [
                'events' => $events()->count(),
                'ended' => $events()->where('status', 'ended')->count(),
                'cancelled' => $events()->where('status', 'cancelled')->count(),
                'sponsored' => $events()->where('is_sponsored', true)->count(),
                'byClients' => $events()->whereNotNull('tenant_id')->count(),
                'registrations' => $registered,
                'attended' => $attended,
                'attendanceRate' => $endedCount > 0
                    ? round((clone $endedRegistrations)->where('status', 'attended')->count() / $endedCount * 100, 1)
                    : null,
            ],
            'monthly' => $this->merge($request->months(), [
                'events' => $this->monthly($events(), 'starts_at'),
                'registrations' => $this->monthly($registrations()->where('status', '!=', 'cancelled'), 'created_at'),
            ]),
            'byStatus' => $this->counts($events(), 'status', Event::STATUSES),
            'byType' => $this->counts($events(), 'type', Event::TYPES),
            'byFormat' => $this->counts($events(), 'format', Event::FORMATS),
            'topEvents' => $topEvents->map(fn (Event $e) => [
                'id' => $e->cuid,
                'titleAr' => $e->title_ar,
                'titleEn' => $e->title_en,
                'startsAt' => $e->starts_at->toIso8601String(),
                'status' => $e->status,
                'capacity' => $e->capacity,
                'registered' => $e->registered_count,
                'attended' => $e->attended_count,
            ]),
        ]);
    }

    // Value per 'YYYY-MM' for $column, e.g. ['2026-09' => 4].
    private function monthly($query, string $column, string $aggregate = 'count(*)'): Collection
    {
        return $query->toBase()
            ->selectRaw("DATE_FORMAT($column, '%Y-%m') as month, $aggregate as value")
            ->groupBy('month')
            ->pluck('value', 'month')
            ->map(fn ($value) => round((float) $value, 2));
    }

    // One row per month of the period with every series, zero where nothing happened.
    private function merge(Collection $months, array $series): Collection
    {
        return $months->map(fn (string $month) => ['month' => $month]
            + array_map(fn (Collection $values) => $values[$month] ?? 0, $series));
    }

    // Count per value of $column, every known value included (0 when absent), e.g. {"ar": 3, "en": 0}.
    private function counts($query, string $column, array $values): array
    {
        $found = $query->toBase()->reorder()->groupBy($column)->selectRaw("$column as k, count(*) as c")->pluck('c', 'k');

        $counts = [];
        foreach ($values as $value) {
            $counts[$value] = (int) ($found[$value] ?? 0);
        }

        return $counts;
    }
}
