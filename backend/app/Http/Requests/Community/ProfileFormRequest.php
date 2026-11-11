<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// The signed-in user's own public profile.
class ProfileFormRequest extends ApiRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['handle' => strtolower(trim((string) $this->input('handle', '')))]);
    }

    public function rules(): array
    {
        return [
            'handle' => ['required', 'string', 'regex:/^[a-z0-9][a-z0-9_-]{2,29}$/', Rule::unique('users', 'handle')->ignore($this->user()->id)],
            'nameAr' => ['required', 'string', 'min:2', 'max:120'],
            'nameEn' => ['required', 'string', 'min:2', 'max:120'],
            'bioAr' => ['nullable', 'string', 'max:500'],
            'bioEn' => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function codes(): array
    {
        return [
            'handle.unique' => 'handle_taken',
            'handle' => 'invalid_handle',
            'nameAr' => 'invalid_name',
            'nameEn' => 'invalid_name',
            'bioAr' => 'invalid_bio',
            'bioEn' => 'invalid_bio',
        ];
    }

    public function fields(): array
    {
        return [
            'handle' => $this->input('handle'),
            'name_ar' => trim($this->input('nameAr')),
            'name_en' => trim($this->input('nameEn')),
            'bio_ar' => $this->filled('bioAr') ? trim($this->input('bioAr')) : null,
            'bio_en' => $this->filled('bioEn') ? trim($this->input('bioEn')) : null,
        ];
    }
}
