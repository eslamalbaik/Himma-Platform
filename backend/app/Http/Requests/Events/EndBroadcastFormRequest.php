<?php

namespace App\Http\Requests\Events;

use App\Http\Requests\ApiRequest;

// Ending a broadcast can attach the recording link at the same time.
class EndBroadcastFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['recordingUrl' => ['nullable', 'url:https', 'max:500']];
    }

    protected function codes(): array
    {
        return ['recordingUrl' => 'invalid_recording_url'];
    }
}
