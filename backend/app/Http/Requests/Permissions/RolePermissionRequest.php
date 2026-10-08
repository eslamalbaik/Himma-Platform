<?php

namespace App\Http\Requests\Permissions;

use App\Http\Requests\ApiRequest;
use App\Models\RoleTemplate;
use Illuminate\Validation\Rule;

// One cell of the matrix (ROL-02): allowed, restricted or denied.
class RolePermissionRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['state' => ['required', Rule::in(RoleTemplate::STATES)]];
    }

    protected function codes(): array
    {
        return ['state' => 'invalid_permission_state'];
    }
}
