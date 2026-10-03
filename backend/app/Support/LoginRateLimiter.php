<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

// Limiter for failed sign-ins, backed by the app's cache store (Redis once configured).
// Port of src/server/rateLimit.js.
class LoginRateLimiter
{
    private const WINDOW_SECONDS = 15 * 60;

    // Per account, and a looser limit per IP so one office network is not locked out by a single user.
    private const MAX_FAILURES = ['email' => 5, 'ip' => 20];

    private static function cacheKey(string $key): string
    {
        return "login_failures:$key";
    }

    private static function recent(string $key): array
    {
        return Cache::get(self::cacheKey($key), []);
    }

    public static function isBlocked(array $keys): bool
    {
        foreach ($keys as $key) {
            $type = explode(':', $key, 2)[0];
            $max = self::MAX_FAILURES[$type] ?? self::MAX_FAILURES['email'];

            if (count(self::recent($key)) >= $max) {
                return true;
            }
        }

        return false;
    }

    public static function recordFailure(array $keys): void
    {
        foreach ($keys as $key) {
            $list = self::recent($key);
            $list[] = time();
            Cache::put(self::cacheKey($key), $list, self::WINDOW_SECONDS);
        }
    }

    public static function clear(array $keys): void
    {
        foreach ($keys as $key) {
            Cache::forget(self::cacheKey($key));
        }
    }
}
