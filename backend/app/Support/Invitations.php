<?php

namespace App\Support;

use App\Mail\JoinApprovedMail;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

// The email that lets the contact of an approved join request choose a password (auth broker `invitations`:
// one-time token, valid `auth.passwords.invitations.expire` minutes). Mail goes to the log until MAIL_* is set.
class Invitations
{
    public static function send(User $user, Tenant $tenant): void
    {
        $token = Password::broker('invitations')->createToken($user);
        $url = rtrim(config('app.frontend_url'), '/').'/set-password?'.http_build_query(['token' => $token, 'email' => $user->email]);

        Mail::to($user->email)->queue(new JoinApprovedMail([
            'name' => $user->name_ar,
            'clientAr' => $tenant->name_ar,
            'clientEn' => $tenant->name_en,
            'url' => $url,
            'days' => (int) round(config('auth.passwords.invitations.expire') / 1440),
        ]));
    }
}
