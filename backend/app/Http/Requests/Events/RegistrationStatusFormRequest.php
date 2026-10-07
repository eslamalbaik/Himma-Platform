<?php

namespace App\Http\Requests\Events;

use App\Http\Requests\ApiRequest;
use App\Models\EventRegistration;
use Illuminate\Validation\Rule;

class RegistrationStatusFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['status' => ['required', Rule::in(EventRegistration::STATUSES)]];
    }

    protected function codes(): array
    {
        return ['status' => 'invalid_registration_status'];
    }
}
