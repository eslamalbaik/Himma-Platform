<?php

namespace App\Support;

use App\Models\Article;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Str;

// Settings → Publishing (Setting group `publishing`): editorial rules the content workflow enforces on top of
// the fixed ones in ArticleController (review before publishing, compliance before approval).
class PublishingRules
{
    // Article fields an author may be required to fill before submitting for review (PUB-02..04, §6).
    public const REQUIRABLE_FIELDS = ['summary', 'source', 'rightsNote', 'section', 'audiences'];

    public const DEFAULTS = [
        'requiredOnSubmit' => [],
        // Four eyes: the person who last changed the text cannot approve it.
        'separateApprover' => false,
        // Sponsored content needs the advertising and approvals compliance items passed (ADS-02, ADS-03).
        'sponsoredChecks' => false,
        'defaultClassification' => 'public',
        'defaultLanguage' => 'ar',
    ];

    public static function settings(): array
    {
        return Setting::group('publishing', self::DEFAULTS);
    }

    // First required field the article leaves empty, as an error code (e.g. article_missing_source), or null.
    public static function missingField(Article $article): ?string
    {
        $values = [
            'summary' => $article->summary,
            'source' => $article->source,
            'rightsNote' => $article->rights_note,
            'section' => $article->section_id,
            'audiences' => $article->audiences,
        ];

        foreach (self::settings()['requiredOnSubmit'] as $field) {
            if (blank($values[$field] ?? null)) {
                return 'article_missing_'.Str::snake($field);
            }
        }

        return null;
    }

    // Why $approver may not approve the article under these rules, as an error code, or null.
    public static function approvalBlock(Article $article, User $approver): ?string
    {
        $settings = self::settings();

        if ($missing = self::missingField($article)) {
            return $missing;
        }

        if ($settings['separateApprover'] && $article->versions()->value('edited_by') === $approver->id) {
            return 'approver_is_last_editor';
        }

        if ($settings['sponsoredChecks'] && $article->is_sponsored) {
            $checks = $article->compliance_checks ?? [];
            if (($checks['advertising'] ?? null) !== 'pass' || ($checks['approvals'] ?? null) !== 'pass') {
                return 'sponsored_checks_required';
            }
        }

        return null;
    }
}
