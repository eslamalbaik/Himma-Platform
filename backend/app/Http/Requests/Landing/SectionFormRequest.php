<?php

namespace App\Http\Requests\Landing;

use App\Http\Requests\ApiRequest;

class SectionFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'chipAr' => ['required', 'string', 'max:100'],
            'chipEn' => ['required', 'string', 'max:100'],
            'titleAr' => ['required', 'string', 'max:200'],
            'titleEn' => ['required', 'string', 'max:200'],
            'subtitleAr' => ['nullable', 'string', 'max:300'],
            'subtitleEn' => ['nullable', 'string', 'max:300'],
        ];
    }

    protected function codes(): array
    {
        return [
            'chipAr' => 'invalid_section_text', 'chipEn' => 'invalid_section_text',
            'titleAr' => 'invalid_section_text', 'titleEn' => 'invalid_section_text',
            'subtitleAr' => 'invalid_section_text', 'subtitleEn' => 'invalid_section_text',
        ];
    }

    public function fields(): array
    {
        return [
            'enabled' => $this->boolean('enabled'),
            'chipAr' => $this->input('chipAr'), 'chipEn' => $this->input('chipEn'),
            'titleAr' => $this->input('titleAr'), 'titleEn' => $this->input('titleEn'),
            'subtitleAr' => $this->input('subtitleAr') ?? '', 'subtitleEn' => $this->input('subtitleEn') ?? '',
        ];
    }
}
