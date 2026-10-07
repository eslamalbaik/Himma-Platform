<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Comment;
use App\Models\ContentReport;
use App\Models\Issue;
use App\Models\MagazineSection;
use App\Models\Tag;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

// The 22 magazine sections and their axes (REQUIREMENTS.md §9), plus sample content for development.
class ContentSeeder extends Seeder
{
    private const SECTIONS = [
        ['افتتاحية العدد', 'Editorial', 'identity'],
        ['ملف العدد', 'Issue feature', 'identity'],
        ['المقالات التربوية', 'Educational articles', 'knowledge'],
        ['تجارب ميدانية متميزة', 'Field experiences', 'people'],
        ['الاتجاهات العالمية', 'Global trends', 'knowledge'],
        ['الابتكار والذكاء الاصطناعي', 'Innovation and AI', 'knowledge'],
        ['التنمية المهنية', 'Professional development', 'knowledge'],
        ['المناهج واستراتيجيات التدريس', 'Curricula and teaching strategies', 'knowledge'],
        ['القياس والتقويم', 'Measurement and assessment', 'data'],
        ['الاستدامة والتعليم الأخضر', 'Sustainability and green education', 'data'],
        ['الهوية الوطنية والقيم', 'National identity and values', 'identity'],
        ['الطالب الملهم', 'Inspiring student', 'people'],
        ['شخصيات تربوية', 'Education figures', 'people'],
        ['لقاءات وحوارات', 'Interviews', 'people'],
        ['التشريعات والسياسات التعليمية', 'Education legislation and policy', 'knowledge'],
        ['إصدارات تربوية', 'Education publications', 'knowledge'],
        ['التكنولوجيا التعليمية', 'Educational technology', 'knowledge'],
        ['مؤشرات وإنفوجرافيك', 'Indicators and infographics', 'data'],
        ['أخبار الجمعية', 'Association news', 'data'],
        ['المنتدى التربوي', 'Education forum', 'identity'],
        ['المسابقات والجوائز', 'Competitions and awards', 'identity'],
        ['الملحق الرقمي', 'Digital supplement', 'identity'],
    ];

