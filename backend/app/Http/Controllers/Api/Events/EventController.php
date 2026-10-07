<?php

namespace App\Http\Controllers\Api\Events;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\ReasonFormRequest;
use App\Http\Requests\Events\EndBroadcastFormRequest;
use App\Http\Requests\Events\EventFormRequest;
use App\Models\Event;
use App\Support\Audit;
use Illuminate\Http\Request;

// Announcing and cancelling events need `manage,events`; running the broadcast (start, end) needs
// `update,events`, which the broadcast moderator has.
class EventController extends Controller
{
    public function index(Request $request)
    {
        $query = Event::with('tenant')
            ->withCount(['registrations' => fn ($q) => $q->where('status', '!=', 'cancelled')]);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('title_ar', 'like', "%{$search}%")
                ->orWhere('title_en', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%"));
        }

        $statuses = array_intersect(explode(',', (string) $request->query('status', '')), Event::STATUSES);
        if ($statuses) {
            $query->whereIn('status', $statuses);
        }
        if (in_array($type = $request->query('type'), Event::TYPES, true)) {
            $query->where('type', $type);
        }
        if (in_array($format = $request->query('format'), Event::FORMATS, true)) {
            $query->where('format', $format);
        }
        if ($request->query('when') === 'upcoming') {
            $query->where('starts_at', '>=', now()->startOfDay());
        } elseif ($request->query('when') === 'past') {
            $query->where('ends_at', '<', now());
        }

        $order = $request->query('when') === 'upcoming' ? 'asc' : 'desc';

        return $this->paginated(
            $query->orderBy('starts_at', $order)->paginate($this->perPage($request)),
            fn (Event $event) => $event->toPublicArray(),
            ['liveCount' => Event::where('status', 'live')->count()]
        );
    }

    public function show(Event $event)
    {
        return $this->item($event->load('tenant')->loadCount(['registrations' => fn ($q) => $q->where('status', '!=', 'cancelled')])->toPublicArray());
    }

    public function store(EventFormRequest $request)
    {
        $event = Event::create($request->fields() + ['status' => 'draft']);
        $this->audit($request, 'created', $event, ['startsAt' => $event->starts_at->toIso8601String()]);

        return $this->item($event->load('tenant')->toPublicArray(), 201);
    }

    // Ended events stay editable so the recording link can be added; cancelled ones are closed.
    public function update(EventFormRequest $request, Event $event)
    {
        if ($event->status === 'cancelled') {
            return $this->error('event_locked', 409);
        }

        $fields = $request->fields();
        if ($fields['capacity'] !== null && $fields['capacity'] < $event->activeRegistrationsCount()) {
            return $this->error('capacity_below_registrations', 409);
        }

        $event->update($fields);
        $this->audit($request, 'updated', $event);

        return $this->item($this->fresh($event));
    }

    public function destroy(Request $request, Event $event)
    {
        if ($event->status !== 'draft') {
            return $this->error('event_locked', 409);
        }

        $event->delete();
        $this->audit($request, 'deleted', $event);

        return $this->ok();
    }

    public function schedule(Request $request, Event $event)
    {
        return $this->transition($request, $event, 'schedule');
    }

    // A broadcast needs an online or hybrid event with a stream link.
    public function start(Request $request, Event $event)
    {
        if ($event->canDo('start') && (! $event->isBroadcast() || ! $event->stream_url)) {
            return $this->error('stream_url_required', 409);
        }

        return $this->transition($request, $event, 'start', ['live_started_at' => now()]);
    }

    public function end(EndBroadcastFormRequest $request, Event $event)
    {
        $extra = ['live_ended_at' => now()];
        if ($request->filled('recordingUrl')) {
            $extra['recording_url'] = $request->input('recordingUrl');
        }

        return $this->transition($request, $event, 'end', $extra);
    }

    public function cancel(ReasonFormRequest $request, Event $event)
    {
        return $this->transition($request, $event, 'cancel', ['cancel_reason' => $request->reason()]);
    }

    private function transition(Request $request, Event $event, string $action, array $extra = [])
    {
        if (! $event->canDo($action)) {
            return $this->error('invalid_event_transition', 409);
        }

        $from = $event->status;
        $event->update(['status' => Event::TRANSITIONS[$action][1]] + $extra);
        $this->audit($request, self::AUDIT_NAMES[$action], $event, array_filter([
            'from' => $from,
            'to' => $event->status,
            'reason' => $extra['cancel_reason'] ?? null,
        ]));

        return $this->item($this->fresh($event));
    }

    private const AUDIT_NAMES = ['schedule' => 'scheduled', 'start' => 'started', 'end' => 'ended', 'cancel' => 'cancelled'];

    private function fresh(Event $event): array
    {
        return $event->fresh('tenant')->loadCount(['registrations' => fn ($q) => $q->where('status', '!=', 'cancelled')])->toPublicArray();
    }

    private function audit(Request $request, string $what, Event $event, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "event.$what",
            'actor' => $request->user(),
            'entity_type' => 'event',
            'entity_id' => $event->cuid,
            'metadata' => ['titleEn' => $event->title_en] + $metadata,
        ]);
    }
}
