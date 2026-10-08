<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TenantUserFormRequest;
use App\Models\RoleTemplate;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;

// Clients → a client's accounts: the platform team creates the accounts that sign in to the client dashboard,
// disables them and resets their passwords. Only accounts of this client are reachable (404 otherwise).
class TenantUserController extends Controller
{
    public function index(Tenant $tenant)
    {
        return response()->json([
            'data' => $tenant->users()->orderBy('created_at')->get()->map(fn (User $u) => $u->toPublicArray())->values(),
            // The role templates a client account can hold, for the role picker.
            'roles' => RoleTemplate::whereIn('key', TenantUserFormRequest::clientRoles())->orderBy('sort_order')->orderBy('id')
                ->get()->map(fn (RoleTemplate $r) => ['key' => $r->key, 'nameAr' => $r->name_ar, 'nameEn' => $r->name_en])->values(),
        ])->header('Cache-Control', 'no-store');
    }

    public function store(TenantUserFormRequest $request, Tenant $tenant)
    {
        $user = User::create($request->fields() + [
            'password' => $request->input('password'),
            'tenant_id' => $tenant->id,
            'locale' => 'ar',
        ]);

        $this->audit($request, 'created', $user, $tenant);

        return $this->item($user->fresh()->toPublicArray(), 201);
    }

    public function update(TenantUserFormRequest $request, Tenant $tenant, User $user)
    {
        $data = $request->fields();
        $passwordReset = $request->filled('password');
        if ($passwordReset) {
            $data['password'] = $request->input('password');
        }
        // A new password or a disabled account ends the account's open sessions.
        if ($passwordReset || ($data['status'] === 'disabled' && $user->status !== 'disabled')) {
            $data['token_version'] = $user->token_version + 1;
        }
        $user->update($data);

        $this->audit($request, 'updated', $user, $tenant, ['passwordReset' => $passwordReset]);

        return $this->item($user->fresh()->toPublicArray());
    }

    private function audit(Request $request, string $what, User $user, Tenant $tenant, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "tenant_user.$what",
            'actor' => $request->user(),
            'entity_type' => 'user',
            'entity_id' => $user->cuid,
            'metadata' => ['tenant' => $tenant->cuid, 'email' => $user->email, 'role' => $user->role, 'status' => $user->status] + $metadata,
        ]);
    }
}
