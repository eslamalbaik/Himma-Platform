<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use App\Models\Tenant;
use Illuminate\Validation\Rule;

class TenantFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(Tenant::TYPES)],
            'status' => ['required', Rule::in(Tenant::STATUSES)],
            'billingEmail' => ['nullable', 'email', 'max:255'],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_tenant_name',
            'nameEn' => 'invalid_tenant_name',
            'type' => 'invalid_tenant_type',
            'status' => 'invalid_tenant_status',
            'billingEmail' => 'invalid_billing_email',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => $this->input('nameAr'),
            'name_en' => $this->input('nameEn'),
            'type' => $this->input('type'),
            'status' => $this->input('status'),
            'billing_email' => $this->input('billingEmail') ?: null,
        ];
    }
}
