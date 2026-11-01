<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

// In-dashboard alert for staff who review join requests. The browser renders `notifications.tenants.join_request`.
class JoinRequestAlert extends Notification
{
    public function __construct(public array $vars) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['group' => 'tenants', 'kind' => 'join_request', 'vars' => $this->vars];
    }
}
