<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Location master (docs/04 §2.2, BRD §7 D).
 *
 * `is_active` and `is_blocked` are deliberately separate (docs/04): inactive is a
 * master-data state (decommissioned, mis-created); blocked is an operational one
 * (maintenance, unsafe, full). Both refuse inbound movement, but they are
 * reported and reversed differently, and BRD §11.3 lists them as distinct
 * occupancy categories.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            // site_id is denormalised from the facility so scoped queries and the
            // per-site code uniqueness constraint do not need a join. Written only
            // by the service layer, from the facility, inside the same transaction.
            $table->foreignId('site_id')->constrained('sites')->restrictOnDelete();
            $table->foreignId('facility_id')->constrained('facilities')->restrictOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('zones')->restrictOnDelete();
            $table->string('code', 60);
            $table->string('description', 255)->nullable();
            $table->enum('location_type', ['STORAGE', 'STAGING', 'COLLECTION', 'DISPATCH'])->default('STORAGE');
            // Null means "not defined" — capacity rules are OI-04, unconfirmed.
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->integer('sequence')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_blocked')->default(false);
            $table->foreignId('blocked_reason_id')->nullable()->constrained('reason_codes')->nullOnDelete();
            $table->string('blocked_remarks', 500)->nullable();
            $table->foreignId('blocked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('blocked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // DC-05: location code unique within a site (docs/04 §4).
            $table->unique(['site_id', 'code']);
            $table->index(['facility_id', 'zone_id', 'is_active']);
            $table->index(['is_active', 'is_blocked']);
            $table->index(['facility_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
