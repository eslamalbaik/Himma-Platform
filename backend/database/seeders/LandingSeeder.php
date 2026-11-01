<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\Testimonial;
use App\Support\LandingSections;
use Illuminate\Database\Seeder;

// The public pricing section (three plans) and the moving student testimonials, as in the design reference.
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

    private function plans(): void
    {
        $rows = [
            [
                'name_en' => 'Free Plan', 'name_ar' => 'الباقة المجانية', 'price' => 0, 'order' => 1,
                'badge' => ['البداية السريعة', 'Quick start'], 'theme' => 'light', 'featured' => false,
                'description' => [
                    'مثالية لصناع المحتوى والمدربين الجدد للبدء بدون أي تكاليف.',
                    'Ideal for creators and new trainers who want to start at no cost.',
                ],
                'cta' => ['ابدأ مجاناً', 'Start for free', '/register'],
                'groups' => [
                    $this->group('الكورسات والمدة', 'Courses and duration', [
                        ['حتى 3 كورسات نشطة بالمنصة', 'Up to 3 active courses', true],
                        ['مدة الاشتراك: تجربة مجانية دائمة', 'Subscription: permanent free trial', true],
                        ['عدد الطلاب: حتى 50 طالب نشط', 'Students: up to 50 active students', true],
                    ]),
                    $this->group('الاختبارات والكويزات', 'Tests and quizzes', [
                        ['كويزات واختبارات دورية مبسطة لكل درس', 'Simple periodic quizzes for every lesson', true],
                        ['بنك الأسئلة ومحاكاة الامتحانات الشاملة', 'Question bank and full exam simulation', false],
                    ]),
                    $this->group('الملفات والمرفقات', 'Files and attachments', [
                        ['رفع ملفات ومرفقات (حتى 50 ميجابايت)', 'Upload files and attachments (up to 50 MB)', true],
                        ['حماية متقدمة للفيديو ضد التسريب والتحميل', 'Advanced video protection against leaks and downloads', false],
                    ]),
                    $this->group('الدعم والإضافات', 'Support and extras', [
                        ['دعم فني أساسي عبر البريد الإلكتروني', 'Basic email support', true],
                        ['ربط نطاق مخصص (Custom Domain)', 'Custom domain', false],
                    ]),
                ],
            ],
            [
                'name_en' => 'Basic Plan', 'name_ar' => 'الباقة الأساسية', 'price' => 5400, 'order' => 2,
                'badge' => ['الأكثر شيوعاً', 'Most popular'], 'theme' => 'primary', 'featured' => true,
                'description' => [
                    'مخصصة للمؤسسات المتوسطة والأكاديميات المتنامية والدورات التعليمية.',
                    'For mid-size organizations, growing academies and training courses.',
                ],
                'cta' => ['اشترك الآن', 'Subscribe now', '/join'],
                'groups' => [
                    $this->group('الكورسات والمدة', 'Courses and duration', [
                        ['حتى 30 كورس نشط بالمنصة', 'Up to 30 active courses', true],
                        ['مدة الاشتراك: صلاحية سنوية كاملة', 'Subscription: a full year', true],
                        ['عدد الطلاب: حتى 1,000 طالب نشط', 'Students: up to 1,000 active students', true],
                    ]),
                    $this->group('الاختبارات والكويزات', 'Tests and quizzes', [
                        ['كويزات واختبارات دورية غير محدودة', 'Unlimited periodic quizzes and tests', true],
                        ['بنك الأسئلة ومحاكاة الامتحانات الشاملة', 'Question bank and full exam simulation', true],
                    ]),
                    $this->group('الملفات والمرفقات', 'Files and attachments', [
                        ['رفع ملفات ومرفقات (حتى 10 جيجابايت)', 'Upload files and attachments (up to 10 GB)', true],
                        ['حماية متقدمة للفيديو ضد التسريب والتحميل', 'Advanced video protection against leaks and downloads', true],
                    ]),
                    $this->group('الدعم والإضافات', 'Support and extras', [
                        ['دعم فني سريع على مدار الساعة', 'Fast 24/7 support', true],
                        ['ربط نطاق مخصص (Custom Domain)', 'Custom domain', true],
                    ]),
                ],
            ],
            [
                'name_en' => 'Professional Plan', 'name_ar' => 'الباقة الاحترافية', 'price' => 9000, 'order' => 3,
                'badge' => ['المؤسسات الكبرى', 'Large organizations'], 'theme' => 'dark', 'featured' => true,
                'description' => [
                    'الحل الشامل للمنصات الكبيرة والشركات مع حماية قصوى وتطبيق هاتف.',
                    'The complete solution for large platforms and companies, with top protection and a mobile app.',
                ],
                'cta' => ['اشترك الآن', 'Subscribe now', '/join'],
                'groups' => [
                    $this->group('الكورسات والمدة', 'Courses and duration', [
                        ['كورسات تدريبية غير محدودة', 'Unlimited training courses', true],
                        ['مدة الاشتراك: صلاحية سنوية مرنة', 'Subscription: a flexible year', true],
                        ['عدد الطلاب: غير محدود', 'Students: unlimited', true],
                    ]),
                    $this->group('الاختبارات والكويزات', 'Tests and quizzes', [
                        ['كويزات واختبارات دورية غير محدودة', 'Unlimited periodic quizzes and tests', true],
                        ['بنك الأسئلة ومحاكاة الامتحانات الشاملة', 'Question bank and full exam simulation', true],
                    ]),
                    $this->group('الملفات والمرفقات', 'Files and attachments', [
                        ['رفع ملفات ومذكرات (مساحة غير محدودة)', 'Upload files and notes (unlimited space)', true],
                        ['حماية قصوى وتشفير للفيديو ضد التسريب والسرقة', 'Maximum protection and encryption for video', true],
                    ]),
                    $this->group('الدعم والإضافات', 'Support and extras', [
                        ['دعم فني مباشر ومسؤول حساب مخصص', 'Direct support and a dedicated account manager', true],
                        ['ربط نطاق مخصص وتخصيص الهوية بالكامل', 'Custom domain and full branding', true],
                    ]),
                ],
            ],
        ];

        foreach ($rows as $row) {
            $plan = Plan::firstOrNew(['name_en' => $row['name_en']]);
            // The price and the plan itself belong to billing: set them only when the plan is new.
            if (! $plan->exists) {
                $plan->fill(['name_ar' => $row['name_ar'], 'price' => $row['price'], 'currency' => 'SAR', 'interval' => 'yearly', 'is_active' => true]);
            }
            $plan->fill([
                'show_on_site' => true, 'site_order' => $row['order'], 'theme' => $row['theme'], 'is_featured' => $row['featured'],
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
