<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Http\Request;

class PlatformSettingController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'read', 'settings')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        return response()->json(['data' => PlatformSetting::current()->toPublicArray()])->header('Cache-Control', 'no-store');
    }

    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => ['code' => 'unauthenticated']], 401);
        }
        if (!Ability::can($user->role, 'update', 'settings')) {
            return response()->json(['error' => ['code' => 'forbidden']], 403);
        }

        $nameAr = trim((string) $request->input('platformNameAr', ''));
        $nameEn = trim((string) $request->input('platformNameEn', ''));
        $locale = $request->input('defaultLocale');
        $supportEmail = trim((string) $request->input('supportEmail', ''));

        if ($nameAr === '' || mb_strlen($nameAr) > 255 || $nameEn === '' || mb_strlen($nameEn) > 255) {
            return response()->json(['error' => ['code' => 'invalid_platform_name']], 422);
        }
        if (!in_array($locale, ['ar', 'en'], true)) {
            return response()->json(['error' => ['code' => 'invalid_locale']], 422);
        }
        if ($supportEmail !== '' && !filter_var($supportEmail, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['error' => ['code' => 'invalid_email']], 422);
        }

        $settings = PlatformSetting::current();
        $settings->update([
            'platform_name_ar' => $nameAr,
            'platform_name_en' => $nameEn,
            'default_locale' => $locale,
            'support_email' => $supportEmail !== '' ? $supportEmail : null,
            'maintenance_mode' => $request->boolean('maintenanceMode'),
        ]);

        Audit::log($request, [
            'action' => 'settings.updated',
            'actor' => $user,
            'entity_type' => 'platform_settings',
            'entity_id' => (string) $settings->id,
        ]);

        return response()->json(['data' => $settings->fresh()->toPublicArray()]);
    }
}
