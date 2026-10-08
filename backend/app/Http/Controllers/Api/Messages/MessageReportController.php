<?php

namespace App\Http\Controllers\Api\Messages;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\ReportDecisionFormRequest;
use App\Http\Requests\Messages\MessageReportFormRequest;
use App\Models\Message;
use App\Models\MessageReport;
use App\Support\Audit;
use Illuminate\Http\Request;

// Reports about private messages (MSG-04, MSG-06). A participant reports a message; moderators then
// see that one message and nothing else of the conversation. Opening the list is audited.
class MessageReportController extends Controller
{
    public function store(MessageReportFormRequest $request, Message $message)
    {
        $user = $request->user();
        if (! $message->conversation->hasParticipant($user)) {
            return $this->error('not_found', 404);
        }
        if ($message->sender_id === $user->id) {
            return $this->error('cannot_report_own_message', 422);
        }
        if ($message->reports()->where('reporter_id', $user->id)->exists()) {
            return $this->error('already_reported', 409);
        }

        $report = $message->reports()->create([
            'reporter_id' => $user->id,
            'reason' => $request->input('reason'),
            'details' => $request->input('details'),
            'status' => 'open',
        ]);
        $this->audit($request, 'created', $report, ['reason' => $report->reason]);

        return $this->item(['id' => $report->cuid, 'status' => $report->status], 201);
    }

    public function index(Request $request)
    {
        $query = MessageReport::with(['message.sender.tenant', 'reporter.tenant', 'resolver']);
        if (in_array($status = $request->query('status'), MessageReport::STATUSES, true)) {
            $query->where('status', $status);
        }

        $page = $query->orderByRaw("status = 'open' desc")->orderByDesc('created_at')->paginate($this->perPage($request));

        // Reading reported messages is the only time staff see private text: record who looked at what.
        Audit::log($request, [
            'action' => 'message_report.viewed',
            'actor' => $request->user(),
            'entity_type' => 'message_report',
            'metadata' => ['reports' => $page->getCollection()->pluck('cuid')->all()],
        ]);

        return $this->paginated($page, fn (MessageReport $r) => $r->toPublicArray(),
            ['openCount' => MessageReport::where('status', 'open')->count()]);
    }

    public function decide(ReportDecisionFormRequest $request, MessageReport $report)
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

        return $this->item($report->fresh(['message.sender.tenant', 'reporter.tenant', 'resolver'])->toPublicArray());
    }

    private function audit(Request $request, string $what, MessageReport $report, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "message_report.$what",
            'actor' => $request->user(),
            'entity_type' => 'message_report',
            'entity_id' => $report->cuid,
            'metadata' => ['message' => $report->message?->cuid] + $metadata,
        ]);
    }
}
