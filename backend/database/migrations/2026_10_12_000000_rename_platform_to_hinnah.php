<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// The platform was renamed from همّة / Himma to هنّة / Hinnah. Databases created before the rename
// still hold the old default names; a name the owner already changed in Settings is left alone.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->string('platform_name_ar')->default('هنّة')->change();
            $table->string('platform_name_en')->default('Hinnah')->change();
        });

        DB::table('platform_settings')->where('platform_name_ar', 'همّة')->update(['platform_name_ar' => 'هنّة']);
        DB::table('platform_settings')->where('platform_name_en', 'Himma')->update(['platform_name_en' => 'Hinnah']);
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->string('platform_name_ar')->default('همّة')->change();
            $table->string('platform_name_en')->default('Himma')->change();
        });
    }
};
