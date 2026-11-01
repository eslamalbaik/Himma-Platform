<?php

namespace App\Http\Requests\Cards;

use App\Http\Requests\ApiRequest;
use App\Models\SmartCardRequest;
use Illuminate\Validation\Rule;

// A reader on a card page asks for a digital dedication or a signed printed copy (no sign-in).
// A signed copy is posted, so it needs an address.
class CardReaderRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::in(SmartCardRequest::KINDS)],
            'bookTitle' => ['nullable', 'string', 'max:200'],
            'eventId' => ['nullable', 'string', 'max:40'],
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9 ()-]{5,30}$/'],
            'dedicateTo' => ['nullable', 'string', 'max:150'],
            'message' => ['nullable', 'string', 'max:1000'],
            'address' => ['nullable', 'required_if:kind,signed_copy', 'string', 'max:500'],
        ];
    }

    protected function codes(): array
    {
        return [
            'kind' => 'invalid_request_kind',
            'name' => 'invalid_name',
            'email' => 'invalid_email',
            'phone' => 'invalid_phone',
            'address' => 'address_required',
            'bookTitle' => 'invalid_input', 'dedicateTo' => 'invalid_input', 'message' => 'invalid_input',
        ];
    }

    public function fields(): array
    {
        return [
            'kind' => $this->input('kind'),
            'book_title' => $this->input('bookTitle'),
            'event_id' => $this->input('eventId'),
            'name' => trim($this->input('name')),
            'email' => strtolower(trim($this->input('email'))),
            'phone' => $this->input('phone'),
            'dedicate_to' => $this->input('dedicateTo'),
            'message' => $this->input('message'),
            'address' => $this->input('kind') === 'signed_copy' ? $this->input('address') : null,
        ];
    }
}
