<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

// Sample client organisations for local development, so the tenants page has data to show.
class TenantSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = [
            ['name_ar' => 'جمعية البر الخيرية', 'name_en' => 'Al Birr Charity Association', 'type' => 'association', 'status' => 'active'],
            ['name_ar' => 'جمعية الوفاء التطوعية', 'name_en' => 'Al Wafa Volunteer Association', 'type' => 'association', 'status' => 'trial'],
            ['name_ar' => 'مدرسة النور الأهلية', 'name_en' => 'Al Noor Private School', 'type' => 'school', 'status' => 'active'],
            ['name_ar' => 'مدرسة الأمل الدولية', 'name_en' => 'Al Amal International School', 'type' => 'school', 'status' => 'suspended'],
            ['name_ar' => 'مؤسسة الرعاية الاجتماعية', 'name_en' => 'Social Care Foundation', 'type' => 'institution', 'status' => 'active'],
            ['name_ar' => 'مؤسسة التنمية المجتمعية', 'name_en' => 'Community Development Institution', 'type' => 'institution', 'status' => 'trial'],
            ['name_ar' => 'وزارة الموارد البشرية والتنمية الاجتماعية', 'name_en' => 'Ministry of Human Resources and Social Development', 'type' => 'government', 'status' => 'active'],
            ['name_ar' => 'أمانة منطقة الرياض', 'name_en' => 'Riyadh Region Municipality', 'type' => 'government', 'status' => 'cancelled'],
            ['name_ar' => 'جمعية إحسان الخيرية', 'name_en' => 'Ehsan Charity Association', 'type' => 'association', 'status' => 'active'],
            ['name_ar' => 'مدرسة الإبداع النموذجية', 'name_en' => 'Al Ibdaa Model School', 'type' => 'school', 'status' => 'active'],
        ];

        foreach ($tenants as $tenant) {
            Tenant::updateOrCreate(
                ['slug' => Str::slug($tenant['name_en'])],
                $tenant
            );
        }

        $this->command->info('Sample tenants ready: ' . count($tenants));
    }
}
