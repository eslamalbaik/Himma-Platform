<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

// Sign-in and permission checks live in route middleware (`auth.api`, `ability:<action>,<subject>`),
// input checks in App\Http\Requests\ApiRequest subclasses.
abstract class Controller
{
    protected function error(string $code, int $status): JsonResponse
    {
        return response()->json(['error' => ['code' => $code]], $status);
    }

    protected function perPage(Request $request): int
    {
        return min(max((int) $request->query('perPage', 25), 1), 100);
    }

    // List response: `{data, meta: {total, perPage, currentPage, lastPage, ...$meta}, ...$extra}`.
    protected function paginated(LengthAwarePaginator $page, callable $map, array $meta = [], array $extra = []): JsonResponse
    {
        return response()->json([
            'data' => $page->getCollection()->map($map)->values(),
            'meta' => [
                'total' => $page->total(),
                'perPage' => $page->perPage(),
                'currentPage' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
            ] + $meta,
        ] + $extra)->header('Cache-Control', 'no-store');
    }

    protected function item(array $data, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $data], $status)->header('Cache-Control', 'no-store');
    }

    protected function ok(): JsonResponse
    {
        return response()->json(['ok' => true]);
    }
}
