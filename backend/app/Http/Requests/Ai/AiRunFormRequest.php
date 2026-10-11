<?php

namespace App\Http\Requests\Ai;

use App\Ai\Tools;
use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// Which AI Center tool to run, on which article (or, for the issue builder, which month).
class AiRunFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'tool' => ['required', Rule::in(array_keys(Tools::FEATURES))],
            'articleId' => ['nullable', 'required_unless:tool,issue_builder', 'string', Rule::exists('articles', 'cuid')],
            'month' => ['nullable', 'date_format:Y-m'],
        ];
    }

    protected function codes(): array
    {
        return [
            'tool' => 'invalid_ai_tool',
            'articleId' => 'article_not_found',
            'month' => 'invalid_date',
        ];
    }
}
