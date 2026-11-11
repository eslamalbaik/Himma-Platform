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
use App\Http\Controllers\Api\Cards\CardRequestController;
use App\Http\Controllers\Api\Cards\PublicCardController;
use App\Http\Controllers\Api\Cards\SmartCardController;
use App\Http\Controllers\Api\Community\BroadcastController;
use App\Http\Controllers\Api\Community\FollowController;
use App\Http\Controllers\Api\Community\MemberController;
use App\Http\Controllers\Api\Community\OrganizationController;
use App\Http\Controllers\Api\Community\ProfileController;
use App\Http\Controllers\Api\Community\VerificationController;
use App\Http\Controllers\Api\Content\ArticleController;
use App\Http\Controllers\Api\Content\CommentController;
use App\Http\Controllers\Api\Content\ContentReportController;
use App\Http\Controllers\Api\Events\EventController;
use App\Http\Controllers\Api\Events\RegistrationController;
use App\Http\Controllers\Api\Landing\LandingController;
use App\Http\Controllers\Api\Landing\TestimonialController;
use App\Http\Controllers\Api\Magazine\IssueController;
use App\Http\Controllers\Api\Magazine\SectionController;
use App\Http\Controllers\Api\Magazine\TagController;
use App\Http\Controllers\Api\Messages\BlockController;
use App\Http\Controllers\Api\Messages\ConversationController;
use App\Http\Controllers\Api\Messages\MessageReportController;
use App\Http\Controllers\Api\MyNotificationController;
use App\Http\Controllers\Api\NotificationSettingsController;
use App\Http\Controllers\Api\PlatformSettingController;
use App\Http\Controllers\Api\Site\ReadController;
use App\Http\Controllers\Api\Site\StoryController;
use App\Http\Controllers\Api\Site\StoryImageController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TenantRequestController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Every route that reads or changes data declares its permission with `ability:<action>,<subject>`
// (subjects and roles: config/roles.php). Every write also goes through `same_origin`.

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('same_origin');
    Route::post('register', [AuthController::class, 'register'])->middleware(['same_origin', 'throttle:10,60']);
    Route::post('set-password', [AuthController::class, 'setPassword'])->middleware(['same_origin', 'throttle:10,60']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('same_origin');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth.api');
});

// Called by payment providers and by payers returning from checkout: no session, no same_origin.
// The public site: anyone can read published public articles and an organization can ask to join.
Route::prefix('public')->middleware('not_maintenance')->group(function () {
    Route::get('articles', [ReadController::class, 'articles'])->middleware('throttle:120,1');
    Route::get('articles/{cuid}', [ReadController::class, 'article'])->middleware('throttle:120,1');
    Route::get('sections', [ReadController::class, 'sections'])->middleware('throttle:120,1');

    // Profiles of people (`/u/{handle}`) and organizations (`/org/{slug}`).
    Route::get('people/{handle}', [ProfileController::class, 'person'])->middleware('throttle:120,1');
    Route::get('organizations/{slug}', [ProfileController::class, 'organization'])->middleware('throttle:120,1');
    Route::get('landing', [LandingController::class, 'publicShow'])->middleware('throttle:120,1');
    Route::post('join-requests', [TenantRequestController::class, 'store'])->middleware(['same_origin', 'throttle:5,60']);

    // A smart card's page (opened by its NFC tag or QR code), and what a reader can ask from it.
    Route::get('cards/{slug}', [PublicCardController::class, 'show'])->middleware('throttle:120,1');
    Route::post('cards/{slug}/requests', [PublicCardController::class, 'storeRequest'])->middleware(['same_origin', 'throttle:5,60']);
    Route::post('cards/{slug}/subscribe', [PublicCardController::class, 'subscribe'])->middleware(['same_origin', 'throttle:10,60']);
});

