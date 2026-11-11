<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A person or organization asking staff for the verified badge. Approving sets `verified_at` on the subject.
class VerificationRequest extends Model
{
    use HasCuid;

    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $fillable = [
        'subject_type', 'subject_id', 'requested_by', 'evidence', 'status', 'review_note', 'reviewed_by', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    // The account or organization the badge is for.
    public function subject(): ?Model
    {
        return $this->subject_type === 'tenant' ? Tenant::find($this->subject_id) : User::find($this->subject_id);
    }

    public function toPublicArray(): array
    {
        $subject = $this->subject();

        return [
            'id' => $this->cuid,
            'subjectType' => $this->subject_type === 'tenant' ? 'organization' : 'person',
            'subjectKey' => $subject instanceof Tenant ? $subject->slug : $subject?->handle,
            'subjectNameAr' => $subject?->name_ar,
            'subjectNameEn' => $subject?->name_en,
            'requestedByNameAr' => $this->requester?->name_ar,
            'requestedByNameEn' => $this->requester?->name_en,
            'evidence' => $this->evidence,
            'status' => $this->status,
            'reviewNote' => $this->review_note,
            'reviewedAt' => optional($this->reviewed_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
