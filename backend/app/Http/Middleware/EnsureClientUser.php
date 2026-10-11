<?php

namespace App\Http\Middleware;

use App\Support\ClientAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Client dashboard routes: only client users, and only for their own organisation. While the organisation is
// suspended or cancelled it can still read and pay (`client:billing`), but cannot change anything else.
class EnsureClientUser
{
    public function handle(Request $request, Closure $next, ?string $area = null): Response
    {
        $user = $request->user();
        if (! $user || ! ClientAccess::isClientUser($user)) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $tenant = $user->tenant;
        $readOnly = in_array($tenant?->status, ['suspended', 'cancelled'], true);
        if ($readOnly && ! $request->isMethodSafe() && $area !== 'billing') {
            return response()->json(['error' => ['code' => 'tenant_suspended']], 403);
        }

        return $next($request);
    }
}