// A signed-in member's own stories (members write; editors review and publish in the dashboard).
Route::prefix('me/stories')->middleware(['auth.api', 'not_maintenance'])->group(function () {
    Route::get('/', [StoryController::class, 'index'])->middleware('ability:read,stories');
    Route::get('{cuid}', [StoryController::class, 'show'])->middleware('ability:read,stories');

    Route::middleware('same_origin')->group(function () {
        Route::post('/', [StoryController::class, 'store'])->middleware(['ability:create,stories', 'throttle:30,1']);
        Route::put('{cuid}', [StoryController::class, 'update'])->middleware('ability:update,stories');
        Route::post('{cuid}/submit', [StoryController::class, 'submit'])->middleware('ability:update,stories');
        Route::delete('{cuid}', [StoryController::class, 'destroy'])->middleware('ability:delete,stories');
    });
});

// A signed-in member's own profile, who they follow, and their badge requests. An organization admin also
// manages the organization's profile, people and broadcasts (`manage,team` / `manage,broadcasts`).
Route::prefix('me')->middleware(['auth.api', 'not_maintenance'])->group(function () {
    Route::get('profile', [ProfileController::class, 'show'])->middleware('ability:read,profile');
    Route::get('following', [FollowController::class, 'index'])->middleware('ability:read,profile');
    Route::get('verification', [VerificationController::class, 'mine'])->middleware('ability:read,profile');

    Route::get('organization', [OrganizationController::class, 'show'])->middleware('ability:manage,team');
    Route::get('organization/members', [MemberController::class, 'index'])->middleware('ability:manage,team');
    Route::get('organization/broadcasts', [BroadcastController::class, 'index'])->middleware('ability:manage,broadcasts');

    Route::middleware('same_origin')->group(function () {
        Route::put('profile', [ProfileController::class, 'update'])->middleware('ability:update,profile');
        Route::post('follows', [FollowController::class, 'store'])->middleware(['ability:create,profile', 'throttle:60,1']);
        Route::delete('follows/{type}/{key}', [FollowController::class, 'destroy'])->middleware('ability:create,profile');
        Route::post('verification', [VerificationController::class, 'store'])->middleware(['ability:create,profile', 'throttle:10,60']);

        Route::put('organization', [OrganizationController::class, 'update'])->middleware('ability:manage,team');
        Route::post('organization/members', [MemberController::class, 'store'])->middleware(['ability:manage,team', 'throttle:30,60']);
        Route::put('organization/members/{cuid}', [MemberController::class, 'update'])->middleware('ability:manage,team');
        Route::post('organization/members/{cuid}/resend-invitation', [MemberController::class, 'resendInvitation'])->middleware(['ability:manage,team', 'throttle:10,60']);

        Route::post('organization/broadcasts', [BroadcastController::class, 'store'])->middleware('ability:manage,broadcasts');
        Route::put('organization/broadcasts/{cuid}', [BroadcastController::class, 'update'])->middleware('ability:manage,broadcasts');
        Route::delete('organization/broadcasts/{cuid}', [BroadcastController::class, 'destroy'])->middleware('ability:manage,broadcasts');
        Route::post('organization/broadcasts/{cuid}/schedule', [BroadcastController::class, 'schedule'])->middleware('ability:manage,broadcasts');
        Route::post('organization/broadcasts/{cuid}/start', [BroadcastController::class, 'start'])->middleware('ability:manage,broadcasts');
        Route::post('organization/broadcasts/{cuid}/end', [BroadcastController::class, 'end'])->middleware('ability:manage,broadcasts');
        Route::post('organization/broadcasts/{cuid}/cancel', [BroadcastController::class, 'cancel'])->middleware('ability:manage,broadcasts');
    });
});

// Pictures inside a story. Whoever may write stories may add pictures to them.
Route::post('me/media', [StoryImageController::class, 'store'])
    ->middleware(['auth.api', 'not_maintenance', 'same_origin:multipart', 'ability:create,stories', 'throttle:30,1']);

