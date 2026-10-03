<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TenantFormRequest;
use App\Models\Tenant;
use App\Support\Audit;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $query = Tenant::withCount('users');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if (in_array($type = $request->query('type'), Tenant::TYPES, true)) {
            $query->where('type', $type);
        }

        if (in_array($status = $request->query('status'), Tenant::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (Tenant $t) => $t->toPublicArray()
        );
    }

    public function show(Tenant $tenant)
    {
        return $this->item($tenant->loadCount('users')->toPublicArray());
    }

    public function store(TenantFormRequest $request)
    {
        $tenant = Tenant::create($request->fields());

        Audit::log($request, [
            'action' => 'tenant.created',
            'actor' => $request->user(),
            'entity_type' => 'tenant',
            'entity_id' => $tenant->cuid,
            'metadata' => ['nameEn' => $tenant->name_en, 'type' => $tenant->type],
        ]);

        return $this->item($tenant->toPublicArray(), 201);
    }

    public function update(TenantFormRequest $request, Tenant $tenant)
    {
        $tenant->update($request->fields());

        Audit::log($request, [
            'action' => 'tenant.updated',
            'actor' => $request->user(),
            'entity_type' => 'tenant',
            'entity_id' => $tenant->cuid,
            'metadata' => ['nameEn' => $tenant->name_en, 'status' => $tenant->status],
        ]);

        return $this->item($tenant->toPublicArray());
    }

    public function destroy(Request $request, Tenant $tenant)
    {
        $cuid = $tenant->cuid;
        $tenant->delete();

        Audit::log($request, [
            'action' => 'tenant.deleted',
            'actor' => $request->user(),
            'entity_type' => 'tenant',
            'entity_id' => $cuid,
        ]);

        return $this->ok();
    }
}
