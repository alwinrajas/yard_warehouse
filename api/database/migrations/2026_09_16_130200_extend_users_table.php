<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends the framework users table to the ALU TRACK user master (docs/04 §2.1).
 *
 * Username is the credential, not email: BRD §6 requires an individual username
 * per user and forbids shared operator credentials.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_code', 50)->nullable()->unique()->after('id');
            $table->string('username', 100)->unique()->after('name');
            $table->foreignId('role_id')->nullable()->after('password')->constrained('roles')->restrictOnDelete();
            $table->foreignId('site_id')->nullable()->after('role_id')->constrained('sites')->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('site_id');
            $table->boolean('must_change_password')->default(true)->after('is_active');
            $table->timestamp('password_changed_at')->nullable()->after('must_change_password');
            $table->timestamp('last_login_at')->nullable()->after('password_changed_at');
            $table->unsignedSmallInteger('failed_login_attempts')->default(0)->after('last_login_at');
            $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');
            $table->softDeletes();

            $table->index(['role_id']);
            $table->index(['site_id', 'is_active']);
        });

        // Email is optional in ALU TRACK; the username is the credential.
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
            $table->dropConstrainedForeignId('site_id');
            $table->dropColumn([
                'employee_code', 'username', 'is_active', 'must_change_password',
                'password_changed_at', 'last_login_at', 'failed_login_attempts',
                'locked_until', 'deleted_at',
            ]);
        });
    }
};
