<?php

namespace App\Http\Controllers\Api\Magazine;

use App\Http\Controllers\Controller;
use App\Http\Requests\Magazine\TagFormRequest;
use App\Models\Tag;
use App\Support\Audit;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function index(Request $request)
    {
        $query = Tag::withCount('articles');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('name_ar', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%"));
        }

        return $this->paginated(
            $query->orderBy('name_en')->paginate($this->perPage($request)),
            fn (Tag $tag) => $tag->toPublicArray()
        );
    }

    public function store(TagFormRequest $request)
    {
        $tag = Tag::create($request->fields());
        $this->audit($request, 'created', $tag);

        return $this->item($tag->toPublicArray(), 201);
    }

    public function update(TagFormRequest $request, Tag $tag)
    {
        $tag->update($request->fields());
        $this->audit($request, 'updated', $tag);

        return $this->item($tag->loadCount('articles')->toPublicArray());
    }

    // Deleting a tag only removes it from its articles.
    public function destroy(Request $request, Tag $tag)
    {
        $tag->delete();
        $this->audit($request, 'deleted', $tag);

        return $this->ok();
    }

    private function audit(Request $request, string $what, Tag $tag): void
    {
        Audit::log($request, [
            'action' => "tag.$what",
            'actor' => $request->user(),
            'entity_type' => 'tag',
            'entity_id' => $tag->cuid,
            'metadata' => ['nameEn' => $tag->name_en],
        ]);
    }
}
