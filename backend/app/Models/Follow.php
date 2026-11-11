<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// A signed-in user following a person (`user`) or an organization (`tenant`).
class Follow extends Model
{
    public const UPDATED_AT = null;

    // The type names used by the API (`person`, `organization`) and the column value each one stores.
    public const TYPES = ['person' => 'user', 'organization' => 'tenant'];

    protected $fillable = ['follower_id', 'followable_type', 'followable_id'];

    public static function countFor(string $type, int $id): int
    {
        return static::where('followable_type', $type)->where('followable_id', $id)->count();
    }

    public static function isFollowing(?User $viewer, string $type, int $id): bool
    {
        return $viewer !== null && static::where('follower_id', $viewer->id)
            ->where('followable_type', $type)->where('followable_id', $id)->exists();
    }
}
