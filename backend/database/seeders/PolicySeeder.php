<?php

namespace Database\Seeders;

use App\Models\Policy;
use App\Models\PolicyVersion;
use App\Models\User;
use Illuminate\Database\Seeder;

// Starter texts for the nine media policies (REQUIREMENTS.md §1-8), published so the public page has content
// locally. They are a first draft for the owner to rewrite in Settings → Policies. Existing policies are left alone.
class PolicySeeder extends Seeder
{
    private const TEXTS = [
        'publishing' => [
            "لا يُنشر أي محتوى مباشرة؛ يمر كل مقال بالمراجعة التحريرية وفحص الامتثال الإعلامي قبل نشره.\nنتحقق من هوية الكاتب والجهة التي يمثلها، ومن أصالة المحتوى وحقوق الصور والملفات المرفقة.\nلا ننشر الأخبار المضللة أو المعلومات غير الموثوقة، ونحتفظ بسجل لكل تعديل واعتماد ونشر.",
            "Nothing is published directly: every article goes through editorial review and a media compliance check first.\nWe verify the author's identity and the organisation they represent, the originality of the content and the rights to attached images and files.\nWe do not publish misleading news or unreliable information, and we keep a record of every edit, approval and publication.",
        ],
        'advertising' => [
            "يظهر كل إعلان عن مؤتمر أو برنامج تدريبي أو مؤسسة تعليمية أو دورة أو منتج تعليمي بوسم «إعلان» واضح.\nنتحقق من الجهة المعلنة قبل النشر، ونطلب الموافقات المسبقة من الجهات المعنية متى اشترطتها التشريعات وفق دليل مجلس الإمارات للإعلام.",
            "Every advertisement for a conference, training programme, educational institution, course or educational product carries a clear \"Advertisement\" label.\nWe verify the advertiser before publication and ask for the prior approvals that the law requires, following the UAE Media Council guidelines.",
        ],
        'corrections' => [
            "عند اكتشاف خطأ في محتوى منشور نصحّحه في أقرب وقت، ونُبقي ملاحظة التصحيح ظاهرة مع تاريخها.\nالأخطاء الجوهرية قد تؤدي إلى سحب المحتوى، مع حفظ سبب السحب في السجل.",
            "When we find an error in published content we correct it promptly and keep a visible, dated correction note.\nSerious errors may lead to the content being withdrawn, with the reason kept on record.",
        ],
        'copyright' => [
            "يملك الكاتب أو الجهة الناشرة حقوق المحتوى ما لم يُذكر غير ذلك. لا يُنشر نص أو صورة أو ملف دون إثبات حق استخدامه وذكر مصدره.\nللإبلاغ عن انتهاك حقوق الملكية استخدم آلية الإبلاغ عن المحتوى.",
            "Authors or publishing organisations own their content unless stated otherwise. No text, image or file is published without proof of the right to use it and a stated source.\nTo report a copyright infringement, use the content reporting mechanism.",
        ],
        'sponsored' => [
            'المحتوى المدعوم يُوسم بـ«محتوى مدعوم» ويُذكر اسم الجهة الداعمة. يخضع لنفس المراجعة التحريرية، ولا يؤثر الدعم على استقلالية التحرير.',
            'Sponsored content is labelled "Sponsored" and names the sponsor. It goes through the same editorial review, and sponsorship does not affect editorial independence.',
        ],
        'comments' => [
            'نرحب بالنقاش المحترم. تخضع التعليقات للإشراف، ونخفي التعليقات المسيئة أو المضللة أو التي تنتهك الخصوصية أو تحتوي إعلانات غير موسومة.',
            'We welcome respectful discussion. Comments are moderated, and we hide comments that are offensive, misleading, invade privacy or contain unlabelled advertising.',
        ],
        'ai' => [
            "نستخدم الذكاء الاصطناعي لمساعدة الكتّاب والمحررين في التدقيق والتلخيص وفحص الامتثال، ويبقى القرار التحريري النهائي للإنسان.\nنوضح عند نشر محتوى أسهم الذكاء الاصطناعي في إنتاجه بشكل جوهري.",
            "We use AI to help authors and editors with proofreading, summaries and compliance checks; the final editorial decision always rests with a person.\nWe disclose when AI contributed substantially to published content.",
        ],
        'privacy' => [
            "نجمع البيانات اللازمة لتقديم الخدمة فقط، ولا نبيعها. الوصول إلى البيانات محكوم بالصلاحيات ومسجل في سجل التدقيق.\nيمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها بالتواصل مع فريق المنصة.",
            "We collect only the data needed to provide the service and we never sell it. Access to data is permission-based and recorded in the audit log.\nYou can ask to see, correct or delete your data by contacting the platform team.",
        ],
        'complaints' => [
            "يمكن لأي قارئ الإبلاغ عن محتوى من صفحة المحتوى نفسه مع ذكر السبب: معلومات مضللة، حقوق ملكية، محتوى مسيء، انتهاك خصوصية، إعلان غير موسوم، أو غير ذلك.\nيراجع فريق التحرير كل بلاغ ويسجل القرار، ويُحال ما يلزم إلى مجلس الحوكمة الإعلامية.",
            "Any reader can report content from the content page itself, giving a reason: misinformation, copyright, offensive content, privacy, unlabelled advertising, or other.\nThe editorial team reviews every report and records its decision, referring cases to the media governance board when needed.",
        ],
    ];

    public function run(): void
    {
        $owner = User::where('role', 'super_admin')->orderBy('id')->first();

        foreach (self::TEXTS as $kind => [$ar, $en]) {
            if (Policy::where('kind', $kind)->exists()) {
                continue;
            }

            $policy = Policy::create([
                'kind' => $kind, 'body_ar' => $ar, 'body_en' => $en, 'is_published' => true,
                'version' => 1, 'updated_by' => $owner?->id, 'published_at' => now(),
            ]);
            PolicyVersion::create([
                'policy_id' => $policy->id, 'version' => 1, 'body_ar' => $ar, 'body_en' => $en,
                'is_published' => true, 'edited_by' => $owner?->id, 'created_at' => now(),
            ]);
        }

        $this->command->info('Policies ready: '.Policy::count());
    }
}
