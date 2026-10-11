<?php

namespace App\Http\Requests\Client;

use App\Http\Requests\ApiRequest;
use App\Models\Article;
use App\Models\MagazineSection;
use App\Support\ClientAccess;
use Illuminate\Validation\Rule;

// An article written in the client dashboard. The organisation, the author and everything editorial (issue,
// writer, tags, sponsorship, compliance) are not the client's to set: the article always belongs to the user's
// own organisation and the platform's editors take it from there.
class ArticleFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'body' => ['required', 'string', 'max:200000'],
            'language' => ['required', Rule::in(Article::LANGUAGES)],
            'classification' => ['required', Rule::in(ClientAccess::classifications($this->user()))],
            'sectionId' => ['nullable', 'string', Rule::exists('magazine_sections', 'cuid')->where('is_active', true)],
            'audiences' => ['nullable', 'array'],
            'audiences.*' => [Rule::in(Article::AUDIENCES)],
            'source' => ['nullable', 'string', 'max:500'],
            'rightsNote' => ['nullable', 'string', 'max:2000'],
        ];
    }

    protected function codes(): array
    {
        return [
            'title' => 'invalid_article_title',
            'summary' => 'invalid_article_summary',
            'body' => 'invalid_article_body',
            'language' => 'invalid_language',
            'classification' => 'invalid_classification',
            'sectionId' => 'invalid_section',
            'audiences' => 'invalid_audience',
            'audiences.*' => 'invalid_audience',
            'source' => 'invalid_source',
            'rightsNote' => 'invalid_rights_note',
        ];
    }

    public function fields(): array
    {
        $user = $this->user();

        return [
            'title' => trim($this->input('title')),
            'summary' => $this->input('summary'),
            'body' => $this->input('body'),
            'language' => $this->input('language'),
            'classification' => $this->input('classification'),
            'tenant_id' => $user->tenant_id,
            'section_id' => $this->filled('sectionId') ? MagazineSection::where('cuid', $this->input('sectionId'))->value('id') : null,
            'author_name' => $this->input('language') === 'en' ? $user->name_en : $user->name_ar,
            'audiences' => array_values(array_unique($this->input('audiences', []))),
            'source' => $this->input('source'),
            'rights_note' => $this->input('rightsNote'),
        ];
    }
}
