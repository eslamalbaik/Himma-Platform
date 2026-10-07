<?php

namespace Tests\Feature\Events;

use App\Models\Event;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventsTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + [
            'titleAr' => 'ندوة الذكاء الاصطناعي في التعليم', 'titleEn' => 'AI in education webinar',
            'type' => 'webinar', 'format' => 'online', 'visibility' => 'public',
            'startsAt' => now()->addDays(3)->setTime(17, 0)->toIso8601String(),
            'endsAt' => now()->addDays(3)->setTime(19, 0)->toIso8601String(),
            'capacity' => 2, 'registrationRequired' => true,
            'streamUrl' => 'https://www.youtube.com/watch?v=abc123',
        ];
    }

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/events')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/admin/events')->assertStatus(403);

        // The broadcast moderator runs broadcasts but cannot create, announce or cancel events.
        $this->signIn('broadcast_moderator');
        $this->getJson('/api/admin/events')->assertOk();
        $this->postJson('/api/admin/events', $this->payload())->assertStatus(403);
        $event = Event::factory()->status('scheduled')->create();
        $this->postJson("/api/admin/events/{$event->cuid}/cancel", ['reason' => 'x'])->assertStatus(403);
        $this->postJson("/api/admin/events/{$event->cuid}/start")->assertOk()->assertJsonPath('data.status', 'live');
    }

    public function test_creates_updates_and_deletes_a_draft(): void
    {
        $this->signIn('platform_editor');

        $id = $this->postJson('/api/admin/events', $this->payload())
            ->assertCreated()->assertJsonPath('data.status', 'draft')->assertJsonPath('data.capacity', 2)->json('data.id');

        $this->putJson("/api/admin/events/$id", $this->payload(['titleEn' => 'Webinar', 'capacity' => 50]))
            ->assertOk()->assertJsonPath('data.titleEn', 'Webinar');

        $this->deleteJson("/api/admin/events/$id")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'event.deleted', 'entity_id' => $id]);
    }

    public function test_times_with_an_offset_are_stored_in_utc(): void
    {
        $this->signIn();

        $this->postJson('/api/admin/events', $this->payload([
            'startsAt' => '2030-01-15T21:00:00+04:00', 'endsAt' => '2030-01-15T23:00:00+04:00',
        ]))->assertCreated()->assertJsonPath('data.startsAt', '2030-01-15T17:00:00+00:00');
    }

    public function test_invalid_fields_return_their_codes(): void
    {
        $this->signIn();
        $url = '/api/admin/events';

        $this->postJson($url, $this->payload(['titleAr' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_event_title');
        $this->postJson($url, $this->payload(['type' => 'party']))->assertJsonPath('error.code', 'invalid_event_type');
        $this->postJson($url, $this->payload(['format' => 'radio']))->assertJsonPath('error.code', 'invalid_event_format');
        $this->postJson($url, $this->payload(['endsAt' => now()->addDay()->toIso8601String()]))->assertJsonPath('error.code', 'invalid_event_dates');
        $this->postJson($url, $this->payload(['format' => 'onsite']))->assertJsonPath('error.code', 'location_required');
        $this->postJson($url, $this->payload(['visibility' => 'institutional']))->assertJsonPath('error.code', 'tenant_required_for_visibility');
        $this->postJson($url, $this->payload(['streamUrl' => 'http://insecure.example.com']))->assertJsonPath('error.code', 'invalid_stream_url');
        $this->postJson($url, $this->payload(['capacity' => 0]))->assertJsonPath('error.code', 'invalid_capacity');

        $tenant = Tenant::factory()->create();
        $this->postJson($url, $this->payload(['visibility' => 'institutional', 'tenantId' => $tenant->cuid]))
            ->assertCreated()->assertJsonPath('data.tenantId', $tenant->cuid);
    }

    public function test_broadcast_lifecycle(): void
    {
        $this->signIn();
        $event = Event::factory()->create();
        $base = "/api/admin/events/{$event->cuid}";

        $this->postJson("$base/start")->assertStatus(409)->assertJsonPath('error.code', 'invalid_event_transition');
        $this->postJson("$base/schedule")->assertOk()->assertJsonPath('data.status', 'scheduled');
        $this->postJson("$base/start")->assertOk()->assertJsonPath('data.status', 'live');
        $this->getJson('/api/admin/events?status=live')->assertJsonPath('meta.total', 1)->assertJsonPath('meta.liveCount', 1);

        // A live event is ended, not cancelled.
        $this->postJson("$base/cancel", ['reason' => 'x'])->assertStatus(409)->assertJsonPath('error.code', 'invalid_event_transition');
        $this->postJson("$base/end", ['recordingUrl' => 'not a url'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_recording_url');
        $this->postJson("$base/end", ['recordingUrl' => 'https://www.youtube.com/watch?v=rec'])->assertOk()
            ->assertJsonPath('data.status', 'ended')->assertJsonPath('data.recordingUrl', 'https://www.youtube.com/watch?v=rec');

        foreach (['scheduled', 'started', 'ended'] as $action) {
            $this->assertDatabaseHas('audit_logs', ['action' => "event.$action", 'entity_id' => $event->cuid]);
        }
    }

    public function test_cannot_broadcast_without_a_stream_and_cancel_needs_a_reason(): void
    {
        $this->signIn();
        $noStream = Event::factory()->status('scheduled')->create(['stream_url' => null]);
        $this->postJson("/api/admin/events/{$noStream->cuid}/start")->assertStatus(409)->assertJsonPath('error.code', 'stream_url_required');

        $this->postJson("/api/admin/events/{$noStream->cuid}/cancel", [])->assertStatus(422)->assertJsonPath('error.code', 'reason_required');
        $this->postJson("/api/admin/events/{$noStream->cuid}/cancel", ['reason' => 'تأجيل'])->assertOk()->assertJsonPath('data.status', 'cancelled');

        // Cancelled events are closed for editing; only drafts can be deleted.
        $this->putJson("/api/admin/events/{$noStream->cuid}", $this->payload())->assertStatus(409)->assertJsonPath('error.code', 'event_locked');
        $this->deleteJson("/api/admin/events/{$noStream->cuid}")->assertStatus(409)->assertJsonPath('error.code', 'event_locked');
    }

    public function test_registrations_respect_capacity_and_duplicates(): void
    {
        $this->signIn();
        $event = Event::factory()->create(['capacity' => 2, 'registration_required' => true]);
        $url = "/api/admin/events/{$event->cuid}/registrations";

        // Drafts are not open for registration yet.
        $this->postJson($url, ['name' => 'أ', 'email' => 'a@example.com'])->assertStatus(409)->assertJsonPath('error.code', 'registration_closed');
        $event->update(['status' => 'scheduled']);

        $first = $this->postJson($url, ['name' => 'أ', 'email' => 'A@Example.com'])->assertCreated()->json('data.id');
        $this->postJson($url, ['name' => 'أ', 'email' => 'a@example.com'])->assertStatus(409)->assertJsonPath('error.code', 'already_registered');
        $this->postJson($url, ['name' => 'ب', 'email' => 'b@example.com'])->assertCreated();
        $this->postJson($url, ['name' => 'ج', 'email' => 'c@example.com'])->assertStatus(409)->assertJsonPath('error.code', 'event_full');
        $this->postJson($url, ['name' => 'د', 'email' => 'bad'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_email');

        // Cancelling a seat frees it; reinstating needs a free seat again.
        $this->postJson("$url/$first/status", ['status' => 'cancelled'])->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->postJson($url, ['name' => 'ج', 'email' => 'c@example.com'])->assertCreated();
        $this->postJson("$url/$first/status", ['status' => 'registered'])->assertStatus(409)->assertJsonPath('error.code', 'event_full');

        $this->getJson($url)->assertOk()->assertJsonPath('meta.activeCount', 2)->assertJsonPath('meta.total', 3);

        // Capacity cannot drop below the seats already taken.
        $this->putJson("/api/admin/events/{$event->cuid}", $this->payload(['capacity' => 1]))
            ->assertStatus(409)->assertJsonPath('error.code', 'capacity_below_registrations');
        $this->assertDatabaseHas('audit_logs', ['action' => 'event_registration.cancelled', 'entity_id' => $first]);
    }
}
