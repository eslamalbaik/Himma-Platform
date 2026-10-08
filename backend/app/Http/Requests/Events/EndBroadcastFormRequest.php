<?php

namespace App\Http\Requests\Events;

use App\Http\Requests\ApiRequest;
use App\Rules\YoutubeLink;
use App\Support\YoutubeSettings;

// Ending a broadcast can attach the recording link at the same time.
class EndBroadcastFormRequest extends ApiRequest
{
    public function rules(): array
    {
        // A recording link already saved on the event is enough.
        $required = YoutubeSettings::settings()['recordingRequired'] && ! $this->route('event')?->recording_url;

        // Settings → YouTube may require the recording link, and a YouTube one.
        return ['recordingUrl' => [$required ? 'required' : 'nullable', 'url:https', 'max:500', new YoutubeLink]];
    }

    protected function codes(): array
    {
        return [
            'recordingUrl.required' => 'recording_url_required',
            'recordingUrl.youtube_link' => 'youtube_link_required',
            'recordingUrl' => 'invalid_recording_url',
        ];
    }
}
