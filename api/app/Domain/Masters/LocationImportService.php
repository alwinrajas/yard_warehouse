<?php

namespace App\Domain\Masters;

use App\Models\Facility;
use App\Models\ImportBatch;
use App\Models\Location;
use App\Models\Zone;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Location import (docs/23 W-23a).
 *
 * Two phases, deliberately: a dry run validates every row and stores the result,
 * then a separate explicit commit writes. Nothing reaches the database until the
 * user has seen the row-level errors, and the commit is all-or-nothing so a
 * partially-imported hierarchy cannot exist (mandate §19).
 *
 * Invalid rows are never silently skipped — the commit refuses while any row is
 * invalid.
 */
class LocationImportService
{
    public const HEADERS = ['facility_code', 'zone_code', 'location_code', 'description', 'location_type', 'capacity', 'sequence'];

    private const MAX_ROWS = 5000;

    public function __construct(private readonly LocationService $locations) {}

    /** Parses and validates without writing any location. */
    public function validateFile(UploadedFile $file, int $siteId): ImportBatch
    {
        $rows = $this->parse($file);

        $batch = ImportBatch::create([
            'type' => 'LOCATION',
            'original_filename' => $file->getClientOriginalName(),
            'status' => 'VALIDATING',
            'site_id' => $siteId,
            'uploaded_by' => Auth::id(),
        ]);

        [$valid, $errors] = $this->validateRows($rows, $siteId);

        $batch->update([
            'status' => $errors === [] ? 'VALIDATED' : 'FAILED',
            'total_rows' => count($rows),
            'valid_rows' => count($valid),
            'error_rows' => count($errors),
            'validated_payload' => $errors === [] ? $valid : null,
            'errors' => $errors ?: null,
        ]);

        AuditLogger::record('location.import_validated', $batch, [], [
            'total' => count($rows),
            'valid' => count($valid),
            'errors' => count($errors),
        ]);

        return $batch->refresh();
    }

    /** Commits a previously validated batch. All rows or none. */
    public function commit(ImportBatch $batch): ImportBatch
    {
        if ($batch->status === 'COMMITTED') {
            throw new BusinessRuleException('IMPORT_ALREADY_COMMITTED', 'This import has already been committed.', 409);
        }

        if ($batch->status !== 'VALIDATED' || empty($batch->validated_payload)) {
            throw new BusinessRuleException(
                'IMPORT_NOT_VALIDATED',
                'This import cannot be committed because it did not pass validation. Correct the file and upload it again.',
                422,
            );
        }

        return DB::transaction(function () use ($batch) {
            foreach ($batch->validated_payload as $row) {
                // Re-check uniqueness inside the transaction: another import or a
                // manual create may have taken the code since validation ran.
                $this->locations->assertCodeAvailable((int) $row['site_id'], $row['code']);

                Location::create([
                    'site_id' => $row['site_id'],
                    'facility_id' => $row['facility_id'],
                    'zone_id' => $row['zone_id'],
                    'code' => $row['code'],
                    'description' => $row['description'],
                    'location_type' => $row['location_type'],
                    'capacity' => $row['capacity'],
                    'sequence' => $row['sequence'],
                    'is_active' => true,
                    'created_by' => Auth::id(),
                    'updated_by' => Auth::id(),
                ]);
            }

            $batch->update([
                'status' => 'COMMITTED',
                'committed_by' => Auth::id(),
                'committed_at' => now(),
            ]);

            AuditLogger::record('location.import_committed', $batch, [], [
                'rows' => count($batch->validated_payload),
            ]);

            return $batch->refresh();
        });
    }

