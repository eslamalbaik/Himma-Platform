<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\ProfileFormRequest;
use App\Models\Article;
use App\Models\Event;
use App\Models\Follow;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;

// Public profiles, like a Medium reader's page: `/u/{handle}` for a person, `/org/{slug}` for an organization.
// Staff accounts have no public profile. Emails and billing details never leave the server here.
class ProfileController extends Controller
{
    public function person(Request $request, string $handle)
    {
        $user = User::where('handle', strtolower($handle))->where('status', 'active')->first();

        if (! $user || ! Ability::isMemberRole($user->role)) {
            return $this->error('not_found', 404);
        }

        return $this->item($this->personArray($user, $request->user()));
    }

    public function organization(Request $request, string $slug)
    {
        $tenant = Tenant::where('slug', $slug)->whereIn('status', ['trial', 'active'])->first();

        if (! $tenant) {
            return $this->error('not_found', 404);
        }

        $viewer = $request->user();
        $isMember = $viewer && $viewer->tenant_id === $tenant->id;

        $members = User::where('tenant_id', $tenant->id)->where('status', 'active')
            ->whereIn('role', ['tenant_admin', 'tenant_member'])
            ->orderByRaw("role = 'tenant_admin' desc")->orderBy('name_ar')->limit(48)->get();

        $broadcasts = Event::where('tenant_id', $tenant->id)
            ->whereIn('status', ['scheduled', 'live', 'ended'])
            ->where(fn ($q) => $isMember ? $q : $q->where('visibility', 'public'))
            ->orderByRaw("field(status, 'live', 'scheduled', 'ended')")->orderByDesc('starts_at')->limit(30)->get();

        return $this->item([
            'slug' => $tenant->slug,
            'nameAr' => $tenant->name_ar,
            'nameEn' => $tenant->name_en,
            'type' => $tenant->type,
            'bioAr' => $tenant->bio_ar,
            'bioEn' => $tenant->bio_en,
            'website' => $tenant->website,
            'verified' => $tenant->verified_at !== null,
            'followersCount' => Follow::countFor('tenant', $tenant->id),
            'membersCount' => User::where('tenant_id', $tenant->id)->where('status', 'active')->count(),
            'storiesCount' => Article::visibleTo($viewer)->where('tenant_id', $tenant->id)->count(),
            'isFollowing' => Follow::isFollowing($viewer, 'tenant', $tenant->id),
            'isMember' => (bool) $isMember,
            'members' => $members->map(fn (User $member) => [
                'handle' => $member->handle,
                'nameAr' => $member->name_ar,
                'nameEn' => $member->name_en,
                'verified' => $member->isVerified(),
                'isAdmin' => $member->role === 'tenant_admin',
            ])->values(),
            'broadcasts' => $broadcasts->map(fn (Event $event) => $this->broadcastArray($event))->values(),
        ]);
    }

    // The signed-in user's own profile, with what they need to edit it.
    public function show(Request $request)
    {
        return $this->item($this->personArray($request->user(), $request->user()) + [
            'bioAr' => $request->user()->bio_ar,
            'bioEn' => $request->user()->bio_en,
        ]);
    }

    public function update(ProfileFormRequest $request)
    {
        $user = $request->user();
        $user->update($request->fields());

        Audit::log($request, [
            'action' => 'profile.updated',
            'actor' => $user,
            'entity_type' => 'user',
            'entity_id' => $user->cuid,
            'metadata' => ['handle' => $user->handle],
        ]);

        return $this->item($this->personArray($user->fresh(), $user) + ['bioAr' => $user->bio_ar, 'bioEn' => $user->bio_en]);
    }

    private function personArray(User $user, ?User $viewer): array
    {
        $tenant = $user->tenant;

        return [
            'handle' => $user->handle,
            'nameAr' => $user->name_ar,
            'nameEn' => $user->name_en,
            'bioAr' => $user->bio_ar,
            'bioEn' => $user->bio_en,
            'verified' => $user->isVerified(),
            'followersCount' => Follow::countFor('user', $user->id),
            'followingCount' => Follow::where('follower_id', $user->id)->count(),
            'storiesCount' => Article::visibleTo($viewer)->where('author_id', $user->id)->count(),
            'isFollowing' => Follow::isFollowing($viewer, 'user', $user->id),
            'isSelf' => $viewer?->id === $user->id,
            'organization' => $tenant && in_array($tenant->status, ['trial', 'active'], true) ? [
                'slug' => $tenant->slug,
                'nameAr' => $tenant->name_ar,
                'nameEn' => $tenant->name_en,
                'verified' => $tenant->verified_at !== null,
                'isAdmin' => $user->role === 'tenant_admin',
            ] : null,
            'joinedAt' => optional($user->created_at)->toIso8601String(),
        ];
    }

    // The stream link is shown only while the broadcast is live, the recording only after it ended.
    public static function broadcastArray(Event $event): array
    {
        return [
            'id' => $event->cuid,
            'titleAr' => $event->title_ar,
            'titleEn' => $event->title_en,
            'descriptionAr' => $event->description_ar,
            'descriptionEn' => $event->description_en,
            'type' => $event->type,
            'format' => $event->format,
            'visibility' => $event->visibility,
            'location' => $event->location,
            'startsAt' => optional($event->starts_at)->toIso8601String(),
            'endsAt' => optional($event->ends_at)->toIso8601String(),
            'status' => $event->status,
            'streamUrl' => $event->status === 'live' ? $event->stream_url : null,
            'recordingUrl' => $event->status === 'ended' ? $event->recording_url : null,
        ];
    }
}
