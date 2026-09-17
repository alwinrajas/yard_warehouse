<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ZoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $updating = $this->route('zone') !== null;

        return [
            'facility_id' => [$updating ? 'sometimes' : 'required', 'integer', 'exists:facilities,id'],
            'code' => [$updating ? 'sometimes' : 'required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'name' => [$updating ? 'sometimes' : 'required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'sequence' => ['sometimes', 'integer', 'min:0', 'max:99999'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
