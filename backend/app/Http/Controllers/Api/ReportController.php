<?php

namespace App\Http\Controllers\Api;

use App\Billing\BillingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ReportRangeRequest;
use App\Models\Article;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Support\Audit;
use App\Support\Locales;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Reports & Analytics: one report per area over a period (default: the last 12 months), and a CSV export
// of each (audited, since it takes data out of the platform). Each route needs `read,reports` plus read
// access to the area it covers, so a platform editor never sees revenue.
class ReportController extends Controller
{
    public const TYPES = ['revenue', 'tenants', 'content', 'events'];

    private const MAX_DAYS = 3 * 366;

    public function show(ReportRangeRequest $request, string $type)
    {
        [$from, $to] = $this->range($request);
        if (! $from) {
            return $this->error('range_too_long', 422);
        }

        return $this->item(['from' => $from->toDateString(), 'to' => $to->toDateString()] + $this->{$type}($from, $to));
    }

    public function export(ReportRangeRequest $request, string $type)
    {
        [$from, $to] = $this->range($request);
        if (! $from) {
            return $this->error('range_too_long', 422);
        }

        $lang = $request->validated('lang') ?? App::getLocale();
        [$columns, $rows] = $this->{$type.'Rows'}($from, $to, $lang);

        Audit::log($request, [
            'action' => 'reports.exported',
            'actor' => $request->user(),
            'entity_type' => 'report',
            'entity_id' => $type,
            'metadata' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'rows' => count($rows)],
        ]);

        $filename = "himma-{$type}-{$from->toDateString()}-{$to->toDateString()}.csv";

