<?php

use App\Models\RoleTemplate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

// Roles offered to clients, members and the public (REQUIREMENTS.md §10), with the eight system roles of §10.1.
return new class extends Migration
{
    private const DESCRIPTIONS = [
        'visitor' => ['يتصفح المحتوى العام دون حساب.', 'Browses public content without an account.'],
        'member' => ['عضو مسجل يقرأ ويتفاعل، ونشره يخضع للمراجعة.', 'A registered member who reads and takes part; anything they publish is reviewed.'],
        'writer' => ['كاتب موثّق يرسل مقالاته للمراجعة.', 'A verified writer who submits articles for review.'],
        'editor' => ['يراجع المحتوى ويعتمد النشر، ويرى جزءاً من المحتوى المقيد.', 'Reviews content and approves publication, with partial access to restricted content.'],
        'institution' => ['حساب مدرسة أو مؤسسة يدير أعضاءه ومحتواه.', 'A school or institution account that manages its members and content.'],
        'government' => ['حساب جهة حكومية يصل إلى محتواها وتقاريرها.', 'A government entity account with access to its content and reports.'],
        'association_supervisor' => ['مشرف من الجمعية يتابع المنصة كاملة.', 'An association supervisor who oversees the whole platform.'],
        'system_admin' => ['مسؤول النظام بكامل الصلاحيات.', 'The system administrator, with every permission.'],
    ];

    public function up(): void
    {
        Schema::create('role_templates', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('key', 80)->unique(); // what users.role holds; custom roles: custom_<english name>
            $table->string('name_ar');
            $table->string('name_en');
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->string('type', 10)->default('custom'); // system | custom
            $table->json('permissions'); // { permission: allowed | restricted | denied }
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        $order = 0;
        foreach (RoleTemplate::SYSTEM_ROLES as $key => [$nameAr, $nameEn, $states]) {
            DB::table('role_templates')->insert([
                'cuid' => (string) Str::ulid(),
                'key' => $key,
                'name_ar' => $nameAr,
                'name_en' => $nameEn,
                'description_ar' => self::DESCRIPTIONS[$key][0],
                'description_en' => self::DESCRIPTIONS[$key][1],
                'type' => 'system',
                'permissions' => json_encode(RoleTemplate::decode($states)),
                'sort_order' => $order++,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('role_templates');
    }
};
