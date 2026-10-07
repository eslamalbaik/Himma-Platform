<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;
use App\Models\Article;
use App\Models\Issue;
use App\Models\MagazineSection;
use App\Models\Tag;
use App\Models\Tenant;
use Illuminate\Validation\Rule;

class ArticleFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'body' => ['required', 'string', 'max:200000'],
            'language' => ['required', Rule::in(Article::LANGUAGES)],
            'classification' => ['required', Rule::in(Article::CLASSIFICATIONS)],
            // Institutional and government content must name the client it belongs to (CLS-03).
            'tenantId' => [
                Rule::requiredIf(in_array($this->input('classification'), Article::TENANT_CLASSIFICATIONS, true)),
                'nullable', 'string', Rule::exists('tenants', 'cuid'),
            ],
            'sectionId' => ['nullable', 'string', Rule::exists('magazine_sections', 'cuid')],
            'issueId' => ['nullable', 'string', Rule::exists('issues', 'cuid')],
            'authorName' => ['required', 'string', 'max:255'],
            'audiences' => ['nullable', 'array'],
            'audiences.*' => [Rule::in(Article::AUDIENCES)],
            'isSponsored' => ['sometimes', 'boolean'],
            'source' => ['nullable', 'string', 'max:500'],
            'rightsNote' => ['nullable', 'string', 'max:2000'],
            'tagIds' => ['nullable', 'array'],
            'tagIds.*' => ['string', Rule::exists('tags', 'cuid')],
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
            'tenantId.required' => 'tenant_required_for_classification',
            'tenantId' => 'invalid_tenant',
            'sectionId' => 'invalid_section',
            'issueId' => 'invalid_issue',
            'authorName' => 'invalid_author',
            'audiences' => 'invalid_audience',
            'audiences.*' => 'invalid_audience',
            'source' => 'invalid_source',
            'rightsNote' => 'invalid_rights_note',
            'tagIds' => 'invalid_tag',
            'tagIds.*' => 'invalid_tag',
        ];
    }

    public function fields(): array
    {
        $tenantNeeded = in_array($this->input('classification'), Article::TENANT_CLASSIFICATIONS, true);

        return [
            'title' => trim($this->input('title')),
            'summary' => $this->input('summary'),
            'body' => $this->input('body'),
            'language' => $this->input('language'),
            'classification' => $this->input('classification'),
            'tenant_id' => $tenantNeeded || $this->filled('tenantId')
                ? Tenant::where('cuid', $this->input('tenantId'))->value('id')
                : null,
            'section_id' => $this->filled('sectionId') ? MagazineSection::where('cuid', $this->input('sectionId'))->value('id') : null,
            'issue_id' => $this->filled('issueId') ? Issue::where('cuid', $this->input('issueId'))->value('id') : null,
            'author_name' => trim($this->input('authorName')),
            'audiences' => array_values(array_unique($this->input('audiences', []))),
            'is_sponsored' => $this->boolean('isSponsored'),
            'source' => $this->input('source'),
            'rights_note' => $this->input('rightsNote'),
        ];
    }

    public function tagIds(): array
    {
        return Tag::whereIn('cuid', $this->input('tagIds', []))->pluck('id')->all();
    }
}
