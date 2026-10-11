<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Every use of the AI Center (AI-P-02): who used which tool on what, what came back (unless Settings → AI
// says not to keep the text), and whether the suggestion was applied. Who reviewed, approved and published
// the article is on the article and its audit trail; the AI usage report joins them.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_usages', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tool'); // writer_assistant | smart_reviewer | compliance_detection | editor_report | issue_builder
            $table->foreignId('article_id')->nullable()->constrained('articles')->nullOnDelete();
            $table->string('subject')->nullable(); // what the tool ran on when it is not an article (e.g. the month 2026-10)
            $table->string('model');
            $table->string('status'); // completed | refused | failed
            $table->string('error_code')->nullable();
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->json('output')->nullable();
            $table->json('applied_fields')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->foreignId('applied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['created_at']);
            $table->index(['tool', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usages');
    }
};
