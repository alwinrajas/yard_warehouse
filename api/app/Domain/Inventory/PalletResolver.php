<?php

namespace App\Domain\Inventory;

use App\Models\Customer;
use App\Models\Pallet;
use App\Support\BusinessRuleException;

/**
 * Pallet identity (docs/02 §6.3).
 *
 * Phase 1 decodes with the RAW_REFERENCE profile: we store exactly what was
 * scanned. No field layout is invented before real ERP labels arrive (OI-01).
 * The raw value is always kept so records can be re-parsed later rather than
 * re-scanned in the yard.
 *
 * This class is the seam a future ErpPalletResolver replaces; nothing else in
 * the codebase needs to know an ERP exists.
 */
class PalletResolver
{
    /** CFG-01. Default JOB_PALLET: the safe superset (docs/01 AMB-01). */
    public function uniquenessRule(): string
    {
        return config('alutrack.pallet_uniqueness', 'JOB_PALLET');
    }

    /**
     * Decodes a scanned barcode into an identity.
     *
     * @return array{job_number: ?string, pallet_number: ?string, raw_value: string, profile: string}
     */
    public function parse(string $barcode): array
    {
        $raw = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', $barcode) ?? '');

        if ($raw === '') {
            throw new BusinessRuleException(
                'PALLET_BARCODE_UNREADABLE',
                'That barcode could not be read. Scan it again, or enter the pallet manually.',
                422,
            );
        }

        if (mb_strlen($raw) > 255) {
            throw new BusinessRuleException('PALLET_BARCODE_INVALID', 'That barcode is not a valid pallet label.', 422);
        }

        // RAW_REFERENCE: the whole value is the reference. Job and pallet numbers
        // are populated by import until OI-01 confirms the encoded structure.
        return ['job_number' => null, 'pallet_number' => $raw, 'raw_value' => $raw, 'profile' => 'RAW_REFERENCE'];
    }

    public function buildKey(?string $jobNumber, ?string $palletNumber, string $rawValue): string
    {
        if ($this->uniquenessRule() === 'PALLET_ONLY') {
            return $palletNumber ?? $rawValue;
        }

        return $jobNumber !== null && $jobNumber !== ''
            ? $jobNumber.'::'.($palletNumber ?? $rawValue)
            : ($palletNumber ?? $rawValue);
    }

    /** Finds the pallet, creating it on first sight (ASM-03). */
    public function resolve(string $barcode, bool $createIfMissing = true): Pallet
    {
        $parsed = $this->parse($barcode);
        $key = $this->buildKey($parsed['job_number'], $parsed['pallet_number'], $parsed['raw_value']);

        $pallet = Pallet::where('pallet_key', $key)->first();

        if ($pallet !== null) {
            return $pallet;
        }

        if (! $createIfMissing) {
            throw new BusinessRuleException(
                'PALLET_NOT_FOUND',
                'No pallet is recorded with that barcode.',
                404,
                ['barcode' => $parsed['raw_value']],
            );
        }

        return Pallet::create([
            'pallet_key' => $key,
            'job_number' => $parsed['job_number'],
            'pallet_number' => $parsed['pallet_number'],
            'raw_barcode_value' => $parsed['raw_value'],
            'barcode_profile' => $parsed['profile'],
        ]);
    }

    /** Enriches a pallet with imported job/customer data, if any matches. */
    public function enrich(Pallet $pallet, ?string $customerCode, ?string $lpo): Pallet
    {
        if ($customerCode !== null) {
            $customer = Customer::where('code', $customerCode)->first();
            if ($customer !== null) {
                $pallet->customer_id = $customer->id;
            }
            $pallet->customer_name_raw = $customerCode;
        }
        if ($lpo !== null) {
            $pallet->lpo_number = $lpo;
        }
        $pallet->save();

        return $pallet;
    }
}
