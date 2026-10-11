<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\YouTubeSettingsFormRequest;
use App\Models\Setting;
use App\Settings\Secrets;
use App\Settings\YouTube;
use App\Support\Audit;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

// Settings → YouTube.
class YouTubeSettingsController extends Controller
{
    public function show()
    {
        return $this->item(YouTube::toPublicArray());
    }

    public function update(YouTubeSettingsFormRequest $request)
    {
        $current = YouTube::all();
        $values = [
            'channelId' => (string) $request->input('channelId', ''),
            'restrictStreamHosts' => $request->boolean('restrictStreamHosts'),
        ];
        if ($values['channelId'] !== $current['channelId']) {
            // A different channel has not been checked yet.
            $values += ['channelTitle' => '', 'checkedAt' => null];
        }

        $keyChange = null;
        if ($request->boolean('clearApiKey')) {
            $values['apiKey'] = null;
            $keyChange = 'cleared';
        } elseif ($request->filled('apiKey')) {
            $values['apiKey'] = Secrets::seal(trim($request->input('apiKey')));
            $keyChange = 'replaced';
        }

        Setting::putGroup('youtube', $values);

        Audit::log($request, [
            'action' => 'settings.youtube_updated',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'youtube',
            // Never the key itself.
            'metadata' => array_filter([
                'channelId' => $values['channelId'],
                'restrictStreamHosts' => $values['restrictStreamHosts'],
                'apiKey' => $keyChange,
            ], fn ($v) => $v !== null),
        ]);

        return $this->item(YouTube::toPublicArray());
    }

    // Reads the channel with the stored key and remembers its title, so the owner sees the right
    // channel is configured.
    public function test(Request $request)
    {
        $settings = YouTube::all();
        $key = YouTube::apiKey();
        if (! $key || ! $settings['channelId']) {
            return $this->error('youtube_not_configured', 409);
        }

        try {
            $response = Http::timeout(10)->get('https://www.googleapis.com/youtube/v3/channels', [
                'part' => 'snippet',
                'id' => $settings['channelId'],
                'key' => $key,
            ]);
        } catch (ConnectionException $e) {
            report($e);

            return $this->error('youtube_unreachable', 502);
        }

        if (! $response->successful()) {
            return $this->error('youtube_rejected', 502);
        }

        $title = $response->json('items.0.snippet.title');
        if (! $title) {
            return $this->error('youtube_channel_not_found', 404);
        }

        Setting::putGroup('youtube', ['channelTitle' => $title, 'checkedAt' => now()->toIso8601String()]);
        Audit::log($request, [
            'action' => 'settings.youtube_checked',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'youtube',
            'metadata' => ['channelId' => $settings['channelId']],
        ]);

        return $this->item(YouTube::toPublicArray());
    }
}
