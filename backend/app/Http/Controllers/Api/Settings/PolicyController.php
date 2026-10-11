<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PolicyFormRequest;
use App\Models\Setting;
use App\Settings\Policies;
use App\Settings\Publishing;
use App\Support\Audit;

// Settings → Policies: the texts of the public policies page (§7). `published` is the public read,
// for the site and anyone signed out.
class PolicyController extends Controller
{
    public function index()
    {
        return $this->item(['keys' => Policies::KEYS, 'policies' => Policies::all()]);
    }

    public function update(PolicyFormRequest $request, string $key)
    {
        if (! in_array($key, Policies::KEYS, true)) {
            return $this->error('not_found', 404);
        }

        $before = Policies::all()[$key];
        $texts = $request->texts();
        if ($texts['ar'] === $before['ar'] && $texts['en'] === $before['en']) {
            return $this->item(['key' => $key] + $before);
        }

        $policy = $texts + ['updatedAt' => now()->toIso8601String()];
        Setting::putGroup('policies', [$key => $policy]);

        // The text itself is kept by the settings row; the audit row records who changed which policy.
        Audit::log($request, [
            'action' => 'settings.policy_updated',
            'actor' => $request->user(),
            'entity_type' => 'policy',
            'entity_id' => $key,
            'metadata' => ['arLength' => mb_strlen($texts['ar']), 'enLength' => mb_strlen($texts['en'])],
        ]);

        return $this->item(['key' => $key] + $policy);
    }

    public function published()
    {
        $publishing = Publishing::all();

        return response()->json(['data' => [
            'policies' => Policies::published(),
            'sponsoredLabel' => ['ar' => $publishing['sponsoredLabelAr'], 'en' => $publishing['sponsoredLabelEn']],
        ]])->header('Cache-Control', 'public, max-age=300');
    }
}
