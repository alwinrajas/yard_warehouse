<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Append-only inventory ledger (docs/04 §2.4, BR-06).
 *
 * No updated_at. No deleted_at. No update or delete path in the application.
 * Corrections append a new row referencing the original; history is never
 * overwritten.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('txn_ref', 30)->unique();
            $table->enum('type', [
                'PUTAWAY', 'TRANSFER', 'DISPATCH', 'STAGE', 'HOLD', 'RELEASE',
                'MARK_DAMAGED', 'FLAG_EXCEPTION', 'CORRECTION', 'OPENING_STOCK',
            ]);
            $table->foreignId('pallet_id')->constrained('pallets')->restrictOnDelete();
            $table->foreignId('source_location_id')->nullable()->constrained('locations')->restrictOnDelete();
            $table->foreignId('destination_location_id')->nullable()->constrained('locations')->restrictOnDelete();
            $table->string('previous_lifecycle_status', 30)->nullable();
            $table->string('new_lifecycle_status', 30)->nullable();
            $table->string('previous_block_state', 20)->nullable();
            $table->string('new_block_state', 20)->nullable();
            $table->json('previous_values')->nullable();
            $table->json('new_values')->nullable();
            $table->foreignId('reason_code_id')->nullable()->constrained('reason_codes')->nullOnDelete();
            $table->string('remarks', 500)->nullable();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('device_id', 100)->nullable();
            $table->unsignedBigInteger('token_id')->nullable();
            $table->enum('channel', ['PDA', 'WEB', 'SYSTEM'])->default('WEB');
            $table->string('idempotency_key', 80)->nullable();
            $table->foreignId('correction_of_transaction_id')->nullable()->constrained('inventory_transactions')->nullOnDelete();
            $table->string('correlation_id', 40)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            $table->index(['pallet_id', 'created_at']);
            $table->index(['type', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['destination_location_id', 'created_at']);
            $table->index(['source_location_id', 'created_at']);
            $table->index('created_at');
            $table->index('idempotency_key');
        });

        Schema::create('dispatch_transaction_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_transaction_id')->unique()->constrained('inventory_transactions')->cascadeOnDelete();
            $table->string('delivery_reference', 80)->nullable();
            $table->string('vehicle_reference', 80)->nullable();
            $table->foreignId('dispatched_from_location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('lpo_number', 80)->nullable();
            $table->string('remarks', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispatch_transaction_details');
        Schema::dropIfExists('inventory_transactions');
    }
};
