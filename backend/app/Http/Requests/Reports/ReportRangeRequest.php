<?php

namespace App\Http\Requests\Reports;

use App\Http\Requests\ApiRequest;

// The period a report covers. Both ends are optional (default: the last 12 months, see ReportController).
class ReportRangeRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'lang' => ['nullable', 'in:ar,en'],
        ];
    }

    protected function codes(): array
    {
        return [
            'from' => 'invalid_date',
            'to.after_or_equal' => 'invalid_range',
            'to' => 'invalid_date',
            'lang' => 'invalid_locale',
        ];
    }
}
