<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Device binding for PDA tokens (docs/04 §2.1, ASM-06). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->string('device_id', 100)->nullable()->after('abilities');
            $table->string('device_model', 120)->nullable()->after('device_id');
            $table->string('app_version', 30)->nullable()->after('device_model');
            $table->string('channel', 10)->default('WEB')->after('app_version');
            $table->string('last_ip', 45)->nullable()->after('channel');

            $table->index(['tokenable_id', 'device_id']);
        });
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropIndex(['tokenable_id', 'device_id']);
            $table->dropColumn(['device_id', 'device_model', 'app_version', 'channel', 'last_ip']);
        });
    }
};