        return new StreamedResponse(function () use ($columns, $rows, $lang) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM, so spreadsheet apps read the Arabic text as UTF-8
            fputcsv($out, array_map(fn ($c) => Locales::t($lang, "admin.reports.csv.$c"), $columns));
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-store',
        ]);
    }

    /** @return array{0: ?Carbon, 1: ?Carbon} [null, null] when the period is longer than allowed. */
    private function range(ReportRangeRequest $request): array
    {
        $to = $request->validated('to') ? Carbon::parse($request->validated('to'))->endOfDay() : Carbon::now()->endOfDay();
        $from = $request->validated('from')
            ? Carbon::parse($request->validated('from'))->startOfDay()
            : $to->copy()->startOfMonth()->subMonthsNoOverflow(11);

        return $from->diffInDays($to) > self::MAX_DAYS ? [null, null] : [$from, $to];
    }

    // 'Y-m' for every month the period touches, so charts show empty months too.
    private function months(Carbon $from, Carbon $to): Collection
    {
        $months = collect();
        for ($m = $from->copy()->startOfMonth(); $m <= $to; $m->addMonthNoOverflow()) {
            $months->push($m->format('Y-m'));
        }

        return $months;
    }

    // Sums (or counts) a query per month of $column, keyed 'Y-m'.
    private function perMonth($query, string $column, string $aggregate = 'count(*)'): Collection
    {
        return $query->selectRaw("DATE_FORMAT($column, '%Y-%m') as month, $aggregate as value")
            ->groupBy('month')->pluck('value', 'month');
    }

    // Row counts per value of $column. JSON gets `{}` rather than `[]` when there are none.
    private function countBy($query, string $column): object
    {
        $counts = $this->counts($query, $column);

        return $counts->isEmpty() ? (object) [] : $counts;
    }

    private function counts($query, string $column): Collection
    {
        return $query->selectRaw("$column as k, count(*) as c")->groupBy($column)->pluck('c', 'k')->map(fn ($c) => (int) $c);
    }

    private function money($value): float
    {
        return round((float) $value, 2);
    }

    private function revenue(Carbon $from, Carbon $to): array
    {
        $payments = fn () => Payment::where('payments.status', 'succeeded')->whereBetween('payments.paid_at', [$from, $to]);
        $invoices = fn () => DB::table('invoices')->where('status', '!=', 'void')->whereBetween('issued_at', [$from->toDateString(), $to->toDateString()]);
        $refunds = fn () => DB::table('refunds')->where('status', 'completed')->whereBetween('created_at', [$from, $to]);

        $invoiced = $this->perMonth($invoices(), 'issued_at', 'sum(amount)');
        $collected = $this->perMonth($payments()->toBase(), 'paid_at', 'sum(amount)');
        $refunded = $this->perMonth($refunds(), 'created_at', 'sum(amount)');

        $outstanding = DB::table('invoices')->where('status', 'unpaid')->get(['id', 'amount'])
            ->sum(fn ($i) => (float) $i->amount - (float) Payment::where('invoice_id', $i->id)->where('status', 'succeeded')->sum('amount'));

        $byPlan = Subscription::with('plan')->whereIn('status', ['active', 'past_due'])->get()
            ->groupBy('plan_id')->map(fn (Collection $subs) => [
                'planNameAr' => $subs->first()->plan?->name_ar,
                'planNameEn' => $subs->first()->plan?->name_en,
                'subscriptions' => $subs->count(),
                'mrr' => $this->money($subs->sum(fn ($s) => $s->plan->interval === 'yearly' ? $s->plan->price / 12 : (float) $s->plan->price)),
            ])->sortByDesc('mrr')->values();

        $topClients = $payments()->join('invoices', 'invoices.id', '=', 'payments.invoice_id')
            ->join('tenants', 'tenants.id', '=', 'invoices.tenant_id')
            ->selectRaw('tenants.cuid, tenants.name_ar, tenants.name_en, sum(payments.amount) as total, count(*) as count')
            ->groupBy('tenants.cuid', 'tenants.name_ar', 'tenants.name_en')
            ->orderByDesc('total')->limit(10)->get()
            ->map(fn ($r) => ['tenantId' => $r->cuid, 'tenantNameAr' => $r->name_ar, 'tenantNameEn' => $r->name_en, 'amount' => $this->money($r->total), 'payments' => (int) $r->count]);

        $byMethod = $payments()->selectRaw('method, sum(amount) as total, count(*) as count')->groupBy('method')->orderByDesc('total')->get()
            ->map(fn ($r) => ['method' => $r->method, 'amount' => $this->money($r->total), 'payments' => (int) $r->count]);

        return [
            'currency' => BillingService::settings()['currency'],
            'totals' => [
                'invoiced' => $this->money($invoiced->sum()),
                'collected' => $this->money($collected->sum()),
                'refunded' => $this->money($refunded->sum()),
                'net' => $this->money($collected->sum() - $refunded->sum()),
                'outstanding' => $this->money($outstanding),
            ],
            'monthly' => $this->months($from, $to)->map(fn ($m) => [
                'month' => $m,
                'invoiced' => $this->money($invoiced[$m] ?? 0),
                'collected' => $this->money($collected[$m] ?? 0),
                'refunded' => $this->money($refunded[$m] ?? 0),
            ])->values(),
            'byPlan' => $byPlan,
            'byMethod' => $byMethod,
            'topClients' => $topClients,
        ];
    }

    private function revenueRows(Carbon $from, Carbon $to, string $lang): array
    {
        $rows = Payment::with('invoice.tenant')->where('status', 'succeeded')->whereBetween('paid_at', [$from, $to])
            ->orderBy('paid_at')->get()->map(fn (Payment $p) => [
                $p->paid_at->toDateString(),
                $p->invoice?->number,
                $this->name($p->invoice?->tenant, $lang),
                $this->label($lang, "admin.billing.method.{$p->method}", $p->method),
                $this->money($p->amount),
                $p->invoice?->currency,
                $p->reference,
            ])->all();

        return [['date', 'invoice', 'client', 'method', 'amount', 'currency', 'reference'], $rows];
    }

    private function tenants(Carbon $from, Carbon $to): array
    {
        $new = $this->perMonth(Tenant::whereBetween('created_at', [$from, $to])->toBase(), 'created_at');
        $cancelled = $this->perMonth(Subscription::where('status', 'cancelled')->whereBetween('updated_at', [$from, $to])->toBase(), 'updated_at');
        $requests = DB::table('tenant_requests')->whereBetween('created_at', [$from, $to]);

        return [
            'totals' => [
                'clients' => Tenant::count(),
                'new' => (int) $new->sum(),
                'cancelled' => (int) $cancelled->sum(),
                'clientUsers' => DB::table('users')->whereNotNull('tenant_id')->count(),
                'activeClientUsers' => DB::table('users')->whereNotNull('tenant_id')->whereBetween('last_login_at', [$from, $to])->count(),
            ],
            'byStatus' => $this->countBy(Tenant::query()->toBase(), 'status'),
            'byType' => $this->countBy(Tenant::query()->toBase(), 'type'),
            'requests' => $this->countBy(clone $requests, 'status'),
            'monthly' => $this->months($from, $to)->map(fn ($m) => [
                'month' => $m,
                'new' => (int) ($new[$m] ?? 0),
                'cancelled' => (int) ($cancelled[$m] ?? 0),
            ])->values(),
        ];
    }

    private function tenantsRows(Carbon $from, Carbon $to, string $lang): array
    {
        $rows = Tenant::withCount('users')->with(['subscriptions' => fn ($q) => $q->with('plan')->latest('id')])
            ->orderBy('created_at')->get()->map(function (Tenant $t) use ($lang) {
                $subscription = $t->subscriptions->first();

                return [
                    $this->name($t, $lang),
                    $this->label($lang, "admin.tenantType.{$t->type}", $t->type),
                    $this->label($lang, "admin.stats.status.{$t->status}", $t->status),
                    $subscription ? $this->name($subscription->plan, $lang) : '',
                    $subscription ? $this->label($lang, "admin.billing.status.{$subscription->status}", $subscription->status) : '',
                    $subscription?->ends_at?->toDateString(),
                    $t->users_count,
                    $t->created_at?->toDateString(),
                ];
            })->all();

        return [['client', 'type', 'status', 'plan', 'subscription', 'endsAt', 'users', 'createdAt'], $rows];
    }

    private function content(Carbon $from, Carbon $to): array
    {
        $created = fn () => Article::whereBetween('created_at', [$from, $to])->toBase();
        $published = fn () => Article::whereBetween('published_at', [$from, $to])->toBase();

        $createdMonthly = $this->perMonth($created(), 'created_at');
        $publishedMonthly = $this->perMonth($published(), 'published_at');

        $bySection = $published()->leftJoin('magazine_sections', 'magazine_sections.id', '=', 'articles.section_id')
            ->selectRaw('magazine_sections.cuid, magazine_sections.name_ar, magazine_sections.name_en, count(*) as c')
            ->groupBy('magazine_sections.cuid', 'magazine_sections.name_ar', 'magazine_sections.name_en')
            ->orderByDesc('c')->get()
            ->map(fn ($r) => ['sectionId' => $r->cuid, 'nameAr' => $r->name_ar, 'nameEn' => $r->name_en, 'articles' => (int) $r->c]);

        $topAuthors = $published()->selectRaw('author_name, count(*) as c')->groupBy('author_name')->orderByDesc('c')->limit(10)->get()
            ->map(fn ($r) => ['author' => $r->author_name, 'articles' => (int) $r->c]);

        return [
            'totals' => [
                'created' => (int) $createdMonthly->sum(),
                'published' => (int) $publishedMonthly->sum(),
                'withdrawn' => Article::whereBetween('withdrawn_at', [$from, $to])->count(),
                'reports' => DB::table('content_reports')->whereBetween('created_at', [$from, $to])->count(),
                'comments' => DB::table('comments')->whereBetween('created_at', [$from, $to])->count(),
            ],
            'monthly' => $this->months($from, $to)->map(fn ($m) => [
                'month' => $m,
                'created' => (int) ($createdMonthly[$m] ?? 0),
                'published' => (int) ($publishedMonthly[$m] ?? 0),
            ])->values(),
            'byStatus' => $this->countBy($created(), 'status'),
            'byLanguage' => $this->countBy($published(), 'language'),
            'byClassification' => $this->countBy($published(), 'classification'),
            'compliance' => $this->countBy(Article::whereBetween('compliance_checked_at', [$from, $to])->toBase(), 'compliance_result'),
            'reportsByStatus' => $this->countBy(DB::table('content_reports')->whereBetween('created_at', [$from, $to]), 'status'),
            'commentsByStatus' => $this->countBy(DB::table('comments')->whereBetween('created_at', [$from, $to]), 'status'),
            'bySection' => $bySection,
            'topAuthors' => $topAuthors,
        ];
    }

    private function contentRows(Carbon $from, Carbon $to, string $lang): array
    {
        $rows = Article::with('section')->whereBetween('published_at', [$from, $to])->orderBy('published_at')->get()
            ->map(fn (Article $a) => [
                $a->published_at->toDateString(),
                $a->title,
                $this->label($lang, "language.{$a->language}", $a->language),
                $a->section ? $this->name($a->section, $lang) : '',
                $this->label($lang, "admin.content.classification.{$a->classification}", $a->classification),
                $a->author_name,
                $this->label($lang, "admin.content.status.{$a->status}", $a->status),
                $a->compliance_result ? $this->label($lang, "admin.content.compliance.result.{$a->compliance_result}", $a->compliance_result) : '',
            ])->all();

        return [['publishedAt', 'title', 'language', 'section', 'classification', 'author', 'status', 'compliance'], $rows];
    }

    private function events(Carbon $from, Carbon $to): array
    {
        $events = fn () => Event::whereBetween('starts_at', [$from, $to])->toBase();
        $registrations = DB::table('event_registrations')
            ->join('events', 'events.id', '=', 'event_registrations.event_id')
            ->whereBetween('events.starts_at', [$from, $to]);

        $byRegistration = $this->counts($registrations, 'event_registrations.status');
        $registered = (int) ($byRegistration['registered'] ?? 0);
        $attended = (int) ($byRegistration['attended'] ?? 0);

        $list = Event::withCount([
            'registrations as registered_count' => fn ($q) => $q->where('status', '!=', 'cancelled'),
            'registrations as attended_count' => fn ($q) => $q->where('status', 'attended'),
        ])->whereBetween('starts_at', [$from, $to])->orderByDesc('starts_at')->limit(50)->get()
            ->map(fn (Event $e) => [
                'id' => $e->cuid,
                'titleAr' => $e->title_ar,
                'titleEn' => $e->title_en,
                'startsAt' => $e->starts_at->toIso8601String(),
                'type' => $e->type,
                'format' => $e->format,
                'status' => $e->status,
                'capacity' => $e->capacity,
                'registered' => $e->registered_count,
                'attended' => $e->attended_count,
            ]);

        return [
            'totals' => [
                'events' => $events()->count(),
                'held' => $events()->whereIn('status', ['live', 'ended'])->count(),
                'cancelled' => $events()->where('status', 'cancelled')->count(),
                'registrations' => $registered + $attended,
                'attended' => $attended,
                'attendanceRate' => $registered + $attended > 0 ? (int) round($attended / ($registered + $attended) * 100) : 0,
            ],
            'byStatus' => $this->countBy($events(), 'status'),
            'byType' => $this->countBy($events(), 'type'),
            'byFormat' => $this->countBy($events(), 'format'),
            'events' => $list,
        ];
    }

    private function eventsRows(Carbon $from, Carbon $to, string $lang): array
    {
        $rows = collect($this->events($from, $to)['events'])->sortBy('startsAt')->map(fn ($e) => [
            Carbon::parse($e['startsAt'])->toDateString(),
            $lang === 'en' ? $e['titleEn'] : $e['titleAr'],
            $this->label($lang, "admin.events.type.{$e['type']}", $e['type']),
            $this->label($lang, "admin.events.format.{$e['format']}", $e['format']),
            $this->label($lang, "admin.events.status.{$e['status']}", $e['status']),
            $e['capacity'],
            $e['registered'],
            $e['attended'],
        ])->values()->all();

        return [['date', 'event', 'type', 'format', 'status', 'capacity', 'registered', 'attended'], $rows];
    }

    // The text for a code in the export's language, or the code itself when there is no text for it.
    private function label(string $lang, string $key, ?string $fallback): string
    {
        $text = Locales::t($lang, $key);

        return $text === $key ? (string) $fallback : $text;
    }

    private function name($model, string $lang): string
    {
        if (! $model) {
            return '';
        }

        return (string) ($lang === 'en' ? ($model->name_en ?: $model->name_ar) : ($model->name_ar ?: $model->name_en));
    }
}
