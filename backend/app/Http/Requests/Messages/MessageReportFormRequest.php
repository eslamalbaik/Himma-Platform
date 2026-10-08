<?php

namespace App\Http\Requests\Messages;

use App\Http\Requests\ApiRequest;
use App\Models\MessageReport;
use Illuminate\Validation\Rule;

class MessageReportFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'reason' => ['required', Rule::in(MessageReport::REASONS)],
            'details' => ['nullable', 'string', 'max:1000'],
        ];
    }

    protected function codes(): array
    {
        return ['reason' => 'invalid_report_reason', 'details' => 'invalid_report_details'];
    }
}
