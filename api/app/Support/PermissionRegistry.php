<?php

namespace App\Support;

/**
 * The authoritative permission list (docs/07).
 *
 * This is the source the web client's permission-codes.ts is generated from, so
 * a typo in the UI becomes a TypeScript error rather than a silently missing
 * button (docs/26 §6).
 *
 * Only the permissions reachable in the current increment are seeded with role
 * grants; the full list is declared so nothing has to be renamed later.
 */
final class PermissionRegistry
{
    /** @return array<string, string> code => description */
    public static function all(): array
    {
        return [
            // Platform
            'auth.login_web' => 'Sign in to the admin web console',
            'auth.login_pda' => 'Sign in to the PDA application',
            'settings.view' => 'View system settings',
            'settings.edit' => 'Change system settings',
            'audit.view' => 'View the audit log',
            'audit.export' => 'Export the audit log',

            // Master data
            'site.view' => 'View sites',
            'site.create' => 'Create sites',
            'site.edit' => 'Edit sites',
            'site.delete' => 'Delete sites',
            'facility.view' => 'View facilities',
            'facility.create' => 'Create facilities',
            'facility.edit' => 'Edit facilities',
            'facility.delete' => 'Delete facilities',
            'zone.view' => 'View zones',
            'zone.create' => 'Create zones',
            'zone.edit' => 'Edit zones',
            'zone.delete' => 'Delete zones',
            'location.view' => 'View locations',
            'location.create' => 'Create locations',
            'location.edit' => 'Edit locations',
            'location.delete' => 'Delete locations',
            'location.import' => 'Import locations',
            'location.block' => 'Block and unblock locations',
            'customer.view' => 'View customers',
            'customer.create' => 'Create customers',
            'customer.edit' => 'Edit customers',
            'reasoncode.view' => 'View reason codes',
            'reasoncode.create' => 'Create reason codes',
            'reasoncode.edit' => 'Edit reason codes',
            'barcode.print' => 'Print location barcodes',
            'barcode.reprint' => 'Reprint location barcodes',

            // Users and roles
            'user.view' => 'View users',
            'user.create' => 'Create users',
            'user.edit' => 'Edit users',
            'user.delete' => 'Delete users',
            'user.reset_password' => 'Reset a user password',
            'role.view' => 'View roles',
            'role.create' => 'Create roles',
            'role.edit' => 'Edit role permissions',
            'role.delete' => 'Delete roles',

            // Inventory operations
            'scan.resolve' => 'Resolve scanned barcodes',
            'scan.manual_override' => 'Select a location or pallet manually',
            'putaway.perform' => 'Perform put-away',
            'transfer.perform' => 'Perform transfers',
            'dispatch.perform' => 'Perform dispatch',
            'dispatch.stage' => 'Stage pallets for dispatch',
            'dispatch.override_hold' => 'Dispatch a held pallet',
            'hold.create' => 'Place a pallet on hold',
            'hold.release' => 'Release a hold',
            'correction.perform' => 'Perform corrections and reversals',
            'openingstock.perform' => 'Capture opening stock',

            // Read side
            'dashboard.view' => 'View the dashboard',
            'inventory.view' => 'View live inventory',
            'search.perform' => 'Search pallets',
            'pallet.view' => 'View pallet detail',
            'pallet.import' => 'Import pallet master data',
            'traceability.view' => 'View pallet traceability',
            'transaction.view' => 'View transactions',
            'stockverify.view' => 'View stock verifications',
            'stockverify.create' => 'Perform stock verification',
            'stockverify.approve' => 'Approve stock verification',
            'report.export' => 'Export reports',

            // Reports
            'report.view.current_inventory' => 'Current Inventory report',
            'report.view.location_stock' => 'Location-wise Stock report',
            'report.view.job_pallet' => 'Job-wise Pallet report',
            'report.view.customer_lpo_stock' => 'Customer/LPO-wise Stock report',
            'report.view.putaway_register' => 'Put-Away Register',
            'report.view.movement_register' => 'Location Movement Register',
            'report.view.dispatch_register' => 'Dispatch Register',
            'report.view.pallet_traceability' => 'Pallet Traceability report',
            'report.view.ageing' => 'Ageing report',
            'report.view.operator_activity' => 'Operator Activity report',
            'report.view.verification_variance' => 'Stock Verification Variance report',
            'report.view.hold_exception' => 'Hold / Exception report',
            'report.view.daily_movement_summary' => 'Daily Stock Movement Summary',
        ];
    }

