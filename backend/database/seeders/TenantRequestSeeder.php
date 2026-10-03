<?php

namespace Database\Seeders;

use App\Models\TenantRequest;
use Illuminate\Database\Seeder;

// Sample join requests for local development, so the requests page has data to show.
class TenantRequestSeeder extends Seeder
{
    public function run(): void
    {
        $requests = [
            [
                'name_ar' => 'جمعية رعاية الأيتام',
                'name_en' => 'Orphan Care Association',
                'type' => 'association',
                'contact_name' => 'سارة العتيبي',
                'contact_email' => 'sara@orphancare.example',
                'contact_phone' => '+966500000001',
                'message' => 'نرغب بالانضمام لإدارة فعالياتنا الخيرية عبر المنصة.',
                'status' => 'pending',
            ],
            [
                'name_ar' => 'مدرسة المستقبل الأهلية',
                'name_en' => 'Future Private School',
                'type' => 'school',
                'contact_name' => 'خالد المطيري',
                'contact_email' => 'khaled@futureschool.example',
                'contact_phone' => '+966500000002',
                'message' => null,
                'status' => 'pending',
            ],
            [
                'name_ar' => 'مؤسسة الأمل للتأهيل',
                'name_en' => 'Al Amal Rehabilitation Institution',
                'type' => 'institution',
                'contact_name' => 'منى الشهري',
                'contact_email' => 'mona@alamal.example',
                'contact_phone' => null,
                'message' => 'نحتاج لوحة لمتابعة المستفيدين.',
                'status' => 'pending',
            ],
        ];

        foreach ($requests as $req) {
            TenantRequest::updateOrCreate(
                ['contact_email' => $req['contact_email']],
                $req
            );
        }

        $this->command->info('Sample tenant requests ready: '.count($requests));
    }
}
