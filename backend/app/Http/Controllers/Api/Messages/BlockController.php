<?php

namespace App\Http\Controllers\Api\Messages;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messages\BlockFormRequest;
use App\Models\User;
use App\Models\UserBlock;
use App\Support\Audit;
use Illuminate\Http\Request;

// Blocking someone stops messages both ways until it is lifted (MSG-04).
class BlockController extends Controller
{
    public function store(BlockFormRequest $request)
    {
        $user = $request->user();
        $other = User::where('cuid', $request->input('userId'))->first();
        if ($other->id === $user->id) {
            return $this->error('invalid_recipient', 422);
        }

        UserBlock::firstOrCreate(['blocker_id' => $user->id, 'blocked_id' => $other->id]);
        $this->audit($request, 'user.blocked', $other);

        return $this->ok();
    }

    public function destroy(Request $request, string $cuid)
    {
        $other = User::where('cuid', $cuid)->first();
        if (! $other) {
            return $this->error('not_found', 404);
        }

        UserBlock::where('blocker_id', $request->user()->id)->where('blocked_id', $other->id)->delete();
        $this->audit($request, 'user.unblocked', $other);

        return $this->ok();
    }

    private function audit(Request $request, string $action, User $other): void
    {
        Audit::log($request, [
            'action' => $action, 'actor' => $request->user(), 'entity_type' => 'user', 'entity_id' => $other->cuid,
        ]);
    }
}
