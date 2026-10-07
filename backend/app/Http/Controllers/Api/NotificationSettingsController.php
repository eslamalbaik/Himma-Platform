<?php

namespace App\Http\Controllers\Api;

use App\Billing\BillingNotifier;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\NotificationSettingsFormRequest;
use App\Models\Setting;
use App\Support\Audit;

// Settings → Notifications: which billing alerts go out and when renewal reminders are sent.
class NotificationSettingsController extends Controller
{
    public function show()
    {
        return $this->item(BillingNotifier::settings());
    }

    public function update(NotificationSettingsFormRequest $request)
    {
        Setting::putGroup('notifications', $request->fields());

        Audit::log($request, [
            'action' => 'settings.notifications_updated',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'notifications',
            'metadata' => $request->fields(),
        ]);

        return $this->item(BillingNotifier::settings());
    }
}
