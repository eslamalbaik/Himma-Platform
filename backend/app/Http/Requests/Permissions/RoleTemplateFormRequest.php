<?php

namespace App\Http\Requests\Permissions;

use App\Http\Requests\ApiRequest;
use App\Models\RoleTemplate;
use Illuminate\Validation\Rule;

// Add or edit a role (ROL-04). `copyFrom` (when adding) takes the permissions of an existing role.
class RoleTemplateFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'max:100'],
            'nameEn' => ['required', 'string', 'max:100'],
            'descriptionAr' => ['nullable', 'string', 'max:1000'],
            'descriptionEn' => ['nullable', 'string', 'max:1000'],
            'copyFrom' => ['nullable', 'string', Rule::exists('role_templates', 'cuid')],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_role_name',
            'nameEn' => 'invalid_role_name',
            'descriptionAr' => 'invalid_description',
            'descriptionEn' => 'invalid_description',
            'copyFrom' => 'invalid_role_template',
        ];
    }

    public function fields(): array
    {
        $text = fn (string $key) => filled($this->input($key)) ? trim($this->input($key)) : null;

        return [
            'name_ar' => trim($this->input('nameAr')),
            'name_en' => trim($this->input('nameEn')),
            'description_ar' => $text('descriptionAr'),
            'description_en' => $text('descriptionEn'),
        ];
    }

    public function copiedPermissions(): array
    {
        $source = $this->filled('copyFrom') ? RoleTemplate::where('cuid', $this->input('copyFrom'))->first() : null;

        return $source ? $source->states() : RoleTemplate::allDenied();
    }
}
