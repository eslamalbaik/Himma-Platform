<?php

namespace App\Http\Controllers\Client;

use App\Http\Middleware\EnsureApiUser;
use App\Http\Requests\Client\ChangePasswordRequest;
use App\Support\Audit;

// The signed-in client account itself.
class AccountController extends ClientController
{
    // A new password ends the account's other sessions (token_version), but keeps this one.
    public function changePassword(ChangePasswordRequest $request)
    {
        $user = $request->user();
        $user->update(['password' => $request->input('password'), 'token_version' => $user->token_version + 1]);
        $request->session()->put(EnsureApiUser::SESSION_TOKEN_VERSION, $user->token_version);

        Audit::log($request, ['action' => 'account.password_changed', 'actor' => $user, 'entity_type' => 'user', 'entity_id' => $user->cuid]);

        return $this->ok();
    }
}
