<?php

namespace App\Http\Controllers\Api\Settings;

use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\NotFoundException;
use Anthropic\Core\Exceptions\PermissionDeniedException;
use App\Ai\Claude;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AiSettingsFormRequest;
use App\Models\Setting;
use App\Settings\Ai;
use App\Settings\Secrets;
use App\Support\Audit;
use Illuminate\Http\Request;

// Settings → AI.
class AiSettingsController extends Controller
{
    public function show()
    {
        return $this->item(Ai::toPublicArray());
    }

    public function update(AiSettingsFormRequest $request)
    {
        $before = Ai::all();
        $values = $request->fields();
        if ($values['model'] !== $before['model']) {
            $values += ['modelName' => '', 'checkedAt' => null];
        }

        $keyChange = null;
        if ($request->boolean('clearApiKey')) {
            $values += ['apiKey' => null, 'modelName' => '', 'checkedAt' => null];
            $keyChange = 'cleared';
        } elseif ($request->filled('apiKey')) {
            $values += ['apiKey' => Secrets::seal(trim($request->input('apiKey'))), 'modelName' => '', 'checkedAt' => null];
            $keyChange = 'replaced';
        }

        Setting::putGroup('ai', $values);

        Audit::log($request, [
            'action' => 'settings.ai_updated',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'ai',
            // Never the key itself.
            'metadata' => array_filter($request->fields() + ['apiKey' => $keyChange], fn ($v) => $v !== null),
        ]);

        return $this->item(Ai::toPublicArray());
    }

    // Checks the key and the chosen model with the Models API (no tokens are spent).
    public function test(Request $request, Claude $claude)
    {
        $settings = Ai::all();
        $key = Ai::apiKey();
        if (! $key) {
            return $this->error('ai_not_configured', 409);
        }

        try {
            $model = $claude->client($key)->models->retrieve($settings['model']);
        } catch (NotFoundException $e) {
            return $this->error('ai_model_unavailable', 422);
        } catch (AuthenticationException|PermissionDeniedException $e) {
            return $this->error('ai_key_rejected', 422);
        } catch (APIStatusException $e) {
            report($e);

            return $this->error('ai_provider_error', 502);
        } catch (APIConnectionException $e) {
            report($e);

            return $this->error('ai_unreachable', 502);
        }

        Setting::putGroup('ai', ['modelName' => $model->displayName, 'checkedAt' => now()->toIso8601String()]);
        Audit::log($request, [
            'action' => 'settings.ai_checked',
            'actor' => $request->user(),
            'entity_type' => 'settings',
            'entity_id' => 'ai',
            'metadata' => ['model' => $settings['model']],
        ]);

        return $this->item(Ai::toPublicArray());
    }
}
