<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;
use App\Models\Tenant;
use Illuminate\Validation\Rule;

// A writer's profile. Status changes go through verify and suspend, not this form.
class WriterFormRequest extends ApiRequest
{
    public function rules(): array
    {
        $writer = $this->route('writer');

        return [
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('writers', 'email')->ignore($writer?->id)],
            'phone' => ['nullable', 'string', 'max:40'],
            'tenantId' => ['nullable', 'string', Rule::exists('tenants', 'cuid')],
            'affiliation' => ['nullable', 'string', 'max:255'],
            'bioAr' => ['nullable', 'string', 'max:2000'],
            'bioEn' => ['nullable', 'string', 'max:2000'],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_writer_name',
            'nameEn' => 'invalid_writer_name',
            'email.unique' => 'email_taken',
            'email' => 'invalid_email',
            'phone' => 'invalid_phone',
            'tenantId' => 'invalid_tenant',
            'affiliation' => 'invalid_affiliation',
            'bioAr' => 'invalid_bio',
            'bioEn' => 'invalid_bio',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => trim($this->input('nameAr')),
            'name_en' => trim($this->input('nameEn')),
            'email' => $this->filled('email') ? mb_strtolower(trim($this->input('email'))) : null,
            'phone' => $this->input('phone') ?: null,
            'tenant_id' => $this->filled('tenantId') ? Tenant::where('cuid', $this->input('tenantId'))->value('id') : null,
            'affiliation' => $this->input('affiliation') ?: null,
            'bio_ar' => $this->input('bioAr') ?: null,
            'bio_en' => $this->input('bioEn') ?: null,
        ];
    }
}
