<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('slug')->unique();
            $table->string('name_ar');
            $table->string('name_en');
            $table->string('type'); // association | school | institution | government
            $table->string('status')->default('active'); // trial | active | suspended | cancelled
            $table->timestamps();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('name_ar');
            $table->string('name_en');
            $table->string('role'); // see config/roles.php
            $table->string('status')->default('active'); // active | disabled
            $table->string('locale')->default('ar'); // ar | en
            // Bumped on logout-everywhere / password change / disable, invalidating issued sessions.
            $table->unsignedInteger('token_version')->default(0);
            $table->timestamp('last_login_at')->nullable();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
        Schema::dropIfExists('tenants');
    }
};
