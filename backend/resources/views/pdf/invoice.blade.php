<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: dejavusans; font-size: 10.5pt; color: #262626; }
    .head { border-bottom: 2px solid #5F0118; padding-bottom: 6px; margin-bottom: 10px; }
    .section { margin-bottom: 18px; }
    h1 { font-size: 16pt; color: #5F0118; margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 5px 6px; border-bottom: 1px solid #e3e3e3; }
    th { background: #f4ecee; color: #5F0118; font-weight: bold; }
    .label { color: #6b6b6b; width: 35%; }
    .total td { font-weight: bold; }
    .muted { color: #6b6b6b; font-size: 9pt; }
    .divider { border-top: 1px dashed #bdbdbd; margin: 14px 0; }
</style>
</head>
<body>
<div class="head">
    @if ($logo)
        <img src="{{ $logo }}" style="height: 48px;">
    @endif
</div>

@foreach ($sections as $i => $s)
    @if ($i > 0)
        <div class="divider"></div>
    @endif
    <div class="section" dir="{{ $s['dir'] }}" lang="{{ $s['locale'] }}" style="text-align: {{ $s['align'] }};">
        <h1>{{ $s['title'] }}</h1>
        <div class="muted">{{ $s['platform'] }}</div>

        <table dir="{{ $s['dir'] }}" style="margin-top: 8px;">
            @foreach ($s['rows'] as [$label, $value])
                <tr>
                    <td class="label" style="text-align: {{ $s['align'] }};">{{ $label }}</td>
                    <td style="text-align: {{ $s['align'] }};">{{ $value }}</td>
                </tr>
            @endforeach
        </table>

        <table dir="{{ $s['dir'] }}" style="margin-top: 10px;">
            @foreach ($s['totals'] as $j => [$label, $value])
                <tr class="{{ $j === 2 ? 'total' : '' }}">
                    <td class="label" style="text-align: {{ $s['align'] }};">{{ $label }}</td>
                    <td style="text-align: {{ $s['align'] }};">{{ $value }}</td>
                </tr>
            @endforeach
        </table>

        @if (count($s['payments']))
            <p style="margin: 12px 0 4px; font-weight: bold;">{{ $s['paymentsTitle'] }}</p>
            <table dir="{{ $s['dir'] }}">
                <tr>
                    @foreach ($s['paymentHeaders'] as $header)
                        <th style="text-align: {{ $s['align'] }};">{{ $header }}</th>
                    @endforeach
                </tr>
                @foreach ($s['payments'] as $row)
                    <tr>
                        @foreach ($row as $cell)
                            <td style="text-align: {{ $s['align'] }};">{{ $cell }}</td>
                        @endforeach
                    </tr>
                @endforeach
            </table>
        @endif

        <p class="muted" style="margin-top: 10px;">{{ $s['footer'] }}</p>
    </div>
@endforeach
</body>
</html>
