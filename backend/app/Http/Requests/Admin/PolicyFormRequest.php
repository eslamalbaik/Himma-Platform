<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;

class PolicyFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            // A published policy needs its text in both languages.
            'bodyAr' => ['nullable', 'string', 'max:50000', 'required_if:isPublished,true'],
            'bodyEn' => ['nullable', 'string', 'max:50000', 'required_if:isPublished,true'],
            'isPublished' => ['required', 'boolean'],
        ];
    }

    protected function codes(): array
    {
        return [
            'bodyAr.required_if' => 'policy_text_required',
            'bodyEn.required_if' => 'policy_text_required',
            'bodyAr' => 'invalid_policy_text',
            'bodyEn' => 'invalid_policy_text',
            'isPublished' => 'invalid_input',
        ];
    }

    public function fields(): array
    {
        $text = fn (string $key) => filled($this->input($key)) ? trim($this->input($key)) : null;

        return [
            'body_ar' => $text('bodyAr'),
            'body_en' => $text('bodyEn'),
            'is_published' => $this->boolean('isPublished'),
        ];
    }
}
