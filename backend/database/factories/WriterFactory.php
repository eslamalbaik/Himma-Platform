<?php

namespace Database\Factories;

use App\Models\Writer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Writer>
 */
class WriterFactory extends Factory
{
    public function definition(): array
    {
        $n = fake()->unique()->numberBetween(1, 99999);

        return [
            'name_ar' => "كاتب $n",
            'name_en' => "Writer $n",
            'email' => "writer$n@example.test",
            'status' => 'pending',
        ];
    }

    public function verified(): static
    {
        return $this->state(fn () => ['status' => 'verified', 'verified_at' => now()]);
    }

    public function suspended(): static
    {
        return $this->state(fn () => ['status' => 'suspended']);
    }
}
