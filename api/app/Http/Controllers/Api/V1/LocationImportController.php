<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Masters\LocationImportService;
use App\Http\Controllers\Controller;
use App\Http\Resources\ImportBatchResource;
use App\Models\ImportBatch;
use App\Support\ApiResponse;
use App\Support\BusinessRuleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LocationImportController extends Controller
{
    public function __construct(private readonly LocationImportService $service) {}

    /** Dry run. Validates and reports; writes no locations. */
    public function validateUpload(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimetypes:text/plain,text/csv,application/csv,application/vnd.ms-excel', 'max:5120'],
            'site_id' => ['required', 'integer', 'exists:sites,id'],
        ]);

        $user = $request->user();
        if ($user->site_id !== null && (int) $data['site_id'] !== $user->site_id) {
            throw BusinessRuleException::outOfScope();
        }

        $batch = $this->service->validateFile($request->file('file'), (int) $data['site_id']);

        return ApiResponse::resource(new ImportBatchResource($batch), 201);
    }

    public function commit(Request $request, ImportBatch $importBatch): JsonResponse
    {
        if ($importBatch->type !== 'LOCATION') {
            throw new BusinessRuleException('IMPORT_TYPE_MISMATCH', 'This batch is not a location import.', 422);
        }

        $user = $request->user();
        if ($user->site_id !== null && $importBatch->site_id !== $user->site_id) {
            throw BusinessRuleException::outOfScope();
        }

        return ApiResponse::resource(new ImportBatchResource($this->service->commit($importBatch)));
    }

    public function show(ImportBatch $importBatch): JsonResponse
    {
        return ApiResponse::resource(new ImportBatchResource($importBatch));
    }

    /** The template, so nobody has to guess the column names. */
    public function template(): Response
    {
        $csv = implode(',', LocationImportService::HEADERS)."\n"
            .'YD-A,ZONE-A,YD-A-01-001,Row 1 bay 1,STORAGE,2,10'."\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="alutrack-location-import-template.csv"',
        ]);
    }
}
