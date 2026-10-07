<?php

namespace App\Http\Controllers\Api\Events;

use App\Http\Controllers\Controller;
use App\Http\Requests\Events\RegistrationFormRequest;
use App\Http\Requests\Events\RegistrationStatusFormRequest;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegistrationController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $query = $event->registrations()->with('tenant');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }
        if (in_array($status = $request->query('status'), EventRegistration::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (EventRegistration $registration) => $registration->toPublicArray(),
            ['capacity' => $event->capacity, 'activeCount' => $event->activeRegistrationsCount()]
        );
    }

    public function store(RegistrationFormRequest $request, Event $event)
    {
        if (! $event->acceptsRegistrations()) {
            return $this->error('registration_closed', 409);
        }

        // Locking the event row keeps two registrations from taking the last seat together.
        $result = DB::transaction(function () use ($request, $event) {
            $event = Event::lockForUpdate()->find($event->id);
            $fields = $request->fields();

            if ($event->registrations()->where('email', $fields['email'])->exists()) {
                return 'already_registered';
            }
            if ($event->capacity !== null && $event->activeRegistrationsCount() >= $event->capacity) {
                return 'event_full';
            }

            return $event->registrations()->create($fields + ['status' => 'registered']);
        });

        if (is_string($result)) {
            return $this->error($result, 409);
        }

        $this->audit($request, 'created', $result);

        return $this->item($result->load('tenant')->toPublicArray(), 201);
    }

    // Marking attendance, cancelling, or reinstating a cancelled seat (which needs a free seat).
    public function updateStatus(RegistrationStatusFormRequest $request, Event $event, EventRegistration $registration)
    {
        if ($registration->event_id !== $event->id) {
            return $this->error('not_found', 404);
        }

        $status = $request->input('status');
        if ($registration->status === 'cancelled' && $status !== 'cancelled'
            && $event->capacity !== null && $event->activeRegistrationsCount() >= $event->capacity) {
            return $this->error('event_full', 409);
        }

        $registration->update(['status' => $status]);
        $this->audit($request, $status, $registration);

        return $this->item($registration->load('tenant')->toPublicArray());
    }

    private function audit(Request $request, string $what, EventRegistration $registration): void
    {
        Audit::log($request, [
            'action' => "event_registration.$what",
            'actor' => $request->user(),
            'entity_type' => 'event_registration',
            'entity_id' => $registration->cuid,
            'metadata' => ['eventId' => $registration->event?->cuid, 'email' => $registration->email],
        ]);
    }
}
