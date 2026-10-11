<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TenantRoleFormRequest;
use App\Http\Requests\Admin\TenantRolePermissionsFormRequest;
use App\Models\AuditLog;
use App\Models\TenantRole;
use App\Models\User;
use App\Support\Audit;
use App\Support\TenantPermissions;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Permissions → Client role templates (§10, ROL-01..09): the roles × permissions matrix for client
// dashboards, three states per cell, custom roles copied from existing ones, and the recent changes.
class TenantRoleController extends Controller
{
    public function index()
    {
        $roles = TenantRole::orderBy('sort_order')->orderBy('id')->get();
        $users = User::whereIn('role', $roles->pluck('key'))->selectRaw('role, count(*) as c')->groupBy('role')->pluck('c', 'role');

        $data = $roles->map(fn (TenantRole $role) => $role->toPublicArray((int) ($users[$role->key] ?? 0)))->values();

        // ROL-07: how the cells of the whole matrix split between the three states.
        $stats = array_fill_keys(TenantPermissions::states(), 0);
        foreach ($data as $role) {
            foreach ($role['permissions'] as $state) {
                $stats[$state]++;
            }
        }

        // ROL-08: the latest changes to these roles.
        $recent = AuditLog::with('actor:id,name_ar,name_en')->where('entity_type', 'tenant_role')
            ->orderByDesc('created_at')->orderByDesc('id')->limit(5)->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->cuid,
                'action' => $log->action,
                'actorNameAr' => $log->actor?->name_ar,
                'actorNameEn' => $log->actor?->name_en,
                'actorEmail' => $log->actor_email,
                'metadata' => $log->metadata ? json_decode($log->metadata, true) : null,
                'createdAt' => optional($log->created_at)->toIso8601String(),
            ]);

        return $this->item([
            'groups' => config('tenant_permissions.groups'),
            'states' => TenantPermissions::states(),
            'roles' => $data,
            'stats' => $stats + ['total' => array_sum($stats)],
            'recent' => $recent,
        ]);
    }

    // ROL-04: a custom role, optionally starting from another role's permissions.
    public function store(TenantRoleFormRequest $request)
    {
        $source = $request->filled('copyFrom') ? TenantRole::where('cuid', $request->input('copyFrom'))->first() : null;

        $role = TenantRole::create($request->fields() + [
            'key' => 'custom_'.Str::lower((string) Str::ulid()),
            'type' => 'custom',
            'permissions' => TenantPermissions::complete($source?->permissions ?? []),
            'sort_order' => (int) TenantRole::max('sort_order') + 1,
        ]);

        $this->audit($request, 'created', $role, array_filter(['copiedFrom' => $source?->key]));

        return $this->item($role->toPublicArray(0), 201);
    }

    public function update(TenantRoleFormRequest $request, TenantRole $tenantRole)
    {
        $tenantRole->update($request->fields());
        $this->audit($request, 'updated', $tenantRole, ['changed' => array_keys($tenantRole->getChanges())]);

        return $this->item($tenantRole->toPublicArray());
    }

    // Changes some cells of the matrix. The audit row lists each change as permission: from → to.
    public function updatePermissions(TenantRolePermissionsFormRequest $request, TenantRole $tenantRole)
    {
        if ($request->unknownKeys()) {
            return $this->error('unknown_permission', 422);
        }

        $current = TenantPermissions::complete($tenantRole->permissions ?? []);
        $changes = [];
        foreach ($request->changes() as $permission => $state) {
            if ($current[$permission] !== $state) {
                $changes[$permission] = ['from' => $current[$permission], 'to' => $state];
                $current[$permission] = $state;
            }
        }

        if ($changes) {
            $tenantRole->update(['permissions' => $current]);
            $this->audit($request, 'permissions_updated', $tenantRole, ['changes' => $changes]);
        }

        return $this->item($tenantRole->toPublicArray());
    }

    // System roles stay; a custom role can go once nobody has it.
    public function destroy(Request $request, TenantRole $tenantRole)
    {
        if ($tenantRole->isSystem()) {
            return $this->error('cannot_delete_system_role', 409);
        }
        if ($tenantRole->usersCount() > 0) {
            return $this->error('role_in_use', 409);
        }

        $tenantRole->delete();
        $this->audit($request, 'deleted', $tenantRole);

        return $this->ok();
    }

    private function audit(Request $request, string $what, TenantRole $role, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "tenant_role.$what",
            'actor' => $request->user(),
            'entity_type' => 'tenant_role',
            'entity_id' => $role->cuid,
            'metadata' => ['key' => $role->key, 'nameAr' => $role->name_ar, 'nameEn' => $role->name_en] + $metadata,
        ]);
    }
}
