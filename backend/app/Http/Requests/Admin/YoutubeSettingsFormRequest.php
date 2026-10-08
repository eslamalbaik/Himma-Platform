<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use App\Support\YoutubeSettings;

class YoutubeSettingsFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'channelUrl' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                if (! YoutubeSettings::isChannelUrl($value)) {
                    $fail('channel');
                }
            }],
            // A channel link needs its name in both languages, as shown on the live page.
            'channelNameAr' => ['nullable', 'string', 'max:100', 'required_with:channelUrl'],
            'channelNameEn' => ['nullable', 'string', 'max:100', 'required_with:channelUrl'],
            'youtubeOnly' => ['required', 'boolean'],
            'privacyEnhanced' => ['required', 'boolean'],
            'recordingRequired' => ['required', 'boolean'],
        ];
    }

    protected function codes(): array
    {
        return [
            'channelUrl' => 'invalid_youtube_channel',
            'channelNameAr' => 'youtube_channel_name_required',
            'channelNameEn' => 'youtube_channel_name_required',
            'youtubeOnly' => 'invalid_youtube_setting',
            'privacyEnhanced' => 'invalid_youtube_setting',
            'recordingRequired' => 'invalid_youtube_setting',
        ];
    }

    public function fields(): array
    {
        $text = fn (string $key) => filled($this->input($key)) ? trim($this->input($key)) : null;

        return [
            'channelUrl' => $text('channelUrl'),
            'channelNameAr' => $text('channelNameAr'),
            'channelNameEn' => $text('channelNameEn'),
            'youtubeOnly' => $this->boolean('youtubeOnly'),
            'privacyEnhanced' => $this->boolean('privacyEnhanced'),
            'recordingRequired' => $this->boolean('recordingRequired'),
        ];
    }
}
