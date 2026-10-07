<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Organisations asking to join the platform. Staff review each request and either approve it
// (which creates the matching Tenant) or reject it.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_requests', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('name_ar');
            $table->string('name_en');
            $table->string('type'); // association | school | institution | government
            $table->string('contact_name');
            $table->string('contact_email');
            $table->string('contact_phone')->nullable();
            $table->text('message')->nullable();
            $table->string('status')->default('pending'); // pending | approved | rejected
            $table->string('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_requests');
    }
};
