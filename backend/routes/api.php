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
use App\Http\Controllers\Api\BusinessStatsController;
use App\Http\Controllers\Api\Content\ArticleController;
use App\Http\Controllers\Api\Content\CommentController;
use App\Http\Controllers\Api\Content\ContentReportController;
use App\Http\Controllers\Api\Events\EventController;
use App\Http\Controllers\Api\Events\RegistrationController;
use App\Http\Controllers\Api\Magazine\IssueController;
use App\Http\Controllers\Api\Magazine\SectionController;
use App\Http\Controllers\Api\Magazine\TagController;
use App\Http\Controllers\Api\Messages\BlockController;
use App\Http\Controllers\Api\Messages\ConversationController;
use App\Http\Controllers\Api\Messages\MessageReportController;
use App\Http\Controllers\Api\MyNotificationController;
use App\Http\Controllers\Api\NotificationSettingsController;
use App\Http\Controllers\Api\PlatformSettingController;
use App\Http\Controllers\Api\ReportController;
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
    Route::get('stats/business', BusinessStatsController::class)->middleware('ability:read,dashboard');

    // Reports: `read reports` and read access to the section each one summarises.
    Route::prefix('reports')->middleware('ability:read,reports')->group(function () {
        Route::get('revenue', [ReportController::class, 'revenue'])->middleware('ability:read,billing');
        Route::get('tenants', [ReportController::class, 'tenants'])->middleware('ability:read,tenants');
        Route::get('content', [ReportController::class, 'content'])->middleware('ability:read,content');
        Route::get('events', [ReportController::class, 'events'])->middleware('ability:read,events');
    });

    Route::get('tenants', [TenantController::class, 'index'])->middleware('ability:read,tenants');
    Route::get('tenants/{tenant}', [TenantController::class, 'show'])->middleware('ability:read,tenants');
    Route::get('tenant-requests', [TenantRequestController::class, 'index'])->middleware('ability:read,tenants');
    Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('ability:read,audit');
    Route::get('users', [UserController::class, 'index'])->middleware('ability:read,users');
    Route::get('settings', [PlatformSettingController::class, 'show'])->middleware('ability:read,settings');
    Route::get('settings/notifications', [NotificationSettingsController::class, 'show'])->middleware('ability:read,settings');

    // The signed-in user's own alerts: no ability needed, a user only sees and marks their own.
    Route::get('notifications', [MyNotificationController::class, 'index']);
    Route::post('notifications/read', [MyNotificationController::class, 'markRead'])->middleware('same_origin');

    Route::middleware('same_origin')->group(function () {
        Route::put('settings/notifications', [NotificationSettingsController::class, 'update'])->middleware('ability:update,settings');
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
        Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->middleware('ability:read,billing');
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

    // Editing needs `update,content`; editorial decisions (approve, reject, publish, withdraw, restore)
    // need `manage,content` (GOV-02).
    Route::prefix('content')->group(function () {
        Route::get('articles', [ArticleController::class, 'index'])->middleware('ability:read,content');
        Route::get('articles/{article}', [ArticleController::class, 'show'])->middleware('ability:read,content');
        Route::get('reports', [ContentReportController::class, 'index'])->middleware('ability:read,content');
        Route::get('comments', [CommentController::class, 'index'])->middleware('ability:read,content');

        Route::middleware('same_origin')->group(function () {
            Route::post('articles', [ArticleController::class, 'store'])->middleware('ability:create,content');
            Route::put('articles/{article}', [ArticleController::class, 'update'])->middleware('ability:update,content');
            Route::delete('articles/{article}', [ArticleController::class, 'destroy'])->middleware('ability:delete,content');
            Route::post('articles/{article}/submit', [ArticleController::class, 'submit'])->middleware('ability:update,content');
            Route::post('articles/{article}/compliance', [ArticleController::class, 'compliance'])->middleware('ability:update,content');
            Route::post('articles/{article}/approve', [ArticleController::class, 'approve'])->middleware('ability:manage,content');
            Route::post('articles/{article}/reject', [ArticleController::class, 'reject'])->middleware('ability:manage,content');
            Route::post('articles/{article}/publish', [ArticleController::class, 'publish'])->middleware('ability:manage,content');
            Route::post('articles/{article}/withdraw', [ArticleController::class, 'withdraw'])->middleware('ability:manage,content');
            Route::post('articles/{article}/restore', [ArticleController::class, 'restore'])->middleware('ability:manage,content');

            Route::post('reports', [ContentReportController::class, 'store'])->middleware('ability:create,content');
            Route::post('reports/{report}/decide', [ContentReportController::class, 'decide'])->middleware('ability:update,content');

            Route::post('comments/{comment}/moderate', [CommentController::class, 'moderate'])->middleware('ability:update,content');
            Route::delete('comments/{comment}', [CommentController::class, 'destroy'])->middleware('ability:delete,content');
        });
    });

    // Announcing (schedule) and cancelling need `manage,events`; running the broadcast (start, end) and
    // handling registrations need `update,events`, which the broadcast moderator has.
    Route::get('events', [EventController::class, 'index'])->middleware('ability:read,events');
    Route::get('events/{event}', [EventController::class, 'show'])->middleware('ability:read,events');
    Route::get('events/{event}/registrations', [RegistrationController::class, 'index'])->middleware('ability:read,events');

    Route::middleware('same_origin')->group(function () {
        Route::post('events', [EventController::class, 'store'])->middleware('ability:create,events');
        Route::put('events/{event}', [EventController::class, 'update'])->middleware('ability:update,events');
        Route::delete('events/{event}', [EventController::class, 'destroy'])->middleware('ability:delete,events');
        Route::post('events/{event}/schedule', [EventController::class, 'schedule'])->middleware('ability:manage,events');
        Route::post('events/{event}/cancel', [EventController::class, 'cancel'])->middleware('ability:manage,events');
        Route::post('events/{event}/start', [EventController::class, 'start'])->middleware('ability:update,events');
        Route::post('events/{event}/end', [EventController::class, 'end'])->middleware('ability:update,events');

        Route::post('events/{event}/registrations', [RegistrationController::class, 'store'])->middleware('ability:update,events');
        Route::post('events/{event}/registrations/{registration}/status', [RegistrationController::class, 'updateStatus'])->middleware('ability:update,events');
    });

    // Private messages: a user only ever sees their own conversations (participant check in the
    // controller). Reported messages are the one place moderators read private text (MSG-06).
    Route::prefix('messages')->group(function () {
        Route::get('conversations', [ConversationController::class, 'index'])->middleware('ability:read,messages');
        Route::get('conversations/{conversation}', [ConversationController::class, 'show'])->middleware('ability:read,messages');
        Route::get('recipients', [ConversationController::class, 'recipients'])->middleware('ability:create,messages');
        Route::get('reports', [MessageReportController::class, 'index'])->middleware('ability:read,messages');

        Route::middleware('same_origin')->group(function () {
            Route::post('conversations', [ConversationController::class, 'store'])->middleware(['ability:create,messages', 'throttle:60,1']);
            Route::post('conversations/{conversation}/messages', [ConversationController::class, 'reply'])->middleware(['ability:create,messages', 'throttle:60,1']);
            Route::post('{message}/report', [MessageReportController::class, 'store'])->middleware('ability:create,messages');
            Route::post('reports/{report}/decide', [MessageReportController::class, 'decide'])->middleware('ability:update,messages');
            Route::post('blocks', [BlockController::class, 'store'])->middleware('ability:create,messages');
            Route::delete('blocks/{cuid}', [BlockController::class, 'destroy'])->middleware('ability:create,messages');
        });
    });

    Route::prefix('magazine')->group(function () {
        Route::get('sections', [SectionController::class, 'index'])->middleware('ability:read,magazine');
        Route::get('tags', [TagController::class, 'index'])->middleware('ability:read,magazine');
        Route::get('issues', [IssueController::class, 'index'])->middleware('ability:read,magazine');

        Route::middleware('same_origin')->group(function () {
            Route::post('sections', [SectionController::class, 'store'])->middleware('ability:create,magazine');
            Route::put('sections/{section}', [SectionController::class, 'update'])->middleware('ability:update,magazine');
            Route::delete('sections/{section}', [SectionController::class, 'destroy'])->middleware('ability:delete,magazine');

            Route::post('tags', [TagController::class, 'store'])->middleware('ability:create,magazine');
            Route::put('tags/{tag}', [TagController::class, 'update'])->middleware('ability:update,magazine');
            Route::delete('tags/{tag}', [TagController::class, 'destroy'])->middleware('ability:delete,magazine');

            Route::post('issues', [IssueController::class, 'store'])->middleware('ability:create,magazine');
            Route::put('issues/{issue}', [IssueController::class, 'update'])->middleware('ability:update,magazine');
            Route::post('issues/{issue}/publish', [IssueController::class, 'publish'])->middleware('ability:update,magazine');
            Route::delete('issues/{issue}', [IssueController::class, 'destroy'])->middleware('ability:delete,magazine');
        });
    });
});
