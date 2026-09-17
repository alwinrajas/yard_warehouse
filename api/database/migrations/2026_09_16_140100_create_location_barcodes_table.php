<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Location barcode identity (docs/11 §3.1).
 *
 * LB-01/LB-02: one barcode identity per location, globally unique value.
 * LB-03: a reprint touches last_printed_at and reprint_count ONLY — there is no
 * service method that rewrites barcode_value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('location_barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->unique()->constrained('locations')->cascadeOnDelete();
            $table->string('barcode_value', 100)->unique();
            $table->enum('symbology', ['CODE128', 'CODE39', 'QR', 'DATAMATRIX'])->default('CODE128');
            $table->enum('source', ['SYSTEM_GENERATED', 'CUSTOMER_PROVIDED'])->default('SYSTEM_GENERATED');
            $table->dateTime('first_printed_at')->nullable();
            $table->dateTime('last_printed_at')->nullable();
            $table->unsignedInteger('reprint_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_barcodes');
    }
};
