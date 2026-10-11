<?php

namespace App\Settings;

use App\Models\Article;
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

    // The error code for the first metadata rule an article breaks when it is submitted for review, or null.
    // Client submissions skip the verified-writer rule: a client's own content has no platform writer.
    public static function submitError(Article $article, bool $writerRule = true): ?string
    {
        $rules = self::all();

        return match (true) {
            $rules['requireSource'] && blank($article->source) => 'source_required',
            $rules['requireRightsNote'] && blank($article->rights_note) => 'rights_note_required',
            $rules['requireSection'] && ! $article->section_id => 'section_required',
            $writerRule && $rules['requireVerifiedWriter'] && $article->writer?->status !== 'verified' => 'verified_writer_required',
            default => null,
        };
    }
}
