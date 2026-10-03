<?php

use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PlatformSettingController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TenantRequestController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('same_origin');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('same_origin');
    Route::get('me', [AuthController::class, 'me']);
});

Route::prefix('admin')->group(function () {
    Route::get('stats', AdminStatsController::class);

    Route::get('tenants', [TenantController::class, 'index']);
    Route::get('tenants/{tenant}', [TenantController::class, 'show']);
    Route::post('tenants', [TenantController::class, 'store'])->middleware('same_origin');
    Route::put('tenants/{tenant}', [TenantController::class, 'update'])->middleware('same_origin');
    Route::delete('tenants/{tenant}', [TenantController::class, 'destroy'])->middleware('same_origin');

    Route::get('tenant-requests', [TenantRequestController::class, 'index']);
    Route::post('tenant-requests', [TenantRequestController::class, 'store'])->middleware('same_origin');
    Route::post('tenant-requests/{tenantRequest}/approve', [TenantRequestController::class, 'approve'])->middleware('same_origin');
    Route::post('tenant-requests/{tenantRequest}/reject', [TenantRequestController::class, 'reject'])->middleware('same_origin');

    Route::get('audit-logs', [AuditLogController::class, 'index']);

    Route::get('users', [UserController::class, 'index']);
    Route::post('users', [UserController::class, 'store'])->middleware('same_origin');
    Route::put('users/{cuid}', [UserController::class, 'update'])->middleware('same_origin');
    Route::delete('users/{cuid}', [UserController::class, 'destroy'])->middleware('same_origin');

    Route::get('settings', [PlatformSettingController::class, 'show']);
    Route::put('settings', [PlatformSettingController::class, 'update'])->middleware('same_origin');
});
