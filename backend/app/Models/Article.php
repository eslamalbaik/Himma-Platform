<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

// A governed article (REQUIREMENTS.md §1-6). Nothing is published directly:
// draft → in_review → approved → published, with rejected and withdrawn on the side.
class Article extends Model
{
    use HasCuid, HasFactory;

    public const LANGUAGES = ['ar', 'en'];

    public const STATUSES = ['draft', 'in_review', 'approved', 'published', 'rejected', 'withdrawn'];

    // Who can see the article (§2). Institutional and government content belongs to one client.
    public const CLASSIFICATIONS = ['public', 'followers', 'members', 'academic', 'institutional', 'government', 'confidential'];

    public const TENANT_CLASSIFICATIONS = ['institutional', 'government'];

    public const AUDIENCES = ['teachers', 'researchers', 'school_leaders', 'students', 'parents', 'decision_makers'];

    // The ten pre-publication compliance items, in the order they are checked (§4).
    public const COMPLIANCE_ITEMS = [
        'rights', 'source', 'accuracy', 'language', 'advertising',
        'privacy', 'sensitive', 'national_identity', 'conflict_of_interest', 'approvals',
    ];

    public const COMPLIANCE_VALUES = ['pass', 'warn', 'fail'];

    // Which status each workflow action starts from, and where it leads.
    public const TRANSITIONS = [
        'submit' => [['draft', 'rejected'], 'in_review'],
        'approve' => [['in_review'], 'approved'],
        'reject' => [['in_review'], 'rejected'],
        'publish' => [['approved'], 'published'],
        'withdraw' => [['published'], 'withdrawn'],
        'restore' => [['withdrawn'], 'in_review'],
    ];

    protected $fillable = [
        'title', 'summary', 'body', 'language', 'section_id', 'issue_id', 'tenant_id', 'author_name', 'author_id',
        'classification', 'audiences', 'is_sponsored', 'source', 'rights_note', 'status',
        'compliance_checks', 'compliance_result', 'compliance_checked_at', 'review_note', 'reviewed_by',
        'published_at', 'withdrawn_at', 'withdrawal_reason',
    ];

    protected function casts(): array
    {
        return [
            'audiences' => 'array',
            'is_sponsored' => 'boolean',
            'compliance_checks' => 'array',
            'compliance_checked_at' => 'datetime',
            'published_at' => 'datetime',
            'withdrawn_at' => 'datetime',
        ];
    }

    // Any failed item blocks publishing; any warning sends the article to human review (CMP-03, CMP-04).
    public static function complianceResultFor(array $checks): string
    {
        if (in_array('fail', $checks, true)) {
            return 'non_compliant';
        }
        if (in_array('warn', $checks, true)) {
            return 'needs_review';
        }

        return 'compliant';
    }

    public function canDo(string $action): bool
    {
        return in_array($this->status, self::TRANSITIONS[$action][0] ?? [], true);
    }

