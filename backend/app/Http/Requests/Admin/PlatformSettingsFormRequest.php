<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;

class PlatformSettingsFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'platformNameAr' => ['required', 'string', 'max:255'],
            'platformNameEn' => ['required', 'string', 'max:255'],
            'defaultLocale' => ['required', 'in:ar,en'],
            'supportEmail' => ['nullable', 'string', 'max:255', 'email:filter'],
            'maintenanceMode' => ['sometimes', 'boolean'],
        ];
    }

    protected function codes(): array
    {
        return [
            'platformNameAr' => 'invalid_platform_name',
            'platformNameEn' => 'invalid_platform_name',
            'defaultLocale' => 'invalid_locale',
            'supportEmail' => 'invalid_email',
        ];
    }

    public function fields(): array
    {
        return [
            'platform_name_ar' => $this->input('platformNameAr'),
            'platform_name_en' => $this->input('platformNameEn'),
            'default_locale' => $this->input('defaultLocale'),
            'support_email' => $this->input('supportEmail'),
            'maintenance_mode' => $this->boolean('maintenanceMode'),
        ];
    }
}
