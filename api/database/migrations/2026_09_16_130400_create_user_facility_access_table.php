<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Facility scoping (BR-09, docs/07 §4).
 *
 * An empty set means all facilities WITHIN the user's site — not all facilities
 * everywhere (rule SC-02).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_facility_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'facility_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_facility_access');
    }
};
