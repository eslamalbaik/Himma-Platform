<?php

namespace App\Http\Requests\Writers;

use App\Http\Requests\ApiRequest;
use App\Models\Writer;
use Illuminate\Validation\Rule;

// How the editor confirmed the writer's identity and organisation (PUB-02). "Other" needs a note.
class VerifyWriterRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'method' => ['required', Rule::in(Writer::VERIFICATION_METHODS)],
            'note' => ['nullable', 'string', 'max:2000', 'required_if:method,other'],
        ];
    }

    protected function codes(): array
    {
        return [
            'method' => 'invalid_verification_method',
            'note.required_if' => 'verification_note_required',
            'note' => 'invalid_verification_note',
        ];
    }

    public function fields(): array
    {
        return [
            'verification_method' => $this->input('method'),
            'verification_note' => filled($this->input('note')) ? trim($this->input('note')) : null,
        ];
    }
}
