<?php

namespace App\Http\Requests\Billing;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// A payment received outside the platform (bank transfer, cash, card terminal), recorded by finance.
class PaymentFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'invoiceId' => ['required', 'string', Rule::exists('invoices', 'cuid')],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999'],
            'method' => ['required', Rule::in(['bank_transfer', 'cash', 'card'])],
            'reference' => ['nullable', 'string', 'max:255'],
            'paidAt' => ['nullable', 'date', 'before_or_equal:now'],
        ];
    }

    protected function codes(): array
    {
        return [
            'invoiceId' => 'invoice_not_found',
            'amount' => 'invalid_amount',
            'method' => 'invalid_payment_method',
            'reference' => 'invalid_reference',
            'paidAt' => 'invalid_date',
        ];
    }
}
