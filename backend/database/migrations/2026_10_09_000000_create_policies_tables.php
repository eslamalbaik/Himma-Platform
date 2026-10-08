<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Media policies and standards (REQUIREMENTS.md §7): one row per policy, every saved text kept in policy_versions.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('policies', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 40)->unique(); // App\Models\Policy::KINDS
            $table->longText('body_ar')->nullable();
            $table->longText('body_en')->nullable();
            $table->boolean('is_published')->default(false);
            $table->unsignedInteger('version')->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable(); // last time a version went public
            $table->timestamps();
        });

        // Append-only: rows are never updated or deleted.
        Schema::create('policy_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('policy_id')->constrained('policies')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->longText('body_ar')->nullable();
            $table->longText('body_en')->nullable();
            $table->boolean('is_published');
            $table->foreignId('edited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->unique(['policy_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('policy_versions');
        Schema::dropIfExists('policies');
    }
};
