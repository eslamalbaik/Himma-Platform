<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\Comment;
use App\Models\ContentReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_logs_and_decides_a_complaint(): void
    {
        $this->signIn('platform_editor');
        $article = Article::factory()->status('published')->create();

        $id = $this->postJson('/api/admin/content/reports', [
            'articleId' => $article->cuid, 'reporterName' => 'ولي أمر', 'reporterEmail' => 'parent@example.com',
            'reason' => 'misinformation', 'details' => 'رقم غير صحيح',
        ])->assertCreated()->assertJsonPath('data.status', 'open')->json('data.id');

        $this->getJson('/api/admin/content/reports')->assertOk()->assertJsonPath('meta.openCount', 1);

        $this->postJson("/api/admin/content/reports/$id/decide", ['status' => 'resolved', 'note' => ''])
            ->assertStatus(422)->assertJsonPath('error.code', 'reason_required');
        $this->postJson("/api/admin/content/reports/$id/decide", ['status' => 'resolved', 'note' => 'تم التصحيح'])
            ->assertOk()->assertJsonPath('data.status', 'resolved');
        $this->postJson("/api/admin/content/reports/$id/decide", ['status' => 'dismissed', 'note' => 'x'])
            ->assertStatus(409)->assertJsonPath('error.code', 'report_already_closed');

        $this->assertDatabaseHas('audit_logs', ['action' => 'content_report.resolved', 'entity_id' => $id]);
    }

    public function test_complaint_fields_return_their_codes(): void
    {
        $this->signIn();
        $article = Article::factory()->create();
        $valid = ['articleId' => $article->cuid, 'reporterName' => 'أ', 'reason' => 'other'];

        $this->postJson('/api/admin/content/reports', ['articleId' => 'nope'] + $valid)->assertStatus(422)->assertJsonPath('error.code', 'invalid_article');
        $this->postJson('/api/admin/content/reports', ['reason' => 'boring'] + $valid)->assertJsonPath('error.code', 'invalid_report_reason');
        $this->postJson('/api/admin/content/reports', ['reporterEmail' => 'not-an-email'] + $valid)->assertJsonPath('error.code', 'invalid_email');
    }

    public function test_moderates_and_deletes_comments(): void
    {
        $article = Article::factory()->status('published')->create();
        $comment = Comment::create(['article_id' => $article->id, 'author_name' => 'قارئ', 'body' => 'تعليق']);

        $this->signIn('support');
        $this->getJson('/api/admin/content/comments')->assertOk()->assertJsonPath('meta.pendingCount', 1);
        $this->postJson("/api/admin/content/comments/{$comment->cuid}/moderate", ['status' => 'approved'])->assertStatus(403);

        $this->signIn('platform_editor');
        $this->postJson("/api/admin/content/comments/{$comment->cuid}/moderate", ['status' => 'deleted'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_comment_status');
        $this->postJson("/api/admin/content/comments/{$comment->cuid}/moderate", ['status' => 'hidden'])
            ->assertOk()->assertJsonPath('data.status', 'hidden');
        $this->deleteJson("/api/admin/content/comments/{$comment->cuid}")->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'comment.hidden', 'entity_id' => $comment->cuid]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'comment.deleted', 'entity_id' => $comment->cuid]);
        $this->assertSame(0, ContentReport::count());
    }
}
