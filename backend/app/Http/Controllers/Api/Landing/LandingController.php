<?php

namespace App\Http\Controllers\Api\Landing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Landing\OrderRequest;
use App\Http\Requests\Landing\PlanDisplayRequest;
use App\Http\Requests\Landing\SectionFormRequest;
use App\Models\Plan;
use App\Support\Audit;
use App\Support\LandingSections;

// Admin side of the landing page: the texts and switch of each section, and how the plans are displayed.
class LandingController extends Controller
{
    // Public and read-only: only visible plans and testimonials, in display order.
    public function publicShow()
    {
        return $this->item(LandingSections::publicPayload());
    }

    public function sections()
    {
        return $this->item(collect(LandingSections::KEYS)->mapWithKeys(fn ($key) => [$key => LandingSections::get($key)])->all());
    }

    public function updateSection(SectionFormRequest $request, string $section)
    {
        abort_unless(in_array($section, LandingSections::KEYS, true), 404);

        LandingSections::put($section, $request->fields());

        Audit::log($request, [
            'action' => 'landing.section_updated',
            'actor' => $request->user(),
            'entity_type' => 'landing_section',
            'entity_id' => $section,
            'metadata' => ['enabled' => $request->boolean('enabled')],
        ]);

        return $this->item(LandingSections::get($section));
    }

    // Every plan that is on sale, those shown on the site first.
    public function plans()
    {
        $plans = Plan::where('is_active', true)->orderByDesc('show_on_site')->orderBy('site_order')->orderBy('id')->get();

        return $this->item($plans->map->toLandingArray()->values()->all());
    }

    public function updatePlan(PlanDisplayRequest $request, Plan $plan)
    {
        $plan->update($request->fields());

        Audit::log($request, [
            'action' => 'landing.plan_updated',
            'actor' => $request->user(),
            'entity_type' => 'plan',
            'entity_id' => $plan->cuid,
            'metadata' => ['showOnSite' => $plan->show_on_site, 'featured' => $plan->is_featured, 'theme' => $plan->theme],
        ]);

        return $this->item($plan->toLandingArray());
    }

    public function orderPlans(OrderRequest $request)
    {
        foreach ($request->input('ids') as $position => $cuid) {
            Plan::where('cuid', $cuid)->update(['site_order' => $position + 1]);
        }

        Audit::log($request, [
            'action' => 'landing.plans_reordered',
            'actor' => $request->user(),
            'entity_type' => 'landing_section',
            'entity_id' => 'pricing',
            'metadata' => ['ids' => $request->input('ids')],
        ]);

        return $this->ok();
    }
}
