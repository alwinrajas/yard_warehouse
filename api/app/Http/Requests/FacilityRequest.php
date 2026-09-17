<?php

namespace App\Http\Requests;

use App\Models\Facility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FacilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $updating = $this->route('facility') !== null;

        return [
            'site_id' => [$updating ? 'sometimes' : 'required', 'integer', 'exists:sites,id'],
            'code' => [$updating ? 'sometimes' : 'required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'name' => [$updating ? 'sometimes' : 'required', 'string', 'max:150'],
            'type' => [$updating ? 'sometimes' : 'required', Rule::in(Facility::TYPES)],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.in' => 'Facility type must be one of: Open Yard, Closed Warehouse, Dispatch Area or Collection Area.',
            'code.regex' => 'The facility code may contain only letters, numbers, hyphens and underscores.',
        ];
    }
}
