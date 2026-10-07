<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

// The signed-in user's own dashboard alerts (the bell in the top bar). Only `auth.api`:
// a user reads and marks only their own notifications.
class MyNotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'data' => $user->notifications()->latest()->limit(20)->get()->map(fn (DatabaseNotification $n) => [
                'id' => $n->id,
                'group' => $n->data['group'] ?? null,
                'kind' => $n->data['kind'] ?? null,
                'vars' => $n->data['vars'] ?? [],
                'read' => $n->read_at !== null,
                'createdAt' => $n->created_at->toIso8601String(),
            ])->values(),
            'meta' => ['unread' => $user->unreadNotifications()->count()],
        ])->header('Cache-Control', 'no-store');
    }

    // Body `{id}` marks one alert read; no id marks all of them.
    public function markRead(Request $request)
    {
        $query = $request->user()->unreadNotifications();

        if ($id = $request->input('id')) {
            if (! is_string($id)) {
                return $this->error('invalid_input', 422);
            }
            $query->whereKey($id);
        }

        $count = $query->update(['read_at' => now()]);

        Audit::log($request, [
            'action' => 'notifications.read',
            'actor' => $request->user(),
            'metadata' => ['count' => $count, 'all' => ! $id],
        ]);

        return $this->ok();
    }
}
