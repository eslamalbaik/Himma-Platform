<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A profile picture for people and a logo for organizations: a path on the public disk (`/storage/...`).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path')->nullable()->after('bio_en');
        });
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('logo_path')->nullable()->after('bio_en');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('avatar_path'));
        Schema::table('tenants', fn (Blueprint $table) => $table->dropColumn('logo_path'));
    }
};
