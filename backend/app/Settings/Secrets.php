<?php

namespace App\Settings;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

// API keys kept in the settings table: encrypted at rest, never sent to the browser
// (pages only learn whether one is set).
class Secrets
{
    public static function seal(string $value): string
    {
        return Crypt::encryptString($value);
    }

    public static function open(?string $sealed): ?string
    {
        if (! $sealed) {
            return null;
        }

        try {
            return Crypt::decryptString($sealed);
        } catch (DecryptException $e) {
            report($e);

            return null;
        }
    }
}
