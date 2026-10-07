<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasCuid;

    public const INTERVALS = ['monthly', 'yearly'];

    protected $fillable = ['name_ar', 'name_en', 'price', 'currency', 'interval', 'features_ar', 'features_en', 'is_active'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'is_active' => 'boolean'];
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
}
