<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Where the client's invoices and billing alerts go. Empty: the client's active users.
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('billing_email')->nullable()->after('type');
        });

        // One row per alert sent, so the daily job never sends the same alert twice.
        Schema::create('billing_notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('kind');
            $table->string('subject_key'); // e.g. "invoice:12", "subscription:4:2026-11-05:7"
            $table->json('recipients');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['kind', 'subject_key']);
        });

        // In-dashboard alerts for platform staff (Laravel database notifications).
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('billing_notices');
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('billing_email');
        });
    }
};
