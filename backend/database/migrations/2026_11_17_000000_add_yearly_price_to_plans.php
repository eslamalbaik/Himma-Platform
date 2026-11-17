<?php

use Database\Seeders\LandingSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// The pricing cards show a monthly price and, under it, the yearly price (display only: billing still charges
// `price` per `interval`). Then the owner's plans of 2026-11-17 replace the old landing plans once, prices included.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->decimal('yearly_price', 10, 2)->nullable()->after('price');
        });

        // Only where plans exist already (a fresh database, the tests' included, gets them from db:seed).
        if (DB::table('plans')->exists()) {
            (new LandingSeeder)->plans(withPrices: true);
        }
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('yearly_price');
        });
    }
};
