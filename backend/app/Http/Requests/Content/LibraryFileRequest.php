<?php

namespace App\Http\Requests\Content;

use App\Http\Requests\ApiRequest;

// A library item's cover (a raster image, not SVG) or its file (PDF or EPUB, up to 50 MB).
class LibraryFileRequest extends ApiRequest
{
    public function rules(): array
    {
        return $this->route('what') === 'cover'
            ? ['file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]
            : ['file' => ['required', 'file', 'mimes:pdf,epub', 'max:51200']];
    }

    protected function codes(): array
    {
        return $this->route('what') === 'cover'
            ? ['file' => 'invalid_image', 'file.max' => 'image_too_large']
            : ['file' => 'invalid_library_file', 'file.max' => 'library_file_too_large'];
    }
}
