<?php

use App\Billing\BillingService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// Renewal invoices, overdue subscriptions and suspensions for unpaid clients (rules: Settings → Billing).
Artisan::command('billing:run', function (BillingService $billing) {
    $summary = $billing->runDaily();
    $this->info("Invoices issued: {$summary['invoiced']}, past due: {$summary['pastDue']}, suspended: {$summary['suspended']}, reminders: {$summary['reminders']}, overdue alerts: {$summary['overdueNotices']}");
})->purpose('Run the daily billing tasks');

Schedule::command('billing:run')->dailyAt('03:00')->withoutOverlapping();
