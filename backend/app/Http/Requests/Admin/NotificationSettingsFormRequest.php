<?php

namespace App\Http\Requests\Admin;

use App\Billing\BillingNotifier;
use App\Http\Requests\ApiRequest;

class NotificationSettingsFormRequest extends ApiRequest
{
    public function rules(): array
    {
        $rules = [
            'staffAlerts' => ['required', 'boolean'],
            'reminderDays' => ['present', 'array', 'max:5'],
            'reminderDays.*' => ['integer', 'min:1', 'max:90', 'distinct'],
        ];

        foreach (BillingNotifier::KINDS as $kind) {
            $rules[$kind] = ['required', 'boolean'];
        }

        return $rules;
    }

    protected function codes(): array
    {
        return [
            'reminderDays' => 'invalid_reminder_days',
            'reminderDays.*' => 'invalid_reminder_days',
        ] + array_fill_keys([...BillingNotifier::KINDS, 'staffAlerts'], 'invalid_notification_setting');
    }

    public function fields(): array
    {
        $fields = ['staffAlerts' => $this->boolean('staffAlerts')];
        foreach (BillingNotifier::KINDS as $kind) {
            $fields[$kind] = $this->boolean($kind);
        }

        $days = array_map('intval', $this->input('reminderDays', []));
        rsort($days);
        $fields['reminderDays'] = $days;

        return $fields;
    }
}
