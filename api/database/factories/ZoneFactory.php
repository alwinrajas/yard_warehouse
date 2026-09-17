<?php

namespace Database\Factories;

use App\Models\Facility;
use Illuminate\Database\Eloquent\Factories\Factory;

class ZoneFactory extends Factory
{
    public function definition(): array
    {
        return [
            'facility_id' => Facility::factory(),
            'code' => 'ZN-'.$this->faker->unique()->numberBetween(1000, 9999),
            'name' => 'Test Zone '.$this->faker->word(),
            'sequence' => 0,
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
