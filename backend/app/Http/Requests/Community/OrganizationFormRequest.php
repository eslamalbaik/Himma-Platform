<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\ApiRequest;

// An organization's public profile, edited by its admin.
class OrganizationFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'min:2', 'max:255'],
            'nameEn' => ['required', 'string', 'min:2', 'max:255'],
            'bioAr' => ['nullable', 'string', 'max:1000'],
            'bioEn' => ['nullable', 'string', 'max:1000'],
            'website' => ['nullable', 'url:https,http', 'max:255'],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_name',
            'nameEn' => 'invalid_name',
            'bioAr' => 'invalid_bio',
            'bioEn' => 'invalid_bio',
            'website' => 'invalid_website',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => trim($this->input('nameAr')),
            'name_en' => trim($this->input('nameEn')),
            'bio_ar' => $this->filled('bioAr') ? trim($this->input('bioAr')) : null,
            'bio_en' => $this->filled('bioEn') ? trim($this->input('bioEn')) : null,
            'website' => $this->filled('website') ? trim($this->input('website')) : null,
        ];
    }
}
