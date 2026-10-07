<?php

namespace App\Support;

// Server-side text (emails) comes from the same translation files as the dashboard:
// public/locales/{ar,en}.json, flat keys with {{name}} placeholders.
class Locales
{
    public const SUPPORTED = ['ar', 'en'];

    private static array $loaded = [];

    public static function t(string $locale, string $key, array $replace = []): string
    {
        $text = self::load($locale)[$key] ?? $key;

        foreach ($replace as $name => $value) {
            $text = str_replace('{{'.$name.'}}', (string) $value, $text);
        }

        return $text;
    }

    private static function load(string $locale): array
    {
        $locale = in_array($locale, self::SUPPORTED, true) ? $locale : 'ar';

        if (! isset(self::$loaded[$locale])) {
            $path = rtrim(env('LOCALES_PATH', base_path('../public/locales')), '/\\')."/{$locale}.json";
            self::$loaded[$locale] = is_file($path) ? (json_decode((string) file_get_contents($path), true) ?: []) : [];
        }

        return self::$loaded[$locale];
    }
}