Route::prefix('billing')->group(function () {
    Route::post('webhook/{driver}', [WebhookController::class, 'handle'])->middleware('throttle:120,1');
    Route::get('payments/{cuid}/result', [PaymentResultController::class, 'show'])->middleware('throttle:30,1');
});

Route::prefix('admin')->middleware(['auth.api', 'not_maintenance'])->group(function () {
    Route::get('stats', AdminStatsController::class)->middleware('ability:read,dashboard');
    Route::get('stats/business', BusinessStatsController::class)->middleware('ability:read,dashboard');

    Route::get('tenants', [TenantController::class, 'index'])->middleware('ability:read,tenants');
    Route::get('tenants/{tenant}', [TenantController::class, 'show'])->middleware('ability:read,tenants');
    Route::get('tenant-requests', [TenantRequestController::class, 'index'])->middleware('ability:read,tenants');
    Route::get('verifications', [VerificationController::class, 'index'])->middleware('ability:read,verification');
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
        Route::post('tenant-requests/{tenantRequest}/resend-invitation', [TenantRequestController::class, 'resendInvitation'])->middleware('ability:update,tenants');

        Route::post('users', [UserController::class, 'store'])->middleware('ability:create,users');
        Route::put('users/{cuid}', [UserController::class, 'update'])->middleware('ability:update,users');
        Route::delete('users/{cuid}', [UserController::class, 'destroy'])->middleware('ability:delete,users');

        Route::put('settings', [PlatformSettingController::class, 'update'])->middleware('ability:update,settings');

        Route::post('verifications/{verification}/approve', [VerificationController::class, 'approve'])->middleware('ability:update,verification');
        Route::post('verifications/{verification}/reject', [VerificationController::class, 'reject'])->middleware('ability:update,verification');
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

    // The landing page: texts and switch of each section, how plans are displayed, student testimonials.
    Route::prefix('landing')->group(function () {
        Route::get('sections', [LandingController::class, 'sections'])->middleware('ability:read,landing');
        Route::get('plans', [LandingController::class, 'plans'])->middleware('ability:read,landing');
        Route::get('testimonials', [TestimonialController::class, 'index'])->middleware('ability:read,landing');

        Route::middleware('same_origin')->group(function () {
            Route::put('sections/{section}', [LandingController::class, 'updateSection'])->middleware('ability:update,landing');
            Route::put('plans/order', [LandingController::class, 'orderPlans'])->middleware('ability:update,landing');
            Route::put('plans/{plan}', [LandingController::class, 'updatePlan'])->middleware('ability:update,landing');

            Route::put('testimonials/order', [TestimonialController::class, 'order'])->middleware('ability:update,landing');
            Route::post('testimonials', [TestimonialController::class, 'store'])->middleware('ability:create,landing');
            Route::put('testimonials/{testimonial}', [TestimonialController::class, 'update'])->middleware('ability:update,landing');
            Route::delete('testimonials/{testimonial}', [TestimonialController::class, 'destroy'])->middleware('ability:delete,landing');
        });
    });

    // Smart cards (NFC + QR) and their public pages. Readers' requests are handled with `update,cards`.
    Route::prefix('cards')->group(function () {
        Route::get('/', [SmartCardController::class, 'index'])->middleware('ability:read,cards');
        Route::get('{card}', [SmartCardController::class, 'show'])->middleware('ability:read,cards');
        Route::get('{card}/requests', [CardRequestController::class, 'index'])->middleware('ability:read,cards');
        Route::get('{card}/subscribers', [CardRequestController::class, 'subscribers'])->middleware('ability:read,cards');

        Route::middleware('same_origin')->group(function () {
            Route::post('/', [SmartCardController::class, 'store'])->middleware('ability:create,cards');
            Route::put('{card}', [SmartCardController::class, 'update'])->middleware('ability:update,cards');
            Route::delete('{card}', [SmartCardController::class, 'destroy'])->middleware('ability:delete,cards');
            Route::post('{card}/requests/{cuid}/status', [CardRequestController::class, 'updateStatus'])->middleware('ability:update,cards');
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
