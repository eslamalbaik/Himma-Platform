<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\OrganizationFormRequest;
use App\Models\Tenant;
use App\Support\Audit;
use Illuminate\Http\Request;

// The signed-in organization admin's own organization: its public profile (`/api/me/organization`).
// Billing, status and plan stay with the platform team.
class OrganizationController extends Controller
{
    public function show(Request $request)
    {
        $tenant = $this->tenant($request);

        return $tenant ? $this->item($this->array($tenant)) : $this->error('not_found', 404);
    }

    public function update(OrganizationFormRequest $request)
    {
        $tenant = $this->tenant($request);
        if (! $tenant) {
            return $this->error('not_found', 404);
        }

        $tenant->update($request->fields());

        Audit::log($request, [
            'action' => 'organization.profile_updated',
            'actor' => $request->user(),
            'entity_type' => 'tenant',
            'entity_id' => $tenant->cuid,
        ]);

        return $this->item($this->array($tenant->fresh()));
    }

    private function tenant(Request $request): ?Tenant
    {
        return $request->user()->tenant;
    }

    private function array(Tenant $tenant): array
    {
        return [
            'slug' => $tenant->slug,
            'nameAr' => $tenant->name_ar,
            'nameEn' => $tenant->name_en,
            'bioAr' => $tenant->bio_ar,
            'bioEn' => $tenant->bio_en,
            'website' => $tenant->website,
            'verified' => $tenant->verified_at !== null,
        ];
    }
}
