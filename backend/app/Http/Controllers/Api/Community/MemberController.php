<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\MemberFormRequest;
use App\Models\User;
use App\Support\Audit;
use App\Support\Invitations;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// An organization admin manages the people of their own organization (`/api/me/organization/members`).
// Everything is scoped to the admin's tenant: another organization's member answers 404.
class MemberController extends Controller
{
    public function index(Request $request)
    {
        $members = $this->members($request)->orderByRaw("role = 'tenant_admin' desc")->orderBy('name_ar')->get();

        return response()->json(['data' => $members->map(fn (User $member) => $this->array($member))->values()])
            ->header('Cache-Control', 'no-store');
    }

    // The new member gets an email with a link to choose their own password (same flow as a join invitation).
    public function store(MemberFormRequest $request)
    {
        $admin = $request->user();

        $member = User::create([
            'email' => $request->input('email'),
            'password' => Str::random(40),
            'name_ar' => trim($request->input('nameAr')),
            'name_en' => trim($request->input('nameEn')),
            'role' => $request->input('role'),
            'status' => 'active',
            'locale' => $admin->locale ?? 'ar',
            'tenant_id' => $admin->tenant_id,
        ]);

        Invitations::send($member, $admin->tenant);
        $this->audit($request, 'created', $member, ['role' => $member->role]);

        return $this->item($this->array($member), 201);
    }

    public function update(MemberFormRequest $request, string $cuid)
    {
        $member = $this->members($request)->where('cuid', $cuid)->first();
        if (! $member) {
            return $this->error('not_found', 404);
        }

        $data = [];
        foreach (['nameAr' => 'name_ar', 'nameEn' => 'name_en', 'role' => 'role', 'status' => 'status'] as $input => $column) {
            if ($request->has($input)) {
                $data[$column] = $input === 'nameAr' || $input === 'nameEn' ? trim($request->input($input)) : $request->input($input);
            }
        }

        // An organization always keeps at least one active admin, and an admin cannot lock themselves out.
        $losesAdmin = $member->role === 'tenant_admin' && $member->status === 'active'
            && (($data['role'] ?? 'tenant_admin') !== 'tenant_admin' || ($data['status'] ?? 'active') !== 'active');
        if ($losesAdmin) {
            if ($member->id === $request->user()->id) {
                return $this->error('cannot_change_self', 422);
            }
            if ($this->members($request)->where('role', 'tenant_admin')->where('status', 'active')->count() < 2) {
                return $this->error('last_admin', 409);
            }
        }

        // Ending a disabled or demoted member's open sessions at once (see EnsureApiUser).
        if (($data['status'] ?? $member->status) === 'disabled' || isset($data['role'])) {
            $data['token_version'] = $member->token_version + 1;
        }

        $member->update($data);
        $this->audit($request, 'updated', $member, array_intersect_key($data, array_flip(['role', 'status'])));

        return $this->item($this->array($member->fresh()));
    }

    public function resendInvitation(Request $request, string $cuid)
    {
        $member = $this->members($request)->where('cuid', $cuid)->first();
        if (! $member) {
            return $this->error('not_found', 404);
        }
        if ($member->status !== 'active' || $member->last_login_at) {
            return $this->error('invitation_not_needed', 409);
        }

        Invitations::send($member, $request->user()->tenant);
        $this->audit($request, 'invitation_resent', $member);

        return $this->ok();
    }

    private function members(Request $request)
    {
        return User::where('tenant_id', $request->user()->tenant_id)->whereIn('role', MemberFormRequest::ROLES);
    }

    private function array(User $member): array
    {
        return [
            'id' => $member->cuid,
            'handle' => $member->handle,
            'email' => $member->email,
            'nameAr' => $member->name_ar,
            'nameEn' => $member->name_en,
            'role' => $member->role,
            'status' => $member->status,
            'verified' => $member->isVerified(),
            'lastLoginAt' => optional($member->last_login_at)->toIso8601String(),
        ];
    }

    private function audit(Request $request, string $what, User $member, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "organization_member.$what",
            'actor' => $request->user(),
            'entity_type' => 'user',
            'entity_id' => $member->cuid,
            'metadata' => $metadata,
        ]);
    }
}
