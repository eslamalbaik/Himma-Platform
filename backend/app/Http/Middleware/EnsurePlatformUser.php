<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Route guard for the platform dashboard API (/api/admin/*): client accounts never reach it, even routes that
// need no particular permission (such as the signed-in user's own notifications). Runs after `auth.api`.
class EnsurePlatformUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()->isClient()) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        return $next($request);
    }
}
