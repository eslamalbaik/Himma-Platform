<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;
use App\Models\LibraryItem;
use App\Models\MagazineSection;
use Illuminate\Validation\Rule;

// A library item's details. Its cover and file are uploaded separately (LibraryFileRequest).
class LibraryItemFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(LibraryItem::TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'authorName' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:5000'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'year' => ['nullable', 'integer', 'min:1000', 'max:2100'],
            'isbn' => ['nullable', 'string', 'regex:/^[0-9Xx\- ]{10,17}$/'],
            'externalUrl' => ['nullable', 'string', 'max:500', 'url:https,http'],
            'sectionId' => ['nullable', 'string', Rule::exists('magazine_sections', 'cuid')],
        ];
    }

    protected function codes(): array
    {
        return [
            'type' => 'invalid_library_type',
            'title' => 'invalid_library_title',
            'authorName' => 'invalid_author',
            'summary' => 'invalid_article_summary',
            'publisher' => 'invalid_publisher',
            'year' => 'invalid_year',
            'isbn' => 'invalid_isbn',
            'externalUrl' => 'invalid_url',
            'sectionId' => 'invalid_section',
        ];
    }

    public function fields(): array
    {
        return [
            'type' => $this->input('type'),
            'title' => trim($this->input('title')),
            'author_name' => trim($this->input('authorName')),
            'summary' => $this->input('summary'),
            'publisher' => $this->input('publisher'),
            'year' => $this->filled('year') ? (int) $this->input('year') : null,
            'isbn' => $this->filled('isbn') ? strtoupper(preg_replace('/[\s\-]/', '', $this->input('isbn'))) : null,
            'external_url' => $this->input('externalUrl') ?: null,
            'section_id' => $this->filled('sectionId') ? MagazineSection::where('cuid', $this->input('sectionId'))->value('id') : null,
        ];
    }
}
