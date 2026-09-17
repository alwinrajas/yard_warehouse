<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * THE INVARIANT TABLE (DC-01 / BR-01 / FR-007).
 *
 * `pallet_id` is the PRIMARY KEY, so "one pallet in two locations" is not
 * representable. A dispatched pallet has NO row, which is what makes "removed
 * from active inventory" structural rather than a status flag every report must
 * remember to filter on.
 *
 * facility/zone/site are denormalised from the location because occupancy, KPIs
 * and location-wise stock all aggregate at those levels. They are written only
 * by InventoryLedger, inside the same transaction, so they cannot drift.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_current', function (Blueprint $table) {
            $table->unsignedBigInteger('pallet_id')->primary();
            $table->foreignId('location_id')->constrained('locations')->restrictOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('zones')->restrictOnDelete();
            $table->foreignId('facility_id')->constrained('facilities')->restrictOnDelete();
            $table->foreignId('site_id')->constrained('sites')->restrictOnDelete();
            $table->dateTime('stored_at');
            $table->dateTime('putaway_at');
            $table->unsignedBigInteger('last_transaction_id')->nullable();
            $table->foreignId('last_action_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('updated_at')->nullable();

            $table->foreign('pallet_id')->references('id')->on('pallets')->cascadeOnDelete();
            $table->index('location_id');
            $table->index(['facility_id', 'zone_id', 'location_id']);
            $table->index(['site_id', 'putaway_at']);
            $table->index('putaway_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_current');
    }
};
