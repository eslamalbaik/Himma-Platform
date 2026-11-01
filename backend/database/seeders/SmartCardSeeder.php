<?php

namespace Database\Seeders;

use App\Models\SmartCard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

// Local test cards: an author with books, a virtual book launch and its programme, plus a business card
// still in draft. Safe to rerun: cards are matched by slug.
class SmartCardSeeder extends Seeder
{
    public function run(): void
    {
        $launch = Carbon::now()->addDays(10)->setTime(19, 0);

        SmartCard::updateOrCreate(['slug' => 'demo-author'], [
            'kind' => 'author', 'status' => 'published',
            'name_ar' => 'مريم السالم', 'name_en' => 'Maryam Al Salem',
            'headline_ar' => 'روائية وباحثة في التراث الإماراتي', 'headline_en' => 'Novelist and researcher of Emirati heritage',
            'bio_ar' => "تكتب الرواية والقصة القصيرة منذ عشرين عاماً، وتهتم بحكايات البحر والصحراء.\nشاركت في معارض الكتب في الشارقة وأبوظبي.",
            'bio_en' => "She has written novels and short stories for twenty years, with a love for tales of the sea and the desert.\nShe has taken part in the Sharjah and Abu Dhabi book fairs.",
            'color' => '#9A5B13',
            'email' => 'author@himma.local', 'phone' => '+971 50 000 0000',
            'publisher_ar' => 'دار هنّة للنشر', 'publisher_en' => 'Hinnah Publishing',
            'rights_ar' => 'جميع الحقوق محفوظة للمؤلفة والناشر.', 'rights_en' => 'All rights reserved by the author and the publisher.',
            'accepts_requests' => true, 'newsletter_enabled' => true,
            'links' => [
                ['type' => 'store', 'labelAr' => 'متجر الكتب', 'labelEn' => 'Book store', 'url' => 'https://example.com/store'],
                ['type' => 'instagram', 'labelAr' => null, 'labelEn' => null, 'url' => 'https://instagram.com/example'],
                ['type' => 'x', 'labelAr' => null, 'labelEn' => null, 'url' => 'https://x.com/example'],
            ],
            'books' => [
                [
                    'id' => 'demobook0000000001', 'titleAr' => 'ذاكرة الرمل', 'titleEn' => 'Memory of Sand',
                    'isbn' => '978-9948-00-000-1', 'format' => 'both', 'year' => 2026, 'coverUrl' => null,
                    'descriptionAr' => 'رواية عن ثلاثة أجيال تعيش على حافة الصحراء.', 'descriptionEn' => 'A novel of three generations on the edge of the desert.',
                    'storeUrl' => 'https://example.com/store/memory-of-sand',
                ],
                [
                    'id' => 'demobook0000000002', 'titleAr' => 'حكايات اللؤلؤ', 'titleEn' => 'Pearl Tales',
                    'isbn' => '978-9948-00-000-2', 'format' => 'print', 'year' => 2023, 'coverUrl' => null,
                    'descriptionAr' => 'قصص قصيرة من زمن الغوص.', 'descriptionEn' => 'Short stories from the pearl-diving days.',
                    'storeUrl' => null,
                ],
            ],
            'events' => [[
                'id' => 'demoevent000000001', 'type' => 'launch',
                'titleAr' => 'حفل الإطلاق الافتراضي لرواية «ذاكرة الرمل»', 'titleEn' => 'Virtual launch of “Memory of Sand”',
                'startsAt' => $launch->toIso8601String(),
                'locationAr' => 'بث مباشر', 'locationEn' => 'Live online',
                'summaryAr' => 'لقاء مباشر مع الكاتبة: قراءة من الرواية، ونقاش، وأسئلة الجمهور، ثم توقيع النسخ.',
                'summaryEn' => 'A live meeting with the author: a reading, a discussion, audience questions, then signing.',
                'liveUrl' => 'https://www.youtube.com/', 'bookTitle' => 'Memory of Sand',
                'programme' => [
                    ['minute' => 0, 'titleAr' => 'الترحيب', 'titleEn' => 'Welcome'],
                    ['minute' => 10, 'titleAr' => 'قراءة من الرواية', 'titleEn' => 'Reading from the novel'],
                    ['minute' => 25, 'titleAr' => 'النقاش', 'titleEn' => 'Discussion'],
                    ['minute' => 45, 'titleAr' => 'أسئلة الجمهور', 'titleEn' => 'Audience questions'],
                    ['minute' => 60, 'titleAr' => 'التوقيع والإهداءات', 'titleEn' => 'Signing and dedications'],
                ],
            ]],
        ]);

        SmartCard::updateOrCreate(['slug' => 'demo-business'], [
            'kind' => 'business', 'status' => 'draft',
            'name_ar' => 'شركة المثال', 'name_en' => 'Example Company',
            'headline_ar' => 'حلول رقمية للأعمال', 'headline_en' => 'Digital solutions for business',
            'color' => '#5F0118', 'email' => 'hello@himma.local',
            'links' => [['type' => 'website', 'labelAr' => 'الموقع', 'labelEn' => 'Website', 'url' => 'https://example.com']],
            'books' => [], 'events' => [],
        ]);

        $this->command->info('Smart cards ready: '.SmartCard::count().' cards (open /c/demo-author).');
    }
}
