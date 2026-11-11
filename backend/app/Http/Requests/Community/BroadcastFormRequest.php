<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\ApiRequest;
use App\Models\Event;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

// An organization's own event or live broadcast. The organization is always the signed-in admin's own.
class BroadcastFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'titleAr' => ['required', 'string', 'max:255'],
            'titleEn' => ['required', 'string', 'max:255'],
            'descriptionAr' => ['nullable', 'string', 'max:5000'],
            'descriptionEn' => ['nullable', 'string', 'max:5000'],
            'type' => ['required', Rule::in(Event::TYPES)],
            'format' => ['required', Rule::in(Event::FORMATS)],
            // Public, or for the organization's own members only.
            'visibility' => ['required', Rule::in(['public', 'institutional'])],
            'location' => [Rule::requiredIf(in_array($this->input('format'), ['onsite', 'hybrid'], true)), 'nullable', 'string', 'max:255'],
            'startsAt' => ['required', 'date'],
            'endsAt' => ['required', 'date', 'after:startsAt'],
            'streamUrl' => ['nullable', 'url:https', 'max:500'],
            'recordingUrl' => ['nullable', 'url:https', 'max:500'],
        ];
    }

    protected function codes(): array
    {
        return [
            'titleAr' => 'invalid_event_title',
            'titleEn' => 'invalid_event_title',
            'descriptionAr' => 'invalid_description',
            'descriptionEn' => 'invalid_description',
            'type' => 'invalid_event_type',
            'format' => 'invalid_event_format',
            'visibility' => 'invalid_visibility',
            'location' => 'location_required',
            'startsAt' => 'invalid_event_dates',
            'endsAt' => 'invalid_event_dates',
            'streamUrl' => 'invalid_stream_url',
            'recordingUrl' => 'invalid_recording_url',
        ];
    }

    public function fields(): array
    {
        return [
            'title_ar' => trim($this->input('titleAr')),
            'title_en' => trim($this->input('titleEn')),
            'description_ar' => $this->input('descriptionAr'),
            'description_en' => $this->input('descriptionEn'),
            'type' => $this->input('type'),
            'format' => $this->input('format'),
            'visibility' => $this->input('visibility'),
            'location' => $this->input('format') === 'online' ? null : $this->input('location'),
            'starts_at' => Carbon::parse($this->input('startsAt'))->setTimezone(config('app.timezone')),
            'ends_at' => Carbon::parse($this->input('endsAt'))->setTimezone(config('app.timezone')),
            'stream_url' => $this->input('format') === 'onsite' ? null : $this->input('streamUrl'),
            'recording_url' => $this->input('recordingUrl'),
        ];
    }
}
