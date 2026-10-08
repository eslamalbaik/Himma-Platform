<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

// Local test accounts: one per platform role (to try each role's dashboard) and a few client users.
// They all use SEED_DEMO_PASSWORD, or the super admin's SEED_ADMIN_PASSWORD when it is not set.
class StaffSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('SEED_DEMO_PASSWORD') ?: env('SEED_ADMIN_PASSWORD');
        if (! $password) {
            return;
        }

        $staff = [
            ['sales@himma.local', 'sales_manager', 'سارة المبيعات', 'Sara Sales'],
            ['finance@himma.local', 'finance', 'خالد المالية', 'Khaled Finance'],
            ['editor@himma.local', 'platform_editor', 'ريم المحررة', 'Reem Editor'],
            ['broadcast@himma.local', 'broadcast_moderator', 'عمر مشرف البث', 'Omar Broadcast'],
            ['support@himma.local', 'support', 'ليلى الدعم', 'Layla Support'],
            ['auditor@himma.local', 'auditor', 'يوسف المدقق', 'Youssef Auditor'],
        ];

        foreach ($staff as [$email, $role, $nameAr, $nameEn]) {
            User::updateOrCreate(['email' => $email], [
                'password' => $password, 'role' => $role, 'name_ar' => $nameAr, 'name_en' => $nameEn,
                'status' => 'active', 'locale' => 'ar',
            ]);
        }

        // Client users: they receive billing emails when the client has no billing email.
        $clients = [
            ['al-birr-charity-association', 'admin@albirr.test', 'مدير جمعية البر', 'Al Birr Admin'],
            ['al-noor-private-school', 'principal@alnoor.test', 'مدير مدرسة النور', 'Al Noor Principal'],
            ['al-amal-international-school', 'office@alamal.test', 'مكتب مدرسة الأمل', 'Al Amal Office'],
            ['social-care-foundation', 'it@socialcare.test', 'تقنية مؤسسة الرعاية', 'Social Care IT'],
        ];

        foreach ($clients as [$slug, $email, $nameAr, $nameEn]) {
            $tenant = Tenant::where('slug', $slug)->first();
            if (! $tenant) {
                continue;
            }

            User::updateOrCreate(['email' => $email], [
                'password' => $password, 'role' => 'tenant_admin', 'tenant_id' => $tenant->id,
                'name_ar' => $nameAr, 'name_en' => $nameEn, 'status' => 'active', 'locale' => 'ar',
            ]);
        }

        $this->command->info('Test accounts ready: '.count($staff).' staff, '.count($clients).' client users.');
    }
}
