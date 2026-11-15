<?php

namespace Tests\Feature\Site;

use App\Models\Event;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// The live broadcasts strip on the home page (`GET /api/public/broadcasts`).
class HomeBroadcastsTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_live_upcoming_and_recorded_public_broadcasts_of_the_community(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'active']);
        Event::factory()->status('live')->create(['tenant_id' => $tenant->id, 'title_en' => 'On air']);
        Event::factory()->status('scheduled')->create(['title_en' => 'Next week']);
        Event::factory()->status('ended')->create(['title_en' => 'Recorded', 'recording_url' => 'https://youtube.com/watch?v=rec']);
        Event::factory()->status('ended')->create(['title_en' => 'No recording', 'recording_url' => null]);
        Event::factory()->status('scheduled')->create(['title_en' => 'Members', 'visibility' => 'institutional']);
        Event::factory()->status('scheduled')->create(['title_en' => 'Hall only', 'format' => 'onsite']);
        Event::factory()->status('draft')->create(['title_en' => 'Draft']);
        Event::factory()->status('live')->create(['title_en' => 'English', 'community' => 'en']);

        $this->getJson('/api/public/broadcasts')->assertOk()
            ->assertJsonCount(1, 'data.live')
            ->assertJsonPath('data.live.0.titleEn', 'On air')
            ->assertJsonPath('data.live.0.streamUrl', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
            ->assertJsonPath('data.live.0.organization.slug', $tenant->slug)
            ->assertJsonCount(1, 'data.upcoming')
            ->assertJsonPath('data.upcoming.0.titleEn', 'Next week')
            ->assertJsonPath('data.upcoming.0.streamUrl', null)
            ->assertJsonPath('data.upcoming.0.organization', null)
            ->assertJsonCount(1, 'data.recordings')
            ->assertJsonPath('data.recordings.0.titleEn', 'Recorded');

        $this->getJson('/api/public/broadcasts', ['X-Community' => 'en'])->assertOk()
            ->assertJsonCount(1, 'data.live')
            ->assertJsonPath('data.live.0.titleEn', 'English')
            ->assertJsonCount(0, 'data.upcoming');
    }

    public function test_hides_broadcasts_of_a_suspended_organization(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'suspended']);
        Event::factory()->status('live')->create(['tenant_id' => $tenant->id]);

        $this->getJson('/api/public/broadcasts')->assertOk()->assertJsonCount(0, 'data.live');
    }
}
