<?php

namespace Tests\Feature\Events;

use App\Models\Event;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class YoutubeSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function settings(array $override = []): array
    {
        return $override + [
            'channelUrl' => null, 'channelNameAr' => null, 'channelNameEn' => null,
            'youtubeOnly' => false, 'privacyEnhanced' => false, 'recordingRequired' => false,
        ];
    }

    private function eventPayload(array $override = []): array
    {
        return $override + [
            'titleAr' => 'ندوة', 'titleEn' => 'Webinar', 'type' => 'webinar', 'format' => 'online', 'visibility' => 'public',
            'startsAt' => now()->addDay()->toIso8601String(), 'endsAt' => now()->addDay()->addHour()->toIso8601String(),
        ];
    }

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/settings/youtube')->assertStatus(401);

        // Event staff read the settings for the live page; only settings managers change them.
        $this->signIn('broadcast_moderator');
        $this->getJson('/api/admin/settings/youtube')->assertOk()->assertJsonPath('data.youtubeOnly', false);
        $this->putJson('/api/admin/settings/youtube', $this->settings())->assertStatus(403);

        $this->signIn('finance');
        $this->getJson('/api/admin/settings/youtube')->assertStatus(403);
    }

    public function test_updates_settings(): void
    {
        $this->signIn();

        $this->putJson('/api/admin/settings/youtube', $this->settings(['channelUrl' => 'https://vimeo.com/himma']))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_youtube_channel');
        $this->putJson('/api/admin/settings/youtube', $this->settings(['channelUrl' => 'https://www.youtube.com/@himma']))
            ->assertJsonPath('error.code', 'youtube_channel_name_required');

        $this->putJson('/api/admin/settings/youtube', $this->settings([
            'channelUrl' => 'https://www.youtube.com/@himma', 'channelNameAr' => 'قناة همّة', 'channelNameEn' => 'Himma channel',
            'privacyEnhanced' => true,
        ]))->assertOk()
            ->assertJsonPath('data.channelUrl', 'https://www.youtube.com/@himma')
            ->assertJsonPath('data.privacyEnhanced', true);
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.youtube_updated']);
    }

    public function test_youtube_only_links(): void
    {
        Setting::putGroup('youtube', ['youtubeOnly' => true]);
        $this->signIn('platform_editor');

        $this->postJson('/api/admin/events', $this->eventPayload(['streamUrl' => 'https://vimeo.com/123456']))
            ->assertStatus(422)->assertJsonPath('error.code', 'youtube_link_required');
        $this->postJson('/api/admin/events', $this->eventPayload(['recordingUrl' => 'https://www.youtube.com/@himma']))
            ->assertJsonPath('error.code', 'youtube_link_required');

        foreach (['https://www.youtube.com/watch?v=abc123', 'https://youtu.be/abc123', 'https://www.youtube.com/live/abc123xyz'] as $url) {
            $this->postJson('/api/admin/events', $this->eventPayload(['streamUrl' => $url]))->assertCreated();
        }

        // Without the setting any https link is accepted.
        Setting::putGroup('youtube', ['youtubeOnly' => false]);
        $this->postJson('/api/admin/events', $this->eventPayload(['streamUrl' => 'https://vimeo.com/123456']))->assertCreated();
    }

    public function test_recording_required_when_ending(): void
    {
        Setting::putGroup('youtube', ['recordingRequired' => true]);
        $this->signIn('broadcast_moderator');

        $live = Event::factory()->status('live')->create(['stream_url' => 'https://www.youtube.com/watch?v=abc123']);
        $this->postJson("/api/admin/events/{$live->cuid}/end")->assertStatus(422)->assertJsonPath('error.code', 'recording_url_required');
        $this->postJson("/api/admin/events/{$live->cuid}/end", ['recordingUrl' => 'https://youtu.be/rec123'])
            ->assertOk()->assertJsonPath('data.status', 'ended');

        // A recording link already on the event is enough.
        $withRecording = Event::factory()->status('live')->create(['recording_url' => 'https://youtu.be/old123']);
        $this->postJson("/api/admin/events/{$withRecording->cuid}/end")->assertOk();
    }
}
