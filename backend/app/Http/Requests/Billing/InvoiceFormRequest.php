<?php

namespace App\Http\Requests\Billing;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// An invoice issued by hand (anything outside a subscription: setup fee, extra service, ...).
class InvoiceFormRequest extends ApiRequest
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
            'tenantId' => ['required', 'string', Rule::exists('tenants', 'cuid')],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999'],
            'currency' => ['nullable', 'string', 'regex:/^[A-Z]{3}$/'],
            'dueAt' => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }

    protected function codes(): array
    {
        return [
            'tenantId' => 'tenant_not_found',
            'amount' => 'invalid_amount',
            'currency' => 'invalid_currency',
            'dueAt' => 'invalid_date',
        ];
    }
}
