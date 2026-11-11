<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A cover picture for articles and for magazine issues: a path on the public disk (`/storage/...`).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->string('cover_path')->nullable()->after('summary');
        });
        Schema::table('issues', function (Blueprint $table) {
            $table->string('cover_path')->nullable()->after('theme_en');
        });
    }

    public function down(): void
    {
        Schema::table('articles', fn (Blueprint $table) => $table->dropColumn('cover_path'));
        Schema::table('issues', fn (Blueprint $table) => $table->dropColumn('cover_path'));
    }
};
