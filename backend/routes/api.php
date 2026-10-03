<?php

use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Billing\BillingSettingsController;
use App\Http\Controllers\Api\Billing\GatewayController;
use App\Http\Controllers\Api\Billing\InvoiceController;
use App\Http\Controllers\Api\Billing\PaymentController;
use App\Http\Controllers\Api\Billing\PaymentResultController;
use App\Http\Controllers\Api\Billing\PlanController;
use App\Http\Controllers\Api\Billing\SubscriptionController;
use App\Http\Controllers\Api\Billing\WebhookController;
use App\Http\Controllers\Api\PlatformSettingController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TenantRequestController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Every route that reads or changes data declares its permission with `ability:<action>,<subject>`
// (subjects and roles: config/roles.php). Every write also goes through `same_origin`.

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('same_origin');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('same_origin');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth.api');
});

// Called by payment providers and by payers returning from checkout: no session, no same_origin.
Route::prefix('billing')->group(function () {
    Route::post('webhook/{driver}', [WebhookController::class, 'handle'])->middleware('throttle:120,1');
    Route::get('payments/{cuid}/result', [PaymentResultController::class, 'show'])->middleware('throttle:30,1');
});

Route::prefix('admin')->middleware(['auth.api', 'not_maintenance'])->group(function () {
    Route::get('stats', AdminStatsController::class)->middleware('ability:read,dashboard');

    Route::get('tenants', [TenantController::class, 'index'])->middleware('ability:read,tenants');
    Route::get('tenants/{tenant}', [TenantController::class, 'show'])->middleware('ability:read,tenants');
    Route::get('tenant-requests', [TenantRequestController::class, 'index'])->middleware('ability:read,tenants');
    Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('ability:read,audit');
    Route::get('users', [UserController::class, 'index'])->middleware('ability:read,users');
    Route::get('settings', [PlatformSettingController::class, 'show'])->middleware('ability:read,settings');

    Route::middleware('same_origin')->group(function () {
        Route::post('tenants', [TenantController::class, 'store'])->middleware('ability:create,tenants');
        Route::put('tenants/{tenant}', [TenantController::class, 'update'])->middleware('ability:update,tenants');
        Route::delete('tenants/{tenant}', [TenantController::class, 'destroy'])->middleware('ability:delete,tenants');

        Route::post('tenant-requests', [TenantRequestController::class, 'store'])->middleware('ability:create,tenants');
        Route::post('tenant-requests/{tenantRequest}/approve', [TenantRequestController::class, 'approve'])->middleware('ability:update,tenants');
        Route::post('tenant-requests/{tenantRequest}/reject', [TenantRequestController::class, 'reject'])->middleware('ability:update,tenants');

        Route::post('users', [UserController::class, 'store'])->middleware('ability:create,users');
        Route::put('users/{cuid}', [UserController::class, 'update'])->middleware('ability:update,users');
        Route::delete('users/{cuid}', [UserController::class, 'destroy'])->middleware('ability:delete,users');

        Route::put('settings', [PlatformSettingController::class, 'update'])->middleware('ability:update,settings');
    });

    Route::prefix('billing')->group(function () {
        Route::get('plans', [PlanController::class, 'index'])->middleware('ability:read,billing');
        Route::get('subscriptions', [SubscriptionController::class, 'index'])->middleware('ability:read,billing');
        Route::get('subscriptions/{subscription}', [SubscriptionController::class, 'show'])->middleware('ability:read,billing');
        Route::get('invoices', [InvoiceController::class, 'index'])->middleware('ability:read,billing');
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show'])->middleware('ability:read,billing');
        Route::get('payments', [PaymentController::class, 'index'])->middleware('ability:read,billing');
        Route::get('payments/{payment}', [PaymentController::class, 'show'])->middleware('ability:read,billing');
        // Gateways and billing rules: finance and the platform owner only (manage billing).
        Route::get('gateways', [GatewayController::class, 'index'])->middleware('ability:manage,billing');
        Route::get('settings', [BillingSettingsController::class, 'show'])->middleware('ability:manage,billing');

        Route::middleware('same_origin')->group(function () {
            Route::post('plans', [PlanController::class, 'store'])->middleware('ability:create,billing');
            Route::put('plans/{plan}', [PlanController::class, 'update'])->middleware('ability:update,billing');
            Route::delete('plans/{plan}', [PlanController::class, 'destroy'])->middleware('ability:delete,billing');

            Route::post('subscriptions', [SubscriptionController::class, 'store'])->middleware('ability:create,billing');
            Route::put('subscriptions/{subscription}', [SubscriptionController::class, 'update'])->middleware('ability:update,billing');
            Route::post('subscriptions/{subscription}/cancel', [SubscriptionController::class, 'cancel'])->middleware('ability:update,billing');

            Route::post('invoices', [InvoiceController::class, 'store'])->middleware('ability:create,billing');
            Route::post('invoices/{invoice}/void', [InvoiceController::class, 'void'])->middleware('ability:update,billing');
            Route::post('invoices/{invoice}/checkout', [InvoiceController::class, 'checkout'])->middleware('ability:create,billing');

            Route::post('payments', [PaymentController::class, 'store'])->middleware('ability:update,billing');
            Route::post('payments/{payment}/sync', [PaymentController::class, 'sync'])->middleware('ability:read,billing');
            Route::post('payments/{payment}/refund', [PaymentController::class, 'refund'])->middleware('ability:manage,billing');

            Route::post('gateways', [GatewayController::class, 'store'])->middleware('ability:manage,billing');
            Route::put('gateways/{gateway}', [GatewayController::class, 'update'])->middleware('ability:manage,billing');
            Route::delete('gateways/{gateway}', [GatewayController::class, 'destroy'])->middleware('ability:manage,billing');
            Route::post('gateways/{gateway}/register-webhook', [GatewayController::class, 'registerWebhook'])->middleware('ability:manage,billing');

            Route::put('settings', [BillingSettingsController::class, 'update'])->middleware('ability:manage,billing');
        });
    });
});
