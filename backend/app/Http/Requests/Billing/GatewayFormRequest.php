<?php

namespace App\Http\Requests\Billing;

use App\Http\Requests\ApiRequest;
use App\Models\PaymentGateway;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

// Payment gateway settings. The driver is chosen once, on create. A secret left empty keeps its stored value.
class GatewayFormRequest extends ApiRequest
{
    private const SECRET_FIELDS = [
        'apiKey' => 'api_key',
        'apiSecret' => 'api_secret',
        'publicKey' => 'public_key',
        'webhookSecret' => 'webhook_secret',
    ];

    private function creating(): bool
    {
        return $this->isMethod('post');
    }

    public function rules(): array
    {
        return [
            ...($this->creating() ? ['driver' => ['required', Rule::in(PaymentGateway::DRIVERS)]] : []),
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'descriptionAr' => ['nullable', 'string', 'max:2000'],
            'descriptionEn' => ['nullable', 'string', 'max:2000'],
            'apiKey' => ['nullable', 'string', 'max:4000'],
            'apiSecret' => ['nullable', 'string', 'max:4000'],
            'publicKey' => ['nullable', 'string', 'max:4000'],
            'webhookSecret' => ['nullable', 'string', 'max:4000'],
            'baseUrl' => ['nullable', 'string', 'max:255', 'url:https'],
            'isActive' => ['sometimes', 'boolean'],
            'testMode' => ['sometimes', 'boolean'],
            'sortOrder' => ['nullable', 'integer', 'min:0', 'max:1000'],
        ];
    }

    protected function codes(): array
    {
        return [
            'driver' => 'invalid_gateway_driver',
            'nameAr' => 'invalid_gateway_name',
            'nameEn' => 'invalid_gateway_name',
            'descriptionAr' => 'invalid_description',
            'descriptionEn' => 'invalid_description',
            'apiKey' => 'invalid_gateway_key',
            'apiSecret' => 'invalid_gateway_key',
            'publicKey' => 'invalid_gateway_key',
            'webhookSecret' => 'invalid_gateway_key',
            'baseUrl' => 'invalid_url',
            'sortOrder' => 'invalid_sort_order',
        ];
    }

    public function fields(): array
    {
        $fields = [
            ...($this->creating() ? ['driver' => $this->input('driver')] : []),
            'name_ar' => $this->input('nameAr'),
            'name_en' => $this->input('nameEn'),
            'description_ar' => $this->input('descriptionAr'),
            'description_en' => $this->input('descriptionEn'),
            'base_url' => $this->input('baseUrl'),
            'is_active' => $this->boolean('isActive'),
            'test_mode' => $this->boolean('testMode', true),
            'sort_order' => (int) $this->input('sortOrder', 0),
        ];

        foreach (self::SECRET_FIELDS as $input => $column) {
            if (filled($this->input($input))) {
                $fields[$column] = trim($this->input($input));
            }
        }

        return $fields;
    }

    // Names of the secrets this request changes (for the audit log; never the values).
    public function changedSecrets(): array
    {
        return array_values(array_map(
            fn ($input) => Str::snake($input),
            array_filter(array_keys(self::SECRET_FIELDS), fn ($input) => filled($this->input($input)))
        ));
    }
}
