<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\Writer;
use Illuminate\Database\Seeder;

// Sample writers for local development, one per status (safe to rerun).
class WriterSeeder extends Seeder
{
    public function run(): void
    {
        $school = Tenant::where('type', 'school')->first();

        $writers = [
            ['email' => 'mona.writer@himma.local', 'name_ar' => 'منى الشامسي', 'name_en' => 'Mona Al Shamsi', 'tenant_id' => $school?->id,
                'status' => 'verified', 'verification_note' => 'بطاقة الهوية وخطاب المدرسة', 'verified_at' => now()->subDays(20)],
            ['email' => 'omar.writer@himma.local', 'name_ar' => 'عمر الكعبي', 'name_en' => 'Omar Al Kaabi', 'affiliation' => 'جامعة الإمارات',
                'status' => 'verified', 'verification_note' => 'بريد الجامعة الرسمي', 'verified_at' => now()->subDays(5)],
            ['email' => 'huda.writer@himma.local', 'name_ar' => 'هدى النعيمي', 'name_en' => 'Huda Al Nuaimi', 'affiliation' => 'معلمة مستقلة',
                'status' => 'pending'],
            ['email' => 'saeed.writer@himma.local', 'name_ar' => 'سعيد المري', 'name_en' => 'Saeed Al Marri',
                'status' => 'suspended', 'verification_note' => 'تعذّر التحقق من الجهة'],
        ];

        foreach ($writers as $writer) {
            Writer::updateOrCreate(['email' => $writer['email']], $writer);
        }

        $this->command?->info('Writers ready: '.count($writers));
    }
}
