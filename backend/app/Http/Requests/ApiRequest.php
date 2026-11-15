<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Str;

// Base for API input checks. A failure answers 422 `{error: {code}}` for the first failing field,
// using codes(): 'field.rule' => code wins over 'field' => code (e.g. 'email.unique' => 'email_taken').
// Permission checks stay in the `ability` route middleware.
abstract class ApiRequest extends FormRequest
{
    protected $stopOnFirstFailure = true;

    // Fields a record keeps in both languages ('name' means nameAr and nameEn). A language community's forms
    // ask for its own language only (CLAUDE.md, "Language communities"); the missing one copies the other.
    protected const BILINGUAL = [];

    abstract protected function codes(): array;

    protected function getValidatorInstance()
    {
        foreach (static::BILINGUAL as $field) {
            [$ar, $en] = [$this->input("{$field}Ar"), $this->input("{$field}En")];
            if (blank($ar) && ! blank($en)) {
                $this->merge(["{$field}Ar" => $en]);
            } elseif (blank($en) && ! blank($ar)) {
                $this->merge(["{$field}En" => $ar]);
            }
        }

        return parent::getValidatorInstance();
    }

    public function authorize(): bool
    {
        return true;
    }

    protected function failedValidation(Validator $validator)
    {
        $codes = $this->codes();
        $code = 'invalid_input';

        foreach ($validator->failed() as $field => $rules) {
            $rule = Str::snake(array_key_first($rules));
            // Array items ('audiences.2') fall back to their wildcard ('audiences.*').
            $wildcard = preg_replace('/\.\d+(?=\.|$)/', '.*', $field);
            $code = $codes["$field.$rule"] ?? $codes[$field]
                ?? $codes["$wildcard.$rule"] ?? $codes[$wildcard] ?? 'invalid_input';
            break;
        }

        throw new HttpResponseException(response()->json(['error' => ['code' => $code]], 422));
    }
}
