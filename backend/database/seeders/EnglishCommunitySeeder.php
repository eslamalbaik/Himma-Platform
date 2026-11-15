<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Event;
use App\Models\Issue;
use App\Models\MagazineSection;
use App\Models\Tenant;
use App\Models\TenantRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

// Local test data for the English language community (`/en`): two organizations with their admins, six
// members, published stories, one magazine issue, an event and two pending join requests. Everything else the
// seeders create is Arabic. Safe to rerun: it does nothing when `en-member1@hinnah.test` already exists.
class EnglishCommunitySeeder extends Seeder
{
    private const NAMES = ['Emma Clarke', 'James Patel', 'Olivia Brown', 'Noah Wilson', 'Ava Thompson', 'Liam Walker'];

    private const STORIES = [
        ['Project-based learning in Grade 6', 'What changed when our class spent a term building one real project together.'],
        ['Reading aloud to teenagers', 'Fifteen minutes a day of reading aloud turned out to be the best lesson of the week.'],
        ['Feedback that students actually read', 'Short, specific comments beat long reports. Here is the template we use.'],
        ['AI tools in the classroom: a first term', 'Where generative tools helped our students, and where they got in the way.'],
        ['Leading a school through change', 'Notes from a principal on introducing a new timetable without losing the staff.'],
        ['Parents as partners', 'Three small habits that brought families into our school community.'],
    ];

    public function run(): void
    {
        if (User::where('email', 'en-member1@hinnah.test')->exists()) {
            $this->command?->info('English community demo data already exists — skipping.');

            return;
        }

        $password = env('SEED_DEMO_PASSWORD') ?: env('SEED_ADMIN_PASSWORD') ?: 'password';

        $orgs = [];
        foreach (['Oakridge Academy' => 'school', 'Teachers Forward Network' => 'association'] as $name => $type) {
            $i = count($orgs) + 1;
            $orgs[$i] = Tenant::create([
                'community' => 'en',
                'name_ar' => $name,
                'name_en' => $name,
                'type' => $type,
                'status' => 'active',
                'billing_email' => "en-billing$i@hinnah.test",
                'bio_en' => 'An education organization in the English community of Hinnah.',
            ]);
            User::create([
                'email' => "en-org$i@hinnah.test",
                'password' => $password,
                'name_ar' => "Org Admin $i",
                'name_en' => "Org Admin $i",
                'role' => 'tenant_admin',
                'status' => 'active',
                'community' => 'en',
                'locale' => 'en',
                'tenant_id' => $orgs[$i]->id,
            ]);
        }

        $members = [];
        foreach (self::NAMES as $index => $name) {
            $i = $index + 1;
            $members[$i] = User::create([
                'email' => "en-member$i@hinnah.test",
                'password' => $password,
                'name_ar' => $name,
                'name_en' => $name,
                'role' => 'member',
                'status' => 'active',
                'community' => 'en',
                'locale' => 'en',
                'bio_en' => 'Teacher and writer in the Hinnah English community.',
            ]);
        }

        $issue = Issue::create([
            'community' => 'en',
            'number' => 1,
            'title_ar' => 'Classrooms that listen',
            'title_en' => 'Classrooms that listen',
            'theme_ar' => 'Student voice',
            'theme_en' => 'Student voice',
            'status' => 'published',
            'published_at' => now()->subDays(3),
        ]);

        $sections = MagazineSection::where('is_active', true)->orderBy('sort_order')->pluck('id')->all();
        foreach (self::STORIES as $index => [$title, $summary]) {
            $author = $members[$index + 1];
            Article::create([
                'title' => $title,
                'summary' => $summary,
                'body' => "<p>{$summary}</p><p>This is a demo story of the English community, written to show how Hinnah keeps each language community's content apart.</p>",
                'language' => 'en',
                'section_id' => $sections ? $sections[$index % count($sections)] : null,
                'issue_id' => $index < 4 ? $issue->id : null,
                'author_name' => $author->name_en,
                'author_id' => $author->id,
                'classification' => 'public',
                'status' => 'published',
                'published_at' => now()->subDays(10 - $index),
            ]);
        }

        Event::create([
            'community' => 'en',
            'title_ar' => 'Teaching with AI: an open webinar',
            'title_en' => 'Teaching with AI: an open webinar',
            'description_en' => 'Teachers from the English community share what worked in their first term.',
            'type' => 'webinar',
            'format' => 'online',
            'visibility' => 'public',
            'tenant_id' => $orgs[2]->id,
            'starts_at' => now()->addDays(7)->setTime(17, 0),
            'ends_at' => now()->addDays(7)->setTime(18, 30),
            'status' => 'scheduled',
        ]);

        foreach (['Riverside Primary School' => 'school', 'Northgate Learning Trust' => 'institution'] as $name => $type) {
            TenantRequest::create([
                'community' => 'en',
                'name_ar' => $name,
                'name_en' => $name,
                'type' => $type,
                'contact_name' => 'Contact of '.$name,
                'contact_email' => 'join-'.strtolower(strtok($name, ' ')).'@hinnah.test',
                'message' => 'We would like to join the English community of Hinnah.',
                'status' => 'pending',
            ]);
        }
    }
}
