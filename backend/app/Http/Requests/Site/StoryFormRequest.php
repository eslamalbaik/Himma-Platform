<?php

namespace App\Http\Requests\Site;

use App\Http\Requests\ApiRequest;
use App\Models\Article;
use App\Models\MagazineSection;
use Illuminate\Validation\Rule;

// A member's own story. Who wrote it, who can read it (public) and where it lives are set by the server.
class StoryFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'body' => ['required', 'string', 'max:200000'],
            'language' => ['required', Rule::in(Article::LANGUAGES)],
            'sectionId' => ['nullable', 'string', Rule::exists('magazine_sections', 'cuid')->where('is_active', true)],
        ];
    }

    protected function codes(): array
    {
        return [
            'title' => 'invalid_article_title',
            'summary' => 'invalid_article_summary',
            'body' => 'invalid_article_body',
            'language' => 'invalid_language',
            'sectionId' => 'invalid_section',
        ];
    }

    public function fields(): array
    {
        return [
            'title' => trim($this->input('title')),
            'summary' => $this->input('summary'),
            'body' => $this->input('body'),
            'language' => $this->input('language'),
            'section_id' => $this->filled('sectionId') ? MagazineSection::where('cuid', $this->input('sectionId'))->value('id') : null,
        ];
    }
}
