<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Ability;
use App\Support\Audit;
use App\Support\LoginRateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // Compared against when the email is unknown, so both paths take about the same time.
    private const DUMMY_HASH = '$2y$12$AQxTVhIiavTxkJuyDJi6Je2AnEAIUb.ijqRse4fLT3APYwsjGap9.';

    public function login(Request $request)
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');
        $remember = $request->boolean('remember');

        if ($email === '' || $password === '' || strlen($password) > 200) {
            return response()->json(['error' => ['code' => 'invalid_credentials']], 400);
        }

        $limitKeys = ["ip:{$request->ip()}", "email:$email"];

        if (LoginRateLimiter::isBlocked($limitKeys)) {
            Audit::log($request, ['action' => 'auth.login_blocked', 'actor_email' => $email]);

            return response()->json(['error' => ['code' => 'too_many_attempts']], 429);
        }

        $user = User::where('email', $email)->first();
        $passwordOk = Hash::check($password, $user?->password ?? self::DUMMY_HASH);

        if (!$user || !$passwordOk || $user->status !== 'active') {
            LoginRateLimiter::recordFailure($limitKeys);
            Audit::log($request, [
                'action' => 'auth.login_failed',
                'actor_email' => $email,
                'metadata' => ['reason' => !$user ? 'unknown_email' : (!$passwordOk ? 'wrong_password' : 'disabled')],
            ]);

            return response()->json(['error' => ['code' => 'invalid_credentials']], 401);
        }

        // Only the super admin dashboard exists so far; client (tenant) accounts get their own dashboard later.
        if (!Ability::isPlatformRole($user->role)) {
            Audit::log($request, [
                'action' => 'auth.login_denied',
                'actor' => $user,
                'metadata' => ['reason' => 'no_dashboard_for_role'],
            ]);

            return response()->json(['error' => ['code' => 'dashboard_not_available']], 403);
        }

        LoginRateLimiter::clear($limitKeys);
        $user->update(['last_login_at' => now()]);

        $request->session()->regenerate();
        Auth::login($user, $remember);

        if (!$remember) {
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

        return response()->json(['ok' => true]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }

        return response()
            ->json(['user' => $user->toPublicArray()])
            ->header('Cache-Control', 'no-store');
    }
}
