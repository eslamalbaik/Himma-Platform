<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Permissions\RolePermissionRequest;
use App\Http\Requests\Permissions\RoleTemplateFormRequest;
use App\Models\AuditLog;
use App\Models\RoleTemplate;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Permissions → Client role templates (REQUIREMENTS.md §10, ROL-01..08): the roles offered to clients, members
// and the public, and a three-state matrix of what each may do. Every change is audited.
class RoleTemplateController extends Controller
{
    public function index(Request $request)
    {
        $roles = RoleTemplate::with('editor')->orderBy('sort_order')->orderBy('id')->get();

        // Latest role changes (ROL-08), for those who may read the audit log.
        $recent = Ability::can($request->user()->role, 'read', 'audit')
            ? AuditLog::with('actor')->where('action', 'like', 'role_template.%')->latest('id')->limit(5)->get()
                ->map(fn (AuditLog $log) => [
                    'id' => $log->cuid,
                    'action' => $log->action,
                    'actorNameAr' => $log->actor?->name_ar,
                    'actorNameEn' => $log->actor?->name_en,
                    'actorEmail' => $log->actor_email,
                    'metadata' => $log->metadata ? json_decode($log->metadata, true) : null,
                    'createdAt' => optional($log->created_at)->toIso8601String(),
                ])->values()
            : null;

        return response()->json([
            'data' => $roles->map(fn (RoleTemplate $role) => $role->toPublicArray())->values(),
            'groups' => RoleTemplate::PERMISSION_GROUPS,
            'recentEvents' => $recent,
        ])->header('Cache-Control', 'no-store');
    }

    public function store(RoleTemplateFormRequest $request)
    {
        $role = RoleTemplate::create($request->fields() + [
            'key' => $this->newKey($request->fields()['name_en']),
            'type' => 'custom',
            'permissions' => $request->copiedPermissions(),
            'sort_order' => (int) RoleTemplate::max('sort_order') + 1,
            'updated_by' => $request->user()->id,
        ]);

        $this->audit($request, 'created', $role, ['copyFrom' => $request->input('copyFrom')]);

        return $this->item($role->load('editor')->toPublicArray(), 201);
    }

    public function update(RoleTemplateFormRequest $request, RoleTemplate $roleTemplate)
    {
        $roleTemplate->update($request->fields() + ['updated_by' => $request->user()->id]);
        $this->audit($request, 'updated', $roleTemplate);

        return $this->item($roleTemplate->load('editor')->toPublicArray());
    }

    // Sets one cell of the matrix.
    public function setPermission(RolePermissionRequest $request, RoleTemplate $roleTemplate, string $permission)
    {
        $from = $roleTemplate->states()[$permission];
        $to = $request->input('state');

        if ($from !== $to) {
            $roleTemplate->update([
                'permissions' => [$permission => $to] + $roleTemplate->states(),
                'updated_by' => $request->user()->id,
            ]);
            $this->audit($request, 'permission_changed', $roleTemplate, compact('permission', 'from', 'to'));
        }

        return $this->item($roleTemplate->load('editor')->toPublicArray());
    }

    // System roles stay; a custom role can go once no account holds it.
    public function destroy(Request $request, RoleTemplate $roleTemplate)
    {
        if ($roleTemplate->type === 'system') {
            return $this->error('system_role_locked', 409);
        }
        if ($roleTemplate->usersCount() > 0) {
            return $this->error('role_in_use', 409);
        }

        $roleTemplate->delete();
        $this->audit($request, 'deleted', $roleTemplate);

        return $this->ok();
    }

    // Accounts hold a role by its key, so custom roles get one too: custom_<english name>, made unique.
    // It never changes, even when the role is renamed.
    private function newKey(string $nameEn): string
    {
        $base = 'custom_'.(Str::slug($nameEn, '_') ?: 'role');
        $key = $base;
        for ($i = 2; RoleTemplate::where('key', $key)->exists(); $i++) {
            $key = "{$base}_{$i}";
        }

        return $key;
    }

    private function audit(Request $request, string $what, RoleTemplate $role, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "role_template.$what",
            'actor' => $request->user(),
            'entity_type' => 'role_template',
            'entity_id' => $role->cuid,
            'metadata' => ['nameAr' => $role->name_ar, 'nameEn' => $role->name_en] + array_filter($metadata),
        ]);
    }
}
