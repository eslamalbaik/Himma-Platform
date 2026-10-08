<?php

namespace App\Support;

use App\Models\Setting;

// Settings → YouTube (Setting group `youtube`): how live events use YouTube. Enforced by the event endpoints
// (EventFormRequest, EndBroadcastFormRequest, EventController::end) and read by the live page.
class YoutubeSettings
{
    public const DEFAULTS = [
        'channelUrl' => null,
        'channelNameAr' => null,
        'channelNameEn' => null,
        // Stream and recording links must be YouTube links.
        'youtubeOnly' => false,
        // Embed through youtube-nocookie.com, which sets no cookies until the viewer plays the video.
        'privacyEnhanced' => false,
        // Ending a broadcast needs the recording link.
        'recordingRequired' => false,
    ];

    public static function settings(): array
    {
        return Setting::group('youtube', self::DEFAULTS);
    }

    // A YouTube watch, short, live, embed or youtu.be link (same rule as youtubeEmbedUrl in the browser).
    public static function isVideoUrl(?string $url): bool
    {
        $parts = $url ? parse_url($url) : false;
        if (! $parts || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])) {
            return false;
        }

        $host = preg_replace('/^(www\.|m\.)/', '', strtolower($parts['host']));
        $path = $parts['path'] ?? '';
        parse_str($parts['query'] ?? '', $query);

        $id = match ($host) {
            'youtu.be' => ltrim($path, '/'),
            'youtube.com', 'youtube-nocookie.com' => $query['v'] ?? (preg_match('#^/(?:live|embed|shorts)/([^/?]+)#', $path, $m) ? $m[1] : null),
            default => null,
        };

        return is_string($id) && preg_match('/^[\w-]{6,20}$/', $id) === 1;
    }

    // A channel page: youtube.com/@handle, /channel/<id>, /c/<name> or /user/<name>.
    public static function isChannelUrl(?string $url): bool
    {
        $parts = $url ? parse_url($url) : false;
        if (! $parts || ($parts['scheme'] ?? '') !== 'https') {
            return false;
        }

        $host = preg_replace('/^(www\.|m\.)/', '', strtolower($parts['host'] ?? ''));

        return $host === 'youtube.com' && preg_match('#^/(@[\w.-]+|channel/[\w-]+|c/[\w.-]+|user/[\w.-]+)/?$#', $parts['path'] ?? '') === 1;
    }
}
