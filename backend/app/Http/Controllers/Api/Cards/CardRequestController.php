<?php

namespace App\Http\Controllers\Api\Cards;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cards\RequestStatusRequest;
use App\Models\SmartCard;
use App\Models\SmartCardRequest;
use App\Support\Audit;
use Illuminate\Http\Request;

// Readers' dedication and signed-copy requests of one card, and the readers who subscribed to its news.
class CardRequestController extends Controller
{
    public function index(Request $request, SmartCard $card)
    {
        $query = $card->requests();

        if (in_array($status = $request->query('status'), SmartCardRequest::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByRaw("status = 'new' desc")->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (SmartCardRequest $r) => $r->toPublicArray()
        );
    }

    public function updateStatus(RequestStatusRequest $request, SmartCard $card, string $cuid)
    {
        $readerRequest = $card->requests()->where('cuid', $cuid)->first();
        if (! $readerRequest) {
            return $this->error('not_found', 404);
        }

        $from = $readerRequest->status;
        $readerRequest->update(['status' => $request->input('status')]);

        Audit::log($request, [
            'action' => 'smart_card_request.status_changed',
            'actor' => $request->user(),
            'entity_type' => 'smart_card_request',
            'entity_id' => $readerRequest->cuid,
            'metadata' => ['card' => $card->cuid, 'from' => $from, 'to' => $readerRequest->status],
        ]);

        return $this->item($readerRequest->toPublicArray());
    }

    public function subscribers(Request $request, SmartCard $card)
    {
        return $this->paginated(
            $card->subscribers()->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn ($subscriber) => $subscriber->toPublicArray()
        );
    }
}
