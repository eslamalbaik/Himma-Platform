<?php

namespace App\Http\Requests\Landing;

use App\Http\Requests\ApiRequest;
use App\Models\Plan;
use Illuminate\Validation\Rule;

class PlanDisplayRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'showOnSite' => ['required', 'boolean'],
            'isFeatured' => ['required', 'boolean'],
            'theme' => ['required', Rule::in(Plan::THEMES)],
            'yearlyPrice' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'badgeAr' => ['nullable', 'string', 'max:100'],
            'badgeEn' => ['nullable', 'string', 'max:100'],
            'descriptionAr' => ['nullable', 'string', 'max:500'],
            'descriptionEn' => ['nullable', 'string', 'max:500'],
            'ctaLabelAr' => ['nullable', 'string', 'max:100'],
            'ctaLabelEn' => ['nullable', 'string', 'max:100'],
            // A path on this site, an https address or a mailto link; never javascript: or other schemes.
            'ctaUrl' => ['nullable', 'string', 'max:500', 'regex:/^(\/(?!\/)|https:\/\/|mailto:)\S*$/'],
            'featureGroups' => ['present', 'array', 'max:10'],
            'featureGroups.*.titleAr' => ['required', 'string', 'max:150'],
            'featureGroups.*.titleEn' => ['required', 'string', 'max:150'],
            'featureGroups.*.items' => ['present', 'array', 'max:20'],
            'featureGroups.*.items.*.textAr' => ['required', 'string', 'max:250'],
            'featureGroups.*.items.*.textEn' => ['required', 'string', 'max:250'],
            'featureGroups.*.items.*.included' => ['required', 'boolean'],
        ];
    }

    protected function codes(): array
    {
        return [
            'theme' => 'invalid_theme',
            'yearlyPrice' => 'invalid_yearly_price',
            'ctaUrl' => 'invalid_cta_url',
            'featureGroups' => 'invalid_feature_groups',
            'featureGroups.*' => 'invalid_feature_groups',
            'featureGroups.*.titleAr' => 'invalid_feature_groups',
            'featureGroups.*.titleEn' => 'invalid_feature_groups',
            'featureGroups.*.items' => 'invalid_feature_groups',
            'featureGroups.*.items.*.textAr' => 'invalid_feature_groups',
            'featureGroups.*.items.*.textEn' => 'invalid_feature_groups',
            'featureGroups.*.items.*.included' => 'invalid_feature_groups',
        ];
    }

    public function fields(): array
    {
        $groups = collect($this->input('featureGroups', []))->map(fn ($group) => [
            'titleAr' => $group['titleAr'], 'titleEn' => $group['titleEn'],
            'items' => collect($group['items'])->map(fn ($item) => [
                'textAr' => $item['textAr'], 'textEn' => $item['textEn'], 'included' => (bool) $item['included'],
            ])->values()->all(),
        ])->values()->all();

        return [
            'show_on_site' => $this->boolean('showOnSite'),
            'is_featured' => $this->boolean('isFeatured'),
            'theme' => $this->input('theme'),
            'yearly_price' => $this->filled('yearlyPrice') ? $this->input('yearlyPrice') : null,
            'badge_ar' => $this->input('badgeAr'), 'badge_en' => $this->input('badgeEn'),
            'description_ar' => $this->input('descriptionAr'), 'description_en' => $this->input('descriptionEn'),
            'cta_label_ar' => $this->input('ctaLabelAr'), 'cta_label_en' => $this->input('ctaLabelEn'),
            'cta_url' => $this->input('ctaUrl'),
            'feature_groups' => $groups,
        ];
    }
}
