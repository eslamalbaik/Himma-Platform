<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Event;
use App\Models\Follow;
use App\Models\MagazineSection;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Database\Seeder;

// Local test data for profiles, following, verification, organization people, stories and broadcasts:
// 30 of each. Safe to rerun: it does nothing when the demo accounts (`demo-*@hinnah.test`) already exist.
class CommunitySeeder extends Seeder
{
    private const COUNT = 30;

    private const FIRST = ['سارة', 'أحمد', 'مريم', 'خالد', 'نورة', 'يوسف', 'ليلى', 'عمر', 'هند', 'سلطان', 'أمل', 'فهد', 'دانة', 'ماجد', 'رنا'];

    private const FIRST_EN = ['Sara', 'Ahmed', 'Mariam', 'Khaled', 'Noura', 'Yousef', 'Layla', 'Omar', 'Hind', 'Sultan', 'Amal', 'Fahad', 'Dana', 'Majed', 'Rana'];

    private const LAST = ['الكعبي', 'المنصوري', 'الشامسي', 'النعيمي', 'الظاهري', 'المزروعي'];

    private const LAST_EN = ['Alkaabi', 'Almansoori', 'Alshamsi', 'Alnuaimi', 'Aldhaheri', 'Almazrouei'];

    private const TOPICS = ['التعلّم النشط', 'القراءة المبكرة', 'تقييم الطلاب', 'التعليم الرقمي', 'قيادة المدرسة', 'الهوية الوطنية', 'تدريب المعلمين', 'الذكاء الاصطناعي في الصف', 'التعلّم الذاتي', 'شراكة الأسرة'];

