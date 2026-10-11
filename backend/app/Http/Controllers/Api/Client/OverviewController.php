<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Invoice;
use App\Models\User;
use App\Support\ClientAccess;
use Illuminate\Http\Request;

// Client dashboard home: the organisation, its current subscription and a few counts. Everything is limited to
// the signed-in user's own organisation; the subscription and invoices only for roles that run the organisation's
// account (`general_settings` allowed), and are null for everyone else.
class OverviewController extends Controller
{
    public function __invoke(Request $request)
    {
        $tenant = $request->user()->tenant;
        $billing = ClientAccess::allowed($request->user(), 'general_settings');

        $subscription = $tenant->subscriptions()->with('plan')
            ->orderByRaw("status = 'cancelled'")->orderByDesc('starts_at')->first();

        $members = User::where('tenant_id', $tenant->id)
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $articles = Article::where('tenant_id', $tenant->id)
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $unpaid = $billing ? Invoice::where('tenant_id', $tenant->id)->where('status', 'unpaid')->get() : collect();

        return $this->item([
            'tenant' => [
                'id' => $tenant->cuid,
                'nameAr' => $tenant->name_ar,
                'nameEn' => $tenant->name_en,
                'type' => $tenant->type,
                'status' => $tenant->status,
                'billingEmail' => $tenant->billing_email,
            ],
            'subscription' => $billing ? $subscription?->toPublicArray() : null,
            'members' => [
                'active' => (int) ($members['active'] ?? 0),
                'disabled' => (int) ($members['disabled'] ?? 0),
            ],
            'articles' => collect(Article::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($articles[$s] ?? 0)]),
            'invoices' => ! $billing ? null : [
                'unpaid' => $unpaid->count(),
                'overdue' => $unpaid->filter(fn (Invoice $i) => $i->due_at?->lt(today()))->count(),
                'outstanding' => round($unpaid->sum(fn (Invoice $i) => $i->balance()), 2),
                'currency' => $unpaid->first()?->currency ?? $subscription?->plan?->currency,
            ],
        ]);
    }
}
