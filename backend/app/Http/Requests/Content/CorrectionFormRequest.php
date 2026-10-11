<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;
use App\Models\ArticleCorrection;
use Illuminate\Validation\Rule;

// A correction to a published article: the note readers see, and optionally the corrected title and text.
class CorrectionFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::in(ArticleCorrection::KINDS)],
            'note' => ['required', 'string', 'max:2000'],
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:200000'],
        ];
    }

    protected function codes(): array
    {
        return [
            'kind' => 'invalid_correction_kind',
            'note' => 'correction_note_required',
            'title' => 'invalid_article_title',
            'body' => 'invalid_article_body',
        ];
    }
}
