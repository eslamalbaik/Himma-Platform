<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

// A request for the verified badge, for the person or for their organization.
class VerificationFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'subject' => ['required', Rule::in(['person', 'organization'])],
            'evidence' => ['required', 'string', 'min:10', 'max:2000'],
        ];
    }

    protected function codes(): array
    {
        return ['subject' => 'invalid_verification_subject', 'evidence' => 'verification_evidence_required'];
    }
}
