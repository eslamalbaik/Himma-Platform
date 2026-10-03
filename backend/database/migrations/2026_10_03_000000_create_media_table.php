<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Uploaded files (images, documents, audio). Rights and source are kept with the file
// because publishing requires them (REQUIREMENTS.md §1 PUB-03, §6).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('disk', 32);
            $table->string('path', 500);
            $table->string('original_name');
            $table->string('mime_type', 150);
            $table->unsignedBigInteger('size');
            $table->string('rights')->nullable();
            $table->string('source', 500)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
