<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Storage facility master (docs/04 §2.2, BRD §7 B). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->restrictOnDelete();
            $table->string('code', 30);
            $table->string('name', 150);
            $table->enum('type', ['OPEN_YARD', 'CLOSED_WAREHOUSE', 'DISPATCH_AREA', 'COLLECTION_AREA']);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // DC: facility code unique within a site.
            $table->unique(['site_id', 'code']);
            $table->index(['site_id', 'is_active']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facilities');
    }
};
