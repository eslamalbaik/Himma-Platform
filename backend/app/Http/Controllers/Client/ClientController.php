<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;

// Base for the client dashboard API (/api/client/*, guarded by `client`). Everything a client controller reads or
// changes goes through tenant(), so one client never sees another's records: a foreign record answers 404.
abstract class ClientController extends Controller
{
    protected function tenant(Request $request): Tenant
    {
        return $request->user()->tenant;
    }
}
