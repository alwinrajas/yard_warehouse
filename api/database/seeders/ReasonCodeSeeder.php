<?php

namespace Database\Seeders;

use App\Models\ReasonCode;
use Illuminate\Database\Seeder;

/**
 * The operational vocabulary every controlled action chooses from.
 *
 * ASSUMPTION: the BRD names reason-code *categories* (§7 I) but not individual
 * codes. These are generic operational reasons, not customer data, and are fully
 * editable in W-26. Confirm the wording with the customer at UAT.
 *
 * A category with no codes makes its feature unusable — a hold cannot be placed
 * without a reason — so every category the schema allows is seeded, not only the
 * ones an early increment reached.
 */
class ReasonCodeSeeder extends Seeder
{
    /** @var array<string, list<array{code: string, name: string, requires_remarks?: bool}>> */
    private const CODES = [
        'LOCATION_BLOCK' => [
            ['code' => 'BLK_MAINTENANCE', 'name' => 'Maintenance'],
            ['code' => 'BLK_UNSAFE', 'name' => 'Unsafe access'],
            ['code' => 'BLK_FULL', 'name' => 'Temporarily full'],
            ['code' => 'BLK_OTHER', 'name' => 'Other', 'requires_remarks' => true],
        ],
        'HOLD' => [
            ['code' => 'HLD_QUALITY', 'name' => 'Quality check pending'],
            ['code' => 'HLD_CUSTOMER', 'name' => 'Customer instruction'],
            ['code' => 'HLD_DOCUMENTATION', 'name' => 'Documentation incomplete'],
            ['code' => 'HLD_INVESTIGATION', 'name' => 'Under investigation', 'requires_remarks' => true],
            ['code' => 'HLD_OTHER', 'name' => 'Other', 'requires_remarks' => true],
        ],
        'DAMAGE' => [
            ['code' => 'DMG_HANDLING', 'name' => 'Damaged in handling'],
            ['code' => 'DMG_TRANSIT', 'name' => 'Damaged in transit'],
            ['code' => 'DMG_WEATHER', 'name' => 'Weather exposure'],
            ['code' => 'DMG_PACKAGING', 'name' => 'Packaging failure'],
            ['code' => 'DMG_OTHER', 'name' => 'Other', 'requires_remarks' => true],
        ],
        'TRANSFER' => [
            ['code' => 'TRF_CONSOLIDATION', 'name' => 'Consolidating stock'],
            ['code' => 'TRF_SPACE', 'name' => 'Making space'],
            ['code' => 'TRF_STAGING', 'name' => 'Staging for dispatch'],
            ['code' => 'TRF_ACCESS', 'name' => 'Improving access'],
            ['code' => 'TRF_OTHER', 'name' => 'Other', 'requires_remarks' => true],
        ],
        'DISPATCH_CANCEL' => [
            ['code' => 'DSC_CUSTOMER', 'name' => 'Customer cancelled'],
            ['code' => 'DSC_VEHICLE', 'name' => 'Vehicle unavailable'],
            ['code' => 'DSC_DOCUMENTATION', 'name' => 'Documentation issue'],
            ['code' => 'DSC_OTHER', 'name' => 'Other', 'requires_remarks' => true],
        ],
        'CORRECTION' => [
            // Every correction demands remarks: the ledger is append-only, so the
            // explanation is the only record of why the original was wrong (FR-030).
            ['code' => 'COR_WRONG_LOCATION', 'name' => 'Recorded at the wrong location', 'requires_remarks' => true],
            ['code' => 'COR_WRONG_PALLET', 'name' => 'Wrong pallet scanned', 'requires_remarks' => true],
            ['code' => 'COR_DUPLICATE', 'name' => 'Duplicate transaction', 'requires_remarks' => true],
            ['code' => 'COR_MISSED', 'name' => 'Movement not recorded at the time', 'requires_remarks' => true],
            ['code' => 'COR_OTHER', 'name' => 'Other', 'requires_remarks' => true],
        ],
        'OTHER' => [
            ['code' => 'GEN_OTHER', 'name' => 'Other', 'requires_remarks' => true],
        ],
    ];

    public function run(): void
    {
        foreach (self::CODES as $category => $codes) {
            foreach ($codes as $code) {
                ReasonCode::updateOrCreate(
                    ['code' => $code['code']],
                    [
                        'name' => $code['name'],
                        'category' => $category,
                        'requires_remarks' => $code['requires_remarks'] ?? false,
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
