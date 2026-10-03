<?php

namespace Tests;

use App\Http\Middleware\EnsureApiUser;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    // Called by RefreshDatabase before it wipes the database: never let it touch the development one
    // (e.g. when a cached config hides phpunit.xml's DB_DATABASE).
    protected function beforeRefreshingDatabase()
    {
        if (config('database.connections.mysql.database') !== 'himma_test') {
            throw new RuntimeException('Tests must run against the himma_test database. Run `php artisan config:clear`.');
        }
    }

    // Signs in as a new staff user with $role, the way a real sign-in leaves the session.
    protected function signIn(string $role = 'super_admin', array $attributes = []): User
    {
        // fresh(): load column defaults (token_version = 0), as a real request would.
        $user = User::factory()->role($role)->create($attributes)->fresh();

        $this->actingAs($user)->withSession([EnsureApiUser::SESSION_TOKEN_VERSION => $user->token_version]);

        return $user;
    }
}
