<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Magazine structure (sections grouped by axis, tags, issues) and governed articles
// (REQUIREMENTS.md §1-6, §9): classification, review workflow, compliance result, versions,
// complaints and comment moderation.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('magazine_sections', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('name_ar');
            $table->string('name_en');
            $table->string('axis'); // knowledge | people | data | identity
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['axis', 'sort_order']);
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('name_ar');
            $table->string('name_en');
            $table->timestamps();
        });

        Schema::create('issues', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->unsignedInteger('number')->unique();
            $table->string('title_ar');
            $table->string('title_en');
            $table->string('theme_ar')->nullable(); // ملف العدد
            $table->string('theme_en')->nullable();
            $table->string('status')->default('draft'); // draft | published
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('title');
            $table->text('summary')->nullable();
            $table->longText('body');
            $table->string('language', 2); // ar | en
            $table->foreignId('section_id')->nullable()->constrained('magazine_sections')->nullOnDelete();
            $table->foreignId('issue_id')->nullable()->constrained('issues')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('author_name');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('classification'); // public | members | academic | institutional | government | confidential
            $table->json('audiences')->nullable(); // teachers, researchers, school_leaders, students, parents, decision_makers
            $table->boolean('is_sponsored')->default(false);
            $table->string('source')->nullable();
            $table->text('rights_note')->nullable();
            $table->string('status')->default('draft'); // draft | in_review | approved | published | rejected | withdrawn
            $table->json('compliance_checks')->nullable();
            $table->string('compliance_result')->nullable(); // compliant | needs_review | non_compliant
            $table->timestamp('compliance_checked_at')->nullable();
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('withdrawn_at')->nullable();
            $table->text('withdrawal_reason')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('classification');
            $table->index('created_at');
        });

        Schema::create('article_tag', function (Blueprint $table) {
            $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained('tags')->cascadeOnDelete();
            $table->primary(['article_id', 'tag_id']);
        });

        // Every saved title/body is kept (PUB-06, Version Control).
        Schema::create('article_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->string('title');
            $table->longText('body');
            $table->foreignId('edited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->unique(['article_id', 'version']);
        });

        // Complaints about published content (GOV-03).
        Schema::create('content_reports', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
            $table->string('reporter_name');
            $table->string('reporter_email')->nullable();
            $table->string('reason'); // misinformation | copyright | offensive | privacy | advertising | other
            $table->text('details')->nullable();
            $table->string('status')->default('open'); // open | resolved | dismissed
            $table->text('resolution_note')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
            $table->string('author_name');
            $table->string('author_email')->nullable();
            $table->text('body');
            $table->string('status')->default('pending'); // pending | approved | hidden
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
        Schema::dropIfExists('content_reports');
        Schema::dropIfExists('article_versions');
        Schema::dropIfExists('article_tag');
        Schema::dropIfExists('articles');
        Schema::dropIfExists('issues');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('magazine_sections');
    }
};
