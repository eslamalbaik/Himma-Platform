<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Online payments (Ziina first) on top of the billing tables:
// gateways managed from the dashboard, payment status, webhook log, refunds, billing periods.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('driver', 32); // ziina | manual
            $table->string('name_ar');
            $table->string('name_en');
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            // Secrets are stored encrypted (APP_KEY) and never sent to the browser.
            $table->text('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->text('public_key')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->string('base_url')->nullable();
            $table->boolean('is_active')->default(false);
            $table->boolean('test_mode')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->string('currency', 3)->default('AED')->change();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('currency', 3)->default('AED')->change();
            // The subscription period this invoice pays for; paying it extends the subscription to period_end.
            $table->date('period_start')->nullable()->after('subscription_id');
            $table->date('period_end')->nullable()->after('period_start');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('gateway_id')->nullable()->after('invoice_id')->constrained('payment_gateways')->nullOnDelete();
            $table->string('status', 20)->default('succeeded')->after('method'); // pending | succeeded | failed | canceled | refunded
            $table->string('gateway_reference')->nullable()->after('reference');
            $table->string('checkout_url', 1000)->nullable()->after('gateway_reference');
            $table->timestamp('paid_at')->nullable()->change();
            $table->index('status');
            $table->index('gateway_reference');
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('status', 20)->default('pending'); // pending | completed | failed
            $table->string('gateway_reference')->nullable();
            $table->string('reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Every webhook call as received, kept for audit and to skip repeats.
        Schema::create('payment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gateway_id')->nullable()->constrained('payment_gateways')->nullOnDelete();
            $table->string('event');
            $table->string('external_id')->nullable();
            $table->string('dedupe_key')->nullable()->unique();
            $table->boolean('signature_valid')->default(false);
            $table->longText('payload');
            $table->string('ip', 45)->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::table('tenants', function (Blueprint $table) {
            // Set when billing (not a person) suspended the tenant, so a payment can lift exactly that suspension.
            $table->timestamp('billing_suspended_at')->nullable()->after('status');
        });

        // Grouped key/value settings (billing now; publishing, youtube, ... later).
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('group', 50);
            $table->string('key', 100);
            $table->text('value')->nullable();
            $table->timestamps();
            $table->unique(['group', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::table('tenants', fn (Blueprint $table) => $table->dropColumn('billing_suspended_at'));
        Schema::dropIfExists('payment_events');
        Schema::dropIfExists('refunds');
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['gateway_reference']);
            $table->dropConstrainedForeignId('gateway_id');
            $table->dropColumn(['status', 'gateway_reference', 'checkout_url']);
        });
        Schema::table('invoices', fn (Blueprint $table) => $table->dropColumn(['period_start', 'period_end']));
        Schema::dropIfExists('payment_gateways');
    }
};
