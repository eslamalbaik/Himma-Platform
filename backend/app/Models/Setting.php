<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Grouped key/value settings (e.g. group "billing"). Values are stored as JSON.
class Setting extends Model
{
    protected $fillable = ['group', 'key', 'value'];

    public static function group(string $group, array $defaults): array
    {
        $stored = static::where('group', $group)->pluck('value', 'key')
            ->map(fn ($value) => json_decode($value, true))
            ->all();

        return array_intersect_key($stored, $defaults) + $defaults;
    }

    public static function putGroup(string $group, array $values): void
    {
        foreach ($values as $key => $value) {
            static::updateOrCreate(['group' => $group, 'key' => $key], ['value' => json_encode($value)]);
        }
    }
}
