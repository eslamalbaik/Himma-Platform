<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // How a plan looks in the public "plans and prices" section of the landing page.
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('show_on_site')->default(false);
            $table->unsignedInteger('site_order')->default(0);
            $table->string('badge_ar')->nullable();
            $table->string('badge_en')->nullable();
            $table->string('description_ar', 500)->nullable();
            $table->string('description_en', 500)->nullable();
            $table->string('theme', 20)->default('light'); // light | primary | dark
            $table->boolean('is_featured')->default(false);
            $table->string('cta_label_ar')->nullable();
            $table->string('cta_label_en')->nullable();
            $table->string('cta_url', 500)->nullable();
            $table->json('feature_groups')->nullable();
        });

        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('author_ar');
            $table->string('author_en');
            $table->string('role_ar')->nullable();
            $table->string('role_en')->nullable();
            $table->text('quote_ar');
            $table->text('quote_en');
            $table->unsignedTinyInteger('rating')->default(5);
            $table->string('color', 7)->default('#5F0118');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonials');
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['show_on_site', 'site_order', 'badge_ar', 'badge_en', 'description_ar', 'description_en',
                'theme', 'is_featured', 'cta_label_ar', 'cta_label_en', 'cta_url', 'feature_groups']);
        });
    }
};
