<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'name_ar' => 'مستخدم '.fake()->unique()->numberBetween(1, 99999),
            'name_en' => fake()->name(),
            'role' => 'super_admin',
            'status' => 'active',
            'locale' => 'ar',
        ];
    }

    public function role(string $role): static
    {
        return $this->state(fn () => ['role' => $role]);
    }

    public function disabled(): static
    {
        return $this->state(fn () => ['status' => 'disabled']);
    }
}
