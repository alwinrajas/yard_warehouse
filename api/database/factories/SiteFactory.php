<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SiteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => 'SITE-'.$this->faker->unique()->numberBetween(1000, 9999),
            'name' => 'Test Site '.$this->faker->word(),
            'address' => $this->faker->address(),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
