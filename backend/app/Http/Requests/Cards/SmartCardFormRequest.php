<?php

namespace App\Http\Requests\Cards;

use App\Http\Requests\ApiRequest;
use App\Models\SmartCard;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

// A whole card in one save: profile, links, books (with ISBN) and events (with their programme).
class SmartCardFormRequest extends ApiRequest
{
    // A path on this site or an https address; never javascript: or another scheme.
    private const PAGE_URL = 'regex:/^(\/(?!\/)|https:\/\/)\S*$/';

    // Social and store links may also open the mail app or the phone.
    private const LINK_URL = 'regex:/^(https:\/\/|mailto:|tel:)\S+$/';

    public function rules(): array
    {
        $card = $this->route('card');

        return [
            'slug' => ['required', 'string', 'max:60', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/',
                Rule::unique('smart_cards', 'slug')->ignore($card?->id)],
            'kind' => ['required', Rule::in(SmartCard::KINDS)],
            'status' => ['required', Rule::in(SmartCard::STATUSES)],
            'nameAr' => ['required', 'string', 'max:150'],
            'nameEn' => ['required', 'string', 'max:150'],
            'headlineAr' => ['nullable', 'string', 'max:200'],
            'headlineEn' => ['nullable', 'string', 'max:200'],
            'bioAr' => ['nullable', 'string', 'max:4000'],
            'bioEn' => ['nullable', 'string', 'max:4000'],
            'photoUrl' => ['nullable', 'string', 'max:500', self::PAGE_URL],
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9 ()-]{5,30}$/'],
            'publisherAr' => ['nullable', 'string', 'max:200'],
            'publisherEn' => ['nullable', 'string', 'max:200'],
            'rightsAr' => ['nullable', 'string', 'max:500'],
            'rightsEn' => ['nullable', 'string', 'max:500'],
            'acceptsRequests' => ['required', 'boolean'],
            'newsletterEnabled' => ['required', 'boolean'],

            'links' => ['present', 'array', 'max:20'],
            'links.*.type' => ['required', Rule::in(SmartCard::LINK_TYPES)],
            'links.*.labelAr' => ['nullable', 'string', 'max:100'],
            'links.*.labelEn' => ['nullable', 'string', 'max:100'],
            'links.*.url' => ['required', 'string', 'max:500', self::LINK_URL],

            'books' => ['present', 'array', 'max:50'],
            'books.*.titleAr' => ['required', 'string', 'max:200'],
            'books.*.titleEn' => ['required', 'string', 'max:200'],
            // ISBN-10 or ISBN-13, hyphens and spaces allowed.
            'books.*.isbn' => ['nullable', 'string', 'regex:/^(?=(?:[^0-9Xx]*[0-9Xx]){10}(?:(?:[^0-9Xx]*[0-9Xx]){3})?[^0-9Xx]*$)[0-9Xx -]+$/'],
            'books.*.format' => ['required', Rule::in(SmartCard::BOOK_FORMATS)],
            'books.*.year' => ['nullable', 'integer', 'min:1800', 'max:2100'],
            'books.*.coverUrl' => ['nullable', 'string', 'max:500', self::PAGE_URL],
            'books.*.descriptionAr' => ['nullable', 'string', 'max:1000'],
            'books.*.descriptionEn' => ['nullable', 'string', 'max:1000'],
            'books.*.storeUrl' => ['nullable', 'string', 'max:500', self::PAGE_URL],

            'events' => ['present', 'array', 'max:30'],
            'events.*.type' => ['required', Rule::in(SmartCard::EVENT_TYPES)],
            'events.*.titleAr' => ['required', 'string', 'max:200'],
            'events.*.titleEn' => ['required', 'string', 'max:200'],
            'events.*.startsAt' => ['required', 'date'],
            'events.*.locationAr' => ['nullable', 'string', 'max:200'],
            'events.*.locationEn' => ['nullable', 'string', 'max:200'],
            'events.*.summaryAr' => ['nullable', 'string', 'max:1000'],
            'events.*.summaryEn' => ['nullable', 'string', 'max:1000'],
            'events.*.liveUrl' => ['nullable', 'string', 'max:500', 'regex:/^https:\/\/\S+$/'],
            'events.*.bookTitle' => ['nullable', 'string', 'max:200'],
            'events.*.programme' => ['present', 'array', 'max:30'],
            'events.*.programme.*.minute' => ['required', 'integer', 'min:0', 'max:1440'],
            'events.*.programme.*.titleAr' => ['required', 'string', 'max:200'],
            'events.*.programme.*.titleEn' => ['required', 'string', 'max:200'],
        ];
    }

    protected function codes(): array
    {
        return [
            'slug' => 'invalid_card_slug', 'slug.unique' => 'card_slug_taken',
            'kind' => 'invalid_card_kind',
            'status' => 'invalid_card_status',
            'nameAr' => 'invalid_card_name', 'nameEn' => 'invalid_card_name',
            'headlineAr' => 'invalid_card_text', 'headlineEn' => 'invalid_card_text',
            'bioAr' => 'invalid_card_text', 'bioEn' => 'invalid_card_text',
            'publisherAr' => 'invalid_card_text', 'publisherEn' => 'invalid_card_text',
            'rightsAr' => 'invalid_card_text', 'rightsEn' => 'invalid_card_text',
            'photoUrl' => 'invalid_url',
            'color' => 'invalid_color',
            'email' => 'invalid_email',
            'phone' => 'invalid_phone',
            'links' => 'invalid_card_links', 'links.*' => 'invalid_card_links',
            'links.*.type' => 'invalid_card_links', 'links.*.labelAr' => 'invalid_card_links',
            'links.*.labelEn' => 'invalid_card_links', 'links.*.url' => 'invalid_card_links',
            'books' => 'invalid_card_books', 'books.*' => 'invalid_card_books',
            'books.*.titleAr' => 'invalid_card_books', 'books.*.titleEn' => 'invalid_card_books',
            'books.*.isbn' => 'invalid_isbn',
            'books.*.format' => 'invalid_card_books', 'books.*.year' => 'invalid_card_books',
            'books.*.coverUrl' => 'invalid_url', 'books.*.storeUrl' => 'invalid_url',
            'books.*.descriptionAr' => 'invalid_card_books', 'books.*.descriptionEn' => 'invalid_card_books',
            'events' => 'invalid_card_events', 'events.*' => 'invalid_card_events',
            'events.*.type' => 'invalid_card_events',
            'events.*.titleAr' => 'invalid_card_events', 'events.*.titleEn' => 'invalid_card_events',
            'events.*.startsAt' => 'invalid_date',
            'events.*.locationAr' => 'invalid_card_events', 'events.*.locationEn' => 'invalid_card_events',
            'events.*.summaryAr' => 'invalid_card_events', 'events.*.summaryEn' => 'invalid_card_events',
            'events.*.liveUrl' => 'invalid_stream_url',
            'events.*.bookTitle' => 'invalid_card_events',
            'events.*.programme' => 'invalid_programme', 'events.*.programme.*' => 'invalid_programme',
            'events.*.programme.*.minute' => 'invalid_programme',
            'events.*.programme.*.titleAr' => 'invalid_programme', 'events.*.programme.*.titleEn' => 'invalid_programme',
        ];
    }

    // Each book and event keeps its id between saves (event pages and reader requests point at it);
    // a new one gets a fresh id.
    private static function keepId(array $row): string
    {
        $id = $row['id'] ?? null;

        return is_string($id) && preg_match('/^[0-9A-Za-z]{10,40}$/', $id) ? $id : strtolower((string) Str::ulid());
    }

    public function fields(): array
    {
        $text = fn (array $row, string $key) => isset($row[$key]) && trim((string) $row[$key]) !== '' ? trim((string) $row[$key]) : null;

        $links = collect($this->input('links', []))->map(fn ($l) => [
            'type' => $l['type'], 'labelAr' => $text($l, 'labelAr'), 'labelEn' => $text($l, 'labelEn'), 'url' => trim($l['url']),
        ])->values()->all();

        $books = collect($this->input('books', []))->map(fn ($b) => [
            'id' => self::keepId($b),
            'titleAr' => trim($b['titleAr']), 'titleEn' => trim($b['titleEn']),
            'isbn' => $text($b, 'isbn'),
            'format' => $b['format'],
            'year' => isset($b['year']) && $b['year'] !== '' ? (int) $b['year'] : null,
            'coverUrl' => $text($b, 'coverUrl'),
            'descriptionAr' => $text($b, 'descriptionAr'), 'descriptionEn' => $text($b, 'descriptionEn'),
            'storeUrl' => $text($b, 'storeUrl'),
        ])->values()->all();

        $events = collect($this->input('events', []))->map(fn ($e) => [
            'id' => self::keepId($e),
            'type' => $e['type'],
            'titleAr' => trim($e['titleAr']), 'titleEn' => trim($e['titleEn']),
            'startsAt' => Carbon::parse($e['startsAt'])->toIso8601String(),
            'locationAr' => $text($e, 'locationAr'), 'locationEn' => $text($e, 'locationEn'),
            'summaryAr' => $text($e, 'summaryAr'), 'summaryEn' => $text($e, 'summaryEn'),
            'liveUrl' => $text($e, 'liveUrl'),
            'bookTitle' => $text($e, 'bookTitle'),
            'programme' => collect($e['programme'])->map(fn ($p) => [
                'minute' => (int) $p['minute'], 'titleAr' => trim($p['titleAr']), 'titleEn' => trim($p['titleEn']),
            ])->sortBy('minute')->values()->all(),
        ])->sortBy('startsAt')->values()->all();

        return [
            'slug' => $this->input('slug'),
            'kind' => $this->input('kind'),
            'status' => $this->input('status'),
            'name_ar' => $this->input('nameAr'), 'name_en' => $this->input('nameEn'),
            'headline_ar' => $this->input('headlineAr'), 'headline_en' => $this->input('headlineEn'),
            'bio_ar' => $this->input('bioAr'), 'bio_en' => $this->input('bioEn'),
            'photo_url' => $this->input('photoUrl'),
            'color' => $this->input('color'),
            'email' => $this->input('email') ? strtolower(trim($this->input('email'))) : null,
            'phone' => $this->input('phone'),
            'publisher_ar' => $this->input('publisherAr'), 'publisher_en' => $this->input('publisherEn'),
            'rights_ar' => $this->input('rightsAr'), 'rights_en' => $this->input('rightsEn'),
            'accepts_requests' => $this->boolean('acceptsRequests'),
            'newsletter_enabled' => $this->boolean('newsletterEnabled'),
            'links' => $links,
            'books' => $books,
            'events' => $events,
        ];
    }
}
