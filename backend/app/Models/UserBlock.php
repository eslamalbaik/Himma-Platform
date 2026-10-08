<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// `blocker` no longer receives messages from `blocked` (MSG-04).
class UserBlock extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['blocker_id', 'blocked_id'];

    public static function isBlocking(User $blocker, User $blocked): bool
    {
        return static::where('blocker_id', $blocker->id)->where('blocked_id', $blocked->id)->exists();
    }

    public static function between(User $a, User $b): bool
    {
        return static::isBlocking($a, $b) || static::isBlocking($b, $a);
    }
}
