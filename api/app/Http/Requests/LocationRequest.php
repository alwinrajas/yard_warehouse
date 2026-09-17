<?php

namespace App\Http\Requests;

use App\Models\Location;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $updating = $this->route('location') !== null;

        return [
            'facility_id' => [$updating ? 'sometimes' : 'required', 'integer', 'exists:facilities,id'],
            // Nullable: a facility may have no zones (docs/04 §2.2).
            'zone_id' => ['nullable', 'integer', 'exists:zones,id'],
            'code' => [$updating ? 'sometimes' : 'required', 'string', 'max:60', 'regex:/^[A-Za-z0-9_\-\/]+$/'],
            'description' => ['nullable', 'string', 'max:255'],
            'location_type' => ['sometimes', Rule::in(Location::TYPES)],
            // Null means "not defined" — capacity rules are OI-04, unconfirmed.
            'capacity' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'sequence' => ['sometimes', 'integer', 'min:0', 'max:99999'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.regex' => 'The location code may contain only letters, numbers, hyphens, underscores and slashes.',
            'capacity.min' => 'Capacity must be at least 1, or left blank if it is not defined.',
        ];
    }
}