    public function run(): void
    {
        if (User::where('email', 'demo-member1@hinnah.test')->exists()) {
            $this->command?->info('Community demo data already exists — skipping.');

            return;
        }

        $password = env('SEED_DEMO_PASSWORD') ?: env('SEED_ADMIN_PASSWORD') ?: 'password';
        $n = self::COUNT;

        // 30 individual members, each with a bio; every third one is verified.
        $members = [];
        for ($i = 1; $i <= $n; $i++) {
            $k = ($i - 1) % count(self::FIRST);
            $l = ($i - 1) % count(self::LAST);
            $members[$i] = User::create([
                'email' => "demo-member$i@hinnah.test",
                'password' => $password,
                'name_ar' => self::FIRST[$k].' '.self::LAST[$l],
                'name_en' => self::FIRST_EN[$k].' '.self::LAST_EN[$l].' '.$i,
                'role' => 'member',
                'status' => 'active',
                'locale' => $i % 4 === 0 ? 'en' : 'ar',
                'bio_ar' => 'كاتب مهتم بـ'.self::TOPICS[$i % count(self::TOPICS)].' في التعليم.',
                'bio_en' => 'Writer interested in education and teaching practice.',
                'verified_at' => $i % 3 === 0 ? now() : null,
            ]);
        }

        // 30 organizations, each with an admin and one member; a third are verified.
        $types = Tenant::TYPES;
        $orgs = [];
        $orgUsers = [];
        for ($i = 1; $i <= $n; $i++) {
            $orgs[$i] = Tenant::create([
                'name_ar' => 'جهة تعليمية رقم '.$i,
                'name_en' => 'Demo Education Organization '.$i,
                'type' => $types[$i % count($types)],
                'status' => 'active',
                'billing_email' => "billing-demo$i@hinnah.test",
                'bio_ar' => 'جهة تعليمية تشارك تجاربها ومبادراتها مع القرّاء.',
                'bio_en' => 'An education organization sharing its experience and initiatives.',
                'website' => "https://demo-org-$i.example.com",
                'verified_at' => $i % 3 === 0 ? now() : null,
            ]);
            $orgUsers[$i] = User::create([
                'email' => "demo-org$i@hinnah.test",
                'password' => $password,
                'name_ar' => 'مسؤول الجهة '.$i,
                'name_en' => 'Org Admin '.$i,
                'role' => 'tenant_admin',
                'status' => 'active',
                'locale' => 'ar',
                'tenant_id' => $orgs[$i]->id,
            ]);
            User::create([
                'email' => "demo-orgmember$i@hinnah.test",
                'password' => $password,
                'name_ar' => 'عضو الجهة '.$i,
                'name_en' => 'Org Member '.$i,
                'role' => 'tenant_member',
                'status' => 'active',
                'locale' => 'ar',
                'tenant_id' => $orgs[$i]->id,
            ]);
        }

        // 30 published stories: 20 public, 6 for followers, 4 for the organization's members.
        $sectionIds = MagazineSection::where('is_active', true)->pluck('id')->all();
        for ($i = 1; $i <= $n; $i++) {
            $byOrg = $i % 3 === 0;
            $author = $byOrg ? $orgUsers[$i] : $members[$i];
            $classification = $i <= 20 ? 'public' : ($i <= 26 ? 'followers' : ($byOrg || $i > 28 ? 'institutional' : 'public'));
            if ($classification === 'institutional' && ! $author->tenant_id) {
                $author = $orgUsers[$i];
            }
            $topic = self::TOPICS[$i % count(self::TOPICS)];
            Article::create([
                'title' => "$topic: تجربة رقم $i",
                'summary' => "ملخص قصير عن $topic وما تعلّمناه منه.",
                'body' => "فقرة أولى عن $topic.\n\n## ما الذي تغيّر؟\n\nفقرة ثانية تشرح التجربة بالتفصيل.\n\n> الفكرة الجيدة تبدأ من سؤال بسيط.",
                'language' => 'ar',
                'section_id' => $sectionIds ? $sectionIds[$i % count($sectionIds)] : null,
                'tenant_id' => $author->tenant_id,
                'author_id' => $author->id,
                'author_name' => $author->name_ar,
                'classification' => $classification,
                'status' => 'published',
                'published_at' => now()->subDays($n - $i)->subHours($i),
            ]);
        }

        // 60 follows: each member follows organization i and the next member.
        for ($i = 1; $i <= $n; $i++) {
            Follow::create(['follower_id' => $members[$i]->id, 'followable_type' => 'tenant', 'followable_id' => $orgs[$i]->id]);
            Follow::create(['follower_id' => $members[$i]->id, 'followable_type' => 'user', 'followable_id' => $members[$i % $n + 1]->id]);
        }

        // 30 verification requests: organizations 1-10 approved (every third is already marked verified above),
        // 11-15 pending; members 1-5 rejected, 6-15 pending.
        $staff = User::where('role', 'super_admin')->first();
        $request = fn (string $type, $subject, User $by, string $status, ?string $note = null) => VerificationRequest::create([
            'subject_type' => $type,
            'subject_id' => $subject->id,
            'requested_by' => $by->id,
            'evidence' => 'ترخيص رسمي وروابط الحسابات والأعمال المنشورة مرفقة للمراجعة.',
            'status' => $status,
            'review_note' => $note,
            'reviewed_by' => $status === 'pending' ? null : $staff?->id,
            'reviewed_at' => $status === 'pending' ? null : now()->subDays(2),
        ]);
        for ($i = 1; $i <= 10; $i++) {
            $request('tenant', $orgs[$i], $orgUsers[$i], 'approved', 'تم التحقق من الترخيص.');
            $orgs[$i]->forceFill(['verified_at' => now()->subDays(2)])->save();
        }
        for ($i = 11; $i <= 15; $i++) {
            $request('tenant', $orgs[$i], $orgUsers[$i], 'pending');
        }
        for ($i = 1; $i <= 5; $i++) {
            $request('user', $members[$i], $members[$i], 'rejected', 'الإثبات غير كافٍ، أضف رابطًا رسميًا.');
        }
        for ($i = 6; $i <= 15; $i++) {
            if ($members[$i]->verified_at) {
                $members[$i]->forceFill(['verified_at' => null])->save();
            }
            $request('user', $members[$i], $members[$i], 'pending');
        }

        // 30 organization events and broadcasts, cycling through every status.
        $statuses = ['draft', 'scheduled', 'live', 'ended', 'cancelled'];
        for ($i = 1; $i <= $n; $i++) {
            $status = $statuses[($i - 1) % count($statuses)];
            $start = match ($status) {
                'live' => now()->subMinutes(20),
                'ended' => now()->subDays($i),
                default => now()->addDays($i),
            };
            Event::create([
                'title_ar' => "بث مباشر: ندوة رقم $i",
                'title_en' => "Live session no. $i",
                'description_ar' => 'ندوة قصيرة مع نقاش مفتوح للحضور.',
                'description_en' => 'A short session with an open discussion.',
                'type' => Event::TYPES[$i % count(Event::TYPES)],
                'format' => 'online',
                'visibility' => $i % 6 === 0 ? 'institutional' : 'public',
                'tenant_id' => $orgs[$i]->id,
                'starts_at' => $start,
                'ends_at' => $start->copy()->addHour(),
                'stream_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'recording_url' => $status === 'ended' ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : null,
                'status' => $status,
                'live_started_at' => in_array($status, ['live', 'ended'], true) ? $start : null,
                'live_ended_at' => $status === 'ended' ? $start->copy()->addHour() : null,
                'cancel_reason' => $status === 'cancelled' ? 'تعذّر حضور المتحدث.' : null,
            ]);
        }

        $this->command?->info("Community demo data created: $n members, $n organizations, $n stories, 60 follows, 30 verification requests, $n events.");
    }
}
