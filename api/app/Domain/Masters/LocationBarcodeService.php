<?php

namespace App\Domain\Masters;

use App\Models\Location;
use App\Models\LocationBarcode;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use Illuminate\Support\Facades\DB;

/**
 * Location barcode identity (docs/11 §3).
 *
 * LB-03 is the rule most easily broken by a careless implementation: a
 * "regenerate" button beside "reprint" is all it takes. There is no regenerate
 * method here, and reprint() cannot write barcode_value — the column is not
 * fillable and nothing assigns it outside generate().
 */
class LocationBarcodeService
{
    public function generate(Location $location): LocationBarcode
    {
        return DB::transaction(function () use ($location) {
            $existing = LocationBarcode::where('location_id', $location->id)->first();
            if ($existing !== null) {
                return $existing; // LB-01: one identity per location, for ever.
            }

            $location->loadMissing(['facility', 'zone']);

            $barcode = new LocationBarcode([
                'location_id' => $location->id,
                'symbology' => config('alutrack.location_symbology', 'CODE128'),
                'source' => 'SYSTEM_GENERATED',
            ]);
            // Assigned here and nowhere else.
            $barcode->barcode_value = $this->buildValue($location);
            $barcode->save();

            AuditLogger::record('barcode.generated', $location, [], ['barcode_value' => $barcode->barcode_value]);

            return $barcode;
        });
    }

    public function markPrinted(LocationBarcode $barcode): LocationBarcode
    {
        $barcode->forceFill([
            'first_printed_at' => $barcode->first_printed_at ?? now(),
            'last_printed_at' => now(),
        ])->save();

        AuditLogger::record('barcode.printed', $barcode->location, [], ['barcode_value' => $barcode->barcode_value]);

        return $barcode->refresh();
    }

    /** Reproduces the SAME value. Identity never changes here (LB-03). */
    public function reprint(LocationBarcode $barcode, ?string $reason): LocationBarcode
    {
        $valueBefore = $barcode->barcode_value;

        $barcode->forceFill([
            'last_printed_at' => now(),
            'reprint_count' => $barcode->reprint_count + 1,
        ])->save();

        $barcode->refresh();

        if ($barcode->barcode_value !== $valueBefore) {
            // Defensive: a reprint that changed identity would be a serious defect.
            throw new BusinessRuleException('BARCODE_IDENTITY_CHANGED', 'Reprint must not change the barcode value.', 500);
        }

        AuditLogger::record('barcode.reprinted', $barcode->location, [], [
            'barcode_value' => $barcode->barcode_value,
            'reprint_count' => $barcode->reprint_count,
            'reason' => $reason,
        ]);

        return $barcode;
    }

    /**
     * CFG-21 pattern. The default is a placeholder that produces valid, unique
     * codes — it is NOT presented as the customer's numbering convention (OI-03).
     */
    private function buildValue(Location $location): string
    {
        $pattern = config('alutrack.location_barcode_pattern', 'LOC-{site}-{facility}-{code}');

        $value = strtr($pattern, [
            '{site}' => (string) $location->site_id,
            '{facility}' => $location->facility->code ?? (string) $location->facility_id,
            '{zone}' => $location->zone->code ?? '',
            '{code}' => $location->code,
            '{seq}' => (string) $location->id,
        ]);

        return strtoupper(preg_replace('/[^A-Za-z0-9\-_]/', '-', $value) ?? $value);
    }
}
