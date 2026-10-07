<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Events (webinars, conferences, workshops...) with an optional live broadcast, and their registrations.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('title_ar');
            $table->string('title_en');
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->string('type'); // webinar | conference | workshop | course | meeting
            $table->string('format'); // online | onsite | hybrid
            $table->string('visibility')->default('public'); // public | members | institutional
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete(); // organiser; null = the platform
            $table->string('location')->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->unsignedInteger('capacity')->nullable();
            $table->boolean('registration_required')->default(false);
            $table->boolean('is_sponsored')->default(false); // academic advertising must be labelled (ADS-01)
            $table->string('stream_url', 500)->nullable();
            $table->string('recording_url', 500)->nullable();
            $table->string('status')->default('draft'); // draft | scheduled | live | ended | cancelled
            $table->timestamp('live_started_at')->nullable();
            $table->timestamp('live_ended_at')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('starts_at');
        });

        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name');
            $table->string('email');
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('status')->default('registered'); // registered | attended | cancelled
            $table->timestamps();

            $table->unique(['event_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registrations');
        Schema::dropIfExists('events');
    }
};
