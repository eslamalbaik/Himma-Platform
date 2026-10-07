<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
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

        if (($from = $request->query('from')) && strtotime($from) !== false) {
            $query->where('created_at', '>=', $from);
        }

        if (($to = $request->query('to')) && strtotime($to) !== false) {
            $query->where('created_at', '<=', $to);
        }

        return $this->paginated(
            $query->paginate($this->perPage($request)),
            fn (AuditLog $log) => [
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
            ],
            extra: ['actions' => AuditLog::select('action')->distinct()->orderBy('action')->pluck('action')]
        );
    }
}
