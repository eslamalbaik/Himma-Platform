<?php

namespace App\Http\Requests\Client;

use App\Http\Requests\ApiRequest;

class ChangePasswordRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'currentPassword' => ['required', 'string', 'max:200', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'max:200', 'confirmed', 'different:currentPassword'],
        ];
    }

    protected function codes(): array
    {
        return [
            'currentPassword' => 'wrong_current_password',
            'password.confirmed' => 'password_mismatch',
            'password.different' => 'password_unchanged',
            'password' => 'invalid_password',
        ];
    }
}
