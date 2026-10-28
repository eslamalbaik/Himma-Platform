<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// An individual signing up on the public site (role `member`).
class RegisterFormRequest extends ApiRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['email' => strtolower(trim((string) $this->input('email', '')))]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'string', 'max:255', 'email:filter', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:200'],
            'locale' => ['nullable', Rule::in(['ar', 'en'])],
        ];
    }

    protected function codes(): array
    {
        return [
            'name' => 'invalid_name',
            'email.unique' => 'email_taken',
            'email' => 'invalid_email',
            'password' => 'invalid_password',
            'locale' => 'invalid_language',
        ];
    }

    // A person types their name once; it is their name in both languages.
    public function fields(): array
    {
        $name = trim($this->input('name'));

        return [
            'email' => $this->input('email'),
            'password' => $this->input('password'),
            'name_ar' => $name,
            'name_en' => $name,
            'locale' => $this->input('locale') ?? 'ar',
        ];
    }
}
