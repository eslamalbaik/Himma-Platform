<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// CSRF defence for cookie-authenticated writes: the session cookie is SameSite=Lax,
// and state-changing requests must come from this site with a JSON body.
// Port of src/server/http.js isSameOriginJson() — adapted for the Next.js reverse proxy:
// Laravel is never hit directly by the browser, so "this site" means the frontend's own
// origin (FRONTEND_URL), not this server's own Host header.
class EnsureSameOriginJson
{
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('origin');

        if ($origin) {
            $expected = rtrim(config('app.frontend_url'), '/');
            $originNormalized = rtrim($origin, '/');

            if ($originNormalized !== $expected) {
                return response()->json(['error' => ['code' => 'bad_origin']], 403);
            }
        }

        if (! str_starts_with((string) $request->header('content-type'), 'application/json')) {
            return response()->json(['error' => ['code' => 'bad_origin']], 403);
        }

        return $next($request);
    }
}
