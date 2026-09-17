<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ReasonCodeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => 'RC-'.$this->faker->unique()->numberBetween(1000, 9999),
            'name' => 'Test reason',
            'category' => 'LOCATION_BLOCK',
            'requires_remarks' => false,
            'is_active' => true,
        ];
    }
}
