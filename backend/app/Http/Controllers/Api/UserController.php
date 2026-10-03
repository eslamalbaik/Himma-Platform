<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;

// Manages platform staff accounts (tenant_id is null) — the only dashboard users that exist so far.
class UserController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'read', 'users')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $query = User::whereNull('tenant_id');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->query('role')) {
            if (Ability::isPlatformRole($role)) {
                $query->where('role', $role);
            }
        }

        if ($status = $request->query('status')) {
            if (in_array($status, ['active', 'disabled'], true)) {
                $query->where('status', $status);
            }
        }

        $perPage = min(max((int) $request->query('perPage', 25), 1), 100);
        $users = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $u) => $u->toPublicArray())->values(),
            'meta' => [
                'total' => $users->total(),
                'perPage' => $users->perPage(),
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
            ],
        ])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'create', 'users')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        if ($errorCode = $this->invalidFieldsCode($request, requirePassword: true)) {
            return response()->json(['error' => ['code' => $errorCode]], 422);
        }

        $email = strtolower(trim((string) $request->input('email')));
        if (User::where('email', $email)->exists()) {
            return response()->json(['error' => ['code' => 'email_taken']], 422);
        }

        $newUser = User::create([
            'email' => $email,
            'password' => $request->input('password'),
            'name_ar' => trim((string) $request->input('nameAr')),
            'name_en' => trim((string) $request->input('nameEn')),
            'role' => $request->input('role'),
            'status' => $request->input('status'),
            'locale' => 'ar',
        ]);

        Audit::log($request, [
            'action' => 'user.created',
            'actor' => $user,
            'entity_type' => 'user',
            'entity_id' => $newUser->cuid,
            'metadata' => ['email' => $newUser->email, 'role' => $newUser->role],
        ]);

        return response()->json(['data' => $newUser->toPublicArray()], 201);
    }

    public function update(Request $request, string $cuid)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'update', 'users')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $target = User::whereNull('tenant_id')->where('cuid', $cuid)->first();
        if (!$target) {
            return response()->json(['error' => ['code' => 'user_not_found']], 404);
        }

        if ($errorCode = $this->invalidFieldsCode($request, requirePassword: false)) {
            return response()->json(['error' => ['code' => $errorCode]], 422);
        }

        if ($target->id === $user->id && $request->input('status') === 'disabled') {
            return response()->json(['error' => ['code' => 'cannot_disable_self']], 422);
        }

        $data = [
            'name_ar' => trim((string) $request->input('nameAr')),
            'name_en' => trim((string) $request->input('nameEn')),
            'role' => $request->input('role'),
            'status' => $request->input('status'),
        ];

        if ($request->filled('password')) {
            $data['password'] = $request->input('password');
            $data['token_version'] = $target->token_version + 1;
        }

        $target->update($data);

        Audit::log($request, [
            'action' => 'user.updated',
            'actor' => $user,
            'entity_type' => 'user',
            'entity_id' => $target->cuid,
            'metadata' => ['role' => $target->role, 'status' => $target->status],
        ]);

        return response()->json(['data' => $target->toPublicArray()]);
    }

    public function destroy(Request $request, string $cuid)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'delete', 'users')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $target = User::whereNull('tenant_id')->where('cuid', $cuid)->first();
        if (!$target) {
            return response()->json(['error' => ['code' => 'user_not_found']], 404);
        }
        if ($target->id === $user->id) {
            return response()->json(['error' => ['code' => 'cannot_delete_self']], 422);
        }

        $target->delete();

        Audit::log($request, [
            'action' => 'user.deleted',
            'actor' => $user,
            'entity_type' => 'user',
            'entity_id' => $cuid,
        ]);

        return response()->json(['ok' => true]);
    }

    private function invalidFieldsCode(Request $request, bool $requirePassword): ?string
    {
        $nameAr = trim((string) $request->input('nameAr', ''));
        $nameEn = trim((string) $request->input('nameEn', ''));
        $email = trim((string) $request->input('email', ''));

        if ($requirePassword && ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL))) {
            return 'invalid_email';
        }
        if ($nameAr === '' || mb_strlen($nameAr) > 255 || $nameEn === '' || mb_strlen($nameEn) > 255) {
            return 'invalid_user_name';
        }
        if (!Ability::isPlatformRole($request->input('role'))) {
            return 'invalid_role';
        }
        if (!in_array($request->input('status'), ['active', 'disabled'], true)) {
            return 'invalid_user_status';
        }
        $password = (string) $request->input('password', '');
        if ($requirePassword && mb_strlen($password) < 8) {
            return 'invalid_password';
        }
        if (!$requirePassword && $password !== '' && mb_strlen($password) < 8) {
            return 'invalid_password';
        }

        return null;
    }
}
