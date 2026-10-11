<?php

namespace App\Settings;

use App\Models\Setting;

// Settings → AI: the Claude model the AI Center uses, which of its tools are on, and a monthly limit.
// AI assists editors; it never publishes or approves anything itself (§8, AI-P-01).
class Ai
{
    public const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];

    public const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

    // The AI Center tools (§8.1-8.5).
    public const FEATURES = ['writerAssistant', 'smartReviewer', 'complianceDetection', 'editorReport', 'issueBuilder'];

    public const DEFAULTS = [
        'enabled' => false,
        'model' => 'claude-opus-5-5',
        // Editorial review is judgement work; the owner can lower it to save cost.
        'effort' => 'high',
        'apiKey' => null, // sealed with Secrets
        'features' => [],
        // Requests per calendar month across the platform; 0 means no limit.
        'monthlyLimit' => 0,
        // Keep the generated text in the AI usage log (AI-P-02). Off keeps only who, what tool and when.
        'keepGeneratedText' => true,
        'modelName' => '',
        'checkedAt' => null,
    ];

    public static function all(): array
    {
        $s = Setting::group('ai', self::DEFAULTS);
        $s['features'] = array_intersect_key((array) $s['features'], array_flip(self::FEATURES))
            + array_fill_keys(self::FEATURES, true);

        return $s;
    }

    public static function apiKey(): ?string
    {
        return Secrets::open(self::all()['apiKey']);
    }

    public static function toPublicArray(): array
    {
        $s = self::all();
        unset($s['apiKey']);

        return $s + ['hasApiKey' => filled(self::all()['apiKey']), 'models' => self::MODELS];
    }
}
