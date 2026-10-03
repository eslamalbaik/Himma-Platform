<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

// Public identifier (ULID) used in URLs and API responses instead of the numeric id.
trait HasCuid
{
    protected static function bootHasCuid(): void
    {
        static::creating(function ($model) {
            $model->cuid ??= (string) Str::ulid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'cuid';
    }
}
