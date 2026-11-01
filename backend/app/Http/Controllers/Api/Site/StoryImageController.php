<?php

namespace App\Http\Controllers\Api\Site;

use App\Http\Controllers\Controller;
use App\Http\Requests\Site\StoryImageRequest;
use App\Models\Media;
use App\Support\Audit;

// Pictures inside a member's story (`POST /api/me/media`). The file goes to the public disk under a random
// name; the story text then points at the returned url.
class StoryImageController extends Controller
{
    public function store(StoryImageRequest $request)
    {
        $user = $request->user();
        $file = $request->file('file');

        $media = Media::create([
            'disk' => 'public',
            'path' => $file->store('stories', 'public'),
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 250),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => $user->id,
            'tenant_id' => $user->tenant_id,
        ]);

        Audit::log($request, [
            'action' => 'media.uploaded',
            'actor' => $user,
            'entity_type' => 'media',
            'entity_id' => $media->cuid,
            'metadata' => ['mimeType' => $media->mime_type, 'size' => $media->size, 'forStory' => true],
        ]);

        return $this->item($media->toPublicArray(), 201);
    }
}
