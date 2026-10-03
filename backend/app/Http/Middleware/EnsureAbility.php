<?php

namespace App\Http\Middleware;

use App\Support\Ability;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Route guard: `ability:read,users` lets the request through only when the user's role allows it.
// Runs after `auth.api`, so a user is always present.
class EnsureAbility
{
    public function handle(Request $request, Closure $next, string $action, string $subject): Response
    {
        if (! Ability::can($request->user()->role, $action, $subject)) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        return $next($request);
    }
}
