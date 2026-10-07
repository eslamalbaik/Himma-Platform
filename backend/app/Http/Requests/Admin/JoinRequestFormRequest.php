<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use App\Models\Tenant;
use Illuminate\Validation\Rule;

// A request from an organisation to join the platform (TenantRequest).
class JoinRequestFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(Tenant::TYPES)],
            'contactName' => ['required', 'string', 'max:255'],
            'contactEmail' => ['required', 'string', 'max:255', 'email:filter'],
            'contactPhone' => ['nullable', 'string', 'max:50'],
            'message' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_tenant_name',
            'nameEn' => 'invalid_tenant_name',
            'type' => 'invalid_tenant_type',
            'contactName' => 'invalid_contact_name',
            'contactEmail' => 'invalid_contact_email',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => $this->input('nameAr'),
            'name_en' => $this->input('nameEn'),
            'type' => $this->input('type'),
            'contact_name' => $this->input('contactName'),
            'contact_email' => $this->input('contactEmail'),
            'contact_phone' => $this->input('contactPhone'),
            'message' => $this->input('message'),
        ];
    }
}
