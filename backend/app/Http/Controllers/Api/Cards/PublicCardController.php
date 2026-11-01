<?php

namespace App\Http\Controllers\Api\Cards;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cards\CardReaderRequest;
use App\Http\Requests\Cards\CardSubscribeRequest;
use App\Models\SmartCard;
use App\Models\SmartCardSubscriber;
use App\Models\User;
use App\Notifications\CardRequestAlert;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;

// What a phone sees after tapping the card (NFC) or scanning its QR code. No sign-in; drafts do not exist.
class PublicCardController extends Controller
{
    private function published(string $slug): ?SmartCard
    {
        return SmartCard::where('slug', $slug)->where('status', 'published')->first();
    }

    // `src` is counted only on the first load of the card page (nfc, qr or link); event pages leave it out.
    public function show(Request $request, string $slug)
    {
        $card = $this->published($slug);
        if (! $card) {
            return $this->error('not_found', 404);
        }

        $src = $request->query('src');
        if (is_string($src) && ($column = SmartCard::SOURCES[$src] ?? ($src === 'link' ? 'link_opens' : null))) {
            SmartCard::whereKey($card->id)->increment($column, 1, ['updated_at' => $card->updated_at]);
        }

        return $this->item($card->toPublicArray());
    }

    public function storeRequest(CardReaderRequest $request, string $slug)
    {
        $card = $this->published($slug);
        if (! $card) {
            return $this->error('not_found', 404);
        }
        if (! $card->accepts_requests) {
            return $this->error('requests_closed', 422);
        }
        if ($request->input('eventId') && ! $card->event($request->input('eventId'))) {
            return $this->error('invalid_input', 422);
        }

        $readerRequest = $card->requests()->create($request->fields() + ['status' => 'new']);

        // The reader's name and address are personal data: the log keeps only what was asked for.
        Audit::log($request, [
            'action' => 'smart_card_request.created',
            'actor' => $request->user(),
            'entity_type' => 'smart_card_request',
            'entity_id' => $readerRequest->cuid,
            'metadata' => ['card' => $card->cuid, 'kind' => $readerRequest->kind],
        ]);

        $alert = new CardRequestAlert([
            'cardAr' => $card->name_ar, 'cardEn' => $card->name_en, 'cardId' => $card->cuid, 'requestKind' => $readerRequest->kind,
        ]);
        User::whereNull('tenant_id')->where('status', 'active')->get()
            ->filter(fn (User $user) => Ability::can($user->role, 'update', 'cards'))
            ->each(fn (User $user) => $user->notify($alert));

        return $this->item(['id' => $readerRequest->cuid, 'kind' => $readerRequest->kind], 201);
    }

    // Subscribing twice is not an error: the reader simply stays on the list.
    public function subscribe(CardSubscribeRequest $request, string $slug)
    {
        $card = $this->published($slug);
        if (! $card) {
            return $this->error('not_found', 404);
        }
        if (! $card->newsletter_enabled) {
            return $this->error('newsletter_closed', 422);
        }

        $subscriber = SmartCardSubscriber::firstOrCreate(
            ['smart_card_id' => $card->id, 'email' => strtolower(trim($request->input('email')))],
            ['language' => $request->input('language', 'ar')]
        );

        if ($subscriber->wasRecentlyCreated) {
            Audit::log($request, [
                'action' => 'smart_card.subscribed',
                'actor' => $request->user(),
                'entity_type' => 'smart_card',
                'entity_id' => $card->cuid,
            ]);
        }

        return $this->ok();
    }
}
