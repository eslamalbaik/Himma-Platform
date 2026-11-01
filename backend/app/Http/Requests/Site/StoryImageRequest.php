<?php

namespace App\Http\Requests\Site;

use App\Http\Requests\ApiRequest;

// A picture a member adds inside a story. Only real raster images, not SVG (it can carry scripts).
class StoryImageRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
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
