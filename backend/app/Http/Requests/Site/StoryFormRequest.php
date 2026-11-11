<?php

namespace App\Http\Requests\Site;

use App\Http\Requests\ApiRequest;
use App\Models\Article;
use App\Models\MagazineSection;
use Illuminate\Validation\Rule;

// A member's own story. Who wrote it, who can read it (public) and where it lives are set by the server.
class StoryFormRequest extends ApiRequest
{
    // `institutional` is the article classification that means "members of the author's organization only".
    public const AUDIENCES = ['public', 'followers', 'institutional'];

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'body' => ['required', 'string', 'max:200000'],
            'language' => ['required', Rule::in(Article::LANGUAGES)],
            'sectionId' => ['nullable', 'string', Rule::exists('magazine_sections', 'cuid')->where('is_active', true)],
            // Who may read it once published: everyone, the writer's followers, or their organization's members.
            'audience' => ['sometimes', Rule::in($this->user()->tenant_id ? self::AUDIENCES : ['public', 'followers'])],
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
            'audience' => 'invalid_audience',
        ];
    }

    public function fields(): array
    {
        return ($this->filled('audience') ? ['classification' => $this->input('audience')] : []) + [
            'title' => trim($this->input('title')),
            'summary' => $this->input('summary'),
            'body' => $this->input('body'),
            'language' => $this->input('language'),
            'section_id' => $this->filled('sectionId') ? MagazineSection::where('cuid', $this->input('sectionId'))->value('id') : null,
        ];
    }
}
