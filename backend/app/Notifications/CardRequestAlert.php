<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

// In-dashboard alert for staff who handle smart cards: a reader asked for a dedication or a signed copy.
// The browser renders `notifications.cards.card_request`.
class CardRequestAlert extends Notification
{
    public function __construct(public array $vars) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['group' => 'cards', 'kind' => 'card_request', 'vars' => $this->vars];
    }
}
