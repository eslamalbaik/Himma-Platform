<?php

namespace App\Http\Requests\Writers;

use App\Http\Requests\ApiRequest;
use App\Models\Tenant;
use App\Models\Writer;
use Illuminate\Validation\Rule;

class WriterFormRequest extends ApiRequest
{
    public function rules(): array
    {
        /** @var Writer|null $writer */
        $writer = $this->route('writer');

        return [
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'max:255', 'email:filter', Rule::unique('writers', 'email')->ignore($writer?->id)],
            'phone' => ['nullable', 'string', 'max:40'],
            'tenantId' => ['nullable', 'string', Rule::exists('tenants', 'cuid')],
            'affiliation' => ['nullable', 'string', 'max:255'],
            'titleAr' => ['nullable', 'string', 'max:255'],
            'titleEn' => ['nullable', 'string', 'max:255'],
            'bioAr' => ['nullable', 'string', 'max:5000'],
            'bioEn' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_writer_name',
            'nameEn' => 'invalid_writer_name',
            'email.unique' => 'writer_email_taken',
            'email' => 'invalid_email',
            'phone' => 'invalid_phone',
            'tenantId' => 'invalid_tenant',
            'affiliation' => 'invalid_affiliation',
            'titleAr' => 'invalid_writer_title',
            'titleEn' => 'invalid_writer_title',
            'bioAr' => 'invalid_bio',
            'bioEn' => 'invalid_bio',
        ];
    }

    public function fields(): array
    {
        $text = fn (string $key) => filled($this->input($key)) ? trim($this->input($key)) : null;

        return [
            'name_ar' => trim($this->input('nameAr')),
            'name_en' => trim($this->input('nameEn')),
            'email' => $text('email') ? strtolower($text('email')) : null,
            'phone' => $text('phone'),
            'tenant_id' => $this->filled('tenantId') ? Tenant::where('cuid', $this->input('tenantId'))->value('id') : null,
            'affiliation' => $text('affiliation'),
            'title_ar' => $text('titleAr'),
            'title_en' => $text('titleEn'),
            'bio_ar' => $text('bioAr'),
            'bio_en' => $text('bioEn'),
        ];
    }
}
