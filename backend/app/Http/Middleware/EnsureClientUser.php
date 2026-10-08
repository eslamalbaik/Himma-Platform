<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Route guard for the client dashboard API (/api/client/*): the signed-in user must be a client account of an
// active client. `client:full` also refuses clients suspended for unpaid invoices, who keep only billing and
// their profile until they pay. Runs after `auth.api`.
class EnsureClientUser
{
    public function handle(Request $request, Closure $next, ?string $level = null): Response
    {
        $user = $request->user();

        if (! $user->isClient() || ! $user->tenant) {
            return $this->deny('not_a_client');
        }
        if (in_array($user->tenant->status, Tenant::INACTIVE_STATUSES, true)) {
            return $this->deny('tenant_inactive');
        }
        if ($level === 'full' && $user->tenant->billing_suspended_at) {
            return $this->deny('tenant_billing_suspended');
        }

        return $next($request);
    }

    private function deny(string $code): Response
    {
        return response()->json(['error' => ['code' => $code]], 403);
    }
}
