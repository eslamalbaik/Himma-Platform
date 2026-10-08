<?php

namespace App\Http\Controllers\Client;

use App\Http\Requests\Client\ClientProfileRequest;
use App\Support\Audit;
use Illuminate\Http\Request;

// Client profile: names, type and status are read-only here (the platform team keeps them);
// the client keeps its billing email, contact phone and YouTube channel up to date.
class ProfileController extends ClientController
{
    public function show(Request $request)
    {
        return $this->item($this->tenant($request)->toPublicArray());
    }

    public function update(ClientProfileRequest $request)
    {
        $tenant = $this->tenant($request);
        $tenant->update($request->fields());

        Audit::log($request, [
            'action' => 'client.profile_updated',
            'actor' => $request->user(),
            'entity_type' => 'tenant',
            'entity_id' => $tenant->cuid,
            'metadata' => $request->fields(),
        ]);

        return $this->item($tenant->fresh()->toPublicArray());
    }
}
