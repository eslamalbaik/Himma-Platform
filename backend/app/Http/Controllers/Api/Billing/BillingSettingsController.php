<?php

namespace App\Http\Controllers\Api\Billing;

use App\Billing\BillingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\BillingSettingsFormRequest;
use App\Models\Setting;
use App\Support\Audit;

class BillingSettingsController extends Controller
{
    public function show()
    {
        return $this->item(BillingService::settings());
    }

    public function update(BillingSettingsFormRequest $request)
    {
        Setting::putGroup('billing', $request->fields());

        Audit::log($request, [
            'action' => 'settings.billing_updated',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'billing',
            'metadata' => $request->fields(),
        ]);

        return $this->item(BillingService::settings());
    }
}
