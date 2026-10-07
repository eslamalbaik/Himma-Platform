<?php

namespace App\Http\Requests\Billing;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// POST starts a subscription for a client; PUT changes its plan (from the next invoice) or its paid-until date.
class SubscriptionFormRequest extends ApiRequest
{
    private function creating(): bool
    {
        return $this->isMethod('post');
    }

    public function rules(): array
    {
        if ($this->creating()) {
            return [
                'tenantId' => ['required', 'string', Rule::exists('tenants', 'cuid')],
                'planId' => ['required', 'string', Rule::exists('plans', 'cuid')->where('is_active', true)],
                'startsAt' => ['nullable', 'date'],
                'trialDays' => ['nullable', 'integer', 'min:0', 'max:365'],
            ];
        }

        return [
            'planId' => ['required', 'string', Rule::exists('plans', 'cuid')->where('is_active', true)],
            'endsAt' => ['nullable', 'date'],
        ];
    }

    protected function codes(): array
    {
        return [
            'tenantId' => 'tenant_not_found',
            'planId' => 'plan_not_found',
            'startsAt' => 'invalid_date',
            'endsAt' => 'invalid_date',
            'trialDays' => 'invalid_trial_days',
        ];
    }
}
