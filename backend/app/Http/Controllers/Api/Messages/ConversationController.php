<?php

namespace App\Http\Controllers\Api\Messages;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messages\MessageFormRequest;
use App\Http\Requests\Messages\StartConversationFormRequest;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\UserBlock;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// The signed-in user's private conversations (MSG-01, MSG-03). Only participants can open a
// conversation: anyone else gets 404, platform staff included (MSG-06).
class ConversationController extends Controller
{
    private const PAGE = 50;

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Conversation::for($user)->with('participants.tenant')->whereNotNull('last_message_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->whereHas('participants', fn ($q) => $q->where('users.id', '!=', $user->id)
                ->where(fn ($p) => $p->where('name_ar', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%")));
        }

        $conversations = $query->orderByDesc('last_message_at')->limit(100)->get();
        $data = $conversations->map(fn (Conversation $c) => $c->toPublicArrayFor($user))->values();

        return response()->json([
            'data' => $data,
            'meta' => ['unread' => $data->sum('unread')],
        ])->header('Cache-Control', 'no-store');
    }

    // Active people the user can write to: staff and client users, not blocked either way.
    public function recipients(Request $request)
    {
        $user = $request->user();
        $search = trim((string) $request->query('search', ''));

        $blocked = UserBlock::where('blocker_id', $user->id)->pluck('blocked_id')
            ->merge(UserBlock::where('blocked_id', $user->id)->pluck('blocker_id'));

        $people = User::with('tenant')->where('status', 'active')->whereKeyNot($user->id)->whereNotIn('id', $blocked)
            ->when($search, fn ($q) => $q->where(fn ($p) => $p->where('name_ar', 'like', "%{$search}%")
                ->orWhere('name_en', 'like', "%{$search}%")
                ->orWhereHas('tenant', fn ($t) => $t->where('name_ar', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%"))))
            ->orderBy('name_en')->limit(20)->get();

        return $this->item($people->map(fn (User $p) => Message::personArray($p))->values()->all());
    }

    // Opens (or reuses) the conversation with `userId` and sends the first message.
    public function store(StartConversationFormRequest $request)
    {
        $user = $request->user();
        $other = User::where('cuid', $request->input('userId'))->first();

        if ($other->id === $user->id || $other->status !== 'active') {
            return $this->error('invalid_recipient', 422);
        }
        if (UserBlock::between($user, $other)) {
            return $this->error('messaging_blocked', 403);
        }

        $conversation = DB::transaction(function () use ($user, $other) {
            $conversation = Conversation::firstOrCreate(['pair_key' => Conversation::pairKey($user, $other)]);
            $conversation->participants()->syncWithoutDetaching([$user->id, $other->id]);

            return $conversation;
        });

        $message = $this->send($request, $conversation, $user);

        return $this->item([
            'conversation' => $conversation->fresh()->load('participants.tenant')->toPublicArrayFor($user),
            'message' => $message->toPublicArrayFor($user),
        ], 201);
    }

    // Messages, newest page first; `before` (a message id) loads older ones. Marks the conversation read.
    public function show(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        if (! $conversation->hasParticipant($user)) {
            return $this->error('not_found', 404);
        }
        $conversation->load('participants.tenant');

        $query = $conversation->messages()->with(['sender', 'reports'])->orderByDesc('id');
        if ($before = $request->query('before')) {
            $beforeId = Message::where('cuid', $before)->where('conversation_id', $conversation->id)->value('id');
            $query->where('id', '<', $beforeId ?? 0);
        }
        $messages = $query->limit(self::PAGE + 1)->get();
        $hasMore = $messages->count() > self::PAGE;

        $summary = $conversation->toPublicArrayFor($user);
        if ($summary['unread'] > 0 && ! $before) {
            $conversation->participants()->updateExistingPivot($user->id, ['last_read_at' => now()]);
            Audit::log($request, [
                'action' => 'conversation.read', 'actor' => $user,
                'entity_type' => 'conversation', 'entity_id' => $conversation->cuid,
                'metadata' => ['unread' => $summary['unread']],
            ]);
            $summary['unread'] = 0;
        }

        return $this->item([
            'conversation' => $summary,
            'messages' => $messages->take(self::PAGE)->reverse()->map(fn (Message $m) => $m->toPublicArrayFor($user))->values()->all(),
            'hasMore' => $hasMore,
        ]);
    }

    public function reply(MessageFormRequest $request, Conversation $conversation)
    {
        $user = $request->user();
        if (! $conversation->hasParticipant($user)) {
            return $this->error('not_found', 404);
        }
        $other = $conversation->load('participants')->otherParticipant($user);
        if (! $other || $other->status !== 'active') {
            return $this->error('invalid_recipient', 422);
        }
        if (UserBlock::between($user, $other)) {
            return $this->error('messaging_blocked', 403);
        }

        return $this->item($this->send($request, $conversation, $user)->toPublicArrayFor($user), 201);
    }

    private function send(Request $request, Conversation $conversation, User $user): Message
    {
        $message = DB::transaction(function () use ($request, $conversation, $user) {
            $message = $conversation->messages()->create(['sender_id' => $user->id, 'body' => $request->input('body')]);
            $conversation->update(['last_message_at' => $message->created_at]);
            // The sender has read everything up to their own message.
            $conversation->participants()->updateExistingPivot($user->id, ['last_read_at' => $message->created_at]);

            return $message;
        });

        // The body is private (MSG-06): the audit row records that a message was sent, not what it says.
        Audit::log($request, [
            'action' => 'message.sent', 'actor' => $user,
            'entity_type' => 'conversation', 'entity_id' => $conversation->cuid,
            'metadata' => ['message' => $message->cuid, 'length' => mb_strlen($message->body)],
        ]);

        return $message->setRelation('reports', collect());
    }
}
