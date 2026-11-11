<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\BroadcastFormRequest;
use App\Http\Requests\Content\ReasonFormRequest;
use App\Http\Requests\Events\EndBroadcastFormRequest;
use App\Models\Event;
use App\Support\Audit;
use Illuminate\Http\Request;

// An organization admin's own events and live broadcasts (`/api/me/organization/broadcasts`). Same life cycle
// as the platform's events (draft → scheduled → live → ended, or cancelled), always inside their own
// organization: another organization's event answers 404.
class BroadcastController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->events($request);

        $statuses = array_intersect(explode(',', (string) $request->query('status', '')), Event::STATUSES);
        if ($statuses) {
            $query->whereIn('status', $statuses);
        }

        return $this->paginated(
            $query->orderByDesc('starts_at')->paginate($this->perPage($request)),
            fn (Event $event) => $event->toPublicArray()
        );
    }

    public function store(BroadcastFormRequest $request)
    {
        $event = Event::create($request->fields() + ['tenant_id' => $request->user()->tenant_id, 'status' => 'draft']);
        $this->audit($request, 'created', $event);

        return $this->item($event->toPublicArray(), 201);
    }

    public function update(BroadcastFormRequest $request, string $cuid)
    {
        $event = $this->events($request)->where('cuid', $cuid)->first();
        if (! $event) {
            return $this->error('not_found', 404);
        }
        if ($event->status === 'cancelled') {
            return $this->error('event_locked', 409);
        }

        $event->update($request->fields());
        $this->audit($request, 'updated', $event);

        return $this->item($event->fresh()->toPublicArray());
    }

    public function destroy(Request $request, string $cuid)
    {
        $event = $this->events($request)->where('cuid', $cuid)->first();
        if (! $event) {
            return $this->error('not_found', 404);
        }
        if ($event->status !== 'draft') {
            return $this->error('event_locked', 409);
        }

        $event->delete();
        $this->audit($request, 'deleted', $event);

        return $this->ok();
    }

    public function schedule(Request $request, string $cuid)
    {
        return $this->transition($request, $cuid, 'schedule');
    }

    // Going live needs a stream link when the event is online or hybrid.
    public function start(Request $request, string $cuid)
    {
        $event = $this->events($request)->where('cuid', $cuid)->first();
        if ($event && $event->canDo('start') && (! $event->isBroadcast() || ! $event->stream_url)) {
            return $this->error('stream_url_required', 409);
        }

        return $this->transition($request, $cuid, 'start', ['live_started_at' => now()]);
    }

    public function end(EndBroadcastFormRequest $request, string $cuid)
    {
        $extra = ['live_ended_at' => now()];
        if ($request->filled('recordingUrl')) {
            $extra['recording_url'] = $request->input('recordingUrl');
        }

        return $this->transition($request, $cuid, 'end', $extra);
    }

    public function cancel(ReasonFormRequest $request, string $cuid)
    {
        return $this->transition($request, $cuid, 'cancel', ['cancel_reason' => $request->reason()]);
    }

    private function transition(Request $request, string $cuid, string $action, array $extra = [])
    {
        $event = $this->events($request)->where('cuid', $cuid)->first();
        if (! $event) {
            return $this->error('not_found', 404);
        }
        if (! $event->canDo($action)) {
            return $this->error('invalid_event_transition', 409);
        }

        $from = $event->status;
        $event->update(['status' => Event::TRANSITIONS[$action][1]] + $extra);
        $this->audit($request, ['schedule' => 'scheduled', 'start' => 'started', 'end' => 'ended', 'cancel' => 'cancelled'][$action], $event, [
            'from' => $from,
            'to' => $event->status,
        ]);

        return $this->item($event->fresh()->toPublicArray());
    }

    private function events(Request $request)
    {
        return Event::where('tenant_id', $request->user()->tenant_id);
    }

    private function audit(Request $request, string $what, Event $event, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "event.$what",
            'actor' => $request->user(),
            'entity_type' => 'event',
            'entity_id' => $event->cuid,
            'metadata' => ['titleEn' => $event->title_en, 'byOrganization' => true] + $metadata,
        ]);
    }
}
