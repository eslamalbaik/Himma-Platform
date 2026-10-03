<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name_ar' => 'جهة '.fake()->unique()->numberBetween(1, 99999),
            'name_en' => fake()->unique()->company(),
            'type' => fake()->randomElement(Tenant::TYPES),
            'status' => 'active',
        ];
    }
}
