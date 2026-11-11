<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\PhotoRequest;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

// The signed-in person's profile picture (`/api/me/profile/avatar`) and, for an organization admin, the
// organization's logo (`/api/me/organization/logo`). Files go to the public disk under a random name.
class PhotoController extends Controller
{
    public function storeAvatar(PhotoRequest $request)
    {
        $user = $request->user();
        $old = $user->avatar_path;
        $user->forceFill(['avatar_path' => $request->file('file')->store('avatars', 'public')])->save();
        $old && Storage::disk('public')->delete($old);

        $this->audit($request, 'profile.avatar_changed', 'user', $user->cuid);

        return $this->item(['avatarUrl' => $user->avatarUrl()]);
    }

    public function destroyAvatar(Request $request)
    {
        $user = $request->user();
        $old = $user->avatar_path;
        $user->forceFill(['avatar_path' => null])->save();
        $old && Storage::disk('public')->delete($old);

        $this->audit($request, 'profile.avatar_removed', 'user', $user->cuid);

        return $this->item(['avatarUrl' => null]);
    }

    public function storeLogo(PhotoRequest $request)
    {
        $tenant = $request->user()->tenant;
        $old = $tenant->logo_path;
        $tenant->forceFill(['logo_path' => $request->file('file')->store('logos', 'public')])->save();
        $old && Storage::disk('public')->delete($old);

        $this->audit($request, 'organization.logo_changed', 'tenant', $tenant->cuid);

        return $this->item(['logoUrl' => $tenant->logoUrl()]);
    }

    public function destroyLogo(Request $request)
    {
        $tenant = $request->user()->tenant;
        $old = $tenant->logo_path;
        $tenant->forceFill(['logo_path' => null])->save();
        $old && Storage::disk('public')->delete($old);

        $this->audit($request, 'organization.logo_removed', 'tenant', $tenant->cuid);

        return $this->item(['logoUrl' => null]);
    }

    private function audit(Request $request, string $action, string $type, string $id): void
    {
        Audit::log($request, [
            'action' => $action,
            'actor' => $request->user(),
            'entity_type' => $type,
            'entity_id' => $id,
        ]);
    }
}
