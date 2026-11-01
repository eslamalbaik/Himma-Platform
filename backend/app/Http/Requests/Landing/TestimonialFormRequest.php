<?php

namespace App\Http\Requests\Landing;

use App\Http\Requests\ApiRequest;

class TestimonialFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'authorAr' => ['required', 'string', 'max:150'],
            'authorEn' => ['required', 'string', 'max:150'],
            'roleAr' => ['nullable', 'string', 'max:150'],
            'roleEn' => ['nullable', 'string', 'max:150'],
            'quoteAr' => ['required', 'string', 'max:600'],
            'quoteEn' => ['required', 'string', 'max:600'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'isVisible' => ['sometimes', 'boolean'],
        ];
    }

    protected function codes(): array
    {
        return [
            'authorAr' => 'invalid_testimonial', 'authorEn' => 'invalid_testimonial',
            'quoteAr' => 'invalid_testimonial', 'quoteEn' => 'invalid_testimonial',
            'roleAr' => 'invalid_testimonial', 'roleEn' => 'invalid_testimonial',
            'rating' => 'invalid_rating',
            'color' => 'invalid_color',
        ];
    }

    public function fields(): array
    {
        return [
            'author_ar' => $this->input('authorAr'), 'author_en' => $this->input('authorEn'),
            'role_ar' => $this->input('roleAr'), 'role_en' => $this->input('roleEn'),
            'quote_ar' => $this->input('quoteAr'), 'quote_en' => $this->input('quoteEn'),
            'rating' => (int) $this->input('rating'),
            'color' => $this->input('color'),
            'is_visible' => $this->boolean('isVisible', true),
        ];
    }
}
