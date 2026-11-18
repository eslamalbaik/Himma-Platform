<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The library (المكتبة, under Articles): books, research and guides with a cover and a file to read or download,
// one community each. And the kind of an article: an article or a literary story (القصص, in the magazine).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_items', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('community', 2)->default('ar');
            $table->string('type', 20)->default('book');
            $table->string('title');
            $table->string('author_name');
            $table->text('summary')->nullable();
            $table->string('publisher')->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('isbn', 20)->nullable();
            $table->string('external_url', 500)->nullable();
            $table->foreignId('section_id')->nullable()->constrained('magazine_sections')->nullOnDelete();
            $table->string('cover_path')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('views')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['community', 'status', 'published_at']);
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->string('kind', 10)->default('article')->after('language');
            $table->index(['language', 'kind', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropIndex(['language', 'kind', 'status']);
            $table->dropColumn('kind');
        });
        Schema::dropIfExists('library_items');
    }
};
