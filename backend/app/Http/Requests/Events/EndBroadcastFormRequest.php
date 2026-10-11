<?php

namespace App\Http\Requests\Events;

use App\Http\Requests\ApiRequest;
use App\Settings\YouTube;

// Ending a broadcast can attach the recording link at the same time.
class EndBroadcastFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['recordingUrl' => YouTube::urlRules()];
    }

    protected function codes(): array
    {
        return ['recordingUrl.regex' => 'stream_url_not_youtube', 'recordingUrl' => 'invalid_recording_url'];
    }
}
