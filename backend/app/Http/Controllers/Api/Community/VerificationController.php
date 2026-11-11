<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\NoteFormRequest;
use App\Http\Requests\Community\VerificationFormRequest;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VerificationRequest;
use App\Support\Audit;
use Illuminate\Http\Request;

// Asking for the verified badge (members, for themselves or for their organization) and deciding on the
// requests (staff with `update,verification`). Approving sets `verified_at` on the person or organization.
class VerificationController extends Controller
{
    // The member's own requests and whether they (and their organization) are already verified.
    public function mine(Request $request)
    {
        $user = $request->user();
        $tenant = $user->tenant;
        $ids = [['user', $user->id]];
        if ($tenant && $user->role === 'tenant_admin') {
            $ids[] = ['tenant', $tenant->id];
        }

        $requests = VerificationRequest::where(function ($q) use ($ids) {
            foreach ($ids as [$type, $id]) {
                $q->orWhere(fn ($q) => $q->where('subject_type', $type)->where('subject_id', $id));
            }
        })->orderByDesc('id')->limit(20)->get();

        return response()->json([
            'data' => $requests->map->toPublicArray()->values(),
            'person' => ['verified' => $user->isVerified()],
            'organization' => $tenant && $user->role === 'tenant_admin' ? ['verified' => $tenant->verified_at !== null] : null,
        ])->header('Cache-Control', 'no-store');
    }

    public function store(VerificationFormRequest $request)
    {
        $user = $request->user();

        if ($request->input('subject') === 'organization') {
            if ($user->role !== 'tenant_admin' || ! $user->tenant_id) {
                return $this->error('forbidden', 403);
            }
            [$type, $subject] = ['tenant', $user->tenant];
            $verified = $subject->verified_at !== null;
        } else {
            [$type, $subject] = ['user', $user];
            $verified = $user->isVerified();
        }

        if ($verified) {
            return $this->error('already_verified', 409);
        }
        if (VerificationRequest::where('subject_type', $type)->where('subject_id', $subject->id)->where('status', 'pending')->exists()) {
            return $this->error('verification_pending', 409);
        }

        $verification = VerificationRequest::create([
            'subject_type' => $type,
            'subject_id' => $subject->id,
            'requested_by' => $user->id,
            'evidence' => trim($request->input('evidence')),
            'status' => 'pending',
        ]);

        $this->audit($request, 'requested', $verification);

        return $this->item($verification->toPublicArray(), 201);
    }

    public function index(Request $request)
    {
        $query = VerificationRequest::with('requester');

        if (in_array($status = $request->query('status'), VerificationRequest::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByRaw("status = 'pending' desc")->orderByDesc('id')->paginate($this->perPage($request)),
            fn (VerificationRequest $verification) => $verification->toPublicArray(),
            ['pendingCount' => VerificationRequest::where('status', 'pending')->count()]
        );
    }

    public function approve(NoteFormRequest $request, VerificationRequest $verification)
    {
        return $this->decide($request, $verification, 'approved');
    }

    public function reject(NoteFormRequest $request, VerificationRequest $verification)
    {
        return $this->decide($request, $verification, 'rejected');
    }

    private function decide(NoteFormRequest $request, VerificationRequest $verification, string $status)
    {
        if ($verification->status !== 'pending') {
            return $this->error('verification_already_decided', 409);
        }

        $verification->update([
            'status' => $status,
            'review_note' => $request->note(),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        if ($status === 'approved') {
            $subject = $verification->subject();
            if ($subject instanceof Tenant || $subject instanceof User) {
                $subject->forceFill(['verified_at' => now()])->save();
            }
        }

        $this->audit($request, $status, $verification);

        return $this->item($verification->fresh('requester')->toPublicArray());
    }

    private function audit(Request $request, string $what, VerificationRequest $verification): void
    {
        Audit::log($request, [
            'action' => "verification.$what",
            'actor' => $request->user(),
            'entity_type' => 'verification',
            'entity_id' => $verification->cuid,
            'metadata' => ['subjectType' => $verification->subject_type],
        ]);
    }
}
