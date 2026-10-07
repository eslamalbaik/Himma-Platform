<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Append-only audit trail (REQUIREMENTS.md §6). Application code only ever inserts rows.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_email')->nullable();
            $table->string('action'); // e.g. auth.login, auth.login_failed, auth.logout
            $table->string('entity_type')->nullable();
            $table->string('entity_id')->nullable();
            $table->text('metadata')->nullable(); // JSON
            $table->string('ip')->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->index('created_at');
            $table->index('actor_id');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
