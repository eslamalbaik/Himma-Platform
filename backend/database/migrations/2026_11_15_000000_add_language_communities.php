<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Hinnah is split into two language communities, `ar` and `en` (like Quora's language sites):
// a member, an organization and what they publish belong to one of them. Articles already
// carry `language`, which is their community. Staff accounts have `community` null (both
// communities) unless they are limited to one. Everything that exists today is Arabic.
return new class extends Migration
{
    private const TABLES = ['tenants', 'tenant_requests', 'events', 'issues', 'smart_cards'];

    public function up(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->string('community', 2)->default('ar')->index()->after('cuid');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('community', 2)->nullable()->index()->after('cuid');
        });
        DB::table('users')
            ->whereIn('role', array_keys(config('roles.member_roles')))
            ->update(['community' => 'ar']);

        // Issue numbers count separately in each community.
        Schema::table('issues', function (Blueprint $table) {
            $table->dropUnique(['number']);
            $table->unique(['community', 'number']);
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropUnique(['community', 'number']);
            $table->unique('number');
        });

        foreach ([...self::TABLES, 'users'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropIndex(['community']);
                $table->dropColumn('community');
            });
        }
    }
};
