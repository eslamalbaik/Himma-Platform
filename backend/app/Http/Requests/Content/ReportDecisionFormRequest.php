<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

class ReportDecisionFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['resolved', 'dismissed'])],
            'note' => ['required', 'string', 'max:2000'],
        ];
    }

    protected function codes(): array
    {
        return ['status' => 'invalid_report_status', 'note' => 'reason_required'];
    }
}
