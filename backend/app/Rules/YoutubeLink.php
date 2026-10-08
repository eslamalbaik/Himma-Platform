<?php

namespace App\Rules;

use App\Support\YoutubeSettings;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

// When Settings → YouTube allows YouTube links only, the value must be a YouTube video or live link.
// ApiRequest codes: '<field>.youtube_link'.
class YoutubeLink implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (filled($value) && YoutubeSettings::settings()['youtubeOnly'] && ! YoutubeSettings::isVideoUrl($value)) {
            $fail('youtube_link');
        }
    }
}
