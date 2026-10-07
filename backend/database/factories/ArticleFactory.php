<?php

namespace Database\Factories;

use App\Models\Article;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Article>
 */
class ArticleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => 'مقال '.fake()->unique()->numberBetween(1, 99999),
            'summary' => 'ملخص قصير',
            'body' => 'نص المقال.',
            'language' => 'ar',
            'author_name' => 'كاتب تجريبي',
            'classification' => 'public',
            'audiences' => ['teachers'],
            'status' => 'draft',
        ];
    }

    public function status(string $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }

    public function compliant(): static
    {
        return $this->state(fn () => [
            'compliance_checks' => array_fill_keys(Article::COMPLIANCE_ITEMS, 'pass'),
            'compliance_result' => 'compliant',
            'compliance_checked_at' => now(),
        ]);
    }
}
