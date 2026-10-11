<?php

namespace App\Http\Requests\Client;

use App\Http\Requests\ApiRequest;
use App\Models\User;
use Illuminate\Validation\Rule;

// Add (POST) or edit (PUT) a member of the signed-in user's organisation. The email is set once, on create;
// on edit an empty password keeps the current one. Whether the chosen role may be given is checked by the
// controller (ClientAccess::mayAssign).
class MemberFormRequest extends ApiRequest
{
    private function creating(): bool
    {
        return $this->isMethod('post');
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => strtolower(trim((string) $this->input('email')))]);
        }
    }

    public function rules(): array
    {
        return [
            ...($this->creating() ? [
                'email' => ['required', 'string', 'max:255', 'email:filter', Rule::unique('users', 'email')],
            ] : []),
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', Rule::exists('tenant_roles', 'key')],
            'status' => ['required', Rule::in(User::STATUSES)],
            'password' => [$this->creating() ? 'required' : 'nullable', 'string', 'min:8', 'max:200'],
        ];
    }

    protected function codes(): array
    {
        return [
            'email' => 'invalid_email',
            'email.unique' => 'email_taken',
            'nameAr' => 'invalid_user_name',
            'nameEn' => 'invalid_user_name',
            'role' => 'invalid_role',
            'status' => 'invalid_user_status',
            'password' => 'invalid_password',
        ];
    }

    public function fields(): array
    {
        return [
            ...($this->creating() ? ['email' => $this->input('email')] : []),
            'name_ar' => $this->input('nameAr'),
            'name_en' => $this->input('nameEn'),
            'role' => $this->input('role'),
            'status' => $this->input('status'),
        ];
    }
}
