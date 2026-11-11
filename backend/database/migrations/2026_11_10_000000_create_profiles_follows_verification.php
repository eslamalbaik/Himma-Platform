<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Public profiles for people and organizations (handle, bio, verified badge), following, and the requests
// staff review to verify an account. An organization's public handle is its existing `slug`.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('handle', 40)->nullable()->unique()->after('cuid');
            $table->text('bio_ar')->nullable();
            $table->text('bio_en')->nullable();
            $table->timestamp('verified_at')->nullable();
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->text('bio_ar')->nullable();
            $table->text('bio_en')->nullable();
            $table->string('website')->nullable();
            $table->timestamp('verified_at')->nullable();
        });

        Schema::create('follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->string('followable_type', 10); // user | tenant
            $table->unsignedBigInteger('followable_id');
            $table->timestamp('created_at')->nullable();

            $table->unique(['follower_id', 'followable_type', 'followable_id'], 'follows_unique');
            $table->index(['followable_type', 'followable_id']);
        });

        Schema::create('verification_requests', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('subject_type', 10); // user | tenant
            $table->unsignedBigInteger('subject_id');
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->text('evidence');
            $table->string('status')->default('pending'); // pending | approved | rejected
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });

        // Existing accounts get a handle too, so every person already has a profile address.
        User::whereNull('handle')->orderBy('id')->each(function (User $user) {
            $user->forceFill(['handle' => User::uniqueHandleFrom($user->name_en ?: strstr($user->email, '@', true))])->save();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_requests');
        Schema::dropIfExists('follows');

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['bio_ar', 'bio_en', 'website', 'verified_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['handle']);
            $table->dropColumn(['handle', 'bio_ar', 'bio_en', 'verified_at']);
        });
    }
};
