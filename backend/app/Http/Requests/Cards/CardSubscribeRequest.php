<?php

namespace App\Http\Requests\Cards;

use App\Http\Requests\ApiRequest;

class CardSubscribeRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:150'],
            'language' => ['nullable', 'in:ar,en'],
        ];
    }

    protected function codes(): array
    {
        return ['email' => 'invalid_email', 'language' => 'invalid_language'];
    }
}
