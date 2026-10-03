<?php

namespace App\Http\Requests\Billing;

use App\Http\Requests\ApiRequest;

class RefundFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function codes(): array
    {
        return [
            'amount' => 'invalid_amount',
            'reason' => 'invalid_reason',
        ];
    }
}
