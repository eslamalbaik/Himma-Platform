<?php

namespace App\Http\Requests\Client;

use App\Http\Requests\ApiRequest;
use App\Support\YoutubeSettings;

// What a client keeps up to date itself. Its names, type and status are the platform team's.
class ClientProfileRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'billingEmail' => ['nullable', 'string', 'email:filter', 'max:255'],
            'contactPhone' => ['nullable', 'string', 'max:40', 'regex:/^\+?[0-9 ()-]{6,40}$/'],
            'youtubeChannelUrl' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                if (! YoutubeSettings::isChannelUrl($value)) {
                    $fail('channel');
                }
            }],
        ];
    }

    protected function codes(): array
    {
        return [
            'billingEmail' => 'invalid_billing_email',
            'contactPhone' => 'invalid_phone',
            'youtubeChannelUrl' => 'invalid_youtube_channel',
        ];
    }

    public function fields(): array
    {
        $text = fn (string $key) => filled($this->input($key)) ? trim($this->input($key)) : null;

        return [
            'billing_email' => $text('billingEmail') ? strtolower($text('billingEmail')) : null,
            'contact_phone' => $text('contactPhone'),
            'youtube_channel_url' => $text('youtubeChannelUrl'),
        ];
    }
}
