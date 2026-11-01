<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A Hinnah smart card (NFC tag + printed QR code) and the public page both open: /c/{slug}.
        // Books, events (with their programme) and links are edited together with the card, so they are JSON.
        Schema::create('smart_cards', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('slug', 60)->unique();
            $table->string('kind', 20); // education | government | business | author
            $table->string('status', 20)->default('draft'); // draft | published
            $table->string('name_ar');
            $table->string('name_en');
            $table->string('headline_ar')->nullable();
            $table->string('headline_en')->nullable();
            $table->text('bio_ar')->nullable();
            $table->text('bio_en')->nullable();
            $table->string('photo_url', 500)->nullable();
            $table->string('color', 7)->default('#9A5B13');
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('publisher_ar')->nullable();
            $table->string('publisher_en')->nullable();
            $table->string('rights_ar', 500)->nullable();
            $table->string('rights_en', 500)->nullable();
            $table->json('links')->nullable();
            $table->json('books')->nullable();
            $table->json('events')->nullable();
            $table->boolean('accepts_requests')->default(false);
            $table->boolean('newsletter_enabled')->default(false);
            $table->unsignedInteger('nfc_opens')->default(0);
            $table->unsignedInteger('qr_opens')->default(0);
            $table->unsignedInteger('link_opens')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'kind']);
        });

        // A reader asking the author for a digital dedication or a signed printed copy.
        Schema::create('smart_card_requests', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->foreignId('smart_card_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20); // dedication | signed_copy
            $table->string('book_title')->nullable();
            $table->string('event_id', 40)->nullable();
            $table->string('name');
            $table->string('email');
            $table->string('phone', 40)->nullable();
            $table->string('dedicate_to')->nullable();
            $table->string('message', 1000)->nullable();
            $table->string('address', 500)->nullable();
            $table->string('status', 20)->default('new'); // new | done | cancelled
            $table->timestamps();

            $table->index(['smart_card_id', 'status']);
        });

        // Readers who asked for news and upcoming events of one card.
        Schema::create('smart_card_subscribers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('smart_card_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('language', 2)->default('ar');
            $table->timestamps();

            $table->unique(['smart_card_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('smart_card_subscribers');
        Schema::dropIfExists('smart_card_requests');
        Schema::dropIfExists('smart_cards');
    }
};
