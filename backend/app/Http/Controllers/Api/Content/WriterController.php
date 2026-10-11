<?php

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\ReasonFormRequest;
use App\Http\Requests\Content\WriterFormRequest;
use App\Models\Writer;
use App\Support\Audit;
use Illuminate\Http\Request;

// Users → Writers: the writers register (NAV-03) and identity verification (PUB-02).
// Editing needs `update,content`; verifying and suspending are editorial decisions (`manage,content`).
class WriterController extends Controller
{
    public function index(Request $request)
    {
        $query = Writer::with('tenant')->withCount([
            'articles',
            'articles as published_count' => fn ($q) => $q->where('status', 'published'),
        ]);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('name_ar', 'like', "%{$search}%")
                ->orWhere('name_en', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('affiliation', 'like', "%{$search}%"));
        }
        if (in_array($status = $request->query('status'), Writer::STATUSES, true)) {
            $query->where('status', $status);
        }
        if ($tenantId = $request->query('tenantId')) {
            $query->whereHas('tenant', fn ($q) => $q->where('cuid', $tenantId));
        }

        $counts = Writer::selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status')->map(fn ($c) => (int) $c);

        return $this->paginated(
            $query->orderByRaw("status = 'pending' desc")->orderBy('name_ar')->paginate($this->perPage($request)),
            fn (Writer $writer) => $writer->toPublicArray(),
            ['byStatus' => $counts->isEmpty() ? (object) [] : $counts]
        );
    }

    public function show(Writer $writer)
    {
        $writer->load(['tenant', 'verifier'])->loadCount([
            'articles',
            'articles as published_count' => fn ($q) => $q->where('status', 'published'),
        ]);

        return $this->item($writer->toPublicArray() + [
            'recentArticles' => $writer->articles()->latest('updated_at')->limit(10)->get()
                ->map(fn ($a) => ['id' => $a->cuid, 'title' => $a->title, 'status' => $a->status, 'publishedAt' => optional($a->published_at)->toIso8601String()])
                ->values(),
        ]);
    }

    public function store(WriterFormRequest $request)
    {
        $writer = Writer::create($request->fields() + ['status' => 'pending']);
        $this->audit($request, 'created', $writer);

        return $this->item($writer->load('tenant')->toPublicArray(), 201);
    }

    public function update(WriterFormRequest $request, Writer $writer)
    {
        $writer->update($request->fields());
        $this->audit($request, 'updated', $writer, ['changed' => array_keys($writer->getChanges())]);

        return $this->item($writer->load('tenant')->toPublicArray());
    }

    // Records that the editorial team checked who the writer is and whom they represent.
    public function verify(ReasonFormRequest $request, Writer $writer)
    {
        if ($writer->status === 'verified') {
            return $this->error('writer_already_verified', 409);
        }

        $writer->update([
            'status' => 'verified',
            'verification_note' => $request->reason(),
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);
        $this->audit($request, 'verified', $writer, ['note' => $request->reason()]);

        return $this->item($writer->load(['tenant', 'verifier'])->toPublicArray());
    }

    // A suspended writer's articles stay on record, but new ones cannot name them.
    public function suspend(ReasonFormRequest $request, Writer $writer)
    {
        if ($writer->status === 'suspended') {
            return $this->error('writer_already_suspended', 409);
        }

        $writer->update(['status' => 'suspended', 'verification_note' => $request->reason()]);
        $this->audit($request, 'suspended', $writer, ['reason' => $request->reason()]);

        return $this->item($writer->load(['tenant', 'verifier'])->toPublicArray());
    }

    public function destroy(Request $request, Writer $writer)
    {
        if ($writer->articles()->exists()) {
            return $this->error('writer_has_articles', 409);
        }

        $writer->delete();
        $this->audit($request, 'deleted', $writer);

        return $this->ok();
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
