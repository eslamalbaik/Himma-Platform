<?php

namespace App\Http\Requests\Magazine;

use App\Http\Requests\ApiRequest;

class TagFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'max:100'],
            'nameEn' => ['required', 'string', 'max:100'],
        ];
    }

    protected function codes(): array
    {
        return ['nameAr' => 'invalid_tag_name', 'nameEn' => 'invalid_tag_name'];
    }

    public function fields(): array
    {
        return ['name_ar' => trim($this->input('nameAr')), 'name_en' => trim($this->input('nameEn'))];
    }
}
