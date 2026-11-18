<?php

namespace App\Http\Controllers\Api\Site;

use App\Http\Controllers\Controller;
use App\Models\LibraryItem;
use App\Support\Community;
use Illuminate\Http\Request;

// The library on the public site (`/library`, `/library/{id}`): published items of the request's community,
// no sign-in needed.
class LibraryReadController extends Controller
{
    public function index(Request $request)
    {
        $query = Community::scope(LibraryItem::published()->with('section'), $request);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")
                ->orWhere('author_name', 'like', "%{$search}%")
                ->orWhere('summary', 'like', "%{$search}%"));
        }
        if (in_array($type = $request->query('type'), LibraryItem::TYPES, true)) {
            $query->where('type', $type);
        }
        if ($sectionId = $request->query('sectionId')) {
            $query->whereHas('section', fn ($q) => $q->where('cuid', $sectionId));
        }

        return $this->paginated(
            $query->orderByDesc('published_at')->orderByDesc('id')->paginate(min($this->perPage($request), 48)),
            fn (LibraryItem $item) => $item->toReaderArray()
        );
    }

    // Opening an item's page counts one view. Like a story, one item opens from either path.
    public function show(string $cuid)
    {
        $item = LibraryItem::published()->with('section')->where('cuid', $cuid)->first();

        if (! $item) {
            return $this->error('not_found', 404);
        }
        $item->increment('views');

        return $this->item($item->toReaderArray());
    }
}
