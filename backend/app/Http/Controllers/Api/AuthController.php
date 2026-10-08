<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureApiUser;
use App\Models\PlatformSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    // Compared against when the email is unknown, so both paths take about the same time.
    private const DUMMY_HASH = '$2y$12$AQxTVhIiavTxkJuyDJi6Je2AnEAIUb.ijqRse4fLT3APYwsjGap9.';

    // Failed sign-ins allowed per 15 minutes: per account, and a looser limit per IP
    // so one office network is not locked out by a single user.
    private const DECAY_SECONDS = 15 * 60;

    private const MAX_FAILURES = ['email' => 5, 'ip' => 20];

    public function login(Request $request)
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');
        $remember = $request->boolean('remember');

        if ($email === '' || $password === '' || strlen($password) > 200) {
            return $this->error('invalid_credentials', 400);
        }

        $limits = ["login:email:$email" => self::MAX_FAILURES['email'], "login:ip:{$request->ip()}" => self::MAX_FAILURES['ip']];

        foreach ($limits as $key => $max) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                Audit::log($request, ['action' => 'auth.login_blocked', 'actor_email' => $email]);

                return $this->error('too_many_attempts', 429);
            }
        }

        $user = User::where('email', $email)->first();
        $passwordOk = Hash::check($password, $user?->password ?? self::DUMMY_HASH);

        if (! $user || ! $passwordOk || $user->status !== 'active') {
            foreach (array_keys($limits) as $key) {
                RateLimiter::hit($key, self::DECAY_SECONDS);
            }
            Audit::log($request, [
                'action' => 'auth.login_failed',
                'actor_email' => $email,
                'metadata' => ['reason' => ! $user ? 'unknown_email' : (! $passwordOk ? 'wrong_password' : 'disabled')],
            ]);

            return $this->error('invalid_credentials', 401);
        }

        // Platform staff use /admin, client accounts use /client. A client account needs an active client.
        $denied = match (true) {
            $user->isClient() && (! $user->tenant || in_array($user->tenant->status, Tenant::INACTIVE_STATUSES, true)) => 'tenant_inactive',
            ! $user->isClient() && ! Ability::isPlatformRole($user->role) => 'dashboard_not_available',
            default => null,
        };
        if ($denied) {
            Audit::log($request, [
                'action' => 'auth.login_denied',
                'actor' => $user,
                'metadata' => ['reason' => $denied],
            ]);

            return $this->error($denied, 403);
        }

        if (PlatformSetting::current()->maintenance_mode && $user->role !== 'super_admin') {
            Audit::log($request, [
                'action' => 'auth.login_denied',
                'actor' => $user,
                'metadata' => ['reason' => 'maintenance_mode'],
            ]);

            return $this->error('maintenance_mode', 503);
        }

        foreach (array_keys($limits) as $key) {
            RateLimiter::clear($key);
        }

        $request->session()->regenerate();
        Auth::login($user, $remember);
        $request->session()->put(EnsureApiUser::SESSION_TOKEN_VERSION, $user->token_version);
        $user->update(['last_login_at' => now()]);

        if (! $remember) {
            // Session cookie ends with the browser session (Laravel defaults to persistent otherwise).
            config(['session.expire_on_close' => true]);
        }

        Audit::log($request, ['action' => 'auth.login', 'actor' => $user, 'metadata' => ['remember' => $remember]]);

        return response()->json(['user' => $user->toPublicArray()]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            Audit::log($request, ['action' => 'auth.logout', 'actor' => $user]);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->ok();
    }

    public function me(Request $request)
    {
        return response()
            ->json(['user' => $request->user()->toPublicArray()])
            ->header('Cache-Control', 'no-store');
    }
}
