<?php

namespace App\Http\Requests\Events;

use App\Http\Requests\ApiRequest;
use App\Models\Tenant;
use Illuminate\Validation\Rule;

// Staff register someone by hand (public registration comes with the public site).
class RegistrationFormRequest extends ApiRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'tenantId' => ['nullable', 'string', Rule::exists('tenants', 'cuid')],
        ];
    }

    protected function codes(): array
    {
        return ['name' => 'invalid_registrant_name', 'email' => 'invalid_email', 'tenantId' => 'invalid_tenant'];
    }

    public function fields(): array
    {
        return [
            'name' => trim($this->input('name')),
            'email' => $this->input('email'),
            'tenant_id' => $this->filled('tenantId') ? Tenant::where('cuid', $this->input('tenantId'))->value('id') : null,
        ];
    }
}
