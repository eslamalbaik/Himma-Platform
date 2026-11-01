<?php

namespace App\Http\Requests\Cards;

use App\Http\Requests\ApiRequest;
use App\Models\SmartCardRequest;
use Illuminate\Validation\Rule;

class RequestStatusRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['status' => ['required', Rule::in(SmartCardRequest::STATUSES)]];
    }

    protected function codes(): array
    {
        return ['status' => 'invalid_request_status'];
    }
}
