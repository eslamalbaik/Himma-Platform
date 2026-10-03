<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PlatformSettingsFormRequest;
use App\Models\PlatformSetting;
use App\Support\Audit;

class PlatformSettingController extends Controller
{
    public function show()
    {
        return $this->item(PlatformSetting::current()->toPublicArray());
    }

    public function update(PlatformSettingsFormRequest $request)
    {
        $settings = PlatformSetting::current();
        $settings->update($request->fields());

        Audit::log($request, [
            'action' => 'settings.updated',
            'actor' => $request->user(),
            'entity_type' => 'platform_settings',
            'entity_id' => (string) $settings->id,
            'metadata' => ['maintenanceMode' => $settings->maintenance_mode],
        ]);

        return $this->item($settings->fresh()->toPublicArray());
    }
}
