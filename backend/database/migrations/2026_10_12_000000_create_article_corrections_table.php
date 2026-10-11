<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Corrections to published articles (GOV-04). Each one stays on record and is shown with the article,
// so readers can see what changed and why. Rows are only ever inserted.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_corrections', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
            $table->string('kind'); // correction | clarification | update
            $table->text('note'); // shown to readers, in the article's language
            $table->unsignedInteger('version')->nullable(); // the version the corrected text was saved as
            $table->foreignId('corrected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->index(['article_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_corrections');
    }
};
