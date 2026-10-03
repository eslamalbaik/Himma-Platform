<?php

namespace App\Http\Middleware;

use App\Models\PlatformSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// While maintenance mode is on (general settings), only the platform owner can use the API.
class EnsureNotInMaintenance
{
    public function handle(Request $request, Closure $next): Response
    {
        if (PlatformSetting::current()->maintenance_mode && $request->user()?->role !== 'super_admin') {
            return response()->json(['error' => ['code' => 'maintenance_mode']], 503);
        }

        return $next($request);
    }
}
