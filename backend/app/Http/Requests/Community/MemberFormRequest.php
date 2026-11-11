<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// Adding a person to the organization (they get an email to choose a password) or changing a member.
class MemberFormRequest extends ApiRequest
{
    public const ROLES = ['tenant_admin', 'tenant_member'];

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => strtolower(trim((string) $this->input('email')))]);
        }
    }

    public function rules(): array
    {
        $creating = $this->isMethod('POST');

        return [
            'email' => [$creating ? 'required' : 'prohibited', 'string', 'max:255', 'email:filter', Rule::unique('users', 'email')],
            'nameAr' => [$creating ? 'required' : 'sometimes', 'string', 'min:2', 'max:120'],
            'nameEn' => [$creating ? 'required' : 'sometimes', 'string', 'min:2', 'max:120'],
            'role' => [$creating ? 'required' : 'sometimes', Rule::in(self::ROLES)],
            'status' => ['sometimes', Rule::in(['active', 'disabled'])],
        ];
    }

    protected function codes(): array
    {
        return [
            'email.unique' => 'email_taken',
            'email' => 'invalid_email',
            'nameAr' => 'invalid_name',
            'nameEn' => 'invalid_name',
            'role' => 'invalid_role',
            'status' => 'invalid_status',
        ];
    }
}
