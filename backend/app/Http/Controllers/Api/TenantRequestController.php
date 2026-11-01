<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\JoinRequestFormRequest;
use App\Models\Tenant;
use App\Models\TenantRequest;
use App\Models\User;
use App\Notifications\JoinRequestAlert;
use App\Support\Ability;
use App\Support\Audit;
use App\Support\Invitations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = TenantRequest::query();

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%");
            });
        }

        if (in_array($status = $request->query('status'), TenantRequest::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByRaw("status = 'pending' desc")->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (TenantRequest $r) => $r->toPublicArray(),
            ['pendingCount' => TenantRequest::where('status', 'pending')->count()]
        );
    }

    public function store(JoinRequestFormRequest $request)
    {
        $tenantRequest = TenantRequest::create($request->fields() + ['status' => 'pending']);

        Audit::log($request, [
            'action' => 'tenant_request.created',
            'actor' => $request->user(),
            'entity_type' => 'tenant_request',
            'entity_id' => $tenantRequest->cuid,
        ]);

        // Bell alert for the staff who review join requests.
        $alert = new JoinRequestAlert(['clientAr' => $tenantRequest->name_ar, 'clientEn' => $tenantRequest->name_en, 'requestId' => $tenantRequest->cuid]);
        User::whereNull('tenant_id')->where('status', 'active')->get()
            ->filter(fn (User $user) => Ability::can($user->role, 'update', 'tenants'))
            ->each(fn (User $user) => $user->notify($alert));

        return $this->item($tenantRequest->toPublicArray(), 201);
    }

    public function approve(Request $request, TenantRequest $tenantRequest)
    {
        $error = null;
        $created = false;

        $result = DB::transaction(function () use ($request, $tenantRequest, &$error, &$created) {
            // Locked so two reviewers clicking at once cannot both create a tenant.
            if (TenantRequest::whereKey($tenantRequest->id)->lockForUpdate()->value('status') !== 'pending') {
                $error = 'request_already_reviewed';

                return null;
            }

            // The contact becomes the organization's admin. An email that already belongs to staff or to
            // another organization cannot be used, so the request stays pending until it is fixed.
            $email = strtolower(trim($tenantRequest->contact_email));
            $user = User::where('email', $email)->first();
            if ($user && ($user->role !== 'member' || $user->tenant_id !== null)) {
                $error = 'contact_email_in_use';

                return null;
            }

            $tenant = Tenant::create([
                'name_ar' => $tenantRequest->name_ar,
                'name_en' => $tenantRequest->name_en,
                'type' => $tenantRequest->type,
                'status' => 'trial',
            ]);

            if ($user) {
                // Already signed up on the public site: keeps their password and becomes the admin.
                $user->update(['role' => 'tenant_admin', 'tenant_id' => $tenant->id]);
            } else {
                $user = User::create([
                    'email' => $email,
                    'password' => Str::random(40), // unusable until the contact sets one from the invitation
                    'name_ar' => $tenantRequest->contact_name,
                    'name_en' => $tenantRequest->contact_name,
                    'role' => 'tenant_admin',
                    'status' => 'active',
                    'locale' => 'ar',
                    'tenant_id' => $tenant->id,
                ]);
                $created = true;
            }

            $tenantRequest->update([
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'tenant_id' => $tenant->id,
            ]);

            return [$tenant, $user];
        });

        if (! $result) {
            return $this->error($error, 409);
        }

        [$tenant, $user] = $result;

        Audit::log($request, [
            'action' => 'tenant_request.approved',
            'actor' => $request->user(),
            'entity_type' => 'tenant_request',
            'entity_id' => $tenantRequest->cuid,
            'metadata' => ['tenantId' => $tenant->cuid, 'adminId' => $user->cuid],
        ]);
        Audit::log($request, [
            'action' => $created ? 'user.created' : 'user.updated',
            'actor' => $request->user(),
            'entity_type' => 'user',
            'entity_id' => $user->cuid,
            'metadata' => ['role' => 'tenant_admin', 'tenantId' => $tenant->cuid, 'via' => 'join_request'],
        ]);

        // A new account has no password yet: email the link to choose one.
        if ($created) {
            Invitations::send($user, $tenant);
        }

        return $this->item($tenantRequest->fresh()->toPublicArray());
    }

    // Sends the invitation again (lost email, expired link) while the contact has not signed in yet.
    public function resendInvitation(Request $request, TenantRequest $tenantRequest)
    {
        if ($tenantRequest->status !== 'approved' || ! $tenantRequest->tenant_id) {
            return $this->error('invitation_not_needed', 409);
        }

        $email = strtolower(trim($tenantRequest->contact_email));
        $user = User::where('email', $email)->first();

        // Requests approved before accounts were created have no admin yet: create it now.
        if (! $user) {
            $user = User::create([
                'email' => $email,
                'password' => Str::random(40),
                'name_ar' => $tenantRequest->contact_name,
                'name_en' => $tenantRequest->contact_name,
                'role' => 'tenant_admin',
                'status' => 'active',
                'locale' => 'ar',
                'tenant_id' => $tenantRequest->tenant_id,
            ]);
            Audit::log($request, [
                'action' => 'user.created',
                'actor' => $request->user(),
                'entity_type' => 'user',
                'entity_id' => $user->cuid,
                'metadata' => ['role' => 'tenant_admin', 'via' => 'join_request'],
            ]);
        }

        if ($user->tenant_id !== $tenantRequest->tenant_id || $user->last_login_at !== null) {
            return $this->error('invitation_not_needed', 409);
        }

        Invitations::send($user, $user->tenant);

        Audit::log($request, [
            'action' => 'tenant_request.invitation_resent',
            'actor' => $request->user(),
            'entity_type' => 'tenant_request',
            'entity_id' => $tenantRequest->cuid,
        ]);

        return $this->ok();
    }

    public function reject(Request $request, TenantRequest $tenantRequest)
    {
        $reason = mb_substr(trim((string) $request->input('reason', '')), 0, 255);

        $updated = TenantRequest::whereKey($tenantRequest->id)->where('status', 'pending')->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => $reason !== '' ? $reason : null,
            'updated_at' => now(),
        ]);

        if (! $updated) {
            return $this->error('request_already_reviewed', 409);
        }

        Audit::log($request, [
            'action' => 'tenant_request.rejected',
            'actor' => $request->user(),
            'entity_type' => 'tenant_request',
            'entity_id' => $tenantRequest->cuid,
            'metadata' => ['reason' => $reason],
        ]);

        return $this->item($tenantRequest->fresh()->toPublicArray());
    }
}
