<?php

use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
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
});
