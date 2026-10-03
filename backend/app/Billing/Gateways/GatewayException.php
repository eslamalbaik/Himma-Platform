<?php

namespace App\Billing\Gateways;

use RuntimeException;

// A payment provider refused or could not be reached. `code` is an API error code for the browser.
class GatewayException extends RuntimeException
{
    public function __construct(public readonly string $errorCode, string $detail = '')
    {
        parent::__construct($detail !== '' ? $detail : $errorCode);
    }
}
