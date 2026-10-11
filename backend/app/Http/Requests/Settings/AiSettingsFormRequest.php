<?php

namespace App\Http\Requests\Settings;

use App\Http\Requests\ApiRequest;
use App\Settings\Ai;
use Illuminate\Validation\Rule;

// The API key is write-only: an empty value keeps the stored key, `clearApiKey` removes it.
class AiSettingsFormRequest extends ApiRequest
{
    public function rules(): array
    {
        $rules = [
            'enabled' => ['required', 'boolean'],
            'model' => ['required', Rule::in(Ai::MODELS)],
            'effort' => ['required', Rule::in(Ai::EFFORTS)],
            'apiKey' => ['nullable', 'string', 'max:300'],
            'clearApiKey' => ['sometimes', 'boolean'],
            'features' => ['required', 'array'],
            'monthlyLimit' => ['required', 'integer', 'min:0', 'max:1000000'],
            'keepGeneratedText' => ['required', 'boolean'],
        ];
        foreach (Ai::FEATURES as $feature) {
            $rules["features.$feature"] = ['required', 'boolean'];
        }

        return $rules;
    }

    protected function codes(): array
    {
        return [
            'model' => 'invalid_ai_model',
            'effort' => 'invalid_ai_effort',
            'apiKey' => 'invalid_api_key',
            'monthlyLimit' => 'invalid_ai_limit',
            'features' => 'invalid_ai_setting',
            'features.*' => 'invalid_ai_setting',
            'enabled' => 'invalid_ai_setting',
            'keepGeneratedText' => 'invalid_ai_setting',
        ];
    }

    public function fields(): array
    {
        $features = [];
        foreach (Ai::FEATURES as $feature) {
            $features[$feature] = (bool) $this->input("features.$feature");
        }

        return [
            'enabled' => $this->boolean('enabled'),
            'model' => $this->input('model'),
            'effort' => $this->input('effort'),
            'features' => $features,
            'monthlyLimit' => (int) $this->input('monthlyLimit'),
            'keepGeneratedText' => $this->boolean('keepGeneratedText'),
        ];
    }
}
