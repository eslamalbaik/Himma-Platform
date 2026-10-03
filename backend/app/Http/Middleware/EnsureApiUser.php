<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

// Requires a signed-in, active user whose session is still valid.
// A session dies when the account is disabled or its token_version moved on
// (password changed), so old sessions stop working at once.
class EnsureApiUser
{
    public const SESSION_TOKEN_VERSION = 'token_version';

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ($user->status !== 'active'
            || $request->session()->get(self::SESSION_TOKEN_VERSION) !== $user->token_version)) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $user = null;
        }

        if (! $user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }

        return $next($request);
    }
}
