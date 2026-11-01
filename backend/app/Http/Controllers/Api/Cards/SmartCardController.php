<?php

namespace App\Http\Controllers\Api\Cards;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cards\SmartCardFormRequest;
use App\Models\SmartCard;
use App\Support\Audit;
use Illuminate\Http\Request;

// Staff manage the smart cards (`/admin/cards`): profile, books, events, links and whether the page is live.
class SmartCardController extends Controller
{
    public function index(Request $request)
    {
        $query = SmartCard::query()
            ->withCount(['requests as new_requests_count' => fn ($q) => $q->where('status', 'new'), 'subscribers']);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if (in_array($kind = $request->query('kind'), SmartCard::KINDS, true)) {
            $query->where('kind', $kind);
        }

        if (in_array($status = $request->query('status'), SmartCard::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByDesc('updated_at')->paginate($this->perPage($request)),
            fn (SmartCard $card) => $card->toAdminArray()
        );
    }

    public function show(SmartCard $card)
    {
        return $this->item($card->loadCount(['requests as new_requests_count' => fn ($q) => $q->where('status', 'new'), 'subscribers'])->toAdminArray());
    }

    public function store(SmartCardFormRequest $request)
    {
        $card = SmartCard::create($request->fields() + ['created_by' => $request->user()->id]);
        $this->audit($request, 'created', $card);

        return $this->item($card->fresh()->toAdminArray(), 201);
    }

    public function update(SmartCardFormRequest $request, SmartCard $card)
    {
        $card->update($request->fields());
        $this->audit($request, 'updated', $card);

        return $this->item($card->toAdminArray());
    }

    // Readers' requests and subscribers go with the card (cascade). The printed card then opens "not found".
    public function destroy(Request $request, SmartCard $card)
    {
        $card->delete();
        $this->audit($request, 'deleted', $card);

        return $this->ok();
    }

    private function audit(Request $request, string $verb, SmartCard $card): void
    {
        Audit::log($request, [
            'action' => "smart_card.$verb",
            'actor' => $request->user(),
            'entity_type' => 'smart_card',
            'entity_id' => $card->cuid,
            'metadata' => [
                'slug' => $card->slug, 'kind' => $card->kind, 'status' => $card->status,
                'books' => count($card->books ?? []), 'events' => count($card->events ?? []),
            ],
        ]);
    }
}
