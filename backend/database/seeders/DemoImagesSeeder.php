<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

// Profile pictures for the demo members and logos for the demo organizations, drawn by DiceBear
// (https://www.dicebear.com): the `lorelei` and `shapes` styles are CC0, so no credit line is needed.
// Each image is downloaded once and kept on the public disk. Safe to rerun: accounts that have one are skipped.
class DemoImagesSeeder extends Seeder
{
    public function run(): void
    {
        $done = 0;

        foreach (User::where('email', 'like', 'demo-%@hinnah.test')->whereNull('avatar_path')->get() as $user) {
            $path = $this->download('lorelei', $user->handle, "avatars/{$user->cuid}.svg");
            $path && $user->forceFill(['avatar_path' => $path])->save() && $done++;
        }

        foreach (Tenant::where('name_en', 'like', 'Demo Education%')->whereNull('logo_path')->get() as $tenant) {
            $path = $this->download('shapes', $tenant->slug, "logos/{$tenant->cuid}.svg");
            $path && $tenant->forceFill(['logo_path' => $path])->save() && $done++;
        }

        $this->command?->info("Demo images saved: $done.");
    }

    private function download(string $style, string $seed, string $path): ?string
    {
        $response = Http::timeout(20)->retry(2, 500)->get("https://api.dicebear.com/9.x/$style/svg", ['seed' => $seed]);

        if (! $response->successful() || ! str_contains($response->body(), '<svg')) {
            return null;
        }

        Storage::disk('public')->put($path, $response->body());

        return $path;
    }
}
