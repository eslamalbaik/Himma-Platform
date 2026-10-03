<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Ability;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminStatsController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'read', 'dashboard')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $last24h = $now->copy()->subDay();
        $last7d = $now->copy()->subDays(7);
        $last14d = $now->copy()->subDays(14);

        $last7Days = collect(range(6, 0))->map(fn ($i) => $now->copy()->subDays($i)->toDateString());

        // Buckets a `DATE(created_at), count` aggregate query into one entry per day of $last7Days.
        $bucketByDay = function ($rows) use ($last7Days) {
            $counts = $rows->mapWithKeys(fn ($r) => [$r->day => $r->count])->all();

            return $last7Days->map(fn ($date) => ['date' => $date, 'count' => $counts[$date] ?? 0])->values();
        };

        // Cast to stdClass when empty so it serializes as `{}` (not `[]`), matching the old Next.js API shape.
        $toMap = function ($rows, string $field) {
            $map = $rows->mapWithKeys(fn ($r) => [$r->$field => $r->count])->all();

            return empty($map) ? (object) [] : $map;
        };

        $tenantsByStatus = Tenant::selectRaw('status, count(*) as count')->groupBy('status')->get();
        $tenantsByType = Tenant::selectRaw('type, count(*) as count')->groupBy('type')->get();
        $usersByStatus = User::selectRaw('status, count(*) as count')->groupBy('status')->get();

        $auditDaily7d = AuditLog::where('created_at', '>=', $last7d)
            ->selectRaw('DATE(created_at) as day, count(*) as count')->groupBy('day')->get();
        $loginsDaily7d = AuditLog::where('action', 'auth.login')->where('created_at', '>=', $last7d)
            ->selectRaw('DATE(created_at) as day, count(*) as count')->groupBy('day')->get();

        return response()->json([
            'tenants' => [
                'total' => Tenant::count(),
                'byStatus' => $toMap($tenantsByStatus, 'status'),
                'byType' => $toMap($tenantsByType, 'type'),
                'newThisMonth' => Tenant::where('created_at', '>=', $startOfMonth)->count(),
            ],
            'users' => [
                'total' => User::count(),
                'byStatus' => $toMap($usersByStatus, 'status'),
                'platformStaff' => User::whereNull('tenant_id')->count(),
                'tenantUsers' => User::whereNotNull('tenant_id')->count(),
                'newThisMonth' => User::where('created_at', '>=', $startOfMonth)->count(),
            ],
            'activity' => [
                'auditLast24h' => AuditLog::where('created_at', '>=', $last24h)->count(),
                'auditLast7d' => $auditDaily7d->sum('count'),
                'auditDaily' => $bucketByDay($auditDaily7d),
                'loginsLast24h' => AuditLog::where('action', 'auth.login')->where('created_at', '>=', $last24h)->count(),
                'loginsLast7d' => $loginsDaily7d->sum('count'),
                'loginsDaily' => $bucketByDay($loginsDaily7d),
                'loginsPrev7d' => AuditLog::where('action', 'auth.login')
                    ->whereBetween('created_at', [$last14d, $last7d])->count(),
                'loginsFailed7d' => AuditLog::where('action', 'auth.login_failed')->where('created_at', '>=', $last7d)->count(),
                'uniqueLoginUsers7d' => AuditLog::where('action', 'auth.login')
                    ->where('created_at', '>=', $last7d)->whereNotNull('actor_id')->distinct('actor_id')->count('actor_id'),
            ],
        ])->header('Cache-Control', 'no-store');
    }
}
