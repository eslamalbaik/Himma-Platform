<?php

namespace App\Http\Controllers\Api\Billing;

use App\Billing\BillingService;
use App\Billing\Gateways\GatewayException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\GatewayFormRequest;
use App\Models\PaymentGateway;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Payment gateways (Settings → Billing). Only one gateway per driver can be active,
// because the webhook URL (/api/billing/webhook/{driver}) identifies the gateway by its driver.
class GatewayController extends Controller
{
    public function __construct(private BillingService $billing) {}

    public function index()
    {
        $gateways = PaymentGateway::withCount('payments')->orderBy('sort_order')->orderBy('id')->get();

        return response()->json([
            'data' => $gateways->map(fn (PaymentGateway $g) => $g->toPublicArray() + ['webhookUrl' => $this->webhookUrl($g)]),
            'meta' => ['total' => $gateways->count()],
        ])->header('Cache-Control', 'no-store');
    }

    public function store(GatewayFormRequest $request)
    {
        $gateway = DB::transaction(function () use ($request) {
            $gateway = PaymentGateway::create($request->fields());
            $this->keepOneActivePerDriver($gateway);

            return $gateway;
        });

        $this->audit($request, 'payment_gateway.created', $gateway, $request->changedSecrets());

        return $this->item($gateway->toPublicArray() + ['webhookUrl' => $this->webhookUrl($gateway)], 201);
    }

    public function update(GatewayFormRequest $request, PaymentGateway $gateway)
    {
        DB::transaction(function () use ($request, $gateway) {
            $gateway->update($request->fields());
            $this->keepOneActivePerDriver($gateway);
        });

        $this->audit($request, 'payment_gateway.updated', $gateway, $request->changedSecrets());

        return $this->item($gateway->loadCount('payments')->toPublicArray() + ['webhookUrl' => $this->webhookUrl($gateway)]);
    }

    public function destroy(Request $request, PaymentGateway $gateway)
    {
        if ($gateway->payments()->exists()) {
            return $this->error('gateway_in_use', 409);
        }

        $gateway->delete();
        $this->audit($request, 'payment_gateway.deleted', $gateway);

        return $this->ok();
    }

    // Tells the provider to send its webhooks to this platform (with the stored webhook secret).
    public function registerWebhook(Request $request, PaymentGateway $gateway)
    {
        try {
            $this->billing->driver($gateway)->registerWebhook($gateway, $this->webhookUrl($gateway));
        } catch (GatewayException $e) {
            report($e);

            return $this->error($e->errorCode, $e->errorCode === 'gateway_not_online' ? 409 : 502);
        }

        $this->audit($request, 'payment_gateway.webhook_registered', $gateway);

        return $this->ok();
    }

    private function keepOneActivePerDriver(PaymentGateway $gateway): void
    {
        if ($gateway->is_active) {
            PaymentGateway::where('driver', $gateway->driver)->whereKeyNot($gateway->id)->update(['is_active' => false]);
        }
    }

    private function webhookUrl(PaymentGateway $gateway): ?string
    {
        // Through the frontend's /api proxy; the trailing slash avoids the frontend's 308 redirect.
        return $gateway->isOnline() ? rtrim(config('app.frontend_url'), '/')."/api/billing/webhook/{$gateway->driver}/" : null;
    }

    private function audit(Request $request, string $action, PaymentGateway $gateway, array $changedSecrets = []): void
    {
        Audit::log($request, [
            'action' => $action,
            'actor' => $request->user(),
            'entity_type' => 'payment_gateway',
            'entity_id' => $gateway->cuid,
            // Which secrets changed, never their values.
            'metadata' => ['driver' => $gateway->driver, 'isActive' => $gateway->is_active, 'testMode' => $gateway->test_mode, 'secretsChanged' => $changedSecrets],
        ]);
    }
}
