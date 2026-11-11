<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\ApiRequest;
use App\Models\Follow;
use Illuminate\Validation\Rule;

class FollowFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(array_keys(Follow::TYPES))],
            'key' => ['required', 'string', 'max:255'],
        ];
    }

    protected function codes(): array
    {
        return ['type' => 'invalid_follow_target', 'key' => 'invalid_follow_target'];
    }
}
