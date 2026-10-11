<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// Name and description of a role template. On create, `copyFrom` takes the permissions of another role.
class TenantRoleFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'nameAr' => ['required', 'string', 'max:100'],
            'nameEn' => ['required', 'string', 'max:100'],
            'descriptionAr' => ['nullable', 'string', 'max:500'],
            'descriptionEn' => ['nullable', 'string', 'max:500'],
            'copyFrom' => ['nullable', 'string', Rule::exists('tenant_roles', 'cuid')],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_role_name',
            'nameEn' => 'invalid_role_name',
            'descriptionAr' => 'invalid_description',
            'descriptionEn' => 'invalid_description',
            'copyFrom' => 'invalid_copy_from',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => trim($this->input('nameAr')),
            'name_en' => trim($this->input('nameEn')),
            'description_ar' => $this->input('descriptionAr') ?: null,
            'description_en' => $this->input('descriptionEn') ?: null,
        ];
    }
}