    public function run(): void
    {
        foreach (self::SECTIONS as $i => [$nameAr, $nameEn, $axis]) {
            MagazineSection::updateOrCreate(['name_en' => $nameEn], ['name_ar' => $nameAr, 'axis' => $axis, 'sort_order' => $i + 1]);
        }

        $tags = collect([
            ['الذكاء الاصطناعي', 'Artificial intelligence'], ['التقويم', 'Assessment'], ['القيادة المدرسية', 'School leadership'],
            ['التعلم الرقمي', 'Digital learning'], ['الاستدامة', 'Sustainability'], ['الهوية الوطنية', 'National identity'],
        ])->map(fn ($t) => Tag::updateOrCreate(['name_en' => $t[1]], ['name_ar' => $t[0]]));

        $issue1 = Issue::updateOrCreate(['number' => 1], [
            'title_ar' => 'العدد الأول', 'title_en' => 'Issue 1',
            'theme_ar' => 'الذكاء الاصطناعي في التعليم', 'theme_en' => 'AI in education',
            'status' => 'published', 'published_at' => now()->subMonth(),
        ]);
        $issue2 = Issue::updateOrCreate(['number' => 2], [
            'title_ar' => 'العدد الثاني', 'title_en' => 'Issue 2',
            'theme_ar' => 'جودة التعليم', 'theme_en' => 'Quality of education', 'status' => 'draft',
        ]);

        $section = fn (string $nameEn) => MagazineSection::where('name_en', $nameEn)->value('id');
        $pass = array_fill_keys(Article::COMPLIANCE_ITEMS, 'pass');
        $school = Tenant::where('type', 'school')->first();

        $articles = [
            ['الذكاء الاصطناعي شريكاً للمعلم', 'Innovation and AI', 'published', $issue1->id, ['teachers', 'researchers'], [0, 3], ['compliance_checks' => $pass, 'compliance_result' => 'compliant', 'published_at' => now()->subMonth()]],
            ['كلمة رئيس الجمعية', 'Editorial', 'published', $issue1->id, ['teachers', 'parents'], [5], ['compliance_checks' => $pass, 'compliance_result' => 'compliant', 'published_at' => now()->subMonth()]],
            ['التقويم من أجل التعلم', 'Measurement and assessment', 'approved', $issue2->id, ['teachers'], [1], ['compliance_checks' => $pass, 'compliance_result' => 'compliant']],
            ['قيادة التغيير في المدرسة', 'Education figures', 'in_review', $issue2->id, ['school_leaders'], [2], ['compliance_checks' => ['source' => 'warn'] + $pass, 'compliance_result' => 'needs_review']],
            ['مدرسة خضراء في رأس الخيمة', 'Sustainability and green education', 'in_review', null, ['students', 'teachers'], [4], []],
            ['تجربتي مع الفصل المقلوب', 'Field experiences', 'draft', null, ['teachers'], [3], []],
            ['أرقام التعليم في 2026', 'Indicators and infographics', 'rejected', null, ['decision_makers'], [], ['review_note' => 'الأرقام تحتاج إلى مصدر رسمي.']],
            ['إعلان: برنامج تدريبي للمعلمين', 'Professional development', 'withdrawn', null, ['teachers'], [], [
                'is_sponsored' => true, 'compliance_checks' => $pass, 'compliance_result' => 'compliant',
                'published_at' => now()->subWeeks(3), 'withdrawn_at' => now()->subWeek(), 'withdrawal_reason' => 'لم يُوسم كإعلان بشكل واضح.',
            ]],
        ];

        foreach ($articles as [$title, $sectionEn, $status, $issueId, $audiences, $tagIdx, $extra]) {
            $article = Article::updateOrCreate(['title' => $title], $extra + [
                'summary' => 'ملخص تجريبي لمقال «'.$title.'».',
                'body' => "هذا نص تجريبي لمقال «{$title}» لأغراض التطوير.\n\nيعرض المقال فكرة رئيسية ويدعمها بأمثلة من الميدان التربوي.",
                'language' => 'ar',
                'section_id' => $section($sectionEn),
                'issue_id' => $issueId,
                'author_name' => 'فريق تحرير همّة',
                'classification' => 'public',
                'audiences' => $audiences,
                'source' => 'تحرير المجلة',
                'status' => $status,
            ]);
            $article->tags()->sync($tags->only($tagIdx)->pluck('id'));
            if (! $article->versions()->exists()) {
                $article->saveVersion(null);
            }
        }

        if ($school) {
            Article::updateOrCreate(['title' => 'خطة المدرسة للعام الدراسي'], [
                'body' => 'محتوى خاص بالمدرسة.', 'language' => 'ar', 'author_name' => 'إدارة المدرسة',
                'classification' => 'institutional', 'tenant_id' => $school->id, 'audiences' => ['school_leaders'],
                'status' => 'draft', 'section_id' => $section('Association news'),
            ]);
        }

        $published = Article::where('title', 'الذكاء الاصطناعي شريكاً للمعلم')->first();
        foreach ([
            ['أحمد', 'مقال مفيد جداً، شكراً.', 'approved'],
            ['مريم', 'هل يمكن مشاركة أمثلة على أدوات مجانية؟', 'pending'],
            ['زائر', 'رابط إعلاني لا علاقة له بالموضوع', 'pending'],
        ] as [$name, $body, $status]) {
            Comment::updateOrCreate(['article_id' => $published->id, 'body' => $body], ['author_name' => $name, 'status' => $status]);
        }

        ContentReport::updateOrCreate(['article_id' => $published->id, 'reporter_name' => 'معلم'], [
            'reporter_email' => 'teacher@example.com', 'reason' => 'misinformation',
            'details' => 'إحصائية في الفقرة الثانية غير صحيحة.', 'status' => 'open',
        ]);

        $this->command->info('Content ready: '.MagazineSection::count().' sections, '.Article::count().' articles.');
    }
}
