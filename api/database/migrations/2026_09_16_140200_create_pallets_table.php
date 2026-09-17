<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pallet master (docs/04 §2.4).
 *
 * `pallet_key` is the canonical identity built per CFG-01 (default JOB_PALLET).
 * It is stored, not recomputed on read, so an existing pallet's key cannot shift
 * if the setting is ever altered — and the setting locks once transactions exist.
 *
 * lifecycle_status and block_state are deliberately orthogonal (ASM-01): a held
 * pallet keeps its location, and release has a state to return to.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pallets', function (Blueprint $table) {
            $table->id();
            $table->string('pallet_key', 160)->unique();
            $table->string('job_number', 80)->nullable();
            $table->string('pallet_number', 80)->nullable();
            $table->string('raw_barcode_value', 255);
            $table->string('barcode_profile', 50)->default('RAW_REFERENCE');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_name_raw', 150)->nullable();
            $table->string('lpo_number', 80)->nullable();
            $table->enum('lifecycle_status', [
                'AT_COLLECTION_POINT', 'STORED', 'IN_MOVEMENT', 'STAGED_FOR_DISPATCH', 'DISPATCHED',
            ])->default('AT_COLLECTION_POINT');
            $table->enum('block_state', ['NONE', 'ON_HOLD', 'DAMAGED', 'EXCEPTION'])->default('NONE');
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->dateTime('first_putaway_at')->nullable();
            $table->dateTime('last_movement_at')->nullable();
            $table->foreignId('last_action_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('dispatched_at')->nullable();
            // Present but unused until OI-05 confirms whether they are tracked.
            $table->decimal('quantity', 12, 3)->nullable();
            $table->decimal('weight_kg', 12, 3)->nullable();
            $table->string('profile_code', 60)->nullable();
            $table->unsignedInteger('bundle_count')->nullable();
            $table->timestamps();

            $table->index('job_number');
            $table->index('pallet_number');
            $table->index(['customer_id', 'lpo_number']);
            $table->index(['lifecycle_status', 'block_state']);
            $table->index('raw_barcode_value');
            $table->index('first_putaway_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pallets');
    }
};
