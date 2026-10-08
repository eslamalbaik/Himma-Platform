<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use App\Models\Tenant;
use App\Support\YoutubeSettings;
use Illuminate\Validation\Rule;

class TenantFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(Tenant::TYPES)],
            'status' => ['required', Rule::in(Tenant::STATUSES)],
            'billingEmail' => ['nullable', 'email', 'max:255'],
            // The client's own YouTube channel, from which it broadcasts its events.
            'youtubeChannelUrl' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                if (! YoutubeSettings::isChannelUrl($value)) {
                    $fail('channel');
                }
            }],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_tenant_name',
            'nameEn' => 'invalid_tenant_name',
            'type' => 'invalid_tenant_type',
            'status' => 'invalid_tenant_status',
            'billingEmail' => 'invalid_billing_email',
            'youtubeChannelUrl' => 'invalid_youtube_channel',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => $this->input('nameAr'),
            'name_en' => $this->input('nameEn'),
            'type' => $this->input('type'),
            'status' => $this->input('status'),
            'billing_email' => $this->input('billingEmail') ?: null,
            'youtube_channel_url' => filled($this->input('youtubeChannelUrl')) ? trim($this->input('youtubeChannelUrl')) : null,
        ];
    }
}
