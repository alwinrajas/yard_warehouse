<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pallet_holds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pallet_id')->constrained('pallets')->cascadeOnDelete();
            $table->enum('hold_type', ['HOLD', 'DAMAGED', 'EXCEPTION']);
            $table->foreignId('reason_code_id')->nullable()->constrained('reason_codes')->nullOnDelete();
            $table->string('remarks', 500)->nullable();
            $table->foreignId('placed_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('placed_at');
            $table->unsignedBigInteger('placed_transaction_id')->nullable();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('released_at')->nullable();
            $table->foreignId('release_reason_code_id')->nullable()->constrained('reason_codes')->nullOnDelete();
            $table->string('release_remarks', 500)->nullable();
            $table->unsignedBigInteger('released_transaction_id')->nullable();
            $table->boolean('is_open')->default(true);
            $table->timestamps();

            $table->index(['pallet_id', 'is_open']);
            $table->index(['is_open', 'placed_at']);
        });

        Schema::create('stock_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('location_id')->constrained('locations')->restrictOnDelete();
            $table->foreignId('facility_id')->constrained('facilities')->restrictOnDelete();
            $table->foreignId('site_id')->constrained('sites')->restrictOnDelete();
            $table->enum('status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'])->default('DRAFT');
            $table->unsignedInteger('expected_count')->default(0);
            $table->unsignedInteger('scanned_count')->default(0);
            $table->unsignedInteger('matched_count')->default(0);
            $table->unsignedInteger('missing_count')->default(0);
            $table->unsignedInteger('unexpected_count')->default(0);
            $table->foreignId('started_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('started_at');
            $table->dateTime('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->string('review_remarks', 500)->nullable();
            $table->string('device_id', 100)->nullable();
            $table->timestamps();

            $table->index(['status', 'started_at']);
            $table->index(['location_id', 'started_at']);
        });

        Schema::create('stock_verification_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_verification_id')->constrained('stock_verifications')->cascadeOnDelete();
            $table->foreignId('pallet_id')->nullable()->constrained('pallets')->nullOnDelete();
            $table->string('scanned_barcode_value', 255)->nullable();
            $table->boolean('expected')->default(false);
            $table->boolean('scanned')->default(false);
            $table->enum('outcome', ['MATCHED', 'MISSING', 'UNEXPECTED']);
            $table->foreignId('system_location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->dateTime('scanned_at')->nullable();
            $table->timestamps();

            $table->index(['stock_verification_id', 'outcome']);
        });

        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->string('key', 80);
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('endpoint', 120);
            $table->char('request_hash', 64);
            $table->unsignedSmallInteger('response_status');
            $table->json('response_body');
            $table->timestamp('created_at')->useCurrent();
            $table->dateTime('expires_at');

            $table->unique(['key', 'user_id']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
        Schema::dropIfExists('stock_verification_lines');
        Schema::dropIfExists('stock_verifications');
        Schema::dropIfExists('pallet_holds');
    }
};
