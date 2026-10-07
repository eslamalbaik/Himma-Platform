<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

class CommentModerationFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['approved', 'hidden'])]];
    }

    protected function codes(): array
    {
        return ['status' => 'invalid_comment_status'];
    }
}
