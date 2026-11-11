<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Issue;
use App\Models\MagazineSection;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

// Demo magazine: six published issues with covers and thirty articles (five per issue) that carry a cover
// picture each. The pictures are photos from Picsum (https://picsum.photos, free to use, no credit needed) and are
// downloaded once and kept on the public disk. Safe to rerun: an article whose title already exists is skipped.
class MagazineSeeder extends Seeder
{
    public function run(): void
    {
        $data = require __DIR__.'/data/magazine.php';
        $sections = MagazineSection::pluck('id', 'name_ar');
        $demoMembers = User::where('email', 'like', 'demo-member%@hinnah.test')->orderBy('id')->get();
        $issues = [];
        $created = 0;

        foreach ($data['issues'] as $number => [$titleAr, $titleEn, $themeAr, $themeEn]) {
            $issue = Issue::firstOrNew(['number' => $number]);
            if (! $issue->exists) {
                $issue->fill(['title_ar' => $titleAr, 'title_en' => $titleEn, 'theme_ar' => $themeAr, 'theme_en' => $themeEn]);
            }
            if ($issue->status !== 'published') {
                $issue->status = 'published';
                $issue->published_at = now()->subMonths(6 - $number)->startOfMonth();
            }
            $issue->cover_path ??= $this->download("https://picsum.photos/seed/hinnah-issue-$number/900/1200", "covers/issue-$number.jpg");
            $issue->save();
            $issues[$number] = $issue;
        }

        foreach ($data['articles'] as $i => [$number, $section, $title, $summary, $heading, $quote, $p1, $p2, $p3]) {
            if (Article::where('title', $title)->exists()) {
                continue;
            }
            $author = $demoMembers[$i % max($demoMembers->count(), 1)] ?? null;
            $issue = $issues[$number];

            Article::create([
                'title' => $title,
                'summary' => $summary,
                'cover_path' => $this->download('https://picsum.photos/seed/hinnah-article-'.($i + 1).'/1200/800', 'covers/article-'.($i + 1).'.jpg'),
                'body' => "$p1\n\n## $heading\n\n$p2\n\n> $quote\n\n$p3",
                'language' => 'ar',
                'section_id' => $sections[$section] ?? null,
                'issue_id' => $issue->id,
                'author_id' => $author?->id,
                'author_name' => $author?->name_ar ?? 'هيئة التحرير',
                'classification' => 'public',
                'status' => 'published',
                'published_at' => $issue->published_at->copy()->addDays(($i % 5) * 3 + 1),
            ]);
            $created++;
        }

        $this->command?->info("Magazine demo data: 6 issues, $created articles created.");
    }

    private function download(string $url, string $path): ?string
    {
        if (Storage::disk('public')->exists($path)) {
            return $path;
        }

        $response = Http::timeout(30)->retry(2, 500)->get($url);

        if (! $response->successful() || ! str_starts_with((string) $response->header('Content-Type'), 'image/')) {
            return null;
        }

        Storage::disk('public')->put($path, $response->body());

        return $path;
    }
}
