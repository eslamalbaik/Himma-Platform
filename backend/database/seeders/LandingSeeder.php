<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\Testimonial;
use App\Support\LandingSections;
use Illuminate\Database\Seeder;

// The public pricing section (the free plan and the owner's three paid plans) and the moving student testimonials, as in the design reference.
// Safe to rerun: plans are matched by English name, testimonials by author and quote.
class LandingSeeder extends Seeder
{
    public function run(): void
    {
        foreach (LandingSections::KEYS as $key) {
            LandingSections::put($key, LandingSections::get($key));
        }

        $this->plans();
        $this->testimonials();

        $this->command->info('Landing ready: '.Plan::where('show_on_site', true)->count().' plans, '.Testimonial::count().' testimonials.');
    }

    private function group(string $titleAr, string $titleEn, array $items): array
    {
        return [
            'titleAr' => $titleAr, 'titleEn' => $titleEn,
            'items' => array_map(fn ($i) => ['textAr' => $i[0], 'textEn' => $i[1], 'included' => $i[2]], $items),
        ];
    }

    // The free plan and the owner's three paid plans (2026-11-17), priced in UAE dirhams. Prices and the billing feature list belong to
    // billing, so a rerun sets them only on a new plan, unless `withPrices` (the migration that brought these plans).
    public function plans(bool $withPrices = false): void
    {
        $rows = [
            [
                'name_en' => 'Free Plan', 'name_ar' => 'الباقة المجانية', 'price' => 0, 'yearly' => null, 'order' => 0,
                'badge' => ['البداية السريعة', 'Quick start'], 'theme' => 'light', 'featured' => false,
                'description' => [
                    'ابدأ الكتابة والنشر على هنّة مجاناً، واقرأ المجلة وتابع الكتّاب.',
                    'Write and publish on Hinnah for free, read the magazine and follow writers.',
                ],
                'cta' => ['ابدأ مجاناً', 'Start for free', '/register'],
                'groups' => [
                    $this->group('الخدمات المشمولة', 'Included services', [
                        ['ملف شخصي للكاتب.', 'A writer profile.', true],
                        ['كتابة المقالات ونشرها.', 'Writing and publishing articles.', true],
                        ['قراءة المجلة الرقمية وأعدادها.', 'Reading the digital magazine and its issues.', true],
                        ['متابعة الكتّاب والتفاعل مع القصص.', 'Following writers and engaging with stories.', true],
                        ['المراسلة الخاصة مع الأعضاء.', 'Private messages with members.', true],
                        ['حضور البث المباشر.', 'Watching live broadcasts.', true],
                        ['الدعم عبر البريد الإلكتروني.', 'Support by email.', true],
                    ]),
                ],
            ],
            [
                'name_en' => 'Basic Plan', 'name_ar' => 'الباقة الأساسية', 'price' => 100, 'yearly' => 1200, 'order' => 1,
                // Hidden from the site (owner, 2026-11-17); kept so it can be shown again from the dashboard.
                'show' => false,
                'badge' => ['للأفراد والكتّاب', 'For individuals and writers'], 'theme' => 'light', 'featured' => false,
                'description' => [
                    'لكل من يكتب وينشر: مقالاتك وفيديوهاتك وأخبارك في مكان واحد.',
                    'For everyone who writes and publishes: your articles, videos and news in one place.',
                ],
                'cta' => ['اشترك الآن', 'Subscribe now', '/join'],
                'groups' => [
                    $this->group('الخدمات المشمولة', 'Included services', [
                        ['كتابة وتحرير المقالات.', 'Writing and editing articles.', true],
                        ['نشر المقالات رقمياً.', 'Publishing articles digitally.', true],
                        ['نشر الفيديوهات.', 'Publishing videos.', true],
                        ['تصميم المنشورات.', 'Designing posts.', true],
                        ['نشر الأخبار والإعلانات.', 'Publishing news and announcements.', true],
                    ]),
                ],
            ],
            [
                'name_en' => 'Professional Plan', 'name_ar' => 'الباقة الاحترافية', 'price' => 199, 'yearly' => 1990, 'order' => 2,
                'badge' => ['للمؤلفين والباحثين وصنّاع المحتوى', 'For authors, researchers and content creators'],
                'theme' => 'primary', 'featured' => true,
                'description' => [
                    'محتوى متخصص وإنتاج مرئي وبث مباشر، مع تقارير تُظهر أثر ما تنشره.',
                    'Specialised content, video and live broadcasts, with reports on your reach.',
                ],
                'cta' => ['اشترك الآن', 'Subscribe now', '/join'],
                'groups' => [
                    $this->group('الخدمات المشمولة', 'Included services', [
                        ['كتابة وتحرير المقالات المتخصصة.', 'Writing and editing specialised articles.', true],
                        ['النشر الرقمي والإعلامي.', 'Digital and media publishing.', true],
                        ['إنتاج ونشر الفيديوهات.', 'Producing and publishing videos.', true],
                        ['تصميم المحتوى الإعلامي.', 'Designing media content.', true],
                        ['إعداد وتصميم الحلقات.', 'Preparing and designing episodes.', true],
                        ['تنظيم البث المباشر.', 'Organising live broadcasts.', true],
                        ['تقارير المشاهدات والتفاعل.', 'Views and engagement reports.', true],
                    ]),
                ],
            ],
            [
                'name_en' => 'Institutions Plan', 'name_ar' => 'باقة المؤسسات', 'price' => 1500, 'yearly' => null, 'order' => 3,
                'badge' => ['للجهات والمؤسسات', 'For organisations'], 'theme' => 'dark', 'featured' => true,
                'description' => [
                    'مجلتك الرقمية كاملة: من التحرير والتصميم إلى النشر والبث والأرشفة.',
                    'Your whole digital magazine: editing, design, publishing, broadcasts and archive.',
                ],
                'cta' => ['اشترك الآن', 'Subscribe now', '/join'],
                'groups' => [
                    $this->group('الخدمات المشمولة', 'Included services', [
                        ['إعداد وتحرير المجلات الرقمية.', 'Preparing and editing digital magazines.', true],
                        ['كتابة المقالات والموضوعات الصحفية.', 'Writing articles and press features.', true],
                        ['إجراء المقابلات والتحقيقات الإعلامية.', 'Conducting interviews and media investigations.', true],
                        ['تصميم الأغلفة والصفحات الداخلية.', 'Designing covers and inside pages.', true],
                        ['الإخراج الفني والتنسيق الاحترافي.', 'Art direction and professional layout.', true],
                        ['نشر الفيديوهات والتقارير المرئية.', 'Publishing videos and video reports.', true],
                        ['إعداد الحلقات والبرامج الإعلامية.', 'Preparing episodes and media programmes.', true],
                        ['تنظيم البث المباشر والتغطيات.', 'Organising live broadcasts and coverage.', true],
                        ['نشر المجلة إلكترونياً.', 'Publishing the magazine online.', true],
                        ['أرشفة الأعداد والإصدارات السابقة.', 'Archiving past issues and publications.', true],
                        ['تصميم الإعلانات والمواد الترويجية.', 'Designing advertisements and promotional material.', true],
                        ['إعداد تقارير المشاهدات والتفاعل.', 'Preparing views and engagement reports.', true],
                    ]),
                    $this->group('الفئات المستهدفة', 'Who it is for', [
                        ['الجهات الحكومية والخاصة.', 'Government and private organisations.', true],
                        ['المؤسسات التعليمية والأكاديميات.', 'Educational institutions and academies.', true],
                        ['الجامعات والمراكز البحثية.', 'Universities and research centres.', true],
                        ['الجمعيات والاتحادات المهنية.', 'Associations and professional unions.', true],
                        ['المؤسسات الثقافية والإعلامية.', 'Cultural and media institutions.', true],
                    ]),
                ],
            ],
        ];

        foreach ($rows as $row) {
            $plan = Plan::firstOrNew(['name_en' => $row['name_en']]);
            if ($withPrices || ! $plan->exists) {
                $services = $row['groups'][0]['items'];
                $plan->fill([
                    'name_ar' => $row['name_ar'], 'price' => $row['price'], 'currency' => 'AED', 'interval' => 'monthly',
                    'is_active' => true,
                    'features_ar' => implode("\n", array_column($services, 'textAr')),
                    'features_en' => implode("\n", array_column($services, 'textEn')),
                ]);
            }
            $plan->fill([
                'yearly_price' => $row['yearly'],
                'show_on_site' => $row['show'] ?? true, 'site_order' => $row['order'], 'theme' => $row['theme'], 'is_featured' => $row['featured'],
                'badge_ar' => $row['badge'][0], 'badge_en' => $row['badge'][1],
                'description_ar' => $row['description'][0], 'description_en' => $row['description'][1],
                'cta_label_ar' => $row['cta'][0], 'cta_label_en' => $row['cta'][1], 'cta_url' => $row['cta'][2],
                'feature_groups' => $row['groups'],
            ])->save();
        }
    }

