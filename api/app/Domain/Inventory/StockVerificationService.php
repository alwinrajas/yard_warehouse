<?php

namespace App\Domain\Inventory;

use App\Models\InventoryCurrent;
use App\Models\Location;
use App\Models\StockVerification;
use App\Models\StockVerificationLine;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Stock verification / cycle count (BRD §13, docs/05 §3.5).
 *
 * A count is EVIDENCE, not authority. Submitting never rewrites inventory, and
 * approving does not silently move stock — each fix is an explicit, reasoned
 * correction (BR-06).
 */
class StockVerificationService
{
    public function __construct(private readonly PalletResolver $pallets) {}

    public function start(int $locationId): StockVerification
    {
        return DB::transaction(function () use ($locationId) {
            $location = Location::findOrFail($locationId);

            $open = StockVerification::where('location_id', $locationId)->where('status', 'DRAFT')->first();
            if ($open !== null) {
                throw new BusinessRuleException(
                    'VERIFICATION_ALREADY_OPEN',
                    'A count is already open for this location.',
                    409,
                    ['reference' => $open->reference],
                );
            }

            $expected = InventoryCurrent::where('location_id', $locationId)->pluck('pallet_id');

            $verification = StockVerification::create([
                'reference' => 'SV-'.now()->format('Ymd').'-'.str_pad((string) (StockVerification::whereDate('created_at', today())->count() + 1), 4, '0', STR_PAD_LEFT),
                'location_id' => $location->id,
                'facility_id' => $location->facility_id,
                'site_id' => $location->site_id,
                'status' => 'DRAFT',
                'expected_count' => $expected->count(),
                'started_by' => Auth::id(),
                'started_at' => now(),
            ]);

            // The expected set is frozen at start. If stock legitimately moves
            // during the count, the review screen shows the intervening
            // transactions rather than reporting a false loss.
            foreach ($expected as $palletId) {
                StockVerificationLine::create([
                    'stock_verification_id' => $verification->id,
                    'pallet_id' => $palletId,
                    'expected' => true,
                    'scanned' => false,
                    'outcome' => 'MISSING',
                    'system_location_id' => $locationId,
                ]);
            }

            return $verification;
        });
    }

    public function scan(int $verificationId, string $palletBarcode): StockVerificationLine
    {
        return DB::transaction(function () use ($verificationId, $palletBarcode) {
            $verification = StockVerification::whereKey($verificationId)->lockForUpdate()->firstOrFail();

            if ($verification->status !== 'DRAFT') {
                throw new BusinessRuleException('VERIFICATION_CLOSED', 'This count has been submitted and cannot be changed.', 409);
            }

            $pallet = $this->pallets->resolve($palletBarcode, false);

            $line = StockVerificationLine::where('stock_verification_id', $verification->id)
                ->where('pallet_id', $pallet->id)
                ->first();

            if ($line !== null) {
                $line->forceFill(['scanned' => true, 'outcome' => 'MATCHED', 'scanned_at' => now()])->save();
            } else {
                $systemLocation = InventoryCurrent::whereKey($pallet->id)->value('location_id');
                $line = StockVerificationLine::create([
                    'stock_verification_id' => $verification->id,
                    'pallet_id' => $pallet->id,
                    'scanned_barcode_value' => $palletBarcode,
                    'expected' => false,
                    'scanned' => true,
                    'outcome' => 'UNEXPECTED',
                    'system_location_id' => $systemLocation,
                    'scanned_at' => now(),
                ]);
            }

            $this->recount($verification);

            return $line;
        });
    }

    public function submit(int $verificationId): StockVerification
    {
        return DB::transaction(function () use ($verificationId) {
            $verification = StockVerification::whereKey($verificationId)->lockForUpdate()->firstOrFail();

            if ($verification->status !== 'DRAFT') {
                throw new BusinessRuleException('VERIFICATION_CLOSED', 'This count has already been submitted.', 409);
            }

            $this->recount($verification);
            $verification->forceFill(['status' => 'SUBMITTED', 'submitted_at' => now()])->save();

            return $verification->refresh();
        });
    }

    public function review(int $verificationId, bool $approve, ?string $remarks): StockVerification
    {
        return DB::transaction(function () use ($verificationId, $approve, $remarks) {
            $verification = StockVerification::whereKey($verificationId)->lockForUpdate()->firstOrFail();

            if ($verification->status !== 'SUBMITTED') {
                throw new BusinessRuleException('VERIFICATION_NOT_SUBMITTED', 'Only a submitted count can be reviewed.', 409);
            }

            $verification->forceFill([
                'status' => $approve ? 'APPROVED' : 'REJECTED',
                'reviewed_by' => Auth::id(),
                'reviewed_at' => now(),
                'review_remarks' => $remarks,
            ])->save();

            return $verification->refresh();
        });
    }

    private function recount(StockVerification $verification): void
    {
        $lines = StockVerificationLine::where('stock_verification_id', $verification->id)->get();

        $verification->forceFill([
            'scanned_count' => $lines->where('scanned', true)->count(),
            'matched_count' => $lines->where('outcome', 'MATCHED')->count(),
            'missing_count' => $lines->where('outcome', 'MISSING')->count(),
            'unexpected_count' => $lines->where('outcome', 'UNEXPECTED')->count(),
        ])->save();
    }
}
