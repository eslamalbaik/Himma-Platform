<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Seeder;

// Sample private conversations between the super admin, staff and client users, plus one open report.
// Needs StaffSeeder. Skipped when the conversation already has messages.
class MessagingSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::whereNull('tenant_id')->where('role', 'super_admin')->first();
        $by = fn (string $email) => User::where('email', $email)->first();

        $threads = [
            [$admin, $by('finance@himma.local'), [
                ['b', 'صباح الخير، فاتورة مدرسة الأمل متأخرة منذ أسبوعين.'],
                ['a', 'شكراً خالد. هل تواصلتم معهم؟'],
                ['b', 'أرسلنا تذكيراً بالبريد، وسأتصل بهم اليوم.'],
            ]],
            [$admin, $by('principal@alnoor.test'), [
                ['b', 'السلام عليكم، نرغب في الترقية إلى الخطة الاحترافية.'],
                ['a', 'وعليكم السلام، يسعدنا ذلك. سنرسل لكم فاتورة الترقية اليوم.'],
            ]],
            [$admin, $by('editor@himma.local'), [
                ['a', 'Reem, please review the two articles waiting for approval.'],
                ['b', 'On it, I will finish them before noon.'],
            ]],
            [$by('support@himma.local'), $by('office@alamal.test'), [
                ['a', 'مرحباً، حسابكم معلّق لعدم السداد. هل تحتاجون مساعدة في الدفع؟'],
                ['b', 'هذا غير مقبول، أنتم تضيعون وقتنا!!'],
            ]],
        ];

        $count = 0;
        foreach ($threads as [$a, $b, $lines]) {
            if (! $a || ! $b) {
                continue;
            }

            $conversation = Conversation::firstOrCreate(['pair_key' => Conversation::pairKey($a, $b)]);
            $conversation->participants()->syncWithoutDetaching([$a->id, $b->id]);
            if ($conversation->messages()->exists()) {
                continue;
            }

            $at = now()->subHours(count($lines) + 2);
            foreach ($lines as [$who, $body]) {
                $at = $at->copy()->addMinutes(37);
                $message = $conversation->messages()->create(['sender_id' => ($who === 'a' ? $a : $b)->id, 'body' => $body]);
                $message->forceFill(['created_at' => $at, 'updated_at' => $at])->saveQuietly();
            }
            $conversation->update(['last_message_at' => $at]);
            // The first person has read everything but the last reply, so the inbox shows an unread message.
            $conversation->participants()->updateExistingPivot($a->id, ['last_read_at' => $at->copy()->subMinute()]);
            $count++;

            // Support reports the rude reply from the suspended client.
            if ($a->email === 'support@himma.local') {
                $conversation->messages()->latest('id')->first()->reports()->create([
                    'reporter_id' => $a->id, 'reason' => 'offensive', 'details' => 'رد غير لائق على تنبيه الدفع.', 'status' => 'open',
                ]);
            }
        }

        $this->command->info("Conversations ready: {$count} new.");
    }
}
