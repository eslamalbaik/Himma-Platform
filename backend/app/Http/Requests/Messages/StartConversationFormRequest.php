<?php

namespace App\Http\Requests\Messages;

// The first message to someone: the recipient (`userId`, a user's public id) and the body.
class StartConversationFormRequest extends MessageFormRequest
{
    public function rules(): array
    {
        return ['userId' => ['required', 'string', 'exists:users,cuid']] + parent::rules();
    }
}
