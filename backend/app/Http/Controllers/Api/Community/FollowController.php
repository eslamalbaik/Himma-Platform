<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\FollowFormRequest;
use App\Models\Follow;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;

// Following people and organizations (`type`: person | organization, `key`: the handle or the slug).
class FollowController extends Controller
{
    // Who the signed-in user follows, newest first.
    public function index(Request $request)
    {
        $follows = Follow::where('follower_id', $request->user()->id)->orderByDesc('id')->limit(200)->get();

        $people = User::whereIn('id', $follows->where('followable_type', 'user')->pluck('followable_id'))->get()->keyBy('id');
        $organizations = Tenant::whereIn('id', $follows->where('followable_type', 'tenant')->pluck('followable_id'))->get()->keyBy('id');

        $data = $follows->map(function (Follow $follow) use ($people, $organizations) {
            if ($follow->followable_type === 'tenant') {
                $target = $organizations->get($follow->followable_id);

                return $target ? ['type' => 'organization', 'key' => $target->slug, 'nameAr' => $target->name_ar, 'nameEn' => $target->name_en, 'verified' => $target->verified_at !== null] : null;
            }
            $target = $people->get($follow->followable_id);

            return $target ? ['type' => 'person', 'key' => $target->handle, 'nameAr' => $target->name_ar, 'nameEn' => $target->name_en, 'verified' => $target->isVerified()] : null;
        })->filter()->values();

        return response()->json(['data' => $data])->header('Cache-Control', 'no-store');
    }

    public function store(FollowFormRequest $request)
    {
        $target = $this->resolve($request->input('type'), $request->input('key'));
        if (! $target) {
            return $this->error('not_found', 404);
        }

        [$type, $model] = $target;
        $user = $request->user();

        if ($type === 'user' && $model->id === $user->id) {
            return $this->error('cannot_follow_self', 422);
        }

        $follow = Follow::firstOrCreate(['follower_id' => $user->id, 'followable_type' => $type, 'followable_id' => $model->id]);

        if ($follow->wasRecentlyCreated) {
            $this->audit($request, 'followed', $request->input('type'), $request->input('key'));
        }

        return $this->item(['isFollowing' => true, 'followersCount' => Follow::countFor($type, $model->id)], 201);
    }

    public function destroy(Request $request, string $type, string $key)
    {
        $target = $this->resolve($type, $key);
        if (! $target) {
            return $this->error('not_found', 404);
        }

        [$columnType, $model] = $target;
        $deleted = Follow::where('follower_id', $request->user()->id)
            ->where('followable_type', $columnType)->where('followable_id', $model->id)->delete();

        if ($deleted) {
            $this->audit($request, 'unfollowed', $type, $key);
        }

        return $this->item(['isFollowing' => false, 'followersCount' => Follow::countFor($columnType, $model->id)]);
    }

    // [column type, model] for an API type and key, or null when there is nothing public to follow.
    private function resolve(string $type, string $key): ?array
    {
        if ($type === 'organization') {
            $tenant = Tenant::where('slug', $key)->whereIn('status', ['trial', 'active'])->first();

            return $tenant ? ['tenant', $tenant] : null;
        }

        $user = $type === 'person' ? User::where('handle', strtolower($key))->where('status', 'active')->first() : null;

        return $user && Ability::isMemberRole($user->role) ? ['user', $user] : null;
    }

    private function audit(Request $request, string $what, string $type, string $key): void
    {
        Audit::log($request, [
            'action' => "follow.$what",
            'actor' => $request->user(),
            'entity_type' => $type,
            'entity_id' => $key,
        ]);
    }
}
