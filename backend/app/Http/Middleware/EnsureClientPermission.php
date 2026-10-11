<?php

namespace App\Http\Middleware;

use App\Support\ClientAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// `tperm:<permission>`: the client user's role (client role templates, §10) must allow or restrict it.
class EnsureClientPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (! ClientAccess::can($request->user(), $permission)) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        return $next($request);
    }
}
