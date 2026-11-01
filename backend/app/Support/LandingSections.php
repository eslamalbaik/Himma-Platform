<?php

namespace App\Support;

use App\Models\Plan;
use App\Models\Setting;
use App\Models\Testimonial;

// Texts and on/off switch of the landing page sections that admins control (pricing, testimonials).
class LandingSections
{
    public const KEYS = ['pricing', 'testimonials'];

    public static function defaults(string $key): array
    {
        return match ($key) {
            'pricing' => [
                'enabled' => true,
                'chipAr' => 'الباقات والأسعار', 'chipEn' => 'Plans & pricing',
                'titleAr' => 'اختر الباقة المناسبة لك', 'titleEn' => 'Choose the plan that fits you',
                'subtitleAr' => 'باقات مرنة تنمو مع أكاديميتك.', 'subtitleEn' => 'Flexible plans that grow with your academy.',
            ],
            'testimonials' => [
                'enabled' => true,
                'chipAr' => 'آراء طلابنا', 'chipEn' => 'Student reviews',
                'titleAr' => 'ما يقوله طلابنا', 'titleEn' => 'What our students say',
                'subtitleAr' => 'اقرأ شهادات طلابنا الراضين حول العالم', 'subtitleEn' => 'Read what our satisfied students say around the world',
            ],
        };
    }

    public static function get(string $key): array
    {
        return Setting::group("landing_$key", self::defaults($key));
    }

    public static function put(string $key, array $values): void
    {
        Setting::putGroup("landing_$key", $values);
    }

    // Everything the public landing page needs; a section that is off or empty comes back as null.
    public static function publicPayload(): array
    {
        $pricing = self::get('pricing');
        $plans = $pricing['enabled']
            ? Plan::where('is_active', true)->where('show_on_site', true)->orderBy('site_order')->orderBy('id')->get()
                ->map->toLandingArray()->values()
            : collect();

        $testimonials = self::get('testimonials');
        $items = $testimonials['enabled']
            ? Testimonial::where('is_visible', true)->orderBy('sort_order')->orderBy('id')->get()->map->toPublicArray()->values()
            : collect();

        return [
            'pricing' => $plans->isEmpty() ? null : ['settings' => $pricing, 'plans' => $plans],
            'testimonials' => $items->isEmpty() ? null : ['settings' => $testimonials, 'items' => $items],
        ];
    }
}
