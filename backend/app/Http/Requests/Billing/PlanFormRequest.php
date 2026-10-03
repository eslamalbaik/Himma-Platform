<?php

namespace App\Http\Requests\Billing;

use App\Http\Requests\ApiRequest;
use App\Models\Plan;
use Illuminate\Validation\Rule;

class PlanFormRequest extends ApiRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('currency'))) {
            $this->merge(['currency' => strtoupper($this->input('currency'))]);
        }
    }

    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0', 'max:9999999'],
            'currency' => ['required', 'string', 'regex:/^[A-Z]{3}$/'],
            'interval' => ['required', Rule::in(Plan::INTERVALS)],
            'featuresAr' => ['nullable', 'string', 'max:5000'],
            'featuresEn' => ['nullable', 'string', 'max:5000'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_plan_name',
            'nameEn' => 'invalid_plan_name',
            'price' => 'invalid_price',
            'currency' => 'invalid_currency',
            'interval' => 'invalid_interval',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => $this->input('nameAr'),
            'name_en' => $this->input('nameEn'),
            'price' => round((float) $this->input('price'), 2),
            'currency' => $this->input('currency'),
            'interval' => $this->input('interval'),
            'features_ar' => $this->input('featuresAr'),
            'features_en' => $this->input('featuresEn'),
            'is_active' => $this->boolean('isActive', true),
        ];
    }
}
