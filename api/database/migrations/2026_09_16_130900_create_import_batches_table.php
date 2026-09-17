<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Import batches (docs/04 §2.6).
 *
 * The import is two-phase by design: a dry run validates and stores the result,
 * and a separate explicit commit writes. Nothing reaches the database until the
 * user has seen the row-level errors (docs/23 W-23a).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['FACILITY', 'ZONE', 'LOCATION', 'USER', 'PALLET', 'OPENING_STOCK']);
            $table->string('original_filename', 255);
            $table->enum('status', ['VALIDATING', 'VALIDATED', 'FAILED', 'COMMITTED'])->default('VALIDATING');
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('valid_rows')->default(0);
            $table->unsignedInteger('error_rows')->default(0);
            // Validated rows and per-row errors, held between dry run and commit.
            $table->json('validated_payload')->nullable();
            $table->json('errors')->nullable();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('committed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('committed_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index(['uploaded_by', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_batches');
    }
};
