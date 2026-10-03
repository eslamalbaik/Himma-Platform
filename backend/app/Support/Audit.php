<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Throwable;

// Writes one audit row. Never throws: a failed audit write must not break the request,
// but it is reported in the server log.
class Audit
{
    public static function log(Request $request, array $data): void
    {
        try {
            /** @var User|null $actor */
            $actor = $data['actor'] ?? null;

            AuditLog::create([
                'action' => $data['action'],
                'actor_id' => $actor?->id,
                'actor_email' => $actor?->email ?? ($data['actor_email'] ?? null),
                'tenant_id' => $actor?->tenant_id,
                'entity_type' => $data['entity_type'] ?? null,
                'entity_id' => $data['entity_id'] ?? null,
                'metadata' => isset($data['metadata']) ? json_encode($data['metadata']) : null,
                'ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
            ]);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
