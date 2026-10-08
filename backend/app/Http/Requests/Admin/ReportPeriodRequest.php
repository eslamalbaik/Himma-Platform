<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

// Period of a report: ?from=YYYY-MM-DD&to=YYYY-MM-DD, both optional. Defaults to the last 12 months
// (this month included); at most 36 months so the monthly series stays readable.
class ReportPeriodRequest extends ApiRequest
{
    public const MAX_MONTHS = 36;

    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    protected function codes(): array
    {
        return [
            'from' => 'invalid_report_period',
            'to' => 'invalid_report_period',
        ];
    }

    protected function passedValidation(): void
    {
        if ((int) $this->from()->startOfMonth()->diffInMonths($this->to()->startOfMonth()) >= self::MAX_MONTHS) {
            throw new HttpResponseException(response()->json(['error' => ['code' => 'invalid_report_period']], 422));
        }
    }

    public function to(): Carbon
    {
        return $this->filled('to') ? Carbon::parse($this->input('to'))->endOfDay() : Carbon::now()->endOfDay();
    }

    public function from(): Carbon
    {
        return $this->filled('from')
            ? Carbon::parse($this->input('from'))->startOfDay()
            : $this->to()->startOfMonth()->subMonthsNoOverflow(11);
    }

    public function range(): array
    {
        return [$this->from(), $this->to()];
    }

    // Every month the period touches, as 'YYYY-MM'.
    public function months(): Collection
    {
        $months = collect();
        for ($month = $this->from()->startOfMonth(); $month <= $this->to(); $month->addMonthNoOverflow()) {
            $months->push($month->format('Y-m'));
        }

        return $months;
    }

    public function period(): array
    {
        return ['from' => $this->from()->toDateString(), 'to' => $this->to()->toDateString()];
    }
}
