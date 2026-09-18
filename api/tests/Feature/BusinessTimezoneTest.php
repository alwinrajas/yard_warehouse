<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\InventoryTransaction;
use App\Models\Location;
use App\Models\Pallet;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Zone;
use App\Support\BusinessTime;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * CFG-13 / OI-19 — the business calendar.
 *
 * The defect this guards against is the one that is invisible in testing and
 * obvious a month after go-live: a dispatch recorded at 21:30 in a UTC+4 yard
 * counted against tomorrow, because "today" was UTC's today.
 *
 * Every case here pins the clock to a real instant near a boundary. Nothing
 * depends on the developer's machine timezone, and storage stays UTC throughout
 * — only the interpretation of a day changes.
 */
class BusinessTimezoneTest extends TestCase
{
    use RefreshDatabase;

    /** UTC+4, no daylight saving — the plausible shape for this customer. */
    private const ZONE = 'Asia/Dubai';

    private User $admin;

    private Location $location;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
        Settings::forget();
        BusinessTime::forget();

        $this->admin = $this->userWithRole('SUPER_ADMIN');

        $facility = Facility::factory()->create();
        $zone = Zone::factory()->create(['facility_id' => $facility->id]);
        $this->location = Location::factory()->create([
            'site_id' => $facility->site_id,
            'facility_id' => $facility->id,
            'zone_id' => $zone->id,
            'code' => 'TZ-A-01-001',
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function configureZone(string $zone): void
    {
        SystemSetting::where('key', 'app.timezone')->update(['value' => $zone]);
        Settings::forget();
        BusinessTime::forget();
    }

    /** Writes a transaction at an exact UTC instant, the way the ledger stores it. */
    private function transactionAt(string $utc, string $type = 'PUTAWAY'): InventoryTransaction
    {
        static $sequence = 0;
        $sequence++;

        $pallet = Pallet::create([
            'pallet_key' => "TZ-KEY-{$sequence}",
            'pallet_number' => "TZ-PAL-{$sequence}",
            'raw_barcode_value' => "TZ-BC-{$sequence}",
            'barcode_profile' => 'RAW',
            'site_id' => $this->location->site_id,
            'lifecycle_status' => 'STORED',
        ]);

        // Inserted through the query builder rather than the model: `created_at`
        // is deliberately not fillable, because the ledger is append-only and
        // nothing in the application may choose a transaction's instant. A test
        // fixture placing a row at a precise moment is the one legitimate
        // exception, and it goes around the model rather than weakening it.
        $id = DB::table('inventory_transactions')->insertGetId([
            'txn_ref' => sprintf('PA-TZ-%06d', $sequence),
            'type' => $type,
            'pallet_id' => $pallet->id,
            'destination_location_id' => $this->location->id,
            'user_id' => $this->admin->id,
            'channel' => 'WEB',
            'created_at' => Carbon::parse($utc, 'UTC')->format('Y-m-d H:i:s'),
        ]);

        return InventoryTransaction::findOrFail($id);
    }

    // ------------------------------------------------------------- the setting

    public function test_cfg_13_defaults_to_utc_rather_than_a_guessed_zone(): void
    {
        $this->assertSame('UTC', BusinessTime::zone());

        $setting = SystemSetting::where('key', 'app.timezone')->firstOrFail();
        $this->assertSame('UTC', $setting->default_value);
        $this->assertSame('OI-19', $setting->open_item);
    }

    public function test_a_configured_zone_is_adopted(): void
    {
        $this->configureZone(self::ZONE);

        $this->assertSame(self::ZONE, BusinessTime::zone());
    }

    public function test_the_configured_zone_persists_and_is_readable_over_the_api(): void
    {
        $setting = SystemSetting::where('key', 'app.timezone')->firstOrFail();

        $this->actingAs($this->admin)
            ->putJson("/api/v1/settings/{$setting->id}", ['value' => self::ZONE])
            ->assertOk()
            ->assertJsonPath('data.value', self::ZONE);

        $this->assertSame(self::ZONE, $setting->refresh()->value);

        // And a fresh read of the register reports it.
        $rows = $this->actingAs($this->admin)->getJson('/api/v1/settings')->json('data');
        $cfg13 = collect($rows)->firstWhere('reference', 'CFG-13');
        $this->assertSame(self::ZONE, $cfg13['value']);
    }

    public function test_an_ambiguous_abbreviation_is_refused(): void
    {
        $setting = SystemSetting::where('key', 'app.timezone')->firstOrFail();

        // IST is India, Israel and Ireland, and carries no daylight rules.
        $this->assertApiError(
            $this->actingAs($this->admin)->putJson("/api/v1/settings/{$setting->id}", ['value' => 'IST']),
            'SETTING_INVALID',
            422,
        );

        $this->assertSame('UTC', $setting->refresh()->value);
    }

    public function test_nonsense_is_refused_and_never_reaches_a_query(): void
    {
        $setting = SystemSetting::where('key', 'app.timezone')->firstOrFail();

        $this->assertApiError(
            $this->actingAs($this->admin)->putJson("/api/v1/settings/{$setting->id}", ['value' => 'Mars/Olympus']),
            'SETTING_INVALID',
            422,
        );
    }

    public function test_a_corrupt_stored_zone_falls_back_rather_than_throwing(): void
    {
        // Written around the API — a bad value must degrade, not break reports.
        SystemSetting::where('key', 'app.timezone')->update(['value' => 'Not/AZone']);
        Settings::forget();
        BusinessTime::forget();

        $this->assertSame('UTC', BusinessTime::zone());
    }

    // ------------------------------------------------------ boundary arithmetic

    public function test_the_business_day_starts_before_utc_midnight_east_of_greenwich(): void
    {
        $this->configureZone(self::ZONE);

        // 2026-03-15 00:00 in Dubai is 2026-03-14 20:00 UTC.
        Carbon::setTestNow(Carbon::parse('2026-03-15 06:00:00', 'UTC'));

        $this->assertSame(
            '2026-03-14 20:00:00',
            BusinessTime::startOfToday()->format('Y-m-d H:i:s'),
        );
    }

    public function test_day_bounds_are_half_open_so_the_last_second_is_not_dropped(): void
    {
        $this->configureZone(self::ZONE);

        $this->assertSame('2026-03-14 20:00:00', BusinessTime::startOfDay('2026-03-15')->format('Y-m-d H:i:s'));
        $this->assertSame('2026-03-15 20:00:00', BusinessTime::endOfDay('2026-03-15')->format('Y-m-d H:i:s'));
    }

    // ------------------------------------------------------------ the dashboard

    public function test_today_counts_the_business_day_not_the_utc_day(): void
    {
        $this->configureZone(self::ZONE);

        // 21:30 on the 15th in Dubai — still the 15th locally, already the 16th
        // nowhere, but 17:30 UTC on the 15th. The case that matters is the one
        // that straddles UTC midnight:
        $this->transactionAt('2026-03-14 21:00:00'); // 01:00 on the 15th in Dubai
        $this->transactionAt('2026-03-15 10:00:00'); // 14:00 on the 15th in Dubai
        $this->transactionAt('2026-03-14 19:00:00'); // 23:00 on the 14th — yesterday

        // Mid-morning on the 15th, Dubai time.
        Carbon::setTestNow(Carbon::parse('2026-03-15 08:00:00', 'UTC'));

        $kpis = $this->actingAs($this->admin)->getJson('/api/v1/dashboard')->assertOk()->json('data.kpis');

        // Under a UTC day this would be 1: the 21:00 transaction would fall into
        // the previous UTC day and the yesterday one would be counted as today.
        $this->assertSame(2, $kpis['today_putaway']);
    }

    public function test_a_transaction_just_before_local_midnight_belongs_to_that_day(): void
    {
        $this->configureZone(self::ZONE);

        // 23:59 on the 15th in Dubai = 19:59 UTC on the 15th.
        $this->transactionAt('2026-03-15 19:59:00');

        // Now: 23:59:30 on the 15th, Dubai.
        Carbon::setTestNow(Carbon::parse('2026-03-15 19:59:30', 'UTC'));
        $this->assertSame(
            1,
            $this->actingAs($this->admin)->getJson('/api/v1/dashboard')->json('data.kpis.today_putaway'),
        );

        // One minute later it is the 16th locally, and the figure resets.
        Carbon::setTestNow(Carbon::parse('2026-03-15 20:00:30', 'UTC'));
        $this->assertSame(
            0,
            $this->actingAs($this->admin)->getJson('/api/v1/dashboard')->json('data.kpis.today_putaway'),
        );
    }

    public function test_utc_configuration_still_counts_utc_days(): void
    {
        // The documented default must keep behaving exactly as before.
        $this->transactionAt('2026-03-15 10:00:00');
        $this->transactionAt('2026-03-14 23:00:00');

        Carbon::setTestNow(Carbon::parse('2026-03-15 12:00:00', 'UTC'));

        $this->assertSame(
            1,
            $this->actingAs($this->admin)->getJson('/api/v1/dashboard')->json('data.kpis.today_putaway'),
        );
    }

    // --------------------------------------------------------------- reporting

    public function test_report_date_filters_use_business_days(): void
    {
        $this->configureZone(self::ZONE);

        $this->transactionAt('2026-03-14 21:00:00'); // 01:00 on the 15th, Dubai
        $this->transactionAt('2026-03-15 19:30:00'); // 23:30 on the 15th, Dubai
        $this->transactionAt('2026-03-15 20:30:00'); // 00:30 on the 16th, Dubai

        $rows = $this->actingAs($this->admin)
            ->getJson('/api/v1/reports/put-away?from=2026-03-15&to=2026-03-15')
            ->assertOk()
            ->json('data.rows');

        // Both ends of the local day, and nothing from the next one.
        $this->assertCount(2, $rows);
    }

    public function test_the_daily_summary_buckets_by_business_date(): void
    {
        $this->configureZone(self::ZONE);

        $this->transactionAt('2026-03-14 21:00:00'); // 15th, Dubai
        $this->transactionAt('2026-03-14 22:00:00'); // 15th, Dubai
        $this->transactionAt('2026-03-15 19:00:00'); // 15th, Dubai

        $rows = $this->actingAs($this->admin)
            ->getJson('/api/v1/reports/daily-movement')
            ->assertOk()
            ->json('data.rows');

        $dates = array_column($rows, 'date');

        // All three are one local day. Grouped by UTC date they would split
        // across the 14th and the 15th.
        $this->assertCount(1, $rows, 'expected a single business day, got: '.implode(', ', $dates));
        $this->assertStringStartsWith('2026-03-15', (string) $rows[0]['date']);
        $this->assertSame(3, (int) $rows[0]['put_away']);
    }

    public function test_transaction_history_filters_on_business_days(): void
    {
        $this->configureZone(self::ZONE);

        $this->transactionAt('2026-03-14 21:00:00'); // 15th, Dubai
        $this->transactionAt('2026-03-15 20:30:00'); // 16th, Dubai

        $rows = $this->actingAs($this->admin)
            ->getJson('/api/v1/transactions?from=2026-03-15&to=2026-03-15')
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $rows);
    }

    // ------------------------------------------------------------------ ageing

    public function test_ageing_advances_when_the_business_day_turns_over(): void
    {
        $this->configureZone(self::ZONE);

        // Put away at 23:00 on the 14th, Dubai time (19:00 UTC).
        $putawayAt = Carbon::parse('2026-03-14 19:00:00', 'UTC');

        // 07:00 on the 15th, Dubai: one local day later.
        Carbon::setTestNow(Carbon::parse('2026-03-15 03:00:00', 'UTC'));

        $this->assertSame(1, BusinessTime::daysStanding($putawayAt));
    }

    // ----------------------------------------------------------- stored values

    public function test_storage_stays_utc_and_nothing_is_rewritten(): void
    {
        $this->configureZone(self::ZONE);

        $txn = $this->transactionAt('2026-03-15 19:59:00');

        // The stored instant is untouched by the business zone — only its
        // interpretation as a *day* changes.
        $stored = DB::table('inventory_transactions')
            ->where('id', $txn->id)
            ->value('created_at');

        $this->assertStringStartsWith('2026-03-15 19:59:00', (string) $stored);
        $this->assertSame('UTC', config('app.timezone'));
    }

    public function test_the_session_reports_the_business_zone_to_every_client(): void
    {
        $this->configureZone(self::ZONE);

        $payload = $this->actingAs($this->admin)->getJson('/api/v1/auth/me')->assertOk()->json('data');

        $this->assertSame(self::ZONE, $payload['app_timezone']);
    }
}
