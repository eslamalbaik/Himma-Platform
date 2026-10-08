<?php

namespace App\Http\Controllers\Api\Writers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\ReasonFormRequest;
use App\Http\Requests\Writers\VerifyWriterRequest;
use App\Http\Requests\Writers\WriterFormRequest;
use App\Models\Writer;
use App\Support\Audit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

// Users → Writers: the writers registry (PUB-02). Editors register writers, verify who they are and whom they
// represent, and suspend them when needed. Articles link to their writer (articles.writer_id).
class WriterController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->withStats(Writer::with(['tenant', 'verifier']));

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('affiliation', 'like', "%{$search}%");
            });
        }

        // status=verified or a list (status=pending,verified) for pickers.
        $statuses = array_intersect(explode(',', (string) $request->query('status', '')), Writer::STATUSES);
        if ($statuses) {
            $query->whereIn('status', $statuses);
        }

        $counts = Writer::selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status');

        return $this->paginated(
            $query->orderByRaw("FIELD(status, 'pending', 'verified', 'suspended')")->orderBy('name_ar')->paginate($this->perPage($request)),
            fn (Writer $writer) => $writer->toPublicArray(),
            ['statusCounts' => collect(Writer::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($counts[$s] ?? 0)])]
        );
    }

    public function show(Writer $writer)
    {
        $writer = $this->withStats(Writer::with(['tenant', 'verifier']))->findOrFail($writer->id);
        $articles = $writer->articles()->latest()->limit(10)->get(['cuid', 'title', 'language', 'status', 'published_at', 'created_at']);

        return $this->item($writer->toPublicArray() + [
            'articles' => $articles->map(fn ($a) => [
                'id' => $a->cuid,
                'title' => $a->title,
                'language' => $a->language,
                'status' => $a->status,
                'publishedAt' => optional($a->published_at)->toIso8601String(),
            ])->values(),
        ]);
    }

    public function store(WriterFormRequest $request)
    {
        $writer = Writer::create($request->fields() + ['status' => 'pending']);
        $this->audit($request, 'created', $writer);

        return $this->item($this->fresh($writer), 201);
    }

    public function update(WriterFormRequest $request, Writer $writer)
    {
        $writer->update($request->fields());
        $this->audit($request, 'updated', $writer);

        return $this->item($this->fresh($writer));
    }

    // Records how the identity and organisation were checked (PUB-02); also re-verifies a suspended writer.
    public function verify(VerifyWriterRequest $request, Writer $writer)
    {
        $writer->update($request->fields() + [
            'status' => 'verified',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'suspension_reason' => null,
        ]);
        $this->audit($request, 'verified', $writer, ['method' => $writer->verification_method]);

        return $this->item($this->fresh($writer));
    }

    public function suspend(ReasonFormRequest $request, Writer $writer)
    {
        if ($writer->status === 'suspended') {
            return $this->error('writer_already_suspended', 409);
        }

        $writer->update(['status' => 'suspended', 'suspension_reason' => $request->reason()]);
        $this->audit($request, 'suspended', $writer, ['reason' => $request->reason()]);

        return $this->item($this->fresh($writer));
    }

    // Writers with articles stay on record (PUB-06); only an unused entry can be deleted.
    public function destroy(Request $request, Writer $writer)
    {
        if ($writer->articles()->exists()) {
            return $this->error('writer_has_articles', 409);
        }

        $writer->delete();
        $this->audit($request, 'deleted', $writer);

        return $this->ok();
    }

    private function withStats(Builder $query): Builder
    {
        return $query->withCount([
            'articles',
            'articles as published_count' => fn (Builder $q) => $q->where('status', 'published'),
        ])->withMax('articles as last_published_at', 'published_at');
    }

    private function fresh(Writer $writer): array
    {
        return $this->withStats(Writer::with(['tenant', 'verifier']))->findOrFail($writer->id)->toPublicArray();
    }

    private function audit(Request $request, string $what, Writer $writer, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "writer.$what",
            'actor' => $request->user(),
            'entity_type' => 'writer',
            'entity_id' => $writer->cuid,
            'metadata' => ['nameAr' => $writer->name_ar, 'nameEn' => $writer->name_en] + $metadata,
        ]);
    }
}
