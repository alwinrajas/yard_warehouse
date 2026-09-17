<?php

/*
 * ALU TRACK business configuration (docs/05 §7).
 *
 * These mirror the CFG-nn register. They live in config so a deployment can set
 * them per environment; the customer-facing editor (W-29) writes them to
 * system_settings in a later increment.
 *
 * Nothing here is a confirmed customer value — several are explicitly open
 * items and are marked as such.
 */
return [
    // CFG-01 (OI-02). Locks once inventory transactions exist.
    'pallet_uniqueness' => env('ALU_PALLET_UNIQUENESS', 'JOB_PALLET'),

    // CFG-02 (OI-01). RAW_REFERENCE until real ERP labels are supplied.
    'barcode_profile' => env('ALU_BARCODE_PROFILE', 'RAW_REFERENCE'),

    // CFG-03 / CFG-21 (OI-03, OI-13).
    'location_symbology' => env('ALU_LOCATION_SYMBOLOGY', 'CODE128'),
    'location_barcode_pattern' => env('ALU_LOCATION_BARCODE_PATTERN', 'LOC-{facility}-{code}'),

    // CFG-04 (OI-10). Ageing bucket upper bounds, in days.
    'ageing_buckets' => [7, 15, 30],
    'ageing_alert_days' => (int) env('ALU_AGEING_ALERT_DAYS', 30),

    // CFG-06 (OI-04). OFF | WARN | BLOCK — capacity rules are unconfirmed.
    'capacity_enforcement' => env('ALU_CAPACITY_ENFORCEMENT', 'OFF'),

    // CFG-08 / CFG-09 (OI-09).
    'transfer_mode' => env('ALU_TRANSFER_MODE', 'SINGLE_STEP'),
    'dispatch_mode' => env('ALU_DISPATCH_MODE', 'DIRECT'),

    // CFG-12.
    'idempotency_ttl_hours' => (int) env('ALU_IDEMPOTENCY_TTL_HOURS', 24),
];
