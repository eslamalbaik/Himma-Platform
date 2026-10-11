<?php

namespace App\Http\Middleware;

use App\Support\ClientAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// `tperm:<permission>`: the client user's role (client role templates, §10) must allow or restrict it.
// `tperm:<permission>,allowed`: only "allowed" will do (see ClientAccess::allowed).
class EnsureClientPermission
{
    public function handle(Request $request, Closure $next, string $permission, ?string $level = null): Response
    {
        $user = $request->user();
        $ok = $level === 'allowed' ? ClientAccess::allowed($user, $permission) : ClientAccess::can($user, $permission);
        if (! $ok) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        return $next($request);
    }
}
