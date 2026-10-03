<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\Ability;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'read', 'audit')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $query = AuditLog::with('actor:id,cuid,name_ar,name_en,email')->orderByDesc('created_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('actor_email', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('entity_type', 'like', "%{$search}%")
                    ->orWhere('entity_id', 'like', "%{$search}%");
            });
        }

        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }

        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', $to);
        }

        $perPage = min(max((int) $request->query('perPage', 25), 1), 100);
        $logs = $query->paginate($perPage);

        return response()->json([
            'data' => $logs->getCollection()->map(fn (AuditLog $log) => [
                'id' => $log->cuid,
                'action' => $log->action,
                'actorEmail' => $log->actor_email,
                'actorNameAr' => $log->actor?->name_ar,
                'actorNameEn' => $log->actor?->name_en,
                'entityType' => $log->entity_type,
                'entityId' => $log->entity_id,
                'metadata' => $log->metadata ? json_decode($log->metadata, true) : null,
                'ip' => $log->ip,
                'createdAt' => optional($log->created_at)->toIso8601String(),
            ])->values(),
            'meta' => [
                'total' => $logs->total(),
                'perPage' => $logs->perPage(),
                'currentPage' => $logs->currentPage(),
                'lastPage' => $logs->lastPage(),
            ],
            'actions' => AuditLog::select('action')->distinct()->orderBy('action')->pluck('action'),
        ])->header('Cache-Control', 'no-store');
    }
}
