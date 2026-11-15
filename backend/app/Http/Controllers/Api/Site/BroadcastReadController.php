<?php

namespace App\Http\Controllers\Api\Site;

use App\Http\Controllers\Api\Community\ProfileController;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Support\Community;
use Illuminate\Http\Request;

// Live broadcasts on the home page (`/`, `/en`): what is live now, what is announced next, and the latest
// recordings, of the request's community. Public online or hybrid events only, no sign-in needed.
class BroadcastReadController extends Controller
{
    public function index(Request $request)
    {
        $base = fn () => Community::scope(Event::query(), $request)
            ->with('tenant')
            ->where('visibility', 'public')
            ->whereIn('format', ['online', 'hybrid'])
            ->where(fn ($q) => $q->whereNull('tenant_id')->orWhereHas('tenant', fn ($t) => $t->where('status', 'active')));

        $live = $base()->where('status', 'live')->orderBy('starts_at')->limit(6)->get();
        $upcoming = $base()->where('status', 'scheduled')->where('starts_at', '>=', now()->subHours(2))
            ->orderBy('starts_at')->limit(6)->get();
        $recordings = $base()->where('status', 'ended')->whereNotNull('recording_url')
            ->orderByDesc('starts_at')->limit(3)->get();

        return $this->item([
            'live' => $live->map(fn (Event $event) => $this->row($event))->values(),
            'upcoming' => $upcoming->map(fn (Event $event) => $this->row($event))->values(),
            'recordings' => $recordings->map(fn (Event $event) => $this->row($event))->values(),
        ]);
    }

    private function row(Event $event): array
    {
        return ProfileController::broadcastArray($event) + [
            'organization' => $event->tenant ? [
                'slug' => $event->tenant->slug,
                'nameAr' => $event->tenant->name_ar,
                'nameEn' => $event->tenant->name_en,
                'logoUrl' => $event->tenant->logoUrl(),
            ] : null,
        ];
    }
}
