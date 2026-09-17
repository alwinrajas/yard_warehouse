<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Location;
use App\Models\Site;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class LocationImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    private function csv(string $body): UploadedFile
    {
        $header = "facility_code,zone_code,location_code,description,location_type,capacity,sequence\n";

        return UploadedFile::fake()->createWithContent('locations.csv', $header.$body);
    }

    public function test_validates_a_good_file_without_writing_anything(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();
        $facility = Facility::factory()->create(['site_id' => $site->id, 'code' => 'YD-A']);
        Zone::factory()->create(['facility_id' => $facility->id, 'code' => 'ZONE-A']);

        $response = $this->actingAs($admin)->post('/api/v1/locations/import/validate', [
            'file' => $this->csv("YD-A,ZONE-A,YD-A-01-001,Bay 1,STORAGE,2,1\nYD-A,ZONE-A,YD-A-01-002,Bay 2,STORAGE,,2\n"),
            'site_id' => $site->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'VALIDATED')
            ->assertJsonPath('data.total_rows', 2)
            ->assertJsonPath('data.valid_rows', 2)
            ->assertJsonPath('data.error_rows', 0);

        // The dry run must not create locations (mandate §19).
        $this->assertSame(0, Location::count());
    }

    public function test_commits_a_validated_batch(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();
        Facility::factory()->create(['site_id' => $site->id, 'code' => 'YD-A']);

        $batchId = $this->actingAs($admin)->post('/api/v1/locations/import/validate', [
            'file' => $this->csv("YD-A,,YD-A-01-001,,STORAGE,,1\nYD-A,,YD-A-01-002,,STORAGE,,2\n"),
            'site_id' => $site->id,
        ])->json('data.id');

        $this->actingAs($admin)->postJson("/api/v1/locations/import/{$batchId}/commit")
            ->assertOk()
            ->assertJsonPath('data.status', 'COMMITTED');

        $this->assertSame(2, Location::count());
        $this->assertDatabaseHas('locations', ['code' => 'YD-A-01-001', 'site_id' => $site->id]);
        $this->assertDatabaseHas('audit_logs', ['event' => 'location.import_committed']);
    }

    public function test_reports_row_level_errors_and_refuses_to_commit(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();
        $facility = Facility::factory()->create(['site_id' => $site->id, 'code' => 'YD-A']);
        Zone::factory()->create(['facility_id' => $facility->id, 'code' => 'ZONE-A']);
        Location::factory()->create(['site_id' => $site->id, 'facility_id' => $facility->id, 'code' => 'EXISTS-1']);

        $response = $this->actingAs($admin)->post('/api/v1/locations/import/validate', [
            'file' => $this->csv(
                "YD-A,ZONE-A,GOOD-1,,STORAGE,,1\n".      // valid
                "NOPE,ZONE-A,BAD-1,,STORAGE,,2\n".        // unknown facility
                "YD-A,OTHER,BAD-2,,STORAGE,,3\n".         // zone not in facility
                "YD-A,,EXISTS-1,,STORAGE,,4\n".           // already exists
                "YD-A,,BAD-3,,ROOFTOP,,5\n".              // invalid type
                "YD-A,,GOOD-1,,STORAGE,,6\n"              // duplicated within the file
            ),
            'site_id' => $site->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'FAILED')
            ->assertJsonPath('data.total_rows', 6)
            ->assertJsonPath('data.valid_rows', 1)
            ->assertJsonPath('data.error_rows', 5);

        $errors = collect($response->json('data.errors'))->pluck('errors')->flatten()->implode(' ');
        $this->assertStringContainsString('does not exist in this site', $errors);
        $this->assertStringContainsString('does not belong to facility', $errors);
        $this->assertStringContainsString('already exists', $errors);
        $this->assertStringContainsString('location_type must be one of', $errors);
        $this->assertStringContainsString('duplicated in this file', $errors);

        // Nothing written, and an invalid batch cannot be forced through.
        $this->assertSame(1, Location::count());

        $this->assertApiError(
            $this->actingAs($admin)->postJson("/api/v1/locations/import/{$response->json('data.id')}/commit"),
            'IMPORT_NOT_VALIDATED',
            422,
        );
        $this->assertSame(1, Location::count());
    }

    public function test_commit_is_all_or_nothing(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();
        $facility = Facility::factory()->create(['site_id' => $site->id, 'code' => 'YD-A']);

        $batchId = $this->actingAs($admin)->post('/api/v1/locations/import/validate', [
            'file' => $this->csv("YD-A,,ROW-1,,STORAGE,,1\nYD-A,,ROW-2,,STORAGE,,2\n"),
            'site_id' => $site->id,
        ])->json('data.id');

        // Someone takes one of the codes between validation and commit.
        Location::factory()->create(['site_id' => $site->id, 'facility_id' => $facility->id, 'code' => 'ROW-2']);

        $this->assertApiError(
            $this->actingAs($admin)->postJson("/api/v1/locations/import/{$batchId}/commit"),
            'DUPLICATE_CODE',
            409,
        );

        // ROW-1 must not survive a failed commit — no partial hierarchy.
        $this->assertDatabaseMissing('locations', ['code' => 'ROW-1']);
        $this->assertSame(1, Location::count());
    }

    public function test_refuses_a_second_commit(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();
        Facility::factory()->create(['site_id' => $site->id, 'code' => 'YD-A']);

        $batchId = $this->actingAs($admin)->post('/api/v1/locations/import/validate', [
            'file' => $this->csv("YD-A,,ONCE-1,,STORAGE,,1\n"),
            'site_id' => $site->id,
        ])->json('data.id');

        $this->actingAs($admin)->postJson("/api/v1/locations/import/{$batchId}/commit")->assertOk();

        $this->assertApiError(
            $this->actingAs($admin)->postJson("/api/v1/locations/import/{$batchId}/commit"),
            'IMPORT_ALREADY_COMMITTED',
            409,
        );
        $this->assertSame(1, Location::count());
    }

    public function test_rejects_a_file_with_missing_headers(): void
    {
        $admin = $this->userWithRole('SUPER_ADMIN');
        $site = Site::factory()->create();

        $this->assertApiError(
            $this->actingAs($admin)->post('/api/v1/locations/import/validate', [
                'file' => UploadedFile::fake()->createWithContent('bad.csv', "a,b,c\n1,2,3\n"),
                'site_id' => $site->id,
            ]),
            'FILE_HEADERS_INVALID',
            422,
        );
    }

    public function test_requires_the_import_permission(): void
    {
        $site = Site::factory()->create();

        $this->assertApiError(
            $this->actingAs($this->userWithRole('SUPERVISOR'))->post('/api/v1/locations/import/validate', [
                'file' => $this->csv("YD-A,,X-1,,STORAGE,,1\n"),
                'site_id' => $site->id,
            ]),
            'PERMISSION_DENIED',
            403,
        );
    }

    public function test_offers_a_template(): void
    {
        $this->actingAs($this->userWithRole('SUPER_ADMIN'))
            ->get('/api/v1/locations/template')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
}
