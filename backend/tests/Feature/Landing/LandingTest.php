<?php

namespace Tests\Feature\Landing;

use App\Models\Plan;
use App\Models\Testimonial;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingTest extends TestCase
{
    use RefreshDatabase;

    private function plan(array $override = []): Plan
    {
        return Plan::create($override + [
            'name_ar' => 'باقة', 'name_en' => 'Plan', 'price' => 100, 'currency' => 'SAR', 'interval' => 'yearly',
            'show_on_site' => true, 'site_order' => 1,
        ]);
    }

    private function display(array $override = []): array
    {
        return $override + [
            'showOnSite' => true, 'isFeatured' => true, 'theme' => 'primary', 'badgeAr' => 'الأكثر شيوعاً', 'badgeEn' => 'Most popular',
            'descriptionAr' => 'وصف', 'descriptionEn' => 'Description', 'ctaLabelAr' => 'اشترك', 'ctaLabelEn' => 'Subscribe',
            'ctaUrl' => '/join',
            'featureGroups' => [[
                'titleAr' => 'الكورسات', 'titleEn' => 'Courses',
                'items' => [['textAr' => 'حتى 3 كورسات', 'textEn' => 'Up to 3 courses', 'included' => true]],
            ]],
        ];
    }

    private function testimonial(array $override = []): array
    {
        return $override + [
            'authorAr' => 'عمر', 'authorEn' => 'Omar', 'roleAr' => 'طالب', 'roleEn' => 'Student',
            'quoteAr' => 'ممتاز', 'quoteEn' => 'Excellent', 'rating' => 5, 'color' => '#5F0118', 'isVisible' => true,
        ];
    }

    private function section(array $override = []): array
    {
        return $override + ['enabled' => true, 'chipAr' => 'ا', 'chipEn' => 'a', 'titleAr' => 'ع', 'titleEn' => 't'];
    }

    public function test_public_endpoint_lists_only_visible_things_in_order(): void
    {
        $this->plan(['name_en' => 'Second', 'site_order' => 2]);
        $this->plan(['name_en' => 'First', 'site_order' => 1]);
        $this->plan(['name_en' => 'Hidden', 'show_on_site' => false]);
        $this->plan(['name_en' => 'Inactive', 'is_active' => false]);
        Testimonial::create(['author_ar' => 'أ', 'author_en' => 'Shown', 'quote_ar' => 'ق', 'quote_en' => 'q', 'sort_order' => 1]);
        Testimonial::create(['author_ar' => 'ب', 'author_en' => 'Hidden', 'quote_ar' => 'ق', 'quote_en' => 'q', 'is_visible' => false]);

        $response = $this->getJson('/api/public/landing')->assertOk();

        $this->assertSame(['First', 'Second'], collect($response->json('data.pricing.plans'))->pluck('nameEn')->all());
        $this->assertSame(['Shown'], collect($response->json('data.testimonials.items'))->pluck('authorEn')->all());
    }

    public function test_a_switched_off_or_empty_section_is_null(): void
    {
        $this->getJson('/api/public/landing')->assertOk()->assertJsonPath('data.pricing', null)->assertJsonPath('data.testimonials', null);

        $this->plan();
        $this->signIn();
        $this->putJson('/api/admin/landing/sections/pricing', $this->section(['enabled' => false]))->assertOk();

        $this->getJson('/api/public/landing')->assertJsonPath('data.pricing', null);
    }

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/landing/plans')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/admin/landing/plans')->assertStatus(403);
        $this->postJson('/api/admin/landing/testimonials', $this->testimonial())->assertStatus(403);

        $this->signIn('platform_editor');
        $this->getJson('/api/admin/landing/plans')->assertOk();
    }

    public function test_updates_section_texts_with_an_audit_row(): void
    {
        $this->signIn();

        $this->getJson('/api/admin/landing/sections')->assertOk()->assertJsonPath('data.pricing.enabled', true);

        $this->putJson('/api/admin/landing/sections/testimonials', $this->section(['titleEn' => 'What they say']))
            ->assertOk()->assertJsonPath('data.titleEn', 'What they say');

        $this->assertDatabaseHas('audit_logs', ['action' => 'landing.section_updated', 'entity_id' => 'testimonials']);
        $this->putJson('/api/admin/landing/sections/unknown', $this->section())->assertStatus(404);
        $this->putJson('/api/admin/landing/sections/pricing', $this->section(['chipAr' => '']))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_section_text');
    }

    public function test_updates_how_a_plan_is_displayed(): void
    {
        $this->signIn();
        $plan = $this->plan(['show_on_site' => false]);

        $this->putJson("/api/admin/landing/plans/{$plan->cuid}", $this->display())
            ->assertOk()->assertJsonPath('data.theme', 'primary')->assertJsonPath('data.featureGroups.0.items.0.included', true);

        $this->assertDatabaseHas('audit_logs', ['action' => 'landing.plan_updated', 'entity_id' => $plan->cuid]);
        $this->assertTrue($plan->fresh()->show_on_site);
        $this->assertSame(100.0, (float) $plan->fresh()->price);
    }

    public function test_plan_display_validation_codes(): void
    {
        $this->signIn();
        $plan = $this->plan();
        $url = "/api/admin/landing/plans/{$plan->cuid}";

        $this->putJson($url, $this->display(['theme' => 'red']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_theme');
        $this->putJson($url, $this->display(['ctaUrl' => 'javascript:alert(1)']))->assertJsonPath('error.code', 'invalid_cta_url');
        $this->putJson($url, $this->display(['ctaUrl' => '//evil.example']))->assertJsonPath('error.code', 'invalid_cta_url');
        $this->putJson($url, $this->display(['featureGroups' => [['titleAr' => '', 'titleEn' => 'x', 'items' => []]]]))
            ->assertJsonPath('error.code', 'invalid_feature_groups');
    }

    public function test_reorders_plans(): void
    {
        $this->signIn();
        $a = $this->plan(['name_en' => 'A', 'site_order' => 1]);
        $b = $this->plan(['name_en' => 'B', 'site_order' => 2]);

        $this->putJson('/api/admin/landing/plans/order', ['ids' => [$b->cuid, $a->cuid]])->assertOk();

        $this->assertSame(1, $b->fresh()->site_order);
        $this->assertSame(2, $a->fresh()->site_order);
        $this->assertDatabaseHas('audit_logs', ['action' => 'landing.plans_reordered']);
        $this->putJson('/api/admin/landing/plans/order', ['ids' => []])->assertStatus(422)->assertJsonPath('error.code', 'invalid_input');
    }

    public function test_testimonials_crud_and_order(): void
    {
        $this->signIn();

        $first = $this->postJson('/api/admin/landing/testimonials', $this->testimonial())->assertCreated()->json('data.id');
        $second = $this->postJson('/api/admin/landing/testimonials', $this->testimonial(['authorEn' => 'Sara']))->assertCreated()->json('data.id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'testimonial.created', 'entity_id' => $first]);

        $this->putJson("/api/admin/landing/testimonials/$first", $this->testimonial(['rating' => 4, 'isVisible' => false]))
            ->assertOk()->assertJsonPath('data.rating', 4)->assertJsonPath('data.isVisible', false);

        $this->putJson('/api/admin/landing/testimonials/order', ['ids' => [$second, $first]])->assertOk();
        $this->assertSame([$second, $first], collect($this->getJson('/api/admin/landing/testimonials')->json('data'))->pluck('id')->all());

        $this->deleteJson("/api/admin/landing/testimonials/$first")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'testimonial.deleted', 'entity_id' => $first]);
        $this->assertDatabaseMissing('testimonials', ['cuid' => $first]);
    }

    public function test_testimonial_validation_codes(): void
    {
        $this->signIn();

        $this->postJson('/api/admin/landing/testimonials', $this->testimonial(['quoteEn' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_testimonial');
        $this->postJson('/api/admin/landing/testimonials', $this->testimonial(['rating' => 9]))->assertJsonPath('error.code', 'invalid_rating');
        $this->postJson('/api/admin/landing/testimonials', $this->testimonial(['color' => 'red']))->assertJsonPath('error.code', 'invalid_color');
    }
}
