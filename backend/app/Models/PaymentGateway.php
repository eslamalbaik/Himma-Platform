<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// A payment provider configured from the dashboard (Settings → Billing). `driver` picks the code
// that talks to it (App\Billing\Gateways). Secrets are encrypted at rest and never leave the server.
class PaymentGateway extends Model
{
    use HasCuid;

    public const DRIVERS = ['ziina', 'manual'];

    public const SECRETS = ['api_key', 'api_secret', 'public_key', 'webhook_secret'];

    protected $fillable = [
        'driver',
        'name_ar',
        'name_en',
        'description_ar',
        'description_en',
        'api_key',
        'api_secret',
        'public_key',
        'webhook_secret',
        'base_url',
        'is_active',
        'test_mode',
        'sort_order',
    ];

    protected $hidden = self::SECRETS;

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'api_secret' => 'encrypted',
            'public_key' => 'encrypted',
            'webhook_secret' => 'encrypted',
            'is_active' => 'boolean',
            'test_mode' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'gateway_id');
    }

    public function isOnline(): bool
    {
        return $this->driver !== 'manual';
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'driver' => $this->driver,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'descriptionAr' => $this->description_ar,
            'descriptionEn' => $this->description_en,
            // Only whether each secret is set; the values stay on the server.
            'hasApiKey' => filled($this->api_key),
            'hasApiSecret' => filled($this->api_secret),
            'hasPublicKey' => filled($this->public_key),
            'hasWebhookSecret' => filled($this->webhook_secret),
            'baseUrl' => $this->base_url,
            'isActive' => $this->is_active,
            'testMode' => $this->test_mode,
            'sortOrder' => $this->sort_order,
            'paymentsCount' => $this->payments_count ?? null,
        ];
    }
}
