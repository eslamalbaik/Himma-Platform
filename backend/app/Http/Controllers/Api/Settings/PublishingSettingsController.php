<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PublishingSettingsFormRequest;
use App\Models\Setting;
use App\Settings\Publishing;
use App\Support\Audit;

// Settings → Publishing. The rules are enforced by ArticleController (submit and publish).
class PublishingSettingsController extends Controller
{
    public function show()
    {
        return $this->item(Publishing::all());
    }

    public function update(PublishingSettingsFormRequest $request)
    {
        $before = Publishing::all();
        Setting::putGroup('publishing', $request->fields());
        $after = Publishing::all();

        Audit::log($request, [
            'action' => 'settings.publishing_updated',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'publishing',
            'metadata' => ['changed' => array_keys(array_diff_assoc($after, $before))],
        ]);

        return $this->item($after);
    }
}
