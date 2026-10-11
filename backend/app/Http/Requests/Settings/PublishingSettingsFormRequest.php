<?php

namespace App\Http\Requests\Settings;

use App\Http\Requests\ApiRequest;
use App\Settings\Publishing;

class PublishingSettingsFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return array_fill_keys(Publishing::RULES, ['required', 'boolean']) + [
            'sponsoredLabelAr' => ['required', 'string', 'max:60'],
            'sponsoredLabelEn' => ['required', 'string', 'max:60'],
        ];
    }

    protected function codes(): array
    {
        return array_fill_keys(Publishing::RULES, 'invalid_publishing_setting') + [
            'sponsoredLabelAr' => 'invalid_sponsored_label',
            'sponsoredLabelEn' => 'invalid_sponsored_label',
        ];
    }

    public function fields(): array
    {
        $fields = [];
        foreach (Publishing::RULES as $rule) {
            $fields[$rule] = $this->boolean($rule);
        }

        return $fields + [
            'sponsoredLabelAr' => trim($this->input('sponsoredLabelAr')),
            'sponsoredLabelEn' => trim($this->input('sponsoredLabelEn')),
        ];
    }
}
