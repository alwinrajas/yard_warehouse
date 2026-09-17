<?php

namespace Database\Factories;

use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

class FacilityFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'code' => 'FAC-'.$this->faker->unique()->numberBetween(1000, 9999),
            'name' => 'Test Facility '.$this->faker->word(),
            'type' => 'OPEN_YARD',
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
