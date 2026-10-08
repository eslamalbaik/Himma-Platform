<?php

namespace App\Http\Requests\Messages;

use App\Http\Requests\ApiRequest;

class BlockFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['userId' => ['required', 'string', 'exists:users,cuid']];
    }

    protected function codes(): array
    {
        return ['userId' => 'invalid_recipient'];
    }
}
