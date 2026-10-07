<?php

namespace App\Http\Controllers\Api\Magazine;

use App\Http\Controllers\Controller;
use App\Http\Requests\Magazine\SectionFormRequest;
use App\Models\MagazineSection;
use App\Support\Audit;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    public function index(Request $request)
    {
        $query = MagazineSection::withCount('articles');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('name_ar', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%"));
        }
        if (in_array($axis = $request->query('axis'), MagazineSection::AXES, true)) {
            $query->where('axis', $axis);
        }
        if (in_array($active = $request->query('active'), ['true', 'false'], true)) {
            $query->where('is_active', $active === 'true');
        }

        return $this->paginated(
            $query->orderBy('sort_order')->orderBy('id')->paginate($this->perPage($request)),
            fn (MagazineSection $section) => $section->toPublicArray()
        );
    }

    public function store(SectionFormRequest $request)
    {
        $section = MagazineSection::create($request->fields());
        $this->audit($request, 'created', $section);

        return $this->item($section->toPublicArray(), 201);
    }

    public function update(SectionFormRequest $request, MagazineSection $section)
    {
        $section->update($request->fields());
        $this->audit($request, 'updated', $section);

        return $this->item($section->loadCount('articles')->toPublicArray());
    }

    // A section with articles cannot be deleted; deactivate it instead.
    public function destroy(Request $request, MagazineSection $section)
    {
        if ($section->articles()->exists()) {
            return $this->error('section_in_use', 409);
        }

        $section->delete();
        $this->audit($request, 'deleted', $section);

        return $this->ok();
    }

    private function audit(Request $request, string $what, MagazineSection $section): void
    {
        Audit::log($request, [
            'action' => "magazine_section.$what",
            'actor' => $request->user(),
            'entity_type' => 'magazine_section',
            'entity_id' => $section->cuid,
            'metadata' => ['nameEn' => $section->name_en, 'axis' => $section->axis],
        ]);
    }
}
