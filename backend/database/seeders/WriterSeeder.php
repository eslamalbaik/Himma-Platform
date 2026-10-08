<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Writer;
use Illuminate\Database\Seeder;

// Local writers in every state, and some seeded articles linked to the verified ones. Safe to rerun.
class WriterSeeder extends Seeder
{
    public function run(): void
    {
        $editor = User::where('role', 'platform_editor')->first() ?? User::where('role', 'super_admin')->first();
        $school = Tenant::where('type', 'school')->first();
        $association = Tenant::where('type', 'association')->first();

        $writers = [
            ['سارة المنصوري', 'Sara Al Mansoori', 'sara.writer@himma.local', $school?->id, null, 'معلمة علوم', 'Science teacher', 'verified', 'organisation_letter'],
            ['د. خالد الحمادي', 'Dr. Khalid Al Hammadi', 'khalid.writer@himma.local', null, 'جامعة الإمارات', 'باحث في تقنيات التعليم', 'Educational technology researcher', 'verified', 'id_document'],
            ['مريم الكعبي', 'Maryam Al Kaabi', 'maryam.writer@himma.local', $association?->id, null, 'مستشارة تربوية', 'Education consultant', 'verified', 'known_contributor'],
            ['أحمد السويدي', 'Ahmed Al Suwaidi', 'ahmed.writer@himma.local', null, 'كاتب مستقل', 'كاتب تربوي', 'Education writer', 'pending', null],
            ['نورة الظاهري', 'Noura Al Dhaheri', 'noura.writer@himma.local', $school?->id, null, 'مديرة مدرسة', 'School principal', 'pending', null],
            ['يوسف الشامسي', 'Yousef Al Shamsi', 'yousef.writer@himma.local', null, 'مركز تدريب خاص', 'مدرب', 'Trainer', 'suspended', 'interview'],
        ];

        foreach ($writers as [$nameAr, $nameEn, $email, $tenantId, $affiliation, $titleAr, $titleEn, $status, $method]) {
            Writer::updateOrCreate(['email' => $email], [
                'name_ar' => $nameAr, 'name_en' => $nameEn, 'tenant_id' => $tenantId, 'affiliation' => $affiliation,
                'title_ar' => $titleAr, 'title_en' => $titleEn, 'status' => $status,
                'bio_ar' => "{$nameAr}، {$titleAr}، تكتب لمجلة همّة عن التعليم والميدان التربوي.",
                'bio_en' => "{$nameEn}, {$titleEn}, writes for Himma about education and teaching practice.",
                'verification_method' => $method,
                'verified_by' => $method ? $editor?->id : null,
                'verified_at' => $method ? now()->subDays(20) : null,
                'suspension_reason' => $status === 'suspended' ? 'محتوى منسوخ دون إذن في مقال سابق' : null,
            ]);
        }

        // Every other seeded Arabic article gets a verified writer as its byline.
        $verified = Writer::where('status', 'verified')->orderBy('id')->get();
        Article::where('language', 'ar')->whereNull('tenant_id')->orderBy('id')->get()
            ->filter(fn ($article, $i) => $i % 2 === 0)
            ->values()
            ->each(fn (Article $article, $i) => $article->update([
                'writer_id' => $verified[$i % $verified->count()]->id,
                'author_name' => $verified[$i % $verified->count()]->name_ar,
            ]));

        $this->command->info('Writers ready: '.Writer::count());
    }
}
