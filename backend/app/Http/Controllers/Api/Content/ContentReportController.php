<?php

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\ContentReportFormRequest;
use App\Http\Requests\Content\ReportDecisionFormRequest;
use App\Models\ContentReport;
use App\Support\Audit;
use Illuminate\Http\Request;

// Complaints about content (GOV-03): received, then resolved or dismissed with a recorded decision.
class ContentReportController extends Controller
{
    public function index(Request $request)
    {
        $query = ContentReport::with(['article', 'resolver']);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('reporter_name', 'like', "%{$search}%")
                ->orWhere('reporter_email', 'like', "%{$search}%")
                ->orWhereHas('article', fn ($a) => $a->where('title', 'like', "%{$search}%")));
        }
        if (in_array($status = $request->query('status'), ContentReport::STATUSES, true)) {
            $query->where('status', $status);
        }
        if (in_array($reason = $request->query('reason'), ContentReport::REASONS, true)) {
            $query->where('reason', $reason);
        }

        return $this->paginated(
            $query->orderByRaw("status = 'open' desc")->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (ContentReport $report) => $report->toPublicArray(),
            ['openCount' => ContentReport::where('status', 'open')->count()]
        );
    }

    public function store(ContentReportFormRequest $request)
    {
        $report = ContentReport::create($request->fields() + ['status' => 'open']);
        $this->audit($request, 'created', $report, ['reason' => $report->reason]);

        return $this->item($report->fresh('article')->toPublicArray(), 201);
    }

    public function decide(ReportDecisionFormRequest $request, ContentReport $report)
    {
        if ($report->status !== 'open') {
            return $this->error('report_already_closed', 409);
        }

        $report->update([
            'status' => $request->input('status'),
            'resolution_note' => trim($request->input('note')),
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);
        $this->audit($request, $report->status, $report, ['note' => $report->resolution_note]);

        return $this->item($report->fresh(['article', 'resolver'])->toPublicArray());
    }

    private function audit(Request $request, string $what, ContentReport $report, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "content_report.$what",
            'actor' => $request->user(),
            'entity_type' => 'content_report',
            'entity_id' => $report->cuid,
            'metadata' => ['articleId' => $report->article?->cuid] + $metadata,
        ]);
    }
}