    /** @return array<string, string[]> role code => permission codes (docs/07 §3) */
    public static function roleGrants(): array
    {
        $all = array_keys(self::all());

        $yardAdminDenied = [
            'site.create', 'site.edit', 'site.delete',
            'facility.delete', 'zone.delete', 'location.delete',
            'user.delete', 'role.create', 'role.edit', 'role.delete',
            'settings.edit', 'audit.export',
            'putaway.perform', 'transfer.perform', 'dispatch.perform',
            'dispatch.stage', 'dispatch.override_hold',
        ];

        return [
            'SUPER_ADMIN' => $all,
            'YARD_ADMIN' => array_values(array_diff($all, $yardAdminDenied)),
            'SUPERVISOR' => [
                'auth.login_web', 'auth.login_pda',
                'site.view', 'facility.view', 'zone.view', 'location.view', 'location.block',
                'customer.view', 'reasoncode.view', 'barcode.print', 'barcode.reprint',
                'user.view',
                'scan.resolve', 'scan.manual_override',
                'putaway.perform', 'transfer.perform', 'dispatch.perform', 'dispatch.stage',
                'dispatch.override_hold', 'hold.create', 'hold.release', 'openingstock.perform',
                'dashboard.view', 'inventory.view', 'search.perform', 'pallet.view',
                'traceability.view', 'transaction.view',
                'stockverify.view', 'stockverify.create', 'stockverify.approve',
                'report.export',
                'report.view.current_inventory', 'report.view.location_stock',
                'report.view.job_pallet', 'report.view.customer_lpo_stock',
                'report.view.putaway_register', 'report.view.movement_register',
                'report.view.dispatch_register', 'report.view.pallet_traceability',
                'report.view.ageing', 'report.view.operator_activity',
                'report.view.verification_variance', 'report.view.hold_exception',
                'report.view.daily_movement_summary',
            ],
            'PDA_OPERATOR' => [
                'auth.login_pda',
                'location.view', 'reasoncode.view',
                'scan.resolve',
                'putaway.perform', 'transfer.perform', 'dispatch.perform', 'dispatch.stage',
                'inventory.view', 'search.perform', 'pallet.view', 'transaction.view',
                'stockverify.view', 'stockverify.create',
            ],
            'VIEWER' => [
                'auth.login_web',
                'site.view', 'facility.view', 'zone.view', 'location.view', 'customer.view',
                'dashboard.view', 'inventory.view', 'search.perform', 'pallet.view',
                'traceability.view', 'transaction.view', 'stockverify.view',
                'report.export',
                'report.view.current_inventory', 'report.view.location_stock',
                'report.view.job_pallet', 'report.view.customer_lpo_stock',
                'report.view.putaway_register', 'report.view.movement_register',
                'report.view.dispatch_register', 'report.view.pallet_traceability',
                'report.view.ageing', 'report.view.hold_exception',
                'report.view.daily_movement_summary',
            ],
        ];
    }

    /** @return array<string, array{name: string, description: string}> */
    public static function roles(): array
    {
        return [
            'SUPER_ADMIN' => ['name' => 'Super Admin', 'description' => 'Full configuration, masters, users, transactions, corrections, reports and audit'],
            'YARD_ADMIN' => ['name' => 'Warehouse / Yard Admin', 'description' => 'Location setup, inventory monitoring, stock verification, reports and approved corrections'],
            'SUPERVISOR' => ['name' => 'Warehouse Supervisor', 'description' => 'Operational dashboard, search, exceptions, stock verification and permitted approvals'],
            'PDA_OPERATOR' => ['name' => 'Forklift / PDA Operator', 'description' => 'Scan-based operational functions only'],
            'VIEWER' => ['name' => 'Management / Viewer', 'description' => 'Dashboard and read-only MIS access'],
        ];
    }
}
