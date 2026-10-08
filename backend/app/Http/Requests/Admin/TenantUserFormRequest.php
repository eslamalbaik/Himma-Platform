<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\ApiRequest;
use App\Models\RoleTemplate;
use App\Models\User;
use Illuminate\Validation\Rule;

// A client account, created by the platform team (Clients → accounts). The role is a client role template;
// on edit an empty password keeps the current one.
class TenantUserFormRequest extends ApiRequest
{
    // Templates that cannot be given to a client account: visitors have no account, system admins are staff.
    private const NOT_FOR_CLIENTS = ['visitor', 'system_admin'];

    public static function clientRoles(): array
    {
        return RoleTemplate::whereNotIn('key', self::NOT_FOR_CLIENTS)->orderBy('sort_order')->orderBy('id')->pluck('key')->all();
    }

    private function creating(): bool
    {
        return $this->isMethod('post');
    }

    public function rules(): array
    {
        /** @var User|null $user */
        $user = $this->route('user');

        return [
            'nameAr' => ['required', 'string', 'max:255'],
            'nameEn' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'max:255', 'email:filter', Rule::unique('users', 'email')->ignore($user?->id)],
            'role' => ['required', Rule::in(self::clientRoles())],
            'status' => ['required', Rule::in(User::STATUSES)],
            'password' => [$this->creating() ? 'required' : 'nullable', 'string', 'min:8', 'max:200'],
        ];
    }

    protected function codes(): array
    {
        return [
            'nameAr' => 'invalid_user_name',
            'nameEn' => 'invalid_user_name',
            'email.unique' => 'email_taken',
            'email' => 'invalid_email',
            'role' => 'invalid_role',
            'status' => 'invalid_status',
            'password' => 'invalid_password',
        ];
    }

    public function fields(): array
    {
        return [
            'name_ar' => trim($this->input('nameAr')),
            'name_en' => trim($this->input('nameEn')),
            'email' => strtolower(trim($this->input('email'))),
            'role' => $this->input('role'),
            'status' => $this->input('status'),
        ];
    }
}
