<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// A single-row table holding platform-wide settings (general section of the admin settings area).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('platform_name_ar')->default('همّة');
            $table->string('platform_name_en')->default('Himma');
            $table->string('default_locale')->default('ar'); // ar | en
            $table->string('support_email')->nullable();
            $table->boolean('maintenance_mode')->default(false);
            $table->timestamps();
        });

        DB::table('platform_settings')->insert([
            'platform_name_ar' => 'همّة',
            'platform_name_en' => 'Himma',
            'default_locale' => 'ar',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