    // Edits are allowed until the article is published; a published article is changed by withdrawing it.
    public function isEditable(): bool
    {
        return in_array($this->status, ['draft', 'in_review', 'approved', 'rejected'], true);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(MagazineSection::class, 'section_id');
    }

    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ArticleVersion::class)->orderByDesc('version');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ContentReport::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function saveVersion(?User $editor): void
    {
        $this->versions()->create([
            'version' => (int) $this->versions()->max('version') + 1,
            'title' => $this->title,
            'body' => $this->body,
            'edited_by' => $editor?->id,
            'created_at' => now(),
        ]);
    }

    // Published articles anyone may read on the public site (no sign-in needed).
    public function scopeReadable($query)
    {
        return $query->where('status', 'published')->where('classification', 'public');
    }

    // What `$viewer` (or a guest) may read: public stories, the followers-only stories of someone they follow
    // (or of an organization they follow), and an organization's own members-only stories.
    public function scopeVisibleTo($query, ?User $viewer)
    {
        $query->where('status', 'published');

        if (! $viewer) {
            return $query->where('classification', 'public');
        }

        return $query->where(function ($q) use ($viewer) {
            $q->where('classification', 'public')
                ->orWhere('author_id', $viewer->id)
                ->orWhere(function ($q) use ($viewer) {
                    $q->where('classification', 'followers')->where(function ($q) use ($viewer) {
                        $q->whereIn('author_id', Follow::where('follower_id', $viewer->id)->where('followable_type', 'user')->select('followable_id'))
                            ->orWhereIn('tenant_id', Follow::where('follower_id', $viewer->id)->where('followable_type', 'tenant')->select('followable_id'))
                            ->orWhere(fn ($q) => $viewer->tenant_id ? $q->where('tenant_id', $viewer->tenant_id) : $q->whereRaw('1 = 0'));
                    });
                })
                ->orWhere(fn ($q) => $viewer->tenant_id
                    ? $q->where('classification', 'institutional')->where('tenant_id', $viewer->tenant_id)
                    : $q->whereRaw('1 = 0'));
        });
    }

    // What the public site shows: no review, compliance or reporting details.
    public function toReaderArray(bool $withBody = false): array
    {
        return [
            'id' => $this->cuid,
            'title' => $this->title,
            'summary' => $this->summary,
            'language' => $this->language,
            'sectionId' => $this->section?->cuid,
            'sectionNameAr' => $this->section?->name_ar,
            'sectionNameEn' => $this->section?->name_en,
            'tenantNameAr' => $this->tenant?->name_ar,
            'tenantNameEn' => $this->tenant?->name_en,
            'authorName' => $this->author_name,
            'authorHandle' => $this->author?->handle,
            'authorVerified' => (bool) $this->author?->verified_at,
            'tenantSlug' => $this->tenant?->slug,
            'tenantVerified' => (bool) $this->tenant?->verified_at,
            'classification' => $this->classification,
            'tags' => $this->tags->map(fn (Tag $tag) => $tag->toPublicArray())->values(),
            'wordCount' => count(preg_split('/\s+/u', trim(strip_tags((string) $this->body)), -1, PREG_SPLIT_NO_EMPTY)),
            'publishedAt' => optional($this->published_at)->toIso8601String(),
        ] + ($withBody ? ['body' => $this->body] : []);
    }

    // A member's own story as they see it while writing: its review status and the editor's note.
    public function toStoryArray(bool $withBody = false): array
    {
        return [
            'id' => $this->cuid,
            'title' => $this->title,
            'summary' => $this->summary,
            'language' => $this->language,
            'sectionId' => $this->section?->cuid,
            'audience' => $this->classification,
            'status' => $this->status,
            'reviewNote' => $this->review_note,
            'publishedAt' => optional($this->published_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
            'updatedAt' => optional($this->updated_at)->toIso8601String(),
        ] + ($withBody ? ['body' => $this->body] : []);
    }

    public function toPublicArray(bool $withBody = false): array
    {
        return [
            'id' => $this->cuid,
            'title' => $this->title,
            'summary' => $this->summary,
            'language' => $this->language,
            'sectionId' => $this->section?->cuid,
            'sectionNameAr' => $this->section?->name_ar,
            'sectionNameEn' => $this->section?->name_en,
            'axis' => $this->section?->axis,
            'issueId' => $this->issue?->cuid,
            'issueNumber' => $this->issue?->number,
            'tenantId' => $this->tenant?->cuid,
            'tenantNameAr' => $this->tenant?->name_ar,
            'tenantNameEn' => $this->tenant?->name_en,
            'authorName' => $this->author_name,
            'classification' => $this->classification,
            'audiences' => $this->audiences ?? [],
            'isSponsored' => $this->is_sponsored,
            'source' => $this->source,
            'rightsNote' => $this->rights_note,
            'tags' => $this->tags->map(fn (Tag $tag) => $tag->toPublicArray())->values(),
            'status' => $this->status,
            'complianceChecks' => $this->compliance_checks,
            'complianceResult' => $this->compliance_result,
            'complianceCheckedAt' => optional($this->compliance_checked_at)->toIso8601String(),
            'reviewNote' => $this->review_note,
            'reviewerNameAr' => $this->reviewer?->name_ar,
            'reviewerNameEn' => $this->reviewer?->name_en,
            'publishedAt' => optional($this->published_at)->toIso8601String(),
            'withdrawnAt' => optional($this->withdrawn_at)->toIso8601String(),
            'withdrawalReason' => $this->withdrawal_reason,
            'openReportsCount' => $this->open_reports_count ?? null,
            'createdAt' => optional($this->created_at)->toIso8601String(),
            'updatedAt' => optional($this->updated_at)->toIso8601String(),
        ] + ($withBody ? ['body' => $this->body] : []);
    }
}
