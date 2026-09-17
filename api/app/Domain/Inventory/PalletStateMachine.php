<?php

namespace App\Domain\Inventory;

use App\Models\Pallet;
use App\Support\BusinessRuleException;

/**
 * Allowed lifecycle transitions (docs/05 §2).
 *
 * Every transition not on this list is rejected BEFORE any write is attempted.
 * This constant is the single source; the table in docs/05 §2 mirrors it.
 */
final class PalletStateMachine
{
    /** @var array<string, string[]> from => allowed destinations */
    private const EDGES = [
        'AT_COLLECTION_POINT' => ['STORED'],
        'STORED' => ['STORED', 'IN_MOVEMENT', 'STAGED_FOR_DISPATCH', 'DISPATCHED'],
        'IN_MOVEMENT' => ['STORED'],
        'STAGED_FOR_DISPATCH' => ['DISPATCHED', 'STORED'],
        // Terminal. Only an audited DISPATCH_REVERSAL correction leaves it.
        'DISPATCHED' => [],
    ];

    public static function assertTransition(Pallet $pallet, string $to, bool $viaCorrection = false): void
    {
        $from = $pallet->lifecycle_status;

        if ($viaCorrection) {
            return; // Corrections are permitted to move state, but only through CorrectionService.
        }

        if (! in_array($to, self::EDGES[$from] ?? [], true)) {
            throw new BusinessRuleException(
                'INVALID_STATE_TRANSITION',
                self::explain($from, $to),
                409,
                ['from' => $from, 'to' => $to],
            );
        }
    }

    private static function explain(string $from, string $to): string
    {
        return match (true) {
            $from === 'DISPATCHED' => 'This pallet has already been dispatched. Reversing a dispatch requires an authorised correction.',
            $to === 'DISPATCHED' && $from === 'AT_COLLECTION_POINT' => 'This pallet is not in storage, so it cannot be dispatched.',
            default => "A pallet cannot move from {$from} to {$to}.",
        };
    }

    /** @return string[] */
    public static function allowedFrom(string $status): array
    {
        return self::EDGES[$status] ?? [];
    }
}
