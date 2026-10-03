<?php

namespace App\Http\Controllers\Api\Billing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\PlanFormRequest;
use App\Models\Plan;
use App\Support\Audit;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    public function index(Request $request)
    {
        $query = Plan::withCount('subscriptions');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('name_ar', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%"));
        }

        if (in_array($active = $request->query('active'), ['true', 'false'], true)) {
            $query->where('is_active', $active === 'true');
        }

        return $this->paginated(
            $query->orderByDesc('is_active')->orderBy('price')->paginate($this->perPage($request)),
            fn (Plan $plan) => $plan->toPublicArray()
        );
    }

    public function store(PlanFormRequest $request)
    {
        $plan = Plan::create($request->fields());

        Audit::log($request, [
            'action' => 'plan.created',
            'actor' => $request->user(),
            'entity_type' => 'plan',
            'entity_id' => $plan->cuid,
            'metadata' => ['nameEn' => $plan->name_en, 'price' => (float) $plan->price, 'currency' => $plan->currency],
        ]);

        return $this->item($plan->toPublicArray(), 201);
    }

    // A new price applies to invoices issued from now on; issued invoices keep their amount.
    public function update(PlanFormRequest $request, Plan $plan)
    {
        $plan->update($request->fields());

        Audit::log($request, [
            'action' => 'plan.updated',
            'actor' => $request->user(),
            'entity_type' => 'plan',
            'entity_id' => $plan->cuid,
            'metadata' => ['price' => (float) $plan->price, 'isActive' => $plan->is_active],
        ]);

        return $this->item($plan->loadCount('subscriptions')->toPublicArray());
    }

    // A plan with subscriptions cannot be deleted; deactivate it instead.
    public function destroy(Request $request, Plan $plan)
    {
        if ($plan->subscriptions()->exists()) {
            return $this->error('plan_in_use', 409);
        }

        $cuid = $plan->cuid;
        $plan->delete();

        Audit::log($request, ['action' => 'plan.deleted', 'actor' => $request->user(), 'entity_type' => 'plan', 'entity_id' => $cuid]);

        return $this->ok();
    }
}
