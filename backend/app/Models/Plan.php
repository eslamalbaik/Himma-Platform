<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasCuid;

    public const INTERVALS = ['monthly', 'yearly'];

    public const THEMES = ['light', 'primary', 'dark'];

    protected $fillable = [
        'name_ar', 'name_en', 'price', 'currency', 'interval', 'features_ar', 'features_en', 'is_active',
        'show_on_site', 'site_order', 'badge_ar', 'badge_en', 'description_ar', 'description_en', 'theme',
        'is_featured', 'cta_label_ar', 'cta_label_en', 'cta_url', 'feature_groups',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2', 'is_active' => 'boolean', 'show_on_site' => 'boolean', 'is_featured' => 'boolean',
            'feature_groups' => 'array',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'price' => (float) $this->price,
            'currency' => $this->currency,
            'interval' => $this->interval,
            'featuresAr' => $this->features_ar,
            'featuresEn' => $this->features_en,
            'isActive' => $this->is_active,
            'subscriptionsCount' => $this->subscriptions_count ?? null,
        ];
    }

    // The display fields of the public pricing section (admin lists them all; the site only the visible ones).
    public function toLandingArray(): array
    {
        return [
            'id' => $this->cuid,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'price' => (float) $this->price,
            'currency' => $this->currency,
            'interval' => $this->interval,
            'isActive' => $this->is_active,
            'showOnSite' => $this->show_on_site,
            'siteOrder' => $this->site_order,
            'badgeAr' => $this->badge_ar,
            'badgeEn' => $this->badge_en,
            'descriptionAr' => $this->description_ar,
            'descriptionEn' => $this->description_en,
            'theme' => $this->theme,
            'isFeatured' => $this->is_featured,
            'ctaLabelAr' => $this->cta_label_ar,
            'ctaLabelEn' => $this->cta_label_en,
            'ctaUrl' => $this->cta_url,
            'featureGroups' => $this->feature_groups ?? [],
        ];
    }
}
