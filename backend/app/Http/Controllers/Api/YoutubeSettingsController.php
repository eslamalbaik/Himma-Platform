<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\YoutubeSettingsFormRequest;
use App\Models\Setting;
use App\Support\Audit;
use App\Support\YoutubeSettings;

// Settings → YouTube. Event staff read it (the live page embeds and links by it); settings managers change it.
class YoutubeSettingsController extends Controller
{
    public function show()
    {
        return $this->item(YoutubeSettings::settings());
    }

    public function update(YoutubeSettingsFormRequest $request)
    {
        Setting::putGroup('youtube', $request->fields());

        Audit::log($request, [
            'action' => 'settings.youtube_updated',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'youtube',
            'metadata' => $request->fields(),
        ]);

        return $this->item(YoutubeSettings::settings());
    }
}
