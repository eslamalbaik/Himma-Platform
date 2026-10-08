<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use App\Models\Article;
use App\Support\PublishingRules;
use Illuminate\Validation\Rule;

class PublishingSettingsFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'requiredOnSubmit' => ['present', 'array'],
            'requiredOnSubmit.*' => ['string', Rule::in(PublishingRules::REQUIRABLE_FIELDS), 'distinct'],
            'separateApprover' => ['required', 'boolean'],
            'sponsoredChecks' => ['required', 'boolean'],
            'defaultClassification' => ['required', Rule::in(Article::CLASSIFICATIONS)],
            'defaultLanguage' => ['required', Rule::in(Article::LANGUAGES)],
        ];
    }

    protected function codes(): array
    {
        return [
            'requiredOnSubmit' => 'invalid_required_fields',
            'requiredOnSubmit.*' => 'invalid_required_fields',
            'separateApprover' => 'invalid_publishing_setting',
            'sponsoredChecks' => 'invalid_publishing_setting',
            'defaultClassification' => 'invalid_classification',
            'defaultLanguage' => 'invalid_language',
        ];
    }

    public function fields(): array
    {
        return [
            // Kept in the order of REQUIRABLE_FIELDS so the stored value does not depend on click order.
            'requiredOnSubmit' => array_values(array_intersect(PublishingRules::REQUIRABLE_FIELDS, $this->input('requiredOnSubmit', []))),
            'separateApprover' => $this->boolean('separateApprover'),
            'sponsoredChecks' => $this->boolean('sponsoredChecks'),
            'defaultClassification' => $this->input('defaultClassification'),
            'defaultLanguage' => $this->input('defaultLanguage'),
        ];
    }
}
