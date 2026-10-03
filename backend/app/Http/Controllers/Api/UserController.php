<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureApiUser;
use App\Http\Requests\Admin\UserFormRequest;
use App\Models\User;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;

// Manages platform staff accounts (tenant_id is null) — the only dashboard users that exist so far.
class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::whereNull('tenant_id');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (Ability::isPlatformRole($role = $request->query('role'))) {
            $query->where('role', $role);
        }

        if (in_array($status = $request->query('status'), User::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (User $u) => $u->toPublicArray()
        );
    }

    public function store(UserFormRequest $request)
    {
        $newUser = User::create($request->fields() + [
            'password' => $request->input('password'),
            'locale' => 'ar',
        ]);

        Audit::log($request, [
            'action' => 'user.created',
            'actor' => $request->user(),
            'entity_type' => 'user',
            'entity_id' => $newUser->cuid,
            'metadata' => ['email' => $newUser->email, 'role' => $newUser->role],
        ]);

        return $this->item($newUser->toPublicArray(), 201);
    }

    public function update(UserFormRequest $request, string $cuid)
    {
        $actor = $request->user();
        $target = User::whereNull('tenant_id')->where('cuid', $cuid)->first();
        if (! $target) {
            return $this->error('user_not_found', 404);
        }

        if ($target->id === $actor->id && $request->input('status') === 'disabled') {
            return $this->error('cannot_disable_self', 422);
        }

        $data = $request->fields();
        $passwordChanged = $request->filled('password');

        if ($passwordChanged) {
            // Bumping the version ends every open session of this account (see EnsureApiUser).
            $data['password'] = $request->input('password');
            $data['token_version'] = $target->token_version + 1;
        }

        $target->update($data);

        if ($passwordChanged && $target->id === $actor->id) {
            // Keep the session that made the change.
            $actor->token_version = $target->token_version;
            $request->session()->put(EnsureApiUser::SESSION_TOKEN_VERSION, $target->token_version);
        }

        Audit::log($request, [
            'action' => 'user.updated',
            'actor' => $actor,
            'entity_type' => 'user',
            'entity_id' => $target->cuid,
            'metadata' => ['role' => $target->role, 'status' => $target->status, 'passwordChanged' => $passwordChanged],
        ]);

        return $this->item($target->toPublicArray());
    }

    public function destroy(Request $request, string $cuid)
    {
        $target = User::whereNull('tenant_id')->where('cuid', $cuid)->first();
        if (! $target) {
            return $this->error('user_not_found', 404);
        }
        if ($target->id === $request->user()->id) {
            return $this->error('cannot_delete_self', 422);
        }

        $target->delete();

        Audit::log($request, [
            'action' => 'user.deleted',
            'actor' => $request->user(),
            'entity_type' => 'user',
            'entity_id' => $cuid,
        ]);

        return $this->ok();
    }
}
