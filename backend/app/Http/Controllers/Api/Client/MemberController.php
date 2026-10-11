<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureApiUser;
use App\Http\Requests\Client\MemberFormRequest;
use App\Models\TenantRole;
use App\Models\User;
use App\Support\Audit;
use App\Support\ClientAccess;
use Illuminate\Http\Request;

// The organisation's own accounts (client dashboard → Members). A client user with `manage_entity_members`
// adds and edits accounts of their own organisation only, and may give a role only if it grants nothing beyond
// their own (ClientAccess::mayAssign). Accounts are disabled, not deleted, so their history stays readable.
class MemberController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('tenant_id', $request->user()->tenant_id);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($role = $request->query('role')) {
            $query->where('role', (string) $role);
        }
        if (in_array($status = $request->query('status'), User::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderBy('name_ar')->paginate($this->perPage($request)),
            fn (User $u) => $u->toPublicArray()
        );
    }

    // Roles shown in the members screen: every client role template except platform-wide ones, each marked with
    // whether the signed-in user may give it.
    public function roles(Request $request)
    {
        $user = $request->user();
        $roles = TenantRole::whereNotIn('key', ClientAccess::NOT_ASSIGNABLE)->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['data' => $roles->map(fn (TenantRole $role) => [
            'key' => $role->key,
            'nameAr' => $role->name_ar,
            'nameEn' => $role->name_en,
            'assignable' => ClientAccess::mayAssign($user, $role),
        ])->values()])->header('Cache-Control', 'no-store');
    }

    public function store(MemberFormRequest $request)
    {
        $actor = $request->user();
        if (! $this->assignable($actor, $request->input('role'))) {
            return $this->error('role_not_assignable', 403);
        }

        $member = User::create($request->fields() + [
            'password' => $request->input('password'),
            'tenant_id' => $actor->tenant_id,
            'locale' => $actor->locale ?? 'ar',
        ]);

        Audit::log($request, [
            'action' => 'client.member_created',
            'actor' => $actor,
            'entity_type' => 'user',
            'entity_id' => $member->cuid,
            'metadata' => ['email' => $member->email, 'role' => $member->role],
        ]);

        return $this->item($member->toPublicArray(), 201);
    }

    public function update(MemberFormRequest $request, string $cuid)
    {
        $actor = $request->user();
        $member = User::where('tenant_id', $actor->tenant_id)->where('cuid', $cuid)->first();
        if (! $member) {
            return $this->error('member_not_found', 404);
        }

        $self = $member->id === $actor->id;
        if ($self && $request->input('role') !== $member->role) {
            return $this->error('cannot_change_own_role', 422);
        }
        if ($self && $request->input('status') === 'disabled') {
            return $this->error('cannot_disable_self', 422);
        }
        // Someone with more permissions than the actor is out of their reach, and so is the role they would give.
        if (! $self && (! $this->assignable($actor, $member->role) || ! $this->assignable($actor, $request->input('role')))) {
            return $this->error('role_not_assignable', 403);
        }

        $data = $request->fields();
        $passwordChanged = $request->filled('password');
        if ($passwordChanged) {
            // Bumping the version ends every open session of this account (see EnsureApiUser).
            $data['password'] = $request->input('password');
            $data['token_version'] = $member->token_version + 1;
        }

        $member->update($data);

        if ($passwordChanged && $self) {
            $actor->token_version = $member->token_version;
            $request->session()->put(EnsureApiUser::SESSION_TOKEN_VERSION, $member->token_version);
        }

        Audit::log($request, [
            'action' => 'client.member_updated',
            'actor' => $actor,
            'entity_type' => 'user',
            'entity_id' => $member->cuid,
            'metadata' => ['role' => $member->role, 'status' => $member->status, 'passwordChanged' => $passwordChanged],
        ]);

        return $this->item($member->toPublicArray());
    }

    private function assignable(User $actor, ?string $key): bool
    {
        $role = $key ? TenantRole::where('key', $key)->first() : null;

        return $role !== null && ClientAccess::mayAssign($actor, $role);
    }
}
