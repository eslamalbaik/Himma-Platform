<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PublishingSettingsFormRequest;
use App\Models\Setting;
use App\Support\Audit;
use App\Support\PublishingRules;

// Settings → Publishing. Anyone who reads content reads the rules (the article form shows them);
// only settings managers change them.
class PublishingSettingsController extends Controller
{
    public function show()
    {
        return $this->item(PublishingRules::settings());
    }

    public function update(PublishingSettingsFormRequest $request)
    {
        Setting::putGroup('publishing', $request->fields());

        Audit::log($request, [
            'action' => 'settings.publishing_updated',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'publishing',
            'metadata' => $request->fields(),
        ]);

        return $this->item(PublishingRules::settings());
    }
}
