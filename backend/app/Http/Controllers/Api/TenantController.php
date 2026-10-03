<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    private const TYPES = ['association', 'school', 'institution', 'government'];
    private const STATUSES = ['trial', 'active', 'suspended', 'cancelled'];

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'read', 'tenants')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $query = Tenant::withCount('users');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($type = $request->query('type')) {
            if (in_array($type, self::TYPES, true)) {
                $query->where('type', $type);
            }
        }

        if ($status = $request->query('status')) {
            if (in_array($status, self::STATUSES, true)) {
                $query->where('status', $status);
            }
        }

        $perPage = min(max((int) $request->query('perPage', 25), 1), 100);
        $tenants = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $tenants->getCollection()->map(fn (Tenant $t) => $t->toPublicArray())->values(),
            'meta' => [
                'total' => $tenants->total(),
                'perPage' => $tenants->perPage(),
                'currentPage' => $tenants->currentPage(),
                'lastPage' => $tenants->lastPage(),
            ],
        ])->header('Cache-Control', 'no-store');
    }

    public function show(Request $request, Tenant $tenant)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'read', 'tenants')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $tenant->loadCount('users');

        return response()->json(['data' => $tenant->toPublicArray()])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'create', 'tenants')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        if ($errorCode = $this->invalidFieldsCode($request)) {
            return response()->json(['error' => ['code' => $errorCode]], 422);
        }

        $tenant = Tenant::create($this->fieldsFrom($request));

        Audit::log($request, [
            'action' => 'tenant.created',
            'actor' => $user,
            'entity_type' => 'tenant',
            'entity_id' => $tenant->cuid,
            'metadata' => ['nameEn' => $tenant->name_en, 'type' => $tenant->type],
        ]);

        return response()->json(['data' => $tenant->toPublicArray()], 201);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'update', 'tenants')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        if ($errorCode = $this->invalidFieldsCode($request)) {
            return response()->json(['error' => ['code' => $errorCode]], 422);
        }

        $tenant->update($this->fieldsFrom($request));

        Audit::log($request, [
            'action' => 'tenant.updated',
            'actor' => $user,
            'entity_type' => 'tenant',
            'entity_id' => $tenant->cuid,
            'metadata' => ['nameEn' => $tenant->name_en, 'status' => $tenant->status],
        ]);

        return response()->json(['data' => $tenant->toPublicArray()]);
    }

    public function destroy(Request $request, Tenant $tenant)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'delete', 'tenants')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $cuid = $tenant->cuid;
        $tenant->delete();

        Audit::log($request, [
            'action' => 'tenant.deleted',
            'actor' => $user,
            'entity_type' => 'tenant',
            'entity_id' => $cuid,
        ]);

        return response()->json(['ok' => true]);
    }

    // Returns an `errors.<code>` key for the first invalid field, or null when the payload is valid.
    private function invalidFieldsCode(Request $request): ?string
    {
        $nameAr = trim((string) $request->input('nameAr', ''));
        $nameEn = trim((string) $request->input('nameEn', ''));

        if ($nameAr === '' || mb_strlen($nameAr) > 255 || $nameEn === '' || mb_strlen($nameEn) > 255) {
            return 'invalid_tenant_name';
        }
        if (!in_array($request->input('type'), self::TYPES, true)) {
            return 'invalid_tenant_type';
        }
        if (!in_array($request->input('status'), self::STATUSES, true)) {
            return 'invalid_tenant_status';
        }

        return null;
    }

    private function fieldsFrom(Request $request): array
    {
        return [
            'name_ar' => trim((string) $request->input('nameAr')),
            'name_en' => trim((string) $request->input('nameEn')),
            'type' => $request->input('type'),
            'status' => $request->input('status'),
        ];
    }
}
