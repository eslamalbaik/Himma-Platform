<?php

namespace App\Http\Requests\Magazine;

use App\Http\Requests\ApiRequest;
use App\Models\MagazineSection;
use Illuminate\Validation\Rule;

class SectionFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'axis' => ['required', Rule::in(MagazineSection::AXES)],
            'descriptionAr' => ['nullable', 'string', 'max:2000'],
            'descriptionEn' => ['nullable', 'string', 'max:2000'],
            'sortOrder' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_section_name',
            'nameEn' => 'invalid_section_name',
            'axis' => 'invalid_axis',
            'descriptionAr' => 'invalid_description',
            'descriptionEn' => 'invalid_description',
            'sortOrder' => 'invalid_sort_order',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => trim($this->input('nameAr')),
            'name_en' => trim($this->input('nameEn')),
            'axis' => $this->input('axis'),
            'description_ar' => $this->input('descriptionAr'),
            'description_en' => $this->input('descriptionEn'),
            'sort_order' => (int) $this->input('sortOrder', 0),
            'is_active' => $this->boolean('isActive', true),
        ];
    }
}
