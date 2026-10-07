<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// A billing alert that was sent (BillingNotifier). Unique on (kind, subject_key).
class BillingNotice extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['tenant_id', 'kind', 'subject_key', 'recipients'];

    protected function casts(): array
    {
        return ['recipients' => 'array'];
    }
}
