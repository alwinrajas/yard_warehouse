<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property bool $is_active
 * @property bool $must_change_password
 * @property Carbon|null $locked_until
 * @property Carbon|null $password_changed_at
 * @property Carbon|null $last_login_at
 * @property int|null $role_id
 * @property int|null $site_id
 * @property-read Role|null $role
 * @property-read Site|null $site
 * @property-read Collection<int, Facility> $facilities
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'employee_code', 'name', 'username', 'email', 'password',
        'role_id', 'site_id', 'is_active', 'must_change_password',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'password_changed_at' => 'datetime',
            'last_login_at' => 'datetime',
            'locked_until' => 'datetime',
            'email_verified_at' => 'datetime',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(Facility::class, 'user_facility_access');
    }

    /** @var string[]|null */
    private ?array $permissionCache = null;

    /** @return string[] */
    public function permissionCodes(): array
    {
        if ($this->permissionCache !== null) {
            return $this->permissionCache;
        }

        $this->permissionCache = $this->role_id === null
            ? []
            : Permission::query()
                ->join('role_permissions', 'permissions.id', '=', 'role_permissions.permission_id')
                ->where('role_permissions.role_id', $this->role_id)
                ->pluck('permissions.code')
                ->all();

        return $this->permissionCache;
    }

    public function hasPermission(string $code): bool
    {
        return in_array($code, $this->permissionCodes(), true);
    }

    /**
     * Facility ids this user is restricted to.
     *
     * An empty array means all facilities WITHIN the user's site — not all
     * facilities everywhere (docs/07 §4 rule SC-02).
     *
     * @return int[]
     */
    public function facilityAccessIds(): array
    {
        return $this->facilities()->pluck('facilities.id')->all();
    }

    public function canAccessFacility(int $facilityId): bool
    {
        $allowed = $this->facilityAccessIds();

        return $allowed === [] || in_array($facilityId, $allowed, true);
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }
}
