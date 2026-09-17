<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Route middleware enforces the permission (docs/07 §5).
    }

    public function rules(): array
    {
        $updating = $this->route('site') !== null;

        return [
            'code' => [$updating ? 'sometimes' : 'required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'name' => [$updating ? 'sometimes' : 'required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:1000'],
            'timezone' => ['nullable', 'string', 'max:64', 'timezone'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.regex' => 'The site code may contain only letters, numbers, hyphens and underscores.',
        ];
    }
}
