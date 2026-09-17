<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $reference
 * @property string $key
 * @property string $group_name
 * @property string $type
 * @property string|null $value
 * @property string|null $default_value
 * @property array|null $allowed_values
 * @property string $description
 * @property string|null $notes
 * @property string|null $open_item
 * @property bool $locks_after_first_transaction
 * @property bool $is_editable
 * @property bool $requires_confirmation
 */
class SystemSetting extends Model
{
    protected $fillable = [
        'reference', 'key', 'group_name', 'type', 'value', 'default_value',
        'allowed_values', 'description', 'notes', 'open_item',
        'locks_after_first_transaction', 'is_editable', 'requires_confirmation',
        'updated_by',
    ];

    protected $attributes = [
        'locks_after_first_transaction' => false,
        'is_editable' => true,
        'requires_confirmation' => false,
    ];

    protected function casts(): array
    {
        return [
            'allowed_values' => 'array',
            'locks_after_first_transaction' => 'boolean',
            'is_editable' => 'boolean',
            'requires_confirmation' => 'boolean',
        ];
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Whether this setting can still be changed.
     *
     * CFG-01 defines what "the same pallet" means; changing it once pallets
     * exist would silently redefine identity for everything already recorded.
     */
    public function isLocked(): bool
    {
        if (! $this->is_editable) {
            return true;
        }

        return $this->locks_after_first_transaction && InventoryTransaction::query()->exists();
    }

    public function lockedReason(): ?string
    {
        if (! $this->is_editable) {
            return 'This setting is fixed for this deployment.';
        }

        if ($this->locks_after_first_transaction && InventoryTransaction::query()->exists()) {
            return 'Locked: transactions have been recorded against the current value. Changing it would redefine pallet identity for inventory that already exists.';
        }

        return null;
    }

    /** The stored string, returned as the type the setting declares. */
    public function typedValue(): mixed
    {
        return self::cast($this->type, $this->value);
    }

    public static function cast(string $type, ?string $raw): mixed
    {
        if ($raw === null) {
            return null;
        }

        return match ($type) {
            'INT' => (int) $raw,
            'BOOL' => filter_var($raw, FILTER_VALIDATE_BOOLEAN),
            'JSON' => json_decode($raw, true),
            default => $raw,
        };
    }
}
