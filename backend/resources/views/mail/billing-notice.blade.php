<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f6f6f6;font-family:Tahoma,Arial,sans-serif;color:#262626">
@foreach ($sections as $section)
    <div dir="{{ $section['dir'] }}" lang="{{ $section['locale'] }}"
         style="max-width:600px;margin:0 auto 16px;padding:24px;background:#ffffff;border-radius:8px;text-align:{{ $section['dir'] === 'rtl' ? 'right' : 'left' }};line-height:1.8">
        <p style="margin:0 0 12px;font-weight:bold;color:#5F0118">{{ $section['greeting'] }}</p>
        <p style="margin:0 0 16px">{{ $section['body'] }}</p>
        <p style="margin:0;color:#6b6b6b;font-size:13px">{{ $section['footer'] }}</p>
    </div>
@endforeach
</body>
</html>
