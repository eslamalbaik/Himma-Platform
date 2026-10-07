<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;
use App\Models\Article;
use Illuminate\Validation\Rule;

// The result of each of the ten compliance items (CMP-02): pass, warn or fail.
class ComplianceFormRequest extends ApiRequest
{
    public function rules(): array
    {
        $rules = ['checks' => ['required', 'array']];
        foreach (Article::COMPLIANCE_ITEMS as $item) {
            $rules["checks.$item"] = ['required', Rule::in(Article::COMPLIANCE_VALUES)];
        }

        return $rules;
    }

    protected function codes(): array
    {
        return ['checks' => 'invalid_compliance_checks', 'checks.*' => 'invalid_compliance_checks']
            + collect(Article::COMPLIANCE_ITEMS)->mapWithKeys(fn ($item) => ["checks.$item" => 'invalid_compliance_checks'])->all();
    }

    public function checks(): array
    {
        return collect(Article::COMPLIANCE_ITEMS)->mapWithKeys(fn ($item) => [$item => $this->input("checks.$item")])->all();
    }
}
