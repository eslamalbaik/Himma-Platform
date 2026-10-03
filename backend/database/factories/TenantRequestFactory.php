<?php

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\TenantRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TenantRequest>
 */
class TenantRequestFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name_ar' => 'جهة '.fake()->unique()->numberBetween(1, 99999),
            'name_en' => fake()->unique()->company(),
            'type' => fake()->randomElement(Tenant::TYPES),
            'contact_name' => fake()->name(),
            'contact_email' => fake()->safeEmail(),
            'status' => 'pending',
        ];
    }
}
