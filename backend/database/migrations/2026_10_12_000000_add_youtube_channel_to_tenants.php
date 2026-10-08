<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Each client broadcasts its own events from its own YouTube channel (owner's decision).
// For now a link set by the platform team; connecting the channel with Google sign-in comes with the client dashboard.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('youtube_channel_url')->nullable()->after('billing_email');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('youtube_channel_url');
        });
    }
};