    private function testimonials(): void
    {
        // [author ar, author en, role ar, role en, quote ar, quote en, rating, color]
        $rows = [
            ['عمر س.', 'Omar S.', 'صيدلاني سريري', 'Clinical pharmacist', 'كان مستوى التدريب الاحترافي وأسئلة الاختبار استثنائياً وواقعياً.', 'The professional training and the exam questions were exceptional and realistic.', 5, '#5F0118'],
            ['د. سارة م.', 'Dr. Sara M.', 'صيدلانية مستشفى', 'Hospital pharmacist', 'أخيراً شريك تعليمي يركز على الفهم العميق وليس الحفظ عن ظهر قلب — والثقة.', 'Finally a learning partner that focuses on deep understanding, not memorizing — and confidence.', 5, '#7D1A33'],
            ['خالد جودت', 'Khaled Jawdat', 'طالب صيدلة', 'Pharmacy student', 'اسامة التميمي عم الجميع', 'Great teaching by Osama, for everyone.', 4, '#383838'],
            ['ماجدة أحمد', 'Magda Ahmed', 'صيدلانية', 'Pharmacist', 'كل الاحترام للمعلمين', 'All respect to the teachers.', 5, '#8C5A2B'],
            ['ياسمين ابراهيم', 'Yasmin Ibrahim', 'صيدلانية', 'Pharmacist', 'الله يجزيكم الخير', 'May God reward you.', 4, '#7D1A33'],
            ['ليلى هـ.', 'Layla H.', 'صيدلانية مرخصة', 'Licensed pharmacist', 'غيرت أكاديمية بروميتريك طريقة دراستي تماماً، وتجاوزت امتحان الترخيص من المحاولة الأولى.', 'This academy completely changed how I study, and I passed the licensing exam on my first attempt.', 5, '#A3485F'],
            ['أحمد م.', 'Ahmed M.', 'صيدلاني مرخص', 'Licensed pharmacist', 'برنامج الإعداد أعطاني الثقة الكاملة قبل الاختبار، ونجحت بامتياز.', 'The preparation program gave me full confidence before the exam, and I passed with distinction.', 5, '#383838'],
            ['نورة ع.', 'Noura A.', 'صيدلانية', 'Pharmacist', 'المحتوى منظم ومركّز — لا وقت ضائع كل ثانية لها قيمة.', 'The content is organized and focused — no wasted time, every second counts.', 5, '#A3485F'],
            ['فيصل ر.', 'Faisal R.', 'صيدلاني سريري', 'Clinical pharmacist', 'تجربة تعلم احترافية من أول يوم حتى آخر يوم، أنصح بها كل صيدلاني.', 'A professional learning experience from the first day to the last. I recommend it to every pharmacist.', 5, '#8C5A2B'],
            ['NASR Alsayed', 'NASR Alsayed', 'صيدلاني', 'Pharmacist', 'منصة جدا جميلة وشرح ممتاز', 'A very nice platform and excellent explanations.', 5, '#4A0012'],
            ['سيف الدين أيمن براسة', 'Seif Eldin Ayman', 'طالب صيدلة', 'Pharmacy student', 'يعطيكم العافية لكل الاساتذة واتمنى التوفيق والنجاح للجميع.', 'Well done to all the teachers. I wish everyone success.', 5, '#8C5A2B'],
            ['هبا القطان', 'Heba Alqattan', 'صيدلانية', 'Pharmacist', 'الاستاذ احمد الحطيبة أفضل مدرس وبسرع الفهم منه.', 'The best teacher, and the easiest to learn from.', 5, '#7D1A33'],
            ['علي ك.', 'Ali K.', 'طالب', 'Student', 'ماشاء الله على الاستاذ، شرح واضح ومبسط.', 'Mashallah, the explanation is clear and simple.', 5, '#5F0118'],
        ];

        foreach ($rows as $position => [$authorAr, $authorEn, $roleAr, $roleEn, $quoteAr, $quoteEn, $rating, $color]) {
            Testimonial::updateOrCreate(['author_en' => $authorEn, 'quote_en' => $quoteEn], [
                'author_ar' => $authorAr, 'role_ar' => $roleAr, 'role_en' => $roleEn, 'quote_ar' => $quoteAr,
                'rating' => $rating, 'color' => $color, 'sort_order' => $position + 1, 'is_visible' => true,
            ]);
        }
    }
}
