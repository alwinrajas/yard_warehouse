<?php

namespace App\Domain\Inventory;

use App\Support\BusinessRuleException;
use App\Support\Settings;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Opening stock capture (FR-035, CFG-17).
 *
 * What is already in the yard on day one has no put-away transaction behind it,
 * so it has to be brought into the ledger some other way. This is that way — and
 * it is deliberately the same path as a put-away, not a shortcut around it:
 * the pallet is locked first, the one-pallet-one-location invariant applies
 * unchanged, capacity is enforced, and a real transaction is written.
 *
 * Two things differ from a put-away, both on purpose:
 *
 *  - the transaction type is OPENING_STOCK, so the ledger never claims someone
 *    physically put these pallets away;
 *  - `stored_since` may be backdated, because a pallet that arrived six weeks
 *    ago must age from then. Ageing drives the whole MIS; starting every legacy
 *    pallet at zero on go-live day would make the first month of reporting wrong.
 *
 * It is gated behind CFG-17 rather than a permission alone: the permission says
 * who may do it, the setting says that the system is still in go-live.
 */
class OpeningStockService
{
    public function __construct(
        private readonly InventoryLedger $ledger,
        private readonly TransactionRecorder $recorder,
        private readonly LocationValidator $locations,
        private readonly PalletResolver $pallets,
    ) {}

    /** @return array<string, mixed> */
    public function capture(string $locationBarcode, string $palletBarcode, array $options = []): array
    {
        if (! Settings::bool('openingstock.mode_enabled')) {
            throw new BusinessRuleException(
                'OPENING_STOCK_DISABLED',
                'Opening stock capture is switched off. A system administrator enables it in System Settings for the go-live period.',
                409,
                ['setting' => 'CFG-17'],
            );
        }

        $user = Auth::user();

        $location = $this->locations->resolveByBarcode($locationBarcode);
        $this->locations->assertAcceptsInbound($location, $user);

        $storedSince = $this->resolveStoredSince($options['stored_since'] ?? null);

        return DB::transaction(function () use ($location, $palletBarcode, $options, $storedSince) {
            $resolved = $this->pallets->resolve($palletBarcode);

            // Same lock, same order, same invariant as every other write path.
            $pallet = $this->ledger->lockPallet($resolved->id);

            $existing = $this->ledger->currentFor($pallet->id);
            if ($existing !== null) {
                $existing->loadMissing(['location', 'facility', 'zone']);
                throw new BusinessRuleException(
                    'PALLET_ALREADY_STORED',
                    'This pallet is already in inventory.',
                    409,
                    [
                        'location_code' => $existing->location->code,
                        'facility' => $existing->facility->name,
                        'zone' => $existing->zone?->name,
                        'stored_at' => $existing->stored_at?->toIso8601String(),
                    ],
                );
            }

            if ($pallet->lifecycle_status === 'DISPATCHED') {
                throw new BusinessRuleException(
                    'PALLET_ALREADY_DISPATCHED',
                    'This pallet has already been dispatched and cannot be captured as opening stock.',
                    409,
                    ['dispatched_at' => $pallet->dispatched_at?->toIso8601String()],
                );
            }

            PalletStateMachine::assertTransition($pallet, 'STORED');
            $this->locations->assertCapacity($location, $this->ledger->occupancyOf($location->id));

            $previousStatus = $pallet->lifecycle_status;

            $txn = $this->recorder->record('OPENING_STOCK', $pallet, [
                'destination_location_id' => $location->id,
                'previous_lifecycle_status' => $previousStatus,
                'new_lifecycle_status' => 'STORED',
                'reason_code_id' => $options['reason_code_id'] ?? null,
                'remarks' => $options['remarks'] ?? null,
                'idempotency_key' => $options['idempotency_key'] ?? null,
                'new_values' => ['stored_since' => $storedSince->toIso8601String()],
            ]);

            $this->ledger->place($pallet, $location, $txn, $storedSince);

            $pallet->forceFill([
                'lifecycle_status' => 'STORED',
                'site_id' => $location->site_id,
                'first_putaway_at' => $storedSince,
                'last_movement_at' => now(),
                'last_action_by' => Auth::id(),
            ])->save();

            return ['transaction' => $txn, 'pallet' => $pallet->refresh(), 'location' => $location];
        });
    }

    /**
     * A backdated arrival is the point of this feature, but a future one is
     * always an error, and an implausibly old one is usually a typo in the year.
     */
    private function resolveStoredSince(?string $raw): Carbon
    {
        if ($raw === null || $raw === '') {
            return now();
        }

        try {
            $date = Carbon::parse($raw);
        } catch (\Throwable) {
            throw new BusinessRuleException('INVALID_STORED_SINCE', 'That is not a valid date.', 422);
        }

        if ($date->isFuture()) {
            throw new BusinessRuleException(
                'STORED_SINCE_IN_FUTURE',
                'Stock cannot have arrived in the future.',
                422,
                ['stored_since' => $date->toIso8601String()],
            );
        }

        if ($date->lt(now()->subYears(5))) {
            throw new BusinessRuleException(
                'STORED_SINCE_TOO_OLD',
                'That arrival date is more than five years ago. Check the year.',
                422,
                ['stored_since' => $date->toIso8601String()],
            );
        }

        return $date;
    }
}
