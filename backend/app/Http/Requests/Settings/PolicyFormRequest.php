<?php

namespace App\Http\Requests\Settings;

use App\Http\Requests\ApiRequest;

// The text of one policy, in Arabic and English. Either may be empty while it is being written.
class PolicyFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'ar' => ['present', 'nullable', 'string', 'max:20000'],
            'en' => ['present', 'nullable', 'string', 'max:20000'],
        ];
    }

    protected function codes(): array
    {
        return ['ar' => 'invalid_policy_text', 'en' => 'invalid_policy_text'];
    }

    public function texts(): array
    {
        return ['ar' => trim((string) $this->input('ar')), 'en' => trim((string) $this->input('en'))];
    }
}
