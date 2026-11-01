<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest;

// The contact of an approved organization chooses a password with the link from the invitation email.
class SetPasswordFormRequest extends ApiRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['email' => strtolower(trim((string) $this->input('email', '')))]);
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'max:255', 'email:filter'],
            'token' => ['required', 'string', 'max:200'],
            'password' => ['required', 'string', 'min:8', 'max:200'],
        ];
    }

    protected function codes(): array
    {
        return [
            'email' => 'invalid_email',
            'token' => 'invalid_invitation',
            'password' => 'invalid_password',
        ];
    }
}
