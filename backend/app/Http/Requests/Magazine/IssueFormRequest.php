<?php

namespace App\Http\Requests\Magazine;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

class IssueFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'number' => ['required', 'integer', 'min:1', 'max:100000', Rule::unique('issues', 'number')->ignore($this->route('issue'))],
            'titleAr' => ['required', 'string', 'max:255'],
            'titleEn' => ['required', 'string', 'max:255'],
            'themeAr' => ['nullable', 'string', 'max:255'],
            'themeEn' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function codes(): array
    {
        return [
            'number.unique' => 'issue_number_taken',
            'number' => 'invalid_issue_number',
            'titleAr' => 'invalid_issue_title',
            'titleEn' => 'invalid_issue_title',
            'themeAr' => 'invalid_issue_theme',
            'themeEn' => 'invalid_issue_theme',
        ];
    }

    public function fields(): array
    {
        return [
            'number' => (int) $this->input('number'),
            'title_ar' => trim($this->input('titleAr')),
            'title_en' => trim($this->input('titleEn')),
            'theme_ar' => $this->input('themeAr'),
            'theme_en' => $this->input('themeEn'),
        ];
    }
}
