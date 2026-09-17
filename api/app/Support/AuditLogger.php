<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Audit writer (BRD §15, docs/09 §8).
 *
 * Append-only. There is no update or delete path for audit_logs anywhere in the
 * application, and the table has no updated_at column to support one.
 */
final class AuditLogger
{
    public static function record(
        string $event,
        ?Model $subject = null,
        array $oldValues = [],
        array $newValues = [],
        array $context = [],
    ): void {
        $request = request();

        AuditLog::create([
            'event' => $event,
            'auditable_type' => $subject ? $subject::class : null,
            'auditable_id' => $subject?->getKey(),
            'user_id' => Auth::id(),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255) ?: null,
            'old_values' => $oldValues ?: null,
            'new_values' => $newValues ?: null,
            'context' => array_filter([
                'correlation_id' => $request->attributes->get('correlation_id'),
            ] + $context) ?: null,
        ]);
    }

    /** Records a master-data change with only the attributes that actually changed. */
    public static function recordChange(string $event, Model $model, array $before): void
    {
        $after = $model->getAttributes();
        $changed = [];
        foreach ($after as $key => $value) {
            if (($before[$key] ?? null) != $value) {
                $changed[$key] = $value;
            }
        }
        unset($changed['updated_at']);

        if ($changed === []) {
            return;
        }

        self::record($event, $model, array_intersect_key($before, $changed), $changed);
    }
}
