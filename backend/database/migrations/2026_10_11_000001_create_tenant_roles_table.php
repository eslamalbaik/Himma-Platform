<?php

use App\Support\TenantPermissions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

// Role templates for client (tenant) dashboards (REQUIREMENTS.md §10): the eight system roles and any
// custom ones, each with its permissions matrix. The system roles are inserted here so every
// environment has them, not only local ones that ran the seeders.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_roles', function (Blueprint $table) {
            $table->id();
            $table->string('cuid')->unique();
            $table->string('key')->unique(); // stable code, also the value of users.role for this role
            $table->string('name_ar');
            $table->string('name_en');
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->string('type')->default('custom'); // system | custom
            $table->json('permissions'); // {permission: allowed|restricted|denied}
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        $order = 0;
        foreach (TenantPermissions::systemDefaults() as $key => $matrix) {
            $names = config("tenant_permissions.system_role_names.$key");
            DB::table('tenant_roles')->insert([
                'cuid' => (string) Str::ulid(),
                'key' => $key,
                'name_ar' => $names['ar'],
                'name_en' => $names['en'],
                'type' => 'system',
                'permissions' => json_encode($matrix),
                'sort_order' => ++$order,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_roles');
    }
};
