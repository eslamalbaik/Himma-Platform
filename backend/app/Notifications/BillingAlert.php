<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

// In-dashboard alert for platform staff. The browser renders `notifications.billing.<kind>` with `vars`.
class BillingAlert extends Notification
{
    public function __construct(public string $kind, public array $vars) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['group' => 'billing', 'kind' => $this->kind, 'vars' => $this->vars];
    }
}
