<?php

namespace App\Http\Requests\Landing;

use App\Http\Requests\ApiRequest;

// The new order of a list: the public ids, first to last.
class OrderRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['ids' => ['required', 'array', 'min:1', 'max:200'], 'ids.*' => ['required', 'string', 'max:40', 'distinct']];
    }

    protected function codes(): array
    {
        return ['ids' => 'invalid_input'];
    }
}
