<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;

// A written reason, required when an editorial decision goes against the author (reject, withdraw).
class ReasonFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['reason' => ['required', 'string', 'max:2000']];
    }

    protected function codes(): array
    {
        return ['reason' => 'reason_required'];
    }

    public function reason(): string
    {
        return trim($this->input('reason'));
    }
}
