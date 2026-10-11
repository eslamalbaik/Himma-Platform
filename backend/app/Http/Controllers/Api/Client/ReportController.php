<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ReportRangeRequest;
use App\Models\Article;
use App\Models\User;
use App\Support\Audit;
use App\Support\ClientAccess;
use App\Support\Locales;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Client dashboard → Reports: the organisation's own activity over a period (default: the last 12 months):
// articles written and published, sign-ins of its members and, for roles that run its account
// (`general_settings` allowed), what was invoiced and paid. Needs `entity_reports`; the CSV export also needs
// `export_data` and is audited, since it takes data out of the platform.
class ReportController extends Controller
{
    private const MAX_DAYS = 3 * 366;

    public function show(ReportRangeRequest $request)
    {
        [$from, $to] = $this->range($request);
        if (! $from) {
            return $this->error('range_too_long', 422);
        }

        return $this->item(['from' => $from->toDateString(), 'to' => $to->toDateString()]
            + $this->report($request->user(), $from, $to));
    }

    public function export(ReportRangeRequest $request)
    {
        [$from, $to] = $this->range($request);
        if (! $from) {
            return $this->error('range_too_long', 422);
        }

        $lang = $request->validated('lang') ?? App::getLocale();
        $report = $this->report($request->user(), $from, $to);
        $billing = $report['billing'] !== null;

        $columns = ['month', 'articles_created', 'articles_submitted', 'articles_published', 'sign_ins', 'members_signed_in'];
        if ($billing) {
            array_push($columns, 'invoiced', 'paid');
        }
        $rows = collect($report['months'])->map(fn (string $month) => array_merge(
            [$month, $report['articles']['created'][$month], $report['articles']['submitted'][$month],
                $report['articles']['published'][$month], $report['members']['signIns'][$month],
                $report['members']['membersSignedIn'][$month]],
            $billing ? [$report['billing']['invoiced'][$month], $report['billing']['paid'][$month]] : []
        ))->all();

        Audit::log($request, [
            'action' => 'client.reports_exported',
            'actor' => $request->user(),
            'entity_type' => 'report',
            'entity_id' => 'organisation',
            'metadata' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'rows' => count($rows)],
        ]);

        $filename = "himma-organisation-{$from->toDateString()}-{$to->toDateString()}.csv";

        return new StreamedResponse(function () use ($columns, $rows, $lang) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM, so spreadsheet apps read the Arabic text as UTF-8
            fputcsv($out, array_map(fn ($c) => Locales::t($lang, "client.reports.csv.$c"), $columns));
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

    private function report(User $user, Carbon $from, Carbon $to): array
    {
        $tenantId = $user->tenant_id;
        $months = $this->months($from, $to);
        $series = fn (Collection $values) => $months->mapWithKeys(fn ($m) => [$m => round((float) ($values[$m] ?? 0), 2)]);
        $counts = fn (Collection $values) => $months->mapWithKeys(fn ($m) => [$m => (int) ($values[$m] ?? 0)]);

        $articles = fn () => Article::where('tenant_id', $tenantId);
        $audit = fn (string $action) => DB::table('audit_logs')->where('tenant_id', $tenantId)
            ->where('action', $action)->whereBetween('created_at', [$from, $to]);

        $report = [
            'months' => $months->values(),
            'articles' => [
                'created' => $counts($this->perMonth($articles()->whereBetween('created_at', [$from, $to])->toBase(), 'created_at')),
                'submitted' => $counts($this->perMonth($audit('article.submitted'), 'created_at')),
                'published' => $counts($this->perMonth($articles()->whereBetween('published_at', [$from, $to])->toBase(), 'published_at')),
                'byStatus' => $this->countBy($articles()->toBase(), 'status'),
                'byClassification' => $this->countBy($articles()->toBase(), 'classification'),
            ],
            'members' => [
                'active' => User::where('tenant_id', $tenantId)->where('status', 'active')->count(),
                'signedIn' => $audit('auth.login')->distinct()->count('actor_id'),
                'signIns' => $counts($this->perMonth($audit('auth.login'), 'created_at')),
                'membersSignedIn' => $counts($this->perMonth($audit('auth.login'), 'created_at', 'count(distinct actor_id)')),
            ],
            'billing' => null,
        ];

        if (ClientAccess::allowed($user, 'general_settings')) {
            $invoiced = DB::table('invoices')->where('tenant_id', $tenantId)->where('status', '!=', 'void')
                ->whereBetween('issued_at', [$from->toDateString(), $to->toDateString()]);
            $paid = DB::table('payments')->join('invoices', 'invoices.id', '=', 'payments.invoice_id')
                ->where('invoices.tenant_id', $tenantId)->where('payments.status', 'succeeded')
                ->whereBetween('payments.paid_at', [$from, $to]);

            $report['billing'] = [
                'currency' => DB::table('invoices')->where('tenant_id', $tenantId)->latest('issued_at')->value('currency'),
                'invoiced' => $series($this->perMonth(clone $invoiced, 'issued_at', 'sum(amount)')),
                'paid' => $series($this->perMonth(clone $paid, 'payments.paid_at', 'sum(payments.amount)')),
                'invoicedTotal' => round((float) (clone $invoiced)->sum('amount'), 2),
                'paidTotal' => round((float) (clone $paid)->sum('payments.amount'), 2),
            ];
        }

        return $report;
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

    private function perMonth($query, string $column, string $aggregate = 'count(*)'): Collection
    {
        return $query->selectRaw("DATE_FORMAT($column, '%Y-%m') as month, $aggregate as value")
            ->groupBy('month')->pluck('value', 'month');
    }

    private function countBy($query, string $column): object
    {
        $counts = $query->selectRaw("$column as k, count(*) as c")->groupBy($column)->pluck('c', 'k')->map(fn ($c) => (int) $c);

        return $counts->isEmpty() ? (object) [] : $counts;
    }
}
