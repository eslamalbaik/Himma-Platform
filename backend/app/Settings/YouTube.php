<?php

namespace App\Settings;

use App\Models\Setting;

// Settings → YouTube: the channel events are broadcast on, and whether stream and recording links must
// point to YouTube. The Data API key is only used to check the channel ("Test connection").
class YouTube
{
    public const DEFAULTS = [
        'channelId' => '',
        'channelTitle' => '',
        'apiKey' => null, // sealed with Secrets
        'restrictStreamHosts' => false,
        'checkedAt' => null,
    ];

    public const URL_PATTERN = '#^https://(www\.|m\.)?(youtube\.com|youtu\.be)/#i';

    public static function all(): array
    {
        return Setting::group('youtube', self::DEFAULTS);
    }

    public static function apiKey(): ?string
    {
        return Secrets::open(self::all()['apiKey']);
    }

    public static function toPublicArray(): array
    {
        $s = self::all();

        return [
            'channelId' => $s['channelId'],
            'channelTitle' => $s['channelTitle'],
            'hasApiKey' => filled($s['apiKey']),
            'restrictStreamHosts' => (bool) $s['restrictStreamHosts'],
            'checkedAt' => $s['checkedAt'],
        ];
    }

    // Validation rule for stream and recording links: any https URL, or only YouTube when restricted.
    public static function urlRules(): array
    {
        $rules = ['nullable', 'url:https', 'max:500'];
        if (self::all()['restrictStreamHosts']) {
            $rules[] = 'regex:'.self::URL_PATTERN;
        }

        return $rules;
    }
}
