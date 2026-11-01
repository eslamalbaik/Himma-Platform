<?php

namespace Tests\Feature\Cards;

use App\Models\SmartCard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmartCardTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + [
            'slug' => 'aisha-author', 'kind' => 'author', 'status' => 'published',
            'nameAr' => 'عائشة', 'nameEn' => 'Aisha', 'headlineAr' => 'كاتبة', 'headlineEn' => 'Writer',
            'bioAr' => 'سيرة', 'bioEn' => 'Bio', 'photoUrl' => null, 'color' => '#9A5B13',
            'email' => 'Aisha@Example.com', 'phone' => '+971 50 000 0000',
            'publisherAr' => 'دار', 'publisherEn' => 'House', 'rightsAr' => null, 'rightsEn' => null,
            'acceptsRequests' => true, 'newsletterEnabled' => true,
            'links' => [['type' => 'store', 'labelAr' => 'المتجر', 'labelEn' => 'Store', 'url' => 'https://store.example']],
            'books' => [[
                'titleAr' => 'ذاكرة الرمل', 'titleEn' => 'Memory of Sand', 'isbn' => '978-9948-00-000-1', 'format' => 'both',
                'year' => 2026, 'coverUrl' => null, 'storeUrl' => 'https://store.example/book',
            ]],
            'events' => [[
                'type' => 'launch', 'titleAr' => 'إطلاق', 'titleEn' => 'Launch', 'startsAt' => '2026-11-20T18:00:00+04:00',
                'liveUrl' => 'https://youtube.com/live/x', 'bookTitle' => 'Memory of Sand',
                'programme' => [
                    ['minute' => 10, 'titleAr' => 'نقاش', 'titleEn' => 'Discussion'],
                    ['minute' => 0, 'titleAr' => 'ترحيب', 'titleEn' => 'Welcome'],
                ],
            ]],
        ];
    }

    private function card(array $override = []): SmartCard
    {
        $this->signIn();
        $id = $this->postJson('/api/admin/cards', $this->payload($override))->assertCreated()->json('data.id');
        auth()->forgetGuards();

        return SmartCard::where('cuid', $id)->firstOrFail();
    }

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/cards')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/admin/cards')->assertStatus(403);

        $this->signIn('support');
        $this->getJson('/api/admin/cards')->assertOk();
        $this->postJson('/api/admin/cards', $this->payload())->assertStatus(403);

        $this->signIn('sales_manager');
        $this->postJson('/api/admin/cards', $this->payload())->assertCreated();
    }

    public function test_creates_a_card_with_books_events_and_an_audit_row(): void
    {
        $this->signIn('platform_editor');

        $response = $this->postJson('/api/admin/cards', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.email', 'aisha@example.com')
            ->assertJsonPath('data.books.0.isbn', '978-9948-00-000-1')
            ->assertJsonPath('data.events.0.programme.0.titleEn', 'Welcome');

        $id = $response->json('data.id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'smart_card.created', 'entity_id' => $id]);

        // Ids of books and events survive an edit, so event pages and reader requests keep pointing at them.
        $card = SmartCard::where('cuid', $id)->first();
        $eventId = $card->events[0]['id'];
        $this->putJson("/api/admin/cards/{$id}", $this->payload(['events' => $card->events, 'nameEn' => 'Aisha A.']))
            ->assertOk()->assertJsonPath('data.events.0.id', $eventId)->assertJsonPath('data.nameEn', 'Aisha A.');
        $this->assertDatabaseHas('audit_logs', ['action' => 'smart_card.updated', 'entity_id' => $id]);
    }

    public function test_validation_codes(): void
    {
        $this->signIn();
        $this->postJson('/api/admin/cards', $this->payload())->assertCreated();

        $this->postJson('/api/admin/cards', $this->payload())->assertStatus(422)->assertJsonPath('error.code', 'card_slug_taken');
        $this->postJson('/api/admin/cards', $this->payload(['slug' => 'Bad Slug']))->assertJsonPath('error.code', 'invalid_card_slug');
        $this->postJson('/api/admin/cards', $this->payload(['slug' => 'b', 'kind' => 'shop']))->assertJsonPath('error.code', 'invalid_card_kind');
        $this->postJson('/api/admin/cards', $this->payload(['slug' => 'b', 'photoUrl' => 'javascript:alert(1)']))->assertJsonPath('error.code', 'invalid_url');
        $this->postJson('/api/admin/cards', $this->payload(['slug' => 'b', 'links' => [['type' => 'x', 'url' => 'javascript:x']]]))
            ->assertJsonPath('error.code', 'invalid_card_links');
        $book = $this->payload()['books'][0];
        $this->postJson('/api/admin/cards', $this->payload(['slug' => 'b', 'books' => [['isbn' => '12345'] + $book]]))
            ->assertJsonPath('error.code', 'invalid_isbn');
        $event = $this->payload()['events'][0];
        $this->postJson('/api/admin/cards', $this->payload(['slug' => 'b', 'events' => [['programme' => [['minute' => -1, 'titleAr' => 'a', 'titleEn' => 'b']]] + $event]]))
            ->assertJsonPath('error.code', 'invalid_programme');
    }

    public function test_public_page_shows_only_published_cards_and_counts_opens(): void
    {
        $card = $this->card();

        $this->getJson('/api/public/cards/aisha-author?src=nfc')->assertOk()->assertJsonPath('data.nameEn', 'Aisha')
            ->assertJsonMissingPath('data.opens');
        $this->getJson('/api/public/cards/aisha-author?src=qr')->assertOk();
        $this->getJson('/api/public/cards/aisha-author')->assertOk();

        $this->assertSame([1, 1, 0], [$card->fresh()->nfc_opens, $card->fresh()->qr_opens, $card->fresh()->link_opens]);

        $card->update(['status' => 'draft']);
        $this->getJson('/api/public/cards/aisha-author')->assertStatus(404)->assertJsonPath('error.code', 'not_found');
    }

    public function test_reader_asks_for_a_signed_copy_and_staff_are_alerted(): void
    {
        $card = $this->card();
        $editor = User::factory()->role('platform_editor')->create();
        $url = '/api/public/cards/aisha-author/requests';

        $this->postJson($url, ['kind' => 'signed_copy', 'name' => 'Omar', 'email' => 'o@example.com'])
            ->assertStatus(422)->assertJsonPath('error.code', 'address_required');

        $id = $this->postJson($url, ['kind' => 'signed_copy', 'name' => 'Omar', 'email' => 'o@example.com', 'address' => 'Dubai', 'bookTitle' => 'Memory of Sand'])
            ->assertCreated()->json('data.id');

        $this->assertDatabaseHas('audit_logs', ['action' => 'smart_card_request.created', 'entity_id' => $id]);
        $this->assertSame('card_request', $editor->fresh()->notifications()->first()->data['kind']);

        $this->signIn();
        $this->getJson("/api/admin/cards/{$card->cuid}/requests")->assertOk()->assertJsonPath('data.0.address', 'Dubai');
        $this->postJson("/api/admin/cards/{$card->cuid}/requests/{$id}/status", ['status' => 'done'])
            ->assertOk()->assertJsonPath('data.status', 'done');
        $this->assertDatabaseHas('audit_logs', ['action' => 'smart_card_request.status_changed', 'entity_id' => $id]);
        $this->postJson("/api/admin/cards/{$card->cuid}/requests/{$id}/status", ['status' => 'lost'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_request_status');
    }

    public function test_requests_and_newsletter_can_be_switched_off(): void
    {
        $card = $this->card(['acceptsRequests' => false, 'newsletterEnabled' => false]);

        $this->postJson('/api/public/cards/aisha-author/requests', ['kind' => 'dedication', 'name' => 'Omar', 'email' => 'o@example.com'])
            ->assertStatus(422)->assertJsonPath('error.code', 'requests_closed');
        $this->postJson('/api/public/cards/aisha-author/subscribe', ['email' => 'o@example.com'])
            ->assertStatus(422)->assertJsonPath('error.code', 'newsletter_closed');

        $card->update(['newsletter_enabled' => true]);
        $this->postJson('/api/public/cards/aisha-author/subscribe', ['email' => 'O@example.com', 'language' => 'en'])->assertOk();
        $this->postJson('/api/public/cards/aisha-author/subscribe', ['email' => 'o@example.com'])->assertOk();
        $this->postJson('/api/public/cards/aisha-author/subscribe', ['email' => 'nope'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_email');

        $this->assertSame(1, $card->subscribers()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'smart_card.subscribed', 'entity_id' => $card->cuid]);

        $this->signIn('auditor');
        $this->getJson("/api/admin/cards/{$card->cuid}/subscribers")->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_deletes_a_card(): void
    {
        $card = $this->card();

        $this->signIn('support');
        $this->deleteJson("/api/admin/cards/{$card->cuid}")->assertStatus(403);

        $this->signIn();
        $this->deleteJson("/api/admin/cards/{$card->cuid}")->assertOk()->assertJsonPath('ok', true);
        $this->assertDatabaseMissing('smart_cards', ['id' => $card->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'smart_card.deleted', 'entity_id' => $card->cuid]);
    }
}
