<?php

namespace App\Ai;

use Anthropic\Client;
use Psr\Http\Client\ClientInterface;

// Builds the Anthropic SDK client from the key in Settings → AI. Tests give it a fake HTTP transport.
class Claude
{
    public function __construct(private ?ClientInterface $transporter = null) {}

    public function client(string $apiKey): Client
    {
        $options = ['timeout' => 120.0, 'maxRetries' => 2];
        if ($this->transporter) {
            $options['transporter'] = $this->transporter;
        }

        return new Client(apiKey: $apiKey, requestOptions: $options);
    }
}
