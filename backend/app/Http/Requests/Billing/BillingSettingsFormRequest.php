<?php

namespace App\Http\Requests\Billing;

use App\Http\Requests\ApiRequest;

class BillingSettingsFormRequest extends ApiRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('currency'))) {
            $this->merge(['currency' => strtoupper($this->input('currency'))]);
        }
    }

    public function rules(): array
    {
        return [
            'currency' => ['required', 'string', 'regex:/^[A-Z]{3}$/'],
            'invoiceDueDays' => ['required', 'integer', 'min:0', 'max:365'],
            'renewDaysBefore' => ['required', 'integer', 'min:0', 'max:90'],
            'graceDays' => ['required', 'integer', 'min:0', 'max:365'],
        ];
    }

    protected function codes(): array
    {
        return [
            'currency' => 'invalid_currency',
            'invoiceDueDays' => 'invalid_billing_setting',
            'renewDaysBefore' => 'invalid_billing_setting',
            'graceDays' => 'invalid_billing_setting',
        ];
    }

    public function fields(): array
    {
        return [
            'currency' => $this->input('currency'),
            'invoiceDueDays' => (int) $this->input('invoiceDueDays'),
            'renewDaysBefore' => (int) $this->input('renewDaysBefore'),
            'graceDays' => (int) $this->input('graceDays'),
        ];
    }
}
