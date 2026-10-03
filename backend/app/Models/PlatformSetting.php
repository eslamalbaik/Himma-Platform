<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// A single row (id=1) holding platform-wide settings.
class PlatformSetting extends Model
{
    protected $fillable = [
        'platform_name_ar',
        'platform_name_en',
        'default_locale',
        'support_email',
        'maintenance_mode',
    ];

    protected function casts(): array
    {
        return [
            'maintenance_mode' => 'boolean',
        ];
    }

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }

    public function toPublicArray(): array
    {
        return [
            'platformNameAr' => $this->platform_name_ar,
            'platformNameEn' => $this->platform_name_en,
            'defaultLocale' => $this->default_locale,
            'supportEmail' => $this->support_email,
            'maintenanceMode' => $this->maintenance_mode,
        ];
    }
}
