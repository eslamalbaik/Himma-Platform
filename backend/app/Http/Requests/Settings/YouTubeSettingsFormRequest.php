<?php

namespace App\Http\Requests\Settings;

use App\Http\Requests\ApiRequest;

// The API key is write-only: an empty value keeps the stored key, `clearApiKey` removes it.
class YouTubeSettingsFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'channelId' => ['nullable', 'string', 'regex:/^UC[A-Za-z0-9_-]{22}$/'],
            'apiKey' => ['nullable', 'string', 'max:200'],
            'clearApiKey' => ['sometimes', 'boolean'],
            'restrictStreamHosts' => ['required', 'boolean'],
        ];
    }

    protected function codes(): array
    {
        return [
            'channelId' => 'invalid_youtube_channel',
            'apiKey' => 'invalid_api_key',
            'clearApiKey' => 'invalid_input',
            'restrictStreamHosts' => 'invalid_input',
        ];
    }
}
