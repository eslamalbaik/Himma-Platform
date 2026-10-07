<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

// Sample events in every state, with registrations, for development.
class EventSeeder extends Seeder
{
    public function run(): void
    {
        $school = Tenant::where('type', 'school')->first();
        $at = fn (int $days, int $hour) => now()->addDays($days)->setTime($hour, 0);
        $youtube = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

        $events = [
            ['ندوة: الذكاء الاصطناعي في الفصل', 'Webinar: AI in the classroom', 'webinar', 'online', 'live', $at(0, now()->hour), 2,
                ['stream_url' => $youtube, 'live_started_at' => now()->subMinutes(25), 'capacity' => 300, 'registration_required' => true]],
            ['ورشة: التقويم من أجل التعلم', 'Workshop: Assessment for learning', 'workshop', 'hybrid', 'scheduled', $at(3, 16), 3,
                ['stream_url' => $youtube, 'location' => 'دبي - مقر الجمعية', 'capacity' => 3, 'registration_required' => true]],
            ['المؤتمر التربوي السنوي', 'Annual education conference', 'conference', 'onsite', 'scheduled', $at(20, 9), 8,
                ['location' => 'أبوظبي - مركز المعارض', 'capacity' => 500, 'registration_required' => true, 'is_sponsored' => true]],
            ['دورة القيادة المدرسية', 'School leadership course', 'course', 'online', 'draft', $at(30, 18), 2,
                ['stream_url' => $youtube, 'capacity' => 40, 'registration_required' => true]],
            ['لقاء أعضاء الجمعية', 'Association members meeting', 'meeting', 'onsite', 'ended', $at(-10, 18), 2,
                ['location' => 'الشارقة', 'live_started_at' => null]],
            ['ندوة: الاستدامة في المدارس', 'Webinar: Sustainability in schools', 'webinar', 'online', 'ended', $at(-5, 17), 1,
                ['stream_url' => $youtube, 'recording_url' => $youtube, 'live_started_at' => $at(-5, 17), 'live_ended_at' => $at(-5, 18)]],
            ['ورشة التعلم الرقمي', 'Digital learning workshop', 'workshop', 'online', 'cancelled', $at(6, 17), 2,
                ['stream_url' => $youtube, 'cancel_reason' => 'اعتذار المحاضر، وسيُعلن موعد جديد.']],
        ];

        foreach ($events as [$titleAr, $titleEn, $type, $format, $status, $start, $hours, $extra]) {
            Event::updateOrCreate(['title_en' => $titleEn], $extra + [
                'title_ar' => $titleAr,
                'description_ar' => "وصف تجريبي لفعالية «{$titleAr}».",
                'description_en' => "Sample description for \"{$titleEn}\".",
                'type' => $type,
                'format' => $format,
                'visibility' => 'public',
                'starts_at' => $start,
                'ends_at' => $start->copy()->addHours($hours),
                'status' => $status,
            ]);
        }

        if ($school) {
            Event::updateOrCreate(['title_en' => 'Parents evening'], [
                'title_ar' => 'أمسية أولياء الأمور', 'type' => 'meeting', 'format' => 'onsite', 'visibility' => 'institutional',
                'tenant_id' => $school->id, 'location' => 'مسرح المدرسة', 'starts_at' => $at(12, 18),
                'ends_at' => $at(12, 20), 'status' => 'scheduled',
            ]);
        }

        $workshop = Event::where('title_en', 'Workshop: Assessment for learning')->first();
        foreach ([['مريم الكعبي', 'maryam@example.com'], ['خالد النعيمي', 'khaled@example.com']] as [$name, $email]) {
            $workshop->registrations()->updateOrCreate(['email' => $email], ['name' => $name, 'status' => 'registered']);
        }
        $live = Event::where('title_en', 'Webinar: AI in the classroom')->first();
        foreach ([['سارة', 'sara@example.com', 'attended'], ['أحمد', 'ahmed@example.com', 'registered'], ['ليلى', 'layla@example.com', 'cancelled']] as [$name, $email, $status]) {
            $live->registrations()->updateOrCreate(['email' => $email], ['name' => $name, 'status' => $status]);
        }

        $this->command->info('Events ready: '.Event::count());
    }
}
