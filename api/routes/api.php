<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CorrectionController;
use App\Http\Controllers\Api\V1\FacilityController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\HoldController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\LocationBarcodeController;
use App\Http\Controllers\Api\V1\LocationController;
use App\Http\Controllers\Api\V1\LocationImportController;
use App\Http\Controllers\Api\V1\OpeningStockController;
use App\Http\Controllers\Api\V1\OperationsController;
use App\Http\Controllers\Api\V1\PalletController;
use App\Http\Controllers\Api\V1\ReasonCodeController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\SiteController;
use App\Http\Controllers\Api\V1\StockVerificationController;
use App\Http\Controllers\Api\V1\TransactionController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\ZoneController;
use Illuminate\Support\Facades\Route;

/*
 * ALU TRACK API v1 (docs/03 §3).
 *
 * Every route is authenticated except login and health, and every mutating route
 * is gated by a permission. Frontend visibility is not security.
 */

Route::prefix('v1')->group(function () {
    Route::get('health', [HealthController::class, 'health']);
    Route::get('health/ready', [HealthController::class, 'ready']);

    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/change-password', [AuthController::class, 'changePassword'])->middleware('throttle:6,1');

        Route::get('reason-codes', [ReasonCodeController::class, 'index'])->middleware('permission:reasoncode.view');

        // Sites
        Route::get('sites', [SiteController::class, 'index'])->middleware('permission:site.view');
        Route::get('sites/{site}', [SiteController::class, 'show'])->middleware('permission:site.view');
        Route::post('sites', [SiteController::class, 'store'])->middleware('permission:site.create');
        Route::put('sites/{site}', [SiteController::class, 'update'])->middleware('permission:site.edit');
        Route::post('sites/{site}/status', [SiteController::class, 'setActive'])->middleware('permission:site.edit');
        Route::delete('sites/{site}', [SiteController::class, 'destroy'])->middleware('permission:site.delete');

        // Facilities
        Route::get('facilities', [FacilityController::class, 'index'])->middleware('permission:facility.view');
        Route::get('facilities/{facility}', [FacilityController::class, 'show'])->middleware('permission:facility.view');
        Route::post('facilities', [FacilityController::class, 'store'])->middleware('permission:facility.create');
        Route::put('facilities/{facility}', [FacilityController::class, 'update'])->middleware('permission:facility.edit');
        Route::post('facilities/{facility}/status', [FacilityController::class, 'setActive'])->middleware('permission:facility.edit');
        Route::delete('facilities/{facility}', [FacilityController::class, 'destroy'])->middleware('permission:facility.delete');

        // Zones
        Route::get('zones', [ZoneController::class, 'index'])->middleware('permission:zone.view');
        Route::get('zones/{zone}', [ZoneController::class, 'show'])->middleware('permission:zone.view');
        Route::post('zones', [ZoneController::class, 'store'])->middleware('permission:zone.create');
        Route::put('zones/{zone}', [ZoneController::class, 'update'])->middleware('permission:zone.edit');
        Route::post('zones/{zone}/status', [ZoneController::class, 'setActive'])->middleware('permission:zone.edit');
        Route::delete('zones/{zone}', [ZoneController::class, 'destroy'])->middleware('permission:zone.delete');

        // Locations
        Route::get('locations', [LocationController::class, 'index'])->middleware('permission:location.view');
        Route::get('locations/template', [LocationImportController::class, 'template'])->middleware('permission:location.import');
        Route::get('locations/{location}', [LocationController::class, 'show'])->middleware('permission:location.view');
        Route::post('locations', [LocationController::class, 'store'])->middleware('permission:location.create');
        Route::put('locations/{location}', [LocationController::class, 'update'])->middleware('permission:location.edit');
        Route::post('locations/{location}/status', [LocationController::class, 'setActive'])->middleware('permission:location.edit');
        Route::post('locations/{location}/block', [LocationController::class, 'block'])->middleware('permission:location.block');
        Route::post('locations/{location}/unblock', [LocationController::class, 'unblock'])->middleware('permission:location.block');
        Route::delete('locations/{location}', [LocationController::class, 'destroy'])->middleware('permission:location.delete');

        // ---- Inventory read side (docs/03 M9) ----
        Route::get('inventory', [InventoryController::class, 'index'])->middleware('permission:inventory.view');
        Route::get('inventory/occupancy', [InventoryController::class, 'occupancy'])->middleware('permission:inventory.view');
        Route::get('inventory/location/{location}', [InventoryController::class, 'atLocation'])->middleware('permission:inventory.view');
        Route::get('dashboard', [InventoryController::class, 'dashboard'])->middleware('permission:dashboard.view');

        // ---- Pallets ----
        Route::get('pallets', [PalletController::class, 'index'])->middleware('permission:pallet.view');
        Route::get('pallets/search', [PalletController::class, 'search'])->middleware('permission:search.perform');
        Route::get('pallets/{pallet}', [PalletController::class, 'show'])->middleware('permission:pallet.view');
        Route::get('pallets/{pallet}/history', [PalletController::class, 'history'])->middleware('permission:traceability.view');

        // ---- Operations (docs/03 M3-M5). Every mutation is idempotent. ----
        Route::post('operations/validate-location', [OperationsController::class, 'validateLocation'])->middleware('permission:scan.resolve');
        Route::post('operations/resolve-pallet', [OperationsController::class, 'resolvePallet'])->middleware('permission:scan.resolve');
        Route::post('putaway', [OperationsController::class, 'storePutAway'])->middleware('permission:putaway.perform');
        Route::post('movements', [OperationsController::class, 'storeMovement'])->middleware('permission:transfer.perform');
        Route::post('dispatch', [OperationsController::class, 'storeDispatch'])->middleware('permission:dispatch.perform');
        Route::post('dispatch/stage', [OperationsController::class, 'storeStage'])->middleware('permission:dispatch.stage');

        // ---- Holds / exceptions ----
        Route::get('holds', [HoldController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('holds', [HoldController::class, 'store'])->middleware('permission:hold.create');
        Route::post('holds/{hold}/release', [HoldController::class, 'release'])->middleware('permission:hold.release');

        // ---- Corrections (privileged, audited) ----
        Route::get('corrections', [CorrectionController::class, 'index'])->middleware('permission:transaction.view');
        Route::post('corrections', [CorrectionController::class, 'store'])->middleware('permission:correction.perform');

        // ---- Stock verification ----
        Route::get('stock-verifications', [StockVerificationController::class, 'index'])->middleware('permission:stockverify.view');
        Route::post('stock-verifications', [StockVerificationController::class, 'store'])->middleware('permission:stockverify.create');
        Route::get('stock-verifications/{stockVerification}', [StockVerificationController::class, 'show'])->middleware('permission:stockverify.view');
        Route::post('stock-verifications/{stockVerification}/scan', [StockVerificationController::class, 'scan'])->middleware('permission:stockverify.create');
        Route::post('stock-verifications/{stockVerification}/submit', [StockVerificationController::class, 'submit'])->middleware('permission:stockverify.create');
        Route::post('stock-verifications/{stockVerification}/review', [StockVerificationController::class, 'review'])->middleware('permission:stockverify.approve');

        // ---- Transactions and audit ----
        Route::get('transactions', [TransactionController::class, 'index'])->middleware('permission:transaction.view');
        Route::get('transactions/{transaction}', [TransactionController::class, 'show'])->middleware('permission:transaction.view');
        Route::get('audit-logs', [TransactionController::class, 'auditLogs'])->middleware('permission:audit.view');

        // ---- Location barcodes. There is deliberately no regenerate endpoint (LB-03). ----
        Route::get('location-barcodes', [LocationBarcodeController::class, 'index'])->middleware('permission:location.view');
        Route::post('location-barcodes/generate-missing', [LocationBarcodeController::class, 'generateMissing'])->middleware('permission:barcode.print');
        Route::post('location-barcodes/print', [LocationBarcodeController::class, 'print'])->middleware('permission:barcode.print');
        Route::post('location-barcodes/{location}/generate', [LocationBarcodeController::class, 'generate'])->middleware('permission:barcode.print');
        Route::post('location-barcodes/{locationBarcode}/reprint', [LocationBarcodeController::class, 'reprint'])->middleware('permission:barcode.reprint');

        // ---- Users and roles ----
        Route::get('users', [UserController::class, 'index'])->middleware('permission:user.view');
        Route::get('users/roles', [UserController::class, 'roles'])->middleware('permission:user.view');
        Route::get('users/{user}', [UserController::class, 'show'])->middleware('permission:user.view');
        Route::post('users', [UserController::class, 'store'])->middleware('permission:user.create');
        Route::put('users/{user}', [UserController::class, 'update'])->middleware('permission:user.edit');
        Route::post('users/{user}/status', [UserController::class, 'setActive'])->middleware('permission:user.edit');
        Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->middleware('permission:user.reset_password');

        // ---- Reports ----
        // Per-report permission is enforced in the controller: one middleware cannot
        // express thirteen different grants (docs/07 §4).
        Route::get('reports/{report}', [ReportController::class, 'show']);

        // ---- Roles & permissions ----
        Route::get('roles', [RoleController::class, 'index'])->middleware('permission:role.view');
        Route::get('roles/permissions', [RoleController::class, 'permissions'])->middleware('permission:role.view');
        Route::get('roles/{role}', [RoleController::class, 'show'])->middleware('permission:role.view');
        Route::post('roles', [RoleController::class, 'store'])->middleware('permission:role.create');
        Route::put('roles/{role}', [RoleController::class, 'update'])->middleware('permission:role.edit');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:role.delete');

        // ---- System settings (docs/05 §7) ----
        Route::get('settings', [SettingController::class, 'index'])->middleware('permission:settings.view');
        Route::put('settings/{setting}', [SettingController::class, 'update'])->middleware('permission:settings.edit');

        // ---- Opening stock (go-live only, gated by CFG-17) ----
        Route::get('opening-stock', [OpeningStockController::class, 'status'])->middleware('permission:openingstock.perform');
        Route::post('opening-stock', [OpeningStockController::class, 'store'])->middleware('permission:openingstock.perform');

        // Location import — validate first, commit separately (docs/23 W-23a).
        Route::post('locations/import/validate', [LocationImportController::class, 'validateUpload'])->middleware('permission:location.import');
        Route::get('locations/import/{importBatch}', [LocationImportController::class, 'show'])->middleware('permission:location.import');
        Route::post('locations/import/{importBatch}/commit', [LocationImportController::class, 'commit'])->middleware('permission:location.import');
    });
});
