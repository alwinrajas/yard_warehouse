<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\InventoryCurrent;
use App\Models\Location;
use App\Models\LocationBarcode;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Zone;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Role administration, system settings and opening stock (S-40, S-41, S-42).
 *
 * The interesting behaviour in all three is refusal: what an administrator is
 * NOT allowed to do. A role screen that can grant anything is a privilege
 * escalation, a settings screen that can change a locked setting corrupts
 * identity, and an opening-stock endpoint that skips the invariant is a second,
 * looser way into live inventory.
 */
class AdministrationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
        Settings::forget();
    }

    // ---------------------------------------------------------------- roles

    public function test_lists_roles_with_their_counts(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $rows = $this->actingAs($admin)->getJson('/api/v1/roles')->assertOk()->json('data');

        $this->assertCount(5, $rows);
        $codes = array_column($rows, 'code');
        foreach (['SUPER_ADMIN', 'YARD_ADMIN', 'SUPERVISOR', 'PDA_OPERATOR', 'VIEWER'] as $code) {
            $this->assertContains($code, $codes);
        }
        $this->assertGreaterThan(0, $rows[0]['permission_count']);
    }

    public function test_an_administrator_cannot_grant_a_permission_they_do_not_hold(): void
    {
        // A delegated administrator: allowed to manage roles, not allowed to
        // dispatch. Without the escalation guard, role.edit would silently be
        // worth every permission in the system.
        $delegate = Role::create([
            'code' => 'ROLE_MANAGER', 'name' => 'Role Manager', 'is_system' => false, 'is_active' => true,
        ]);
        $delegate->permissions()->sync(
            Permission::whereIn('code', ['role.view', 'role.edit', 'dashboard.view', 'inventory.view'])->pluck('id'),
        );
        $actor = User::factory()->create(['role_id' => $delegate->id, 'is_active' => true]);

        $this->assertFalse($actor->hasPermission('dispatch.perform'));

        $target = Role::where('code', 'VIEWER')->firstOrFail();

        $response = $this->actingAs($actor)->putJson("/api/v1/roles/{$target->id}", [
            'name' => 'Management / Viewer',
            'permissions' => ['dashboard.view', 'dispatch.perform'],
        ]);

        // The route allows the call — this is the guard inside it.
        $this->assertApiError($response, 'PERMISSION_NOT_HELD', 403);
        $this->assertSame(['dispatch.perform'], $response->json('error.details.permissions'));

        // And nothing was granted.
        $this->assertNotContains('dispatch.perform', $target->permissions()->pluck('code')->all());
    }

    public function test_nobody_can_edit_the_role_they_are_signed_in_under(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $this->assertApiError(
            $this->actingAs($admin)->putJson("/api/v1/roles/{$admin->role_id}", ['name' => 'Renamed']),
            'CANNOT_EDIT_OWN_ROLE',
            403,
        );
    }

    public function test_creates_a_role_and_records_the_grant_in_the_audit_trail(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $response = $this->actingAs($admin)->postJson('/api/v1/roles', [
            'code' => 'GATE_CLERK',
            'name' => 'Gate Clerk',
            'description' => 'Reads inventory at the gate.',
            'permissions' => ['dashboard.view', 'inventory.view'],
        ]);

        $response->assertCreated()->assertJsonPath('data.code', 'GATE_CLERK');
        $this->assertSame(2, $response->json('data.permission_count'));
        $this->assertDatabaseHas('audit_logs', ['event' => 'role.created']);
    }

    public function test_rejects_an_unknown_permission_without_leaking_the_vocabulary(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/roles', [
                'code' => 'BAD_ROLE',
                'name' => 'Bad',
                'permissions' => ['inventory.view', 'not.a.permission'],
            ]),
            'UNKNOWN_PERMISSION',
            422,
        );

        $this->assertDatabaseMissing('roles', ['code' => 'BAD_ROLE']);
    }

    public function test_built_in_roles_cannot_be_deleted_or_deactivated(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $viewer = Role::where('code', 'VIEWER')->firstOrFail();

        $this->assertApiError(
            $this->actingAs($admin)->deleteJson("/api/v1/roles/{$viewer->id}"),
            'SYSTEM_ROLE_PROTECTED',
            422,
        );

        $this->assertApiError(
            $this->actingAs($admin)->putJson("/api/v1/roles/{$viewer->id}", [
                'name' => 'Management / Viewer',
                'is_active' => false,
            ]),
            'SYSTEM_ROLE_REQUIRED',
            422,
        );
    }

    public function test_a_role_with_users_cannot_be_deleted(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $role = Role::create(['code' => 'TEMP_ROLE', 'name' => 'Temp', 'is_system' => false, 'is_active' => true]);
        $role->permissions()->sync(Permission::where('code', 'dashboard.view')->pluck('id'));

        $this->actingAs($admin)->deleteJson("/api/v1/roles/{$role->id}")->assertOk();

        $role2 = Role::create(['code' => 'TEMP_ROLE_2', 'name' => 'Temp 2', 'is_system' => false, 'is_active' => true]);
        User::factory()->create(['role_id' => $role2->id]);

        $this->assertApiError(
            $this->actingAs($admin)->deleteJson("/api/v1/roles/{$role2->id}"),
            'ROLE_IN_USE',
            409,
        );
    }

    public function test_a_supervisor_cannot_reach_role_administration_at_all(): void
    {
        $supervisor = $this->userWithRole('SUPERVISOR');

        $this->actingAs($supervisor)->getJson('/api/v1/roles')->assertForbidden();
        $this->actingAs($supervisor)->postJson('/api/v1/roles', ['code' => 'X', 'name' => 'X'])->assertForbidden();
    }

    // ------------------------------------------------------------- settings

    public function test_the_configuration_register_is_complete(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $rows = $this->actingAs($admin)->getJson('/api/v1/settings')->assertOk()->json('data');

        // docs/05 §7 defines CFG-01 … CFG-21. A missing row means a value is
        // living in a PHP literal somewhere instead.
        $this->assertCount(21, $rows);
        $this->assertSame('CFG-01', $rows[0]['reference']);
        $this->assertSame('CFG-21', $rows[20]['reference']);
    }

    public function test_updates_a_setting_and_audits_both_values(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $setting = SystemSetting::where('key', 'web.poll_interval_seconds')->firstOrFail();

        $this->actingAs($admin)
            ->putJson("/api/v1/settings/{$setting->id}", ['value' => 30])
            ->assertOk()
            ->assertJsonPath('data.value', '30')
            ->assertJsonPath('data.is_default', false);

        $this->assertDatabaseHas('audit_logs', ['event' => 'setting.updated']);
    }

    public function test_rejects_a_value_the_setting_does_not_allow(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');

        $enum = SystemSetting::where('key', 'location.capacity_enforcement')->firstOrFail();
        $this->assertApiError(
            $this->actingAs($admin)->putJson("/api/v1/settings/{$enum->id}", ['value' => 'MAYBE']),
            'SETTING_INVALID',
            422,
        );

        $int = SystemSetting::where('key', 'scan.duplicate_window_ms')->firstOrFail();
        $this->assertApiError(
            $this->actingAs($admin)->putJson("/api/v1/settings/{$int->id}", ['value' => 'soon']),
            'SETTING_INVALID',
            422,
        );

        $json = SystemSetting::where('key', 'ageing.buckets')->firstOrFail();
        $this->assertApiError(
            $this->actingAs($admin)->putJson("/api/v1/settings/{$json->id}", ['value' => 'not json']),
            'SETTING_INVALID',
            422,
        );
    }

    public function test_pallet_identity_locks_once_a_transaction_exists(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $setting = SystemSetting::where('key', 'pallet.uniqueness_rule')->firstOrFail();

        // Before any inventory exists it is changeable.
        $this->actingAs($admin)
            ->putJson("/api/v1/settings/{$setting->id}", ['value' => 'PALLET_ONLY'])
            ->assertOk();

        $this->recordAnOpeningStockTransaction();

        // After: changing it would redefine what "the same pallet" means for
        // everything already recorded.
        $response = $this->actingAs($admin)
            ->putJson("/api/v1/settings/{$setting->id}", ['value' => 'JOB_PALLET']);

        $this->assertApiError($response, 'SETTING_LOCKED', 409);
        $this->assertSame('PALLET_ONLY', $setting->refresh()->value);
    }

    public function test_settings_are_read_only_without_the_edit_permission(): void
    {
        $yardAdmin = $this->userWithRole('YARD_ADMIN');
        $setting = SystemSetting::where('key', 'web.poll_interval_seconds')->firstOrFail();

        $this->assertTrue($yardAdmin->hasPermission('settings.view'));
        $this->actingAs($yardAdmin)->getJson('/api/v1/settings')->assertOk();
        $this->actingAs($yardAdmin)->putJson("/api/v1/settings/{$setting->id}", ['value' => 60])->assertForbidden();
    }

    // -------------------------------------------------------- opening stock

    public function test_opening_stock_is_refused_while_the_setting_is_off(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        [$location, $barcode] = $this->makeLocation();

        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/opening-stock', [
                'location_barcode' => $barcode,
                'pallet_barcode' => 'OS-PALLET-1',
            ]),
            'OPENING_STOCK_DISABLED',
            409,
        );

        $this->assertDatabaseCount('inventory_current', 0);
    }

    public function test_captures_opening_stock_with_a_backdated_arrival(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $this->enableOpeningStock();
        [$location, $barcode] = $this->makeLocation();

        $response = $this->actingAs($admin)->postJson('/api/v1/opening-stock', [
            'location_barcode' => $barcode,
            'pallet_barcode' => 'OS-PALLET-1',
            'stored_since' => now()->subDays(42)->toDateString(),
        ]);

        $response->assertCreated()->assertJsonPath('data.transaction.type', 'OPENING_STOCK');

        $current = InventoryCurrent::firstOrFail();
        $this->assertSame($location->id, $current->location_id);

        // Ageing must run from when the stock actually arrived, or the first
        // month of MIS after go-live is wrong.
        $this->assertSame(42, (int) $current->putaway_at->diffInDays(now()));
    }

    public function test_opening_stock_obeys_the_one_pallet_one_location_invariant(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $this->enableOpeningStock();
        [, $barcodeA] = $this->makeLocation('OS-A-01-001');
        [, $barcodeB] = $this->makeLocation('OS-A-01-002');

        $this->actingAs($admin)->postJson('/api/v1/opening-stock', [
            'location_barcode' => $barcodeA,
            'pallet_barcode' => 'OS-PALLET-1',
        ])->assertCreated();

        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/opening-stock', [
                'location_barcode' => $barcodeB,
                'pallet_barcode' => 'OS-PALLET-1',
            ]),
            'PALLET_ALREADY_STORED',
            409,
        );

        $this->assertSame(1, InventoryCurrent::count());
    }

    public function test_a_future_arrival_date_is_refused(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $this->enableOpeningStock();
        [, $barcode] = $this->makeLocation();

        $this->assertApiError(
            $this->actingAs($admin)->postJson('/api/v1/opening-stock', [
                'location_barcode' => $barcode,
                'pallet_barcode' => 'OS-PALLET-1',
                'stored_since' => now()->addDay()->toDateString(),
            ]),
            'STORED_SINCE_IN_FUTURE',
            422,
        );
    }

    public function test_opening_stock_requires_its_own_permission(): void
    {
        // SUPERVISOR holds openingstock.perform by the documented matrix
        // (docs/07); VIEWER is the read-only role and must not.
        $viewer = $this->userWithRole('VIEWER');
        $this->assertFalse($viewer->hasPermission('openingstock.perform'));

        $this->enableOpeningStock();
        [, $barcode] = $this->makeLocation();

        $this->actingAs($viewer)->postJson('/api/v1/opening-stock', [
            'location_barcode' => $barcode,
            'pallet_barcode' => 'OS-PALLET-1',
        ])->assertForbidden();

        $this->assertDatabaseCount('inventory_current', 0);
    }

    // ------------------------------------------------------------- helpers

    private function enableOpeningStock(): void
    {
        SystemSetting::where('key', 'openingstock.mode_enabled')->update(['value' => 'true']);
        Settings::forget();
    }

    /** @return array{0: Location, 1: string} */
    private function makeLocation(string $code = 'OS-A-01-001'): array
    {
        $facility = Facility::factory()->create();
        $zone = Zone::factory()->create(['facility_id' => $facility->id]);

        $location = Location::factory()->create([
            'site_id' => $facility->site_id,
            'facility_id' => $facility->id,
            'zone_id' => $zone->id,
            'code' => $code,
        ]);

        $barcode = new LocationBarcode(['location_id' => $location->id]);
        $barcode->barcode_value = 'BC-'.$code;
        $barcode->save();

        return [$location, 'BC-'.$code];
    }

    private function recordAnOpeningStockTransaction(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $this->enableOpeningStock();
        [, $barcode] = $this->makeLocation('OS-LOCK-001');

        $this->actingAs($admin)->postJson('/api/v1/opening-stock', [
            'location_barcode' => $barcode,
            'pallet_barcode' => 'OS-LOCK-PALLET',
        ])->assertCreated();
    }
}
