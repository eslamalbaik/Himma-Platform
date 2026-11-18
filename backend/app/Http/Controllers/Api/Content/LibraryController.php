<?php

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\LibraryFileRequest;
use App\Http\Requests\Content\LibraryItemFormRequest;
use App\Models\LibraryItem;
use App\Support\Audit;
use App\Support\Community;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

// The library in the dashboard (Content → Library, `/admin/content/library`). Editing needs `update,content`;
// publishing and taking an item off the site need `manage,content`, like articles.
class LibraryController extends Controller
{
    public function index(Request $request)
    {
        $query = Community::scope(LibraryItem::with('section'), $request);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")
                ->orWhere('author_name', 'like', "%{$search}%")
                ->orWhere('isbn', $search));
        }
        if (in_array($type = $request->query('type'), LibraryItem::TYPES, true)) {
            $query->where('type', $type);
        }
        if (in_array($status = $request->query('status'), LibraryItem::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByDesc('updated_at')->orderByDesc('id')->paginate($this->perPage($request)),
            fn (LibraryItem $item) => $item->toPublicArray()
        );
    }

    public function show(LibraryItem $item)
    {
        return $this->item($item->load('section')->toPublicArray());
    }

    public function store(LibraryItemFormRequest $request)
    {
        $item = LibraryItem::create($request->fields() + [
            'community' => Community::current($request),
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);
        $this->audit($request, 'created', $item);

        return $this->item($item->load('section')->toPublicArray(), 201);
    }

    public function update(LibraryItemFormRequest $request, LibraryItem $item)
    {
        $item->update($request->fields());
        $this->audit($request, 'updated', $item);

        return $this->item($item->load('section')->toPublicArray());
    }

    // An item goes on the site once it has something to read: a file or a link.
    public function publish(Request $request, LibraryItem $item)
    {
        if ($item->status === 'published') {
            return $this->error('library_already_published', 409);
        }
        if (! $item->file_path && ! $item->external_url) {
            return $this->error('library_needs_file', 409);
        }

        $item->update(['status' => 'published', 'published_at' => now()]);
        $this->audit($request, 'published', $item);

        return $this->item($item->load('section')->toPublicArray());
    }

    public function unpublish(Request $request, LibraryItem $item)
    {
        if ($item->status !== 'published') {
            return $this->error('library_not_published', 409);
        }

        $item->update(['status' => 'draft']);
        $this->audit($request, 'unpublished', $item);

        return $this->item($item->load('section')->toPublicArray());
    }

    // `what` is `cover` or `file`; a new upload replaces the old one.
    public function upload(LibraryFileRequest $request, LibraryItem $item, string $what)
    {
        $file = $request->file('file');

        if ($what === 'cover') {
            $old = $item->cover_path;
            $item->forceFill(['cover_path' => $file->store('library/covers', 'public')])->save();
        } else {
            $old = $item->file_path;
            $item->forceFill([
                'file_path' => $file->store('library/files', 'public'),
                'file_name' => mb_substr($file->getClientOriginalName(), 0, 250),
                'file_size' => $file->getSize(),
            ])->save();
        }
        $old && Storage::disk('public')->delete($old);
        $this->audit($request, "{$what}_uploaded", $item);

        return $this->item($item->load('section')->toPublicArray());
    }

    public function destroy(Request $request, LibraryItem $item)
    {
        foreach ([$item->cover_path, $item->file_path] as $path) {
            $path && Storage::disk('public')->delete($path);
        }
        $item->delete();
        $this->audit($request, 'deleted', $item);

        return $this->ok();
    }

    private function audit(Request $request, string $what, LibraryItem $item): void
    {
        Audit::log($request, [
            'action' => "library.$what",
            'actor' => $request->user(),
            'entity_type' => 'library_item',
            'entity_id' => $item->cuid,
            'metadata' => ['title' => $item->title, 'type' => $item->type, 'community' => $item->community],
        ]);
    }
}