    /** @return array<int, array<string, string>> */
    private function parse(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if ($handle === false) {
            throw new BusinessRuleException('FILE_UNREADABLE', 'The uploaded file could not be read.', 422);
        }

        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            throw new BusinessRuleException('FILE_EMPTY', 'The uploaded file is empty.', 422);
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $missing = array_diff(['facility_code', 'location_code'], $header);
        if ($missing !== []) {
            fclose($handle);
            throw new BusinessRuleException(
                'FILE_HEADERS_INVALID',
                'The file must contain at least the columns: '.implode(', ', self::HEADERS).'.',
                422,
                ['missing' => array_values($missing)],
            );
        }

        $rows = [];
        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) === 1 && ($line[0] === null || trim((string) $line[0]) === '')) {
                continue;
            }
            $row = [];
            foreach ($header as $index => $name) {
                $row[$name] = isset($line[$index]) ? trim((string) $line[$index]) : '';
            }
            if (implode('', $row) === '') {
                continue;
            }
            $rows[] = $row;

            if (count($rows) > self::MAX_ROWS) {
                fclose($handle);
                throw new BusinessRuleException(
                    'FILE_TOO_LARGE',
                    'This file exceeds '.self::MAX_ROWS.' rows. Split it and import in batches.',
                    422,
                );
            }
        }
        fclose($handle);

        return $rows;
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>} */
    private function validateRows(array $rows, int $siteId): array
    {
        $facilities = Facility::where('site_id', $siteId)->get()->keyBy('code');
        $zones = Zone::whereIn('facility_id', $facilities->pluck('id'))->get();
        $existingCodes = Location::withTrashed()->where('site_id', $siteId)->pluck('code')->flip();

        $valid = [];
        $errors = [];
        $seen = [];

        foreach ($rows as $index => $row) {
            $line = $index + 2; // +1 for the header, +1 for 1-based numbering
            $rowErrors = [];

            $code = $row['location_code'] ?? '';
            $facilityCode = $row['facility_code'] ?? '';
            $zoneCode = $row['zone_code'] ?? '';

            if ($code === '') {
                $rowErrors[] = 'location_code is required.';
            } elseif (strlen($code) > 60) {
                $rowErrors[] = 'location_code must be 60 characters or fewer.';
            } elseif (isset($existingCodes[$code])) {
                $rowErrors[] = "Location code \"{$code}\" already exists in this site.";
            } elseif (isset($seen[$code])) {
                $rowErrors[] = "Location code \"{$code}\" is duplicated in this file (also on line {$seen[$code]}).";
            }

            $facility = $facilityCode === '' ? null : $facilities->get($facilityCode);
            if ($facilityCode === '') {
                $rowErrors[] = 'facility_code is required.';
            } elseif ($facility === null) {
                $rowErrors[] = "Facility \"{$facilityCode}\" does not exist in this site.";
            } elseif (! $facility->is_active) {
                $rowErrors[] = "Facility \"{$facilityCode}\" is inactive.";
            }

            $zoneId = null;
            if ($zoneCode !== '' && $facility !== null) {
                $zone = $zones->first(fn ($z) => $z->facility_id === $facility->id && $z->code === $zoneCode);
                if ($zone === null) {
                    $rowErrors[] = "Zone \"{$zoneCode}\" does not belong to facility \"{$facilityCode}\".";
                } elseif (! $zone->is_active) {
                    $rowErrors[] = "Zone \"{$zoneCode}\" is inactive.";
                } else {
                    $zoneId = $zone->id;
                }
            }

            $type = strtoupper($row['location_type'] ?? '') ?: 'STORAGE';
            if (! in_array($type, Location::TYPES, true)) {
                $rowErrors[] = 'location_type must be one of: '.implode(', ', Location::TYPES).'.';
            }

            $capacity = ($row['capacity'] ?? '') === '' ? null : $row['capacity'];
            if ($capacity !== null && (! ctype_digit((string) $capacity) || (int) $capacity < 1)) {
                $rowErrors[] = 'capacity must be a positive whole number, or left blank.';
            }

            $sequence = ($row['sequence'] ?? '') === '' ? 0 : $row['sequence'];
            if (! is_numeric($sequence)) {
                $rowErrors[] = 'sequence must be a number, or left blank.';
            }

            if ($rowErrors !== []) {
                $errors[] = ['line' => $line, 'code' => $code, 'errors' => $rowErrors];

                continue;
            }

            $seen[$code] = $line;
            $valid[] = [
                'line' => $line,
                'site_id' => $siteId,
                'facility_id' => $facility->id,
                'zone_id' => $zoneId,
                'code' => $code,
                'description' => ($row['description'] ?? '') ?: null,
                'location_type' => $type,
                'capacity' => $capacity === null ? null : (int) $capacity,
                'sequence' => (int) $sequence,
            ];
        }

        return [$valid, $errors];
    }
}
