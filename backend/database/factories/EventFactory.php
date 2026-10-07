<?php

namespace Database\Factories;

use App\Models\Event;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    public function definition(): array
    {
        $start = now()->addDays(7)->setTime(17, 0);

        return [
            'title_ar' => 'فعالية '.fake()->unique()->numberBetween(1, 99999),
            'title_en' => 'Event '.fake()->unique()->numberBetween(1, 99999),
            'type' => 'webinar',
            'format' => 'online',
            'visibility' => 'public',
            'starts_at' => $start,
            'ends_at' => $start->copy()->addHours(2),
            'stream_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'status' => 'draft',
        ];
    }

    public function status(string $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }
}
