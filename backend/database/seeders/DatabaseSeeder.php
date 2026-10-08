<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    // Creates the first super admin from SEED_ADMIN_* in .env (mirrors the old `npm run db:seed`).
    public function run(): void
    {
        $email = env('SEED_ADMIN_EMAIL');
        $password = env('SEED_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            $this->command->warn('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set in .env — skipping.');

            return;
        }

        User::updateOrCreate(
            ['email' => strtolower($email)],
            [
                'password' => $password,
                'name_ar' => env('SEED_ADMIN_NAME_AR', 'مدير المنصة'),
                'name_en' => env('SEED_ADMIN_NAME_EN', 'Platform Owner'),
                'role' => 'super_admin',
                'status' => 'active',
                'locale' => 'ar',
            ]
        );

        $this->command->info("Super admin ready: $email");

        $this->call(TenantSeeder::class);
        $this->call(TenantRequestSeeder::class);
        $this->call(StaffSeeder::class);
        $this->call(BillingSeeder::class);
        $this->call(MessagingSeeder::class);
        $this->call(ContentSeeder::class);
        $this->call(EventSeeder::class);
    }
}
