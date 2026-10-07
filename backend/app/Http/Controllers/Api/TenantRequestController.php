<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\JoinRequestFormRequest;
use App\Models\Tenant;
use App\Models\TenantRequest;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        return $this->item($tenantRequest->toPublicArray(), 201);
    }

    public function approve(Request $request, TenantRequest $tenantRequest)
    {
        $tenant = DB::transaction(function () use ($request, $tenantRequest) {
            // Locked so two reviewers clicking at once cannot both create a tenant.
            if (TenantRequest::whereKey($tenantRequest->id)->lockForUpdate()->value('status') !== 'pending') {
                return null;
            }

            $tenant = Tenant::create([
                'name_ar' => $tenantRequest->name_ar,
                'name_en' => $tenantRequest->name_en,
                'type' => $tenantRequest->type,
                'status' => 'trial',
            ]);

            $tenantRequest->update([
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'tenant_id' => $tenant->id,
            ]);

            return $tenant;
        });

        if (! $tenant) {
            return $this->error('request_already_reviewed', 409);
        }

        Audit::log($request, [
            'action' => 'tenant_request.approved',
            'actor' => $request->user(),
            'entity_type' => 'tenant_request',
            'entity_id' => $tenantRequest->cuid,
            'metadata' => ['tenantId' => $tenant->cuid],
        ]);

        return $this->item($tenantRequest->fresh()->toPublicArray());
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
