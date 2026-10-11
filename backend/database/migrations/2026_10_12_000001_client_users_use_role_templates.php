<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Client users now take their role from the client role templates (tenant_roles.key). The old single
// `tenant_admin` role becomes the template that matches the client: government entity for government clients,
// school / institution for everyone else. Both may manage their organisation's members.
return new class extends Migration
{
    public function up(): void
    {
        $governments = DB::table('tenants')->where('type', 'government')->pluck('id');

        DB::table('users')->where('role', 'tenant_admin')->whereIn('tenant_id', $governments)->update(['role' => 'government']);
        DB::table('users')->where('role', 'tenant_admin')->update(['role' => 'institution']);
    }

    public function down(): void
    {
        DB::table('users')->whereNotNull('tenant_id')->whereIn('role', ['institution', 'government'])->update(['role' => 'tenant_admin']);
    }
};
