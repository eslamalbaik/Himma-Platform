<?php

namespace App\Support;

use App\Models\Article;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

// Hinnah has two language communities, `ar` and `en` (CLAUDE.md, "Language communities").
// The browser says which one a request is about in the `X-Community` header: the `/en` path on
// the public site, the community switcher in the dashboard. Members belong to one community;
// staff have none (both) unless they were limited to one, and then they always get theirs.
final class Community
{
    public const ALL = ['ar', 'en'];

    public const HEADER = 'X-Community';

    public static function current(Request $request): string
    {
        $user = $request->user();
        if ($user && self::isStaff($user) && $user->community) {
            return $user->community;
        }

        $asked = $request->header(self::HEADER);

        return in_array($asked, self::ALL, true) ? $asked : 'ar';
    }

    // The community a member writes into: always their own.
    public static function ofMember(User $user): string
    {
        return $user->community ?? $user->tenant?->community ?? 'ar';
    }

    // Two people can write to and follow each other when they share a community. Staff of both
    // communities (community null) can reach everyone.
    public static function canMeet(User $a, ?string $community): bool
    {
        return $a->community === null || $community === null || $a->community === $community;
    }

    public static function isStaff(User $user): bool
    {
        return array_key_exists($user->role, config('roles.platform_roles'));
    }

    // Limits a query to the request's community (`language` on articles, `community` elsewhere).
    public static function scope(Builder $query, Request $request, string $column = 'community'): Builder
    {
        return $query->where($query->getModel()->qualifyColumn($column), self::current($request));
    }

    // The community a record belongs to: `language` on articles (and on what hangs off an article or an
    // event), `community` elsewhere; null for records both communities share (plans, sections, ...).
    public static function of(mixed $record): ?string
    {
        if (! $record instanceof Model) {
            return null;
        }
        $attributes = $record->getAttributes();
        if (array_key_exists('community', $attributes)) {
            return $attributes['community'];
        }
        if ($record instanceof Article) {
            return $record->language;
        }
        if (array_key_exists('article_id', $attributes)) {
            return $record->article?->language;
        }
        if (array_key_exists('event_id', $attributes)) {
            return $record->event?->community;
        }
        if (array_key_exists('requested_by', $attributes)) {
            return $record->requester?->community;
        }

        return null;
    }

    // Staff limited to one community cannot open or change a record of the other one (EnsureCommunity
    // answers 404, like a record that does not exist). Staff of both communities may.
    public static function allows(User $user, mixed $record): bool
    {
        $community = self::of($record);

        return ! (self::isStaff($user) && $user->community && $community !== null && $community !== $user->community);
    }
}
