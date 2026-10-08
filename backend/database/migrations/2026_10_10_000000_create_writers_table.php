<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Writers registry (PUB-02): who writes for the magazine, the organisation they represent, and how their
// identity was verified. Articles point to their writer; author_name stays as the printed byline.
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
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete(); // a client organisation
            $table->string('affiliation')->nullable(); // any other organisation, free text
            $table->string('title_ar')->nullable(); // e.g. "معلمة رياضيات"
            $table->string('title_en')->nullable();
            $table->text('bio_ar')->nullable();
            $table->text('bio_en')->nullable();
            $table->string('status', 20)->default('pending'); // pending | verified | suspended
            $table->string('verification_method', 30)->nullable(); // App\Models\Writer::VERIFICATION_METHODS
            $table->text('verification_note')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('suspension_reason')->nullable();
            $table->timestamps();

            $table->index('status');
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->foreignId('writer_id')->nullable()->after('author_id')->constrained('writers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('writer_id');
        });
        Schema::dropIfExists('writers');
    }
};
