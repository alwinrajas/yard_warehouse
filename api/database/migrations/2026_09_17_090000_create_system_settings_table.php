<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * System settings (docs/05 §7 — the CFG-01 … CFG-21 register).
 *
 * Every configurable value lives here, not in a PHP literal. The row carries its
 * own metadata — type, default, allowed values, the open item it depends on —
 * so S-41 renders the register without a second copy of it in the frontend.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 10)->unique();   // CFG-01
            $table->string('key', 80)->unique();         // pallet.uniqueness_rule
            $table->string('group_name', 40);   // not `group`: reserved in MySQL 8
            $table->enum('type', ['STRING', 'INT', 'BOOL', 'ENUM', 'JSON']);
            $table->text('value')->nullable();
            $table->text('default_value')->nullable();
            $table->json('allowed_values')->nullable();
            $table->string('description', 255);
            $table->string('notes', 255)->nullable();
            $table->string('open_item', 10)->nullable();
            // Some settings become unchangeable once data depends on them: CFG-01
            // decides pallet identity, and changing it after the first transaction
            // would silently redefine what "the same pallet" means.
            $table->boolean('locks_after_first_transaction')->default(false);
            $table->boolean('is_editable')->default(true);
            $table->boolean('requires_confirmation')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('group_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
