<?php

use App\Http\Middleware\EnsureAbility;
use App\Http\Middleware\EnsureApiUser;
use App\Http\Middleware\EnsureNotInMaintenance;
use App\Http\Middleware\EnsureSameOriginJson;
use App\Http\Middleware\SetLocale;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // /api/* is cookie/session-authenticated (consumed by the Next.js frontend via a
        // same-origin proxy), not the stateless token API Laravel defaults to.
        $middleware->api(prepend: [
            EncryptCookies::class,
            StartSession::class,
            AddQueuedCookiesToResponse::class,
        ], append: [
            SetLocale::class,
        ]);
        $middleware->alias([
            'same_origin' => EnsureSameOriginJson::class,
            'auth.api' => EnsureApiUser::class,
            'ability' => EnsureAbility::class,
            'not_maintenance' => EnsureNotInMaintenance::class,
        ]);
        // Check the session before resolving {tenant} etc., so a signed-out caller gets 401, not 404.
        $middleware->prependToPriorityList(SubstituteBindings::class, EnsureApiUser::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Every API failure is `{error: {code}}`; the browser translates `errors.<code>`.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            [$code, $status] = match (true) {
                $e instanceof ValidationException => ['invalid_input', 422],
                $e instanceof AuthenticationException => ['unauthenticated', 401],
                $e instanceof AuthorizationException => ['forbidden', 403],
                $e instanceof ThrottleRequestsException => ['too_many_attempts', 429],
                $e instanceof NotFoundHttpException => ['not_found', 404],
                $e instanceof MethodNotAllowedHttpException => ['method_not_allowed', 405],
                $e instanceof HttpExceptionInterface => ['server_error', $e->getStatusCode()],
                default => ['server_error', 500],
            };

            return response()->json(['error' => ['code' => $code]], $status);
        });
    })->create();
