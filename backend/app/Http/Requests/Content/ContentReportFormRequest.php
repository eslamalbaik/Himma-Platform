<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;
use App\Models\Article;
use App\Models\ContentReport;
use Illuminate\Validation\Rule;

// Staff log a complaint received by phone or email (a public report form comes with the public site).
class ContentReportFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'articleId' => ['required', 'string', Rule::exists('articles', 'cuid')],
            'reporterName' => ['required', 'string', 'max:255'],
            'reporterEmail' => ['nullable', 'email', 'max:255'],
            'reason' => ['required', Rule::in(ContentReport::REASONS)],
            'details' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function codes(): array
    {
        return [
            'articleId' => 'invalid_article',
            'reporterName' => 'invalid_reporter_name',
            'reporterEmail' => 'invalid_email',
            'reason' => 'invalid_report_reason',
            'details' => 'invalid_report_details',
        ];
    }

    public function fields(): array
    {
        return [
            'article_id' => Article::where('cuid', $this->input('articleId'))->value('id'),
            'reporter_name' => trim($this->input('reporterName')),
            'reporter_email' => $this->input('reporterEmail'),
            'reason' => $this->input('reason'),
            'details' => $this->input('details'),
        ];
    }
}
