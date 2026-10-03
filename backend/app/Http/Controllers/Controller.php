<?php

namespace App\Http\Controllers;

use App\Support\Ability;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

abstract class Controller
{
    // Returns an error response when the signed-in user may not do $action on $subject, or null when allowed.
    protected function deny(Request $request, string $action, string $subject): ?JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return $this->error('unauthenticated', 401);
        }
        if (!Ability::can($user->role, $action, $subject)) {
            return $this->error('forbidden', 403);
        }

        return null;
    }

    protected function error(string $code, int $status): JsonResponse
    {
        return response()->json(['error' => ['code' => $code]], $status);
    }

    protected function perPage(Request $request): int
    {
        return min(max((int) $request->query('perPage', 25), 1), 100);
    }

    protected function paginated(LengthAwarePaginator $page, callable $map, array $extra = []): JsonResponse
    {
        return response()->json([
            'data' => $page->getCollection()->map($map)->values(),
            'meta' => [
                'total' => $page->total(),
                'perPage' => $page->perPage(),
                'currentPage' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
            ],
        ] + $extra)->header('Cache-Control', 'no-store');
    }

    // Shared field checks; each returns true when the value is acceptable.
    protected function validName(?string $value): bool
    {
        $value = trim((string) $value);

        return $value !== '' && mb_strlen($value) <= 255;
    }

    protected function optionalDate($value): bool
    {
        return $value === null || $value === '' || strtotime((string) $value) !== false;
    }
}
