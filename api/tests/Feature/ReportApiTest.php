<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Location;
use App\Models\LocationBarcode;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The thirteen MIS reports (BRD §14, docs/10).
 *
 * The behaviour worth pinning is the authorisation: each report is granted
 * separately, and a report the caller may not read is indistinguishable from one
 * that does not exist.
 */
class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    public function test_every_report_slug_resolves_for_a_fully_granted_role(): void
    {
        $user = $this->userWithRole('SUPER_ADMIN');

        $slugs = [
            'current-inventory', 'location-stock', 'job-pallet', 'customer-stock',
            'put-away', 'movement', 'dispatch', 'traceability', 'ageing',
            'operator-activity', 'stock-verification', 'holds', 'daily-movement',
        ];

        foreach ($slugs as $slug) {
            $response = $this->actingAs($user)->getJson("/api/v1/reports/{$slug}");

            $response->assertOk()
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.report', $slug);

            $this->assertIsArray($response->json('data.rows'), "{$slug} must return rows");
        }
    }

    public function test_an_unknown_report_is_rejected(): void
    {
        $user = $this->userWithRole('SUPER_ADMIN');

        $this->assertApiError(
            $this->actingAs($user)->getJson('/api/v1/reports/not-a-report'),
            'UNKNOWN_REPORT',
            404,
        );
    }

    public function test_a_report_the_role_cannot_read_answers_exactly_as_a_missing_one(): void
    {
        // VIEWER is granted current-inventory but not operator-activity
        // (PermissionRegistry::roleGrants). Before per-report enforcement, one
        // grant opened all thirteen.
        $viewer = $this->userWithRole('VIEWER');

        $this->actingAs($viewer)->getJson('/api/v1/reports/current-inventory')->assertOk();

        $forbidden = $this->actingAs($viewer)->getJson('/api/v1/reports/operator-activity');
        $missing = $this->actingAs($viewer)->getJson('/api/v1/reports/not-a-report');

        $this->assertApiError($forbidden, 'UNKNOWN_REPORT', 404);
        $this->assertSame($missing->json('error.message'), $forbidden->json('error.message'));
    }

    public function test_reports_never_leak_internals_on_failure(): void
    {
        $user = $this->userWithRole('SUPER_ADMIN');

        $body = $this->actingAs($user)->getJson('/api/v1/reports/not-a-report')->json();

        $this->assertArrayNotHasKey('trace', $body);
        $this->assertArrayNotHasKey('file', $body['error']);
        $this->assertStringNotContainsStringIgnoringCase('sql', json_encode($body));
    }

    public function test_traceability_asks_for_a_pallet_rather_than_returning_everything(): void
    {
        $user = $this->userWithRole('SUPER_ADMIN');

        $response = $this->actingAs($user)->getJson('/api/v1/reports/traceability');

        $response->assertOk();
        $this->assertSame([], $response->json('data.rows'));
        $this->assertNotEmpty($response->json('data.summary.hint'));
    }

    public function test_location_stock_is_scoped_to_visible_facilities(): void
    {
        $mine = Facility::factory()->create();
        $theirs = Facility::factory()->create();

        $this->makeLocation($mine, 'MINE-01');
        $this->makeLocation($theirs, 'THEIRS-01');

        $user = $this->userWithRole('SUPERVISOR', $mine->site, [$mine]);

        $rows = $this->actingAs($user)->getJson('/api/v1/reports/location-stock')
            ->assertOk()
            ->json('data.rows');

        $codes = array_column($rows, 'location');

        $this->assertContains('MINE-01', $codes);
        $this->assertNotContains('THEIRS-01', $codes);
    }

    private function makeLocation(Facility $facility, string $code): Location
    {
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

        return $location;
    }
}
