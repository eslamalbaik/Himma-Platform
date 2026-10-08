<?php

namespace App\Http\Requests\Events;

use App\Http\Requests\ApiRequest;
use App\Models\Event;
use App\Models\Tenant;
use App\Rules\YoutubeLink;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class EventFormRequest extends ApiRequest
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
            'visibility' => ['required', Rule::in(Event::VISIBILITIES)],
            // Institutional events are shown to one client's members only.
            'tenantId' => [
                Rule::requiredIf($this->input('visibility') === 'institutional'),
                'nullable', 'string', Rule::exists('tenants', 'cuid'),
            ],
            'location' => [Rule::requiredIf(in_array($this->input('format'), ['onsite', 'hybrid'], true)), 'nullable', 'string', 'max:255'],
            'startsAt' => ['required', 'date'],
            'endsAt' => ['required', 'date', 'after:startsAt'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'registrationRequired' => ['sometimes', 'boolean'],
            'isSponsored' => ['sometimes', 'boolean'],
            // Settings → YouTube may allow YouTube links only.
            'streamUrl' => ['nullable', 'url:https', 'max:500', new YoutubeLink],
            'recordingUrl' => ['nullable', 'url:https', 'max:500', new YoutubeLink],
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
            'tenantId.required' => 'tenant_required_for_visibility',
            'tenantId' => 'invalid_tenant',
            'location' => 'location_required',
            'startsAt' => 'invalid_event_dates',
            'endsAt' => 'invalid_event_dates',
            'capacity' => 'invalid_capacity',
            'streamUrl.youtube_link' => 'youtube_link_required',
            'recordingUrl.youtube_link' => 'youtube_link_required',
            'streamUrl' => 'invalid_stream_url',
            'recordingUrl' => 'invalid_recording_url',
        ];
    }

    public function fields(): array
    {
        $institutional = $this->input('visibility') === 'institutional';

        return [
            'title_ar' => trim($this->input('titleAr')),
            'title_en' => trim($this->input('titleEn')),
            'description_ar' => $this->input('descriptionAr'),
            'description_en' => $this->input('descriptionEn'),
            'type' => $this->input('type'),
            'format' => $this->input('format'),
            'visibility' => $this->input('visibility'),
            'tenant_id' => $institutional || $this->filled('tenantId')
                ? Tenant::where('cuid', $this->input('tenantId'))->value('id')
                : null,
            'location' => $this->input('format') === 'online' ? null : $this->input('location'),
            'starts_at' => Carbon::parse($this->input('startsAt'))->setTimezone(config('app.timezone')),
            'ends_at' => Carbon::parse($this->input('endsAt'))->setTimezone(config('app.timezone')),
            'capacity' => $this->filled('capacity') ? (int) $this->input('capacity') : null,
            'registration_required' => $this->boolean('registrationRequired'),
            'is_sponsored' => $this->boolean('isSponsored'),
            'stream_url' => $this->input('format') === 'onsite' ? null : $this->input('streamUrl'),
            'recording_url' => $this->input('recordingUrl'),
        ];
    }
}
