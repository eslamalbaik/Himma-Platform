<?php

namespace App\Http\Controllers\Api\Landing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Landing\OrderRequest;
use App\Http\Requests\Landing\TestimonialFormRequest;
use App\Models\Testimonial;
use App\Support\Audit;
use Illuminate\Http\Request;

class TestimonialController extends Controller
{
    public function index()
    {
        return $this->item(Testimonial::orderBy('sort_order')->orderBy('id')->get()->map->toPublicArray()->all());
    }

    public function store(TestimonialFormRequest $request)
    {
        $testimonial = Testimonial::create($request->fields() + ['sort_order' => (int) Testimonial::max('sort_order') + 1]);
        $this->audit($request, 'created', $testimonial);

        return $this->item($testimonial->toPublicArray(), 201);
    }

    public function update(TestimonialFormRequest $request, Testimonial $testimonial)
    {
        $testimonial->update($request->fields());
        $this->audit($request, 'updated', $testimonial);

        return $this->item($testimonial->toPublicArray());
    }

    public function destroy(Request $request, Testimonial $testimonial)
    {
        $testimonial->delete();
        $this->audit($request, 'deleted', $testimonial);

        return $this->ok();
    }

    public function order(OrderRequest $request)
    {
        foreach ($request->input('ids') as $position => $cuid) {
            Testimonial::where('cuid', $cuid)->update(['sort_order' => $position + 1]);
        }

        Audit::log($request, [
            'action' => 'testimonial.reordered',
            'actor' => $request->user(),
            'entity_type' => 'landing_section',
            'entity_id' => 'testimonials',
            'metadata' => ['ids' => $request->input('ids')],
        ]);

        return $this->ok();
    }

    // The quote text is not copied to the log; the author and visibility are enough to trace a change.
    private function audit(Request $request, string $verb, Testimonial $testimonial): void
    {
        Audit::log($request, [
            'action' => "testimonial.$verb",
            'actor' => $request->user(),
            'entity_type' => 'testimonial',
            'entity_id' => $testimonial->cuid,
            'metadata' => ['authorEn' => $testimonial->author_en, 'isVisible' => $testimonial->is_visible],
        ]);
    }
}
