<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class RoleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => 'ROLE_'.$this->faker->unique()->numberBetween(1000, 9999),
            'name' => 'Test Role',
            'is_system' => false,
            'is_active' => true,
        ];
    }
}
