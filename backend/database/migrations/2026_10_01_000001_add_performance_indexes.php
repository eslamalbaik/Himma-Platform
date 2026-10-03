<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Indexes for the columns the admin dashboard and tenants pages filter, group and sort by.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->index('status');
            $table->index('type');
            $table->index('created_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['type']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['created_at']);
        });
    }
};
