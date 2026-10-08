<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PolicyFormRequest;
use App\Models\Policy;
use App\Models\PolicyVersion;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;

// Settings → Policies (REQUIREMENTS.md §7) and the public policies page. Every save that changes a policy
// becomes a new version; the public page only shows published ones.
class PolicyController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Policy::everyKind()->map(fn (Policy $policy) => $policy->toPublicArray())->values(),
        ])->header('Cache-Control', 'no-store');
    }

    public function update(PolicyFormRequest $request, string $kind)
    {
        $policy = Policy::firstOrNew(['kind' => $kind]);
        $wasPublished = (bool) $policy->is_published;
        $policy->fill($request->fields());

        if ($policy->exists && ! $policy->isDirty()) {
            return $this->item($policy->load('editor')->toPublicArray());
        }

        DB::transaction(function () use ($policy, $request, $wasPublished) {
            $policy->version = (int) $policy->version + 1;
            $policy->updated_by = $request->user()->id;
            if ($policy->is_published && ($policy->isDirty(['body_ar', 'body_en']) || ! $wasPublished)) {
                $policy->published_at = now();
            }
            $policy->save();

            PolicyVersion::create([
                'policy_id' => $policy->id,
                'version' => $policy->version,
                'body_ar' => $policy->body_ar,
                'body_en' => $policy->body_en,
                'is_published' => $policy->is_published,
                'edited_by' => $request->user()->id,
                'created_at' => now(),
            ]);
        });

        // The text itself stays in policy_versions; the audit row says who changed what and when.
        Audit::log($request, [
            'action' => 'policy.updated',
            'actor' => $request->user(),
            'entity_type' => 'policy',
            'entity_id' => $kind,
            'metadata' => ['version' => $policy->version, 'isPublished' => $policy->is_published],
        ]);

        return $this->item($policy->load('editor')->toPublicArray());
    }

    public function versions(string $kind)
    {
        $policy = Policy::where('kind', $kind)->first();

        return response()->json([
            'data' => $policy
                ? $policy->versions()->with('editor')->get()->map(fn (PolicyVersion $v) => $v->toPublicArray())->values()
                : [],
        ])->header('Cache-Control', 'no-store');
    }

    // Public: the published policies, both languages, in the order of Policy::KINDS.
    public function published()
    {
        $policies = Policy::where('is_published', true)->get()->keyBy('kind');

        return response()->json([
            'data' => collect(Policy::KINDS)->filter(fn ($kind) => isset($policies[$kind]))
                ->map(fn ($kind) => [
                    'kind' => $kind,
                    'bodyAr' => $policies[$kind]->body_ar,
                    'bodyEn' => $policies[$kind]->body_en,
                    'version' => $policies[$kind]->version,
                    'publishedAt' => optional($policies[$kind]->published_at)->toIso8601String(),
                ])->values(),
        ])->header('Cache-Control', 'public, max-age=60');
    }
}
