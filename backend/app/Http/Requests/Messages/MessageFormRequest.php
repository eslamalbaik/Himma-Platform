<?php

namespace App\Http\Requests\Messages;

use App\Http\Requests\ApiRequest;
use App\Models\Message;

// A message body (StartConversationFormRequest adds the recipient).
class MessageFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return ['body' => ['required', 'string', 'max:'.Message::MAX_LENGTH]];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('body'))) {
            $this->merge(['body' => trim($this->input('body'))]);
        }
    }

    protected function codes(): array
    {
        return ['body' => 'invalid_message_body', 'userId' => 'invalid_recipient'];
    }
}
