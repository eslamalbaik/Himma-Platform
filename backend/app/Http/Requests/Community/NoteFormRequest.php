<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\ApiRequest;

// An optional note that goes with a staff decision.
class NoteFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['note' => ['nullable', 'string', 'max:2000']];
    }

    protected function codes(): array
    {
        return ['note' => 'invalid_note'];
    }

    public function note(): ?string
    {
        return $this->filled('note') ? trim($this->input('note')) : null;
    }
}
