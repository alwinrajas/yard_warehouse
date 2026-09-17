<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SystemSettingResource;
use App\Models\SystemSetting;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\BusinessRuleException;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * System settings (S-41, docs/05 §7).
 *
 * The register is reference data with a value attached; this endpoint changes
 * the value and nothing else. Keys, types and allowed values come from the
 * seeder, so a client cannot introduce a setting the system does not know.
 */
class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = SystemSetting::with('updatedBy')
            ->orderBy('reference')
            ->get();

        return ApiResponse::success(SystemSettingResource::collection($settings)->resolve());
    }

    public function update(Request $request, SystemSetting $setting): JsonResponse
    {
        if ($setting->isLocked()) {
            throw new BusinessRuleException(
                'SETTING_LOCKED',
                $setting->lockedReason() ?? 'This setting cannot be changed.',
                409,
                ['reference' => $setting->reference],
            );
        }

        $data = $request->validate(['value' => ['present']]);
        $value = $this->normalise($setting, $data['value']);

        $before = $setting->getAttributes();

        $setting->forceFill(['value' => $value, 'updated_by' => $request->user()->id])->save();

        // Every configuration change is audited with both values (BRD §15): a
        // setting that quietly changed is indistinguishable from a bug later.
        AuditLogger::record(
            'setting.updated',
            $setting,
            ['value' => $before['value'] ?? null],
            ['value' => $value],
            ['reference' => $setting->reference, 'key' => $setting->key],
        );

        Settings::forget();

        return ApiResponse::resource(new SystemSettingResource($setting->load('updatedBy')));
    }

    /** Validates against the setting's own declared type and allowed values. */
    private function normalise(SystemSetting $setting, mixed $value): string
    {
        $fail = fn (string $message) => throw new BusinessRuleException(
            'SETTING_INVALID',
            $message,
            422,
            ['reference' => $setting->reference, 'type' => $setting->type],
        );

        switch ($setting->type) {
            case 'INT':
                if (! is_numeric($value) || (int) $value != $value) {
                    $fail('This setting must be a whole number.');
                }

                return (string) (int) $value;

            case 'BOOL':
                if (! is_bool($value) && ! in_array($value, ['true', 'false', 0, 1, '0', '1'], true)) {
                    $fail('This setting must be true or false.');
                }

                return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';

            case 'ENUM':
                $allowed = $setting->allowed_values ?? [];
                if (! in_array($value, $allowed, true)) {
                    $fail('Choose one of: '.implode(', ', $allowed).'.');
                }

                return (string) $value;

            case 'JSON':
                $decoded = is_string($value) ? json_decode($value, true) : $value;
                if (! is_array($decoded)) {
                    $fail('This setting must be valid JSON.');
                }

                return json_encode($decoded);

            default:
                if (! is_string($value) || trim($value) === '') {
                    $fail('This setting cannot be empty.');
                }

                return trim($value);
        }
    }
}
