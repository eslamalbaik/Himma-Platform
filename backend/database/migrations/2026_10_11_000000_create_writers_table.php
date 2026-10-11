<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The writers register (NAV-03): who writes for the platform, which organisation they represent, and
// whether their identity has been verified (PUB-02). Articles can point to their writer.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('writers', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('name_ar');
            $table->string('name_en');
            $table->string('email')->nullable()->unique();
            $table->string('phone', 40)->nullable();
            // The client they write for, or a free-text organisation when it is not a client.
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('affiliation')->nullable();
            $table->text('bio_ar')->nullable();
            $table->text('bio_en')->nullable();
            $table->string('status')->default('pending'); // pending | verified | suspended
            $table->text('verification_note')->nullable(); // how identity was checked, or why suspended
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->foreignId('writer_id')->nullable()->after('author_id')->constrained('writers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('articles', fn (Blueprint $table) => $table->dropConstrainedForeignId('writer_id'));
        Schema::dropIfExists('writers');
    }
};
