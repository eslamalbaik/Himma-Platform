<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

// Picks Arabic or English for anything the server writes in words (emails, exports).
// API errors stay codes; the browser translates them.
class SetLocale
{
    private const SUPPORTED = ['ar', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->user()?->locale ?? $request->getPreferredLanguage(self::SUPPORTED);

        App::setLocale(in_array($locale, self::SUPPORTED, true) ? $locale : 'ar');

        return $next($request);
    }
}
