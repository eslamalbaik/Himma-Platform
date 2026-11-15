<?php

namespace App\Http\Middleware;

use App\Support\Community;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Dashboard routes: a record bound in the URL ({tenant}, {article}, {event}, ...) that belongs to the other
// language community answers 404 for staff limited to one community (App\Support\Community::allows).
class EnsureCommunity
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            foreach ($request->route()?->parameters() ?? [] as $record) {
                if (! Community::allows($user, $record)) {
                    return response()->json(['error' => ['code' => 'not_found']], 404);
                }
            }
        }

        return $next($request);
    }
}
