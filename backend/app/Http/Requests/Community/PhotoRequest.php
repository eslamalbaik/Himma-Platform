<?php

namespace App\Http\Requests\Community;

use App\Http\Requests\ApiRequest;

// A profile picture or an organization logo. Only real raster images, not SVG (it can carry scripts).
class PhotoRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    protected function codes(): array
    {
        return [
            'file' => 'invalid_image',
            'file.max' => 'image_too_large',
        ];
    }
}
