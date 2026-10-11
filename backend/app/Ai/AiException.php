<?php

namespace App\Ai;

use RuntimeException;

// A failed AI Center request, as an API error code and HTTP status.
class AiException extends RuntimeException
{
    public function __construct(public readonly string $errorCode, public readonly int $status)
    {
        parent::__construct($errorCode);
    }
}
