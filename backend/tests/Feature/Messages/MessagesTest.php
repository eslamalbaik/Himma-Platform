<?php

namespace Tests\Feature\Messages;

use App\Models\AuditLog;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessagesTest extends TestCase
{
    use RefreshDatabase;

    private function start(User $to, string $body = 'مرحباً')
    {
        return $this->postJson('/api/admin/messages/conversations', ['userId' => $to->cuid, 'body' => $body]);
    }

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/messages/conversations')->assertStatus(401);

        $this->signIn('finance'); // no messages subject
        $this->getJson('/api/admin/messages/conversations')->assertStatus(403);

        $other = User::factory()->create();
        $this->signIn('auditor'); // read only
        $this->getJson('/api/admin/messages/conversations')->assertOk();
        $this->start($other)->assertStatus(403);
        $conversation = Conversation::create(['pair_key' => 'x:y']);
        $message = $conversation->messages()->create(['sender_id' => $other->id, 'body' => 'x']);
        $report = $message->reports()->create(['reporter_id' => $other->id, 'reason' => 'spam', 'status' => 'open']);
        $this->postJson("/api/admin/messages/reports/{$report->cuid}/decide", ['status' => 'resolved', 'note' => 'x'])->assertStatus(403);
    }

    public function test_conversation_flow_and_unread_counts(): void
    {
        $client = User::factory()->create(['role' => 'tenant_admin', 'tenant_id' => Tenant::factory()->create()->id]);
        $me = $this->signIn('support');

        $this->start($client, '   ')->assertStatus(422)->assertJsonPath('error.code', 'invalid_message_body');
        $this->postJson('/api/admin/messages/conversations', ['userId' => 'nope', 'body' => 'x'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_recipient');
        $this->start($me)->assertStatus(422)->assertJsonPath('error.code', 'invalid_recipient');

        $id = $this->start($client, 'السلام عليكم')->assertCreated()
            ->assertJsonPath('data.conversation.other.id', $client->cuid)->json('data.conversation.id');

        // Writing again reuses the same conversation.
        $this->assertSame($id, $this->start($client, 'ثانية')->json('data.conversation.id'));
        $this->assertSame(1, Conversation::count());

        // The client answers; the conversation shows one unread message until it is opened.
        $conversation = Conversation::where('cuid', $id)->first();
        $this->travel(1)->minutes();
        $conversation->messages()->create(['sender_id' => $client->id, 'body' => 'وعليكم السلام']);
        $conversation->update(['last_message_at' => now()]);

        $this->getJson('/api/admin/messages/conversations')->assertJsonPath('meta.unread', 1);
        $this->getJson("/api/admin/messages/conversations/$id")->assertOk()
            ->assertJsonCount(3, 'data.messages')
            ->assertJsonPath('data.messages.2.mine', false);
        $this->getJson('/api/admin/messages/conversations')->assertJsonPath('meta.unread', 0);

        $this->postJson("/api/admin/messages/conversations/$id/messages", ['body' => 'تمام'])
            ->assertCreated()->assertJsonPath('data.mine', true);

        $this->assertDatabaseHas('audit_logs', ['action' => 'message.sent']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'conversation.read']);
        // The audit row never holds the message text.
        foreach (AuditLog::where('action', 'message.sent')->pluck('metadata') as $metadata) {
            $this->assertSame(['message', 'length'], array_keys(json_decode($metadata, true)));
        }
    }

    public function test_only_participants_can_open_a_conversation_even_staff(): void
    {
        $a = User::factory()->role('support')->create();
        $b = User::factory()->create(['role' => 'tenant_admin']);
        $conversation = Conversation::create(['pair_key' => Conversation::pairKey($a, $b), 'last_message_at' => now()]);
        $conversation->participants()->attach([$a->id, $b->id]);
        $conversation->messages()->create(['sender_id' => $a->id, 'body' => 'خاص']);

        $this->signIn('super_admin');
        $this->getJson("/api/admin/messages/conversations/{$conversation->cuid}")->assertStatus(404);
        $this->postJson("/api/admin/messages/conversations/{$conversation->cuid}/messages", ['body' => 'x'])->assertStatus(404);
        $this->getJson('/api/admin/messages/conversations')->assertJsonCount(0, 'data');
    }

    public function test_blocking_stops_messages_both_ways(): void
    {
        $other = User::factory()->role('platform_editor')->create();
        $me = $this->signIn('sales_manager');
        $id = $this->start($other)->json('data.conversation.id');

        $this->postJson('/api/admin/messages/blocks', ['userId' => $other->cuid])->assertOk();
        $this->postJson("/api/admin/messages/conversations/$id/messages", ['body' => 'x'])
            ->assertStatus(403)->assertJsonPath('error.code', 'messaging_blocked');
        $this->getJson('/api/admin/messages/recipients')->assertJsonMissing(['id' => $other->cuid]);

        $this->deleteJson("/api/admin/messages/blocks/{$other->cuid}")->assertOk();
        $this->postJson("/api/admin/messages/conversations/$id/messages", ['body' => 'x'])->assertCreated();
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.blocked', 'entity_id' => $other->cuid]);
        $this->assertNotNull($me);
    }

    public function test_reporting_and_moderating_a_message(): void
    {
        $sender = User::factory()->role('platform_editor')->create();
        $me = $this->signIn('support');
        $conversation = Conversation::create(['pair_key' => Conversation::pairKey($me, $sender), 'last_message_at' => now()]);
        $conversation->participants()->attach([$me->id, $sender->id]);
        $mine = $conversation->messages()->create(['sender_id' => $me->id, 'body' => 'رسالتي']);
        $theirs = $conversation->messages()->create(['sender_id' => $sender->id, 'body' => 'رسالة مسيئة']);

        $this->postJson("/api/admin/messages/{$mine->cuid}/report", ['reason' => 'spam'])
            ->assertStatus(422)->assertJsonPath('error.code', 'cannot_report_own_message');
        $this->postJson("/api/admin/messages/{$theirs->cuid}/report", ['reason' => 'nope'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_report_reason');
        $this->postJson("/api/admin/messages/{$theirs->cuid}/report", ['reason' => 'offensive', 'details' => 'لغة غير لائقة'])->assertCreated();
        $this->postJson("/api/admin/messages/{$theirs->cuid}/report", ['reason' => 'offensive'])->assertStatus(409);

        $this->signIn('sales_manager');
        $report = $this->getJson('/api/admin/messages/reports')->assertOk()
            ->assertJsonPath('meta.openCount', 1)
            ->assertJsonPath('data.0.message.body', 'رسالة مسيئة')
            ->json('data.0.id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'message_report.viewed']);

        $this->postJson("/api/admin/messages/reports/$report/decide", ['status' => 'resolved'])
            ->assertStatus(422)->assertJsonPath('error.code', 'reason_required');
        $this->postJson("/api/admin/messages/reports/$report/decide", ['status' => 'resolved', 'note' => 'تم التنبيه'])
            ->assertOk()->assertJsonPath('data.status', 'resolved');
        $this->postJson("/api/admin/messages/reports/$report/decide", ['status' => 'dismissed', 'note' => 'x'])->assertStatus(409);

        // A non-participant cannot report.
        $this->postJson("/api/admin/messages/{$theirs->cuid}/report", ['reason' => 'spam'])->assertStatus(404);
        $this->assertInstanceOf(Message::class, $theirs);
    }
}
