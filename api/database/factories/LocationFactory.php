<?php

namespace Database\Factories;

use App\Models\Facility;
use Illuminate\Database\Eloquent\Factories\Factory;

class LocationFactory extends Factory
{
    public function definition(): array
    {
        /** @var Facility $facility */
        $facility = Facility::factory()->create();

        return [
            'site_id' => $facility->site_id,
            'facility_id' => $facility->id,
            'zone_id' => null,
            'code' => 'LOC-'.$this->faker->unique()->numberBetween(10000, 99999),
            'location_type' => 'STORAGE',
            'is_active' => true,
            'is_blocked' => false,
        ];
    }
}
