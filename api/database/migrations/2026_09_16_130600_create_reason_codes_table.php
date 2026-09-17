<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reason code master (docs/04 §2.3, BRD §7 I).
 *
 * Only the LOCATION_BLOCK category is exercised in U-2 — blocking a location
 * requires a reason (docs/05 §3.4). The remaining categories exist in the enum
 * so later modules do not need a schema change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reason_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name', 150);
            $table->enum('category', [
                'TRANSFER', 'DISPATCH_CANCEL', 'CORRECTION',
                'HOLD', 'DAMAGE', 'LOCATION_BLOCK', 'OTHER',
            ]);
            $table->boolean('requires_remarks')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reason_codes');
    }
};
