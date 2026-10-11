<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use App\Support\TenantPermissions;
use Illuminate\Validation\Rule;

// Changed cells of one role's matrix: {permissions: {permission: allowed|restricted|denied}}.
class TenantRolePermissionsFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*' => ['required', Rule::in(TenantPermissions::states())],
        ];
    }

    protected function codes(): array
    {
        // Named keys (permissions.publish) do not fall back to 'permissions.*', so each one is listed.
        $codes = ['permissions' => 'invalid_permissions'];
        foreach (TenantPermissions::keys() as $key) {
            $codes["permissions.$key"] = 'invalid_permission_state';
        }

        return $codes;
    }

    public function changes(): array
    {
        return $this->input('permissions');
    }

    /** @return string[] keys that are not in the catalogue */
    public function unknownKeys(): array
    {
        return array_values(array_diff(array_keys($this->changes()), TenantPermissions::keys()));
    }
}
