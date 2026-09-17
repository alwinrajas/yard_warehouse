<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

/**
 * The configuration register, exactly as docs/05 §7 defines it.
 *
 * Reference data, not customer configuration: every default is the documented
 * one, and the settings whose real values are still open carry the open-item id
 * so S-41 can show what each one is waiting on. Re-running never overwrites a
 * value an administrator has set — only the metadata around it.
 */
class SystemSettingSeeder extends Seeder
{
    /** @var list<array{0: string, 1: string, 2: string, 3: string, 4: string, 5: list<string>|null, 6: string, 7: string|null, 8: string|null, 9: bool, 10: bool}> */
    private const REGISTER = [
        ['CFG-01', 'pallet.uniqueness_rule', 'Identity', 'ENUM', 'JOB_PALLET', ['JOB_PALLET', 'PALLET_ONLY'], 'How a pallet is uniquely identified.', 'Locks after the first transaction — it defines what "the same pallet" means.', 'OI-02', true, true],
        ['CFG-02', 'barcode.active_profile', 'Barcode', 'STRING', 'RAW_REFERENCE', null, 'Decoding profile applied to scanned pallet labels.', 'Awaiting sample ERP labels.', 'OI-01', false, true],
        ['CFG-03', 'barcode.location_symbology', 'Barcode', 'ENUM', 'CODE128', ['CODE128', 'QR', 'DATAMATRIX'], 'Symbology used when generating location labels.', null, 'OI-13', false, false],
        ['CFG-04', 'ageing.buckets', 'Inventory', 'JSON', '[7,15,30]', null, 'Upper bound in days of each ageing bucket.', 'Bucket colours are fixed tokens; only the boundaries are configurable.', 'OI-10', false, false],
        ['CFG-05', 'scan.duplicate_window_ms', 'Scanning', 'INT', '800', null, 'A repeat scan inside this window is discarded as a bounce.', null, null, false, false],
        ['CFG-06', 'location.capacity_enforcement', 'Inventory', 'ENUM', 'OFF', ['OFF', 'WARN', 'BLOCK'], 'What happens when a put-away would exceed a location capacity.', 'BLOCK refuses the transaction outright.', 'OI-04', false, true],
        ['CFG-07', 'ageing.alert_threshold_days', 'Inventory', 'INT', '30', null, 'Age at which a pallet is surfaced as an alert on the dashboard.', null, 'OI-10', false, false],
        ['CFG-08', 'transfer.mode', 'Operations', 'ENUM', 'SINGLE_STEP', ['SINGLE_STEP', 'TWO_STEP'], 'Whether a movement is one action or a pick then a place.', 'TWO_STEP introduces the IN_MOVEMENT status.', null, false, true],
        ['CFG-09', 'dispatch.mode', 'Operations', 'ENUM', 'DIRECT', ['DIRECT', 'STAGED'], 'Whether dispatch happens from storage or via a staging area.', null, 'OI-09', false, true],
        ['CFG-10', 'password.policy', 'Security', 'JSON', '{"min_length":12,"require_mixed_case":true,"require_digit":true,"require_symbol":true,"max_attempts":5,"lockout_minutes":15}', null, 'Password composition and lockout policy.', 'Placeholder — confirm against the customer IT policy.', 'OI-15', false, true],
        ['CFG-11', 'session.idle_timeout_minutes', 'Security', 'INT', '480', null, 'Idle minutes before a session is ended.', 'Placeholder — confirm against the customer IT policy.', 'OI-15', false, true],
        ['CFG-12', 'idempotency.ttl_hours', 'Operations', 'INT', '24', null, 'How long an idempotency key is honoured for replay.', null, null, false, false],
        ['CFG-13', 'app.timezone', 'General', 'STRING', 'UTC', null, 'The timezone every date and "today" figure is calculated in.', 'MUST be confirmed before go-live. A wrong value silently corrupts every daily KPI.', 'OI-19', false, true],
        ['CFG-14', 'web.poll_interval_seconds', 'General', 'INT', '15', null, 'How often live screens refresh.', null, null, false, false],
        ['CFG-15', 'pda.retry_attempts', 'PDA', 'INT', '3', null, 'Automatic retries before the PDA reports a transaction as failed.', null, null, false, false],
        ['CFG-16', 'dispatch.require_delivery_reference', 'Operations', 'BOOL', 'false', null, 'Whether a delivery reference is mandatory on dispatch.', null, 'OI-16', false, false],
        ['CFG-17', 'openingstock.mode_enabled', 'Go-live', 'BOOL', 'false', null, 'Enables opening-stock capture.', 'Intended for go-live only. Leave off once normal operation begins.', 'OI-20', false, true],
        ['CFG-18', 'report.default_page_size', 'Reporting', 'INT', '50', null, 'Default rows per page in reports.', null, 'OI-10', false, false],
        ['CFG-19', 'alerts.email_enabled', 'Alerts', 'BOOL', 'false', null, 'Whether ageing and exception alerts are emailed.', 'Optional per BRD §16.', null, false, false],
        ['CFG-20', 'auth.single_active_pda_session', 'Security', 'BOOL', 'true', null, 'Only one active PDA session per user.', 'Makes "no shared credentials" operationally true rather than a policy statement.', null, false, true],
        ['CFG-21', 'barcode.location_pattern', 'Barcode', 'STRING', 'LOC-{site}-{facility}-{zone}-{seq}', null, 'Pattern for system-generated location barcode values.', 'Ignored when location codes are customer-provided.', 'OI-03', false, true],
    ];

    public function run(): void
    {
        foreach (self::REGISTER as [$ref, $key, $group, $type, $default, $allowed, $description, $notes, $openItem, $locks, $confirm]) {
            $existing = SystemSetting::where('key', $key)->first();

            SystemSetting::updateOrCreate(
                ['key' => $key],
                [
                    'reference' => $ref,
                    'group_name' => $group,
                    'type' => $type,
                    // An administrator's value survives reseeding; only a new
                    // setting takes the documented default.
                    'value' => $existing?->value ?? $default,
                    'default_value' => $default,
                    'allowed_values' => $allowed,
                    'description' => $description,
                    'notes' => $notes,
                    'open_item' => $openItem,
                    'locks_after_first_transaction' => $locks,
                    'requires_confirmation' => $confirm,
                    'is_editable' => true,
                ],
            );
        }
    }
}
