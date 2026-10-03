<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantRequest;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;

class TenantRequestController extends Controller
{
    private const TYPES = ['association', 'school', 'institution', 'government'];
    private const STATUSES = ['pending', 'approved', 'rejected'];

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'read', 'tenants')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $query = TenantRequest::query();

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            if (in_array($status, self::STATUSES, true)) {
                $query->where('status', $status);
            }
        }

        $perPage = min(max((int) $request->query('perPage', 25), 1), 100);
        $requests = $query->orderByRaw("status = 'pending' desc")->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $requests->getCollection()->map(fn (TenantRequest $r) => $r->toPublicArray())->values(),
            'meta' => [
                'total' => $requests->total(),
                'perPage' => $requests->perPage(),
                'currentPage' => $requests->currentPage(),
                'lastPage' => $requests->lastPage(),
                'pendingCount' => TenantRequest::where('status', 'pending')->count(),
            ],
        ])->header('Cache-Control', 'no-store');
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

        $tenantRequest = TenantRequest::create([
            'name_ar' => trim((string) $request->input('nameAr')),
            'name_en' => trim((string) $request->input('nameEn')),
            'type' => $request->input('type'),
            'contact_name' => trim((string) $request->input('contactName')),
            'contact_email' => trim((string) $request->input('contactEmail')),
            'contact_phone' => $request->filled('contactPhone') ? trim((string) $request->input('contactPhone')) : null,
            'message' => $request->filled('message') ? trim((string) $request->input('message')) : null,
            'status' => 'pending',
        ]);

        Audit::log($request, [
            'action' => 'tenant_request.created',
            'actor' => $user,
            'entity_type' => 'tenant_request',
            'entity_id' => $tenantRequest->cuid,
        ]);

        return response()->json(['data' => $tenantRequest->toPublicArray()], 201);
    }

    public function approve(Request $request, TenantRequest $tenantRequest)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'update', 'tenants')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }
        if ($tenantRequest->status !== 'pending') {
            return response()->json(['error' => ['code' => 'request_already_reviewed']], 409);
        }

        $tenant = Tenant::create([
            'name_ar' => $tenantRequest->name_ar,
            'name_en' => $tenantRequest->name_en,
            'type' => $tenantRequest->type,
            'status' => 'trial',
        ]);

        $tenantRequest->update([
            'status' => 'approved',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'tenant_id' => $tenant->id,
        ]);

        Audit::log($request, [
            'action' => 'tenant_request.approved',
            'actor' => $user,
            'entity_type' => 'tenant_request',
            'entity_id' => $tenantRequest->cuid,
            'metadata' => ['tenantId' => $tenant->cuid],
        ]);

        return response()->json(['data' => $tenantRequest->fresh()->toPublicArray()]);
    }

    public function reject(Request $request, TenantRequest $tenantRequest)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'update', 'tenants')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }
        if ($tenantRequest->status !== 'pending') {
            return response()->json(['error' => ['code' => 'request_already_reviewed']], 409);
        }

        $reason = trim((string) $request->input('reason', ''));

        $tenantRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'rejection_reason' => $reason !== '' ? $reason : null,
        ]);

        Audit::log($request, [
            'action' => 'tenant_request.rejected',
            'actor' => $user,
            'entity_type' => 'tenant_request',
            'entity_id' => $tenantRequest->cuid,
            'metadata' => ['reason' => $reason],
        ]);

        return response()->json(['data' => $tenantRequest->fresh()->toPublicArray()]);
    }

    private function invalidFieldsCode(Request $request): ?string
    {
        $nameAr = trim((string) $request->input('nameAr', ''));
        $nameEn = trim((string) $request->input('nameEn', ''));
        $contactName = trim((string) $request->input('contactName', ''));
        $contactEmail = trim((string) $request->input('contactEmail', ''));

        if ($nameAr === '' || mb_strlen($nameAr) > 255 || $nameEn === '' || mb_strlen($nameEn) > 255) {
            return 'invalid_tenant_name';
        }
        if (!in_array($request->input('type'), self::TYPES, true)) {
            return 'invalid_tenant_type';
        }
        if ($contactName === '' || mb_strlen($contactName) > 255) {
            return 'invalid_contact_name';
        }
        if ($contactEmail === '' || !filter_var($contactEmail, FILTER_VALIDATE_EMAIL)) {
            return 'invalid_contact_email';
        }

        return null;
    }
}
