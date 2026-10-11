<?php

namespace App\Settings;

use App\Models\Setting;

// The texts of the public "Media policies and standards" page (REQUIREMENTS.md §7), in Arabic and
// English. Titles come from the translation files (policies.<key>); only the bodies are stored.
class Policies
{
    public const KEYS = [
        'publishing', 'advertising', 'corrections', 'copyright', 'sponsored',
        'comments', 'ai', 'privacy', 'complaints',
    ];

    // The AI policy text is fixed by the requirements (§8.7, AI-P-01); the others start empty.
    private const AI_POLICY = [
        'ar' => 'استخدام الذكاء الاصطناعي مساعدٌ للتحرير والتحليل، ولا يُعد بديلًا عن المسؤولية البشرية عن المحتوى المنشور.',
        'en' => 'Artificial intelligence assists editing and analysis; it does not replace human responsibility for published content.',
    ];

    /** @return array<string, array{ar: string, en: string, updatedAt: ?string}> */
    public static function all(): array
    {
        $defaults = [];
        foreach (self::KEYS as $key) {
            $defaults[$key] = ['ar' => '', 'en' => '', 'updatedAt' => null];
        }
        $defaults['ai'] = self::AI_POLICY + ['updatedAt' => null];

        $stored = Setting::group('policies', $defaults);

        // A stored value may predate a field; fill what is missing.
        return array_map(fn ($value) => (array) $value + ['ar' => '', 'en' => '', 'updatedAt' => null], $stored);
    }

    // What the public page shows: policies with text in at least one language.
    public static function published(): array
    {
        return array_filter(self::all(), fn ($p) => trim($p['ar']) !== '' || trim($p['en']) !== '');
    }
}
