<?php

namespace App\Settings;

use App\Models\Setting;

// Settings → Publishing: editorial rules on top of the fixed workflow (draft → review → approved →
// published). Every rule is off by default, so the workflow behaves as before until the owner turns it on.
class Publishing
{
    public const RULES = [
        'requireSource',       // submitting for review needs the source (PUB-03, mandatory metadata §6)
        'requireRightsNote',   // ... and the rights note
        'requireSection',      // ... and a magazine section
        'requireVerifiedWriter', // ... and a writer whose identity was verified (PUB-02)
        'publishNeedsCompliant', // publishing needs a compliant check, "needs review" is not enough
        'separatePublisher',   // whoever approved an article cannot also publish it
    ];

    public const DEFAULTS = [
        'requireSource' => false,
        'requireRightsNote' => false,
        'requireSection' => false,
        'requireVerifiedWriter' => false,
        'publishNeedsCompliant' => false,
        'separatePublisher' => false,
        // The label shown on sponsored content and advertising (ADS-01).
        'sponsoredLabelAr' => 'محتوى مدعوم',
        'sponsoredLabelEn' => 'Sponsored content',
    ];

    public static function all(): array
    {
        return Setting::group('publishing', self::DEFAULTS);
    }

    public static function on(string $rule): bool
    {
        return (bool) self::all()[$rule];
    }
}
