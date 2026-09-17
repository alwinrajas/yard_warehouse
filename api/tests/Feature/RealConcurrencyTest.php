<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\InventoryCurrent;
use App\Models\Location;
use App\Models\Pallet;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use PDO;
use PDOException;
use Tests\TestCase;

/**
 * Concurrency against a real server, on real second connections.
 *
 * ConcurrencyTest exercises the service-level guards inside one transaction.
 * This exercises the database itself: two independent sessions, genuine row
 * locks, genuine constraint violations. It is the only place where "the primary
 * key defeats a concurrent insert" and "the lock actually blocks" are proven
 * rather than reasoned about.
 *
 * It does not use RefreshDatabase, because that wraps the test in a transaction
 * the second connection could never see.
 *
 * Skipped unless PARALLEL_CONCURRENCY=1 so the developer suite stays fast; CI
 * sets it, and CI runs MySQL 8 — which is the engine these guarantees have to
 * hold on (docs/26 D-8).
 */
class RealConcurrencyTest extends TestCase
{
    use DatabaseTruncation;

    private Location $location;

    private Pallet $pallet;

    private User $author;

    protected function setUp(): void
    {
        parent::setUp();

        if (env('PARALLEL_CONCURRENCY') !== '1') {
            $this->markTestSkipped('Set PARALLEL_CONCURRENCY=1 to run real multi-connection tests.');
        }

        $this->seedReferenceData();
        $this->author = $this->userWithRole('SUPER_ADMIN');

        $facility = Facility::factory()->create();
        $zone = Zone::factory()->create(['facility_id' => $facility->id]);

        $this->location = Location::factory()->create([
            'site_id' => $facility->site_id,
            'facility_id' => $facility->id,
            'zone_id' => $zone->id,
            'code' => 'CC-A-01-001',
        ]);

        $this->pallet = Pallet::create([
            'pallet_key' => 'CC-KEY-1',
            'pallet_number' => 'CC-PAL-1',
            'raw_barcode_value' => 'CC-BC-1',
            'barcode_profile' => 'RAW',
            'site_id' => $facility->site_id,
            'lifecycle_status' => 'AT_COLLECTION_POINT',
        ]);
    }

    /** A second, independent session — not Laravel's, not inside its transaction. */
    private function secondSession(): PDO
    {
        $config = config('database.connections.mysql');

        $pdo = new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s', $config['host'], $config['port'], $config['database']),
            $config['username'],
            $config['password'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
        );

        // Short, so a test that should block fails fast instead of hanging CI.
        $pdo->exec('SET SESSION innodb_lock_wait_timeout = 3');

        return $pdo;
    }

    public function test_the_engine_is_the_production_engine_in_ci(): void
    {
        $version = (string) $this->secondSession()->query('SELECT VERSION()')->fetchColumn();

        // Developers run MariaDB locally (docs/26 D-8); that is a known, accepted
        // divergence. What is NOT acceptable is CI silently doing the same, which
        // would mean every guarantee below was proven against the wrong engine.
        if (env('CI') === false || env('CI') === null) {
            $this->markTestSkipped("Local engine is {$version}. This assertion is CI's job.");
        }

        $this->assertStringNotContainsStringIgnoringCase('mariadb', $version, "CI must run MySQL 8, got: {$version}");
        $this->assertStringStartsWith('8.', $version, "CI must run MySQL 8, got: {$version}");
    }

    public function test_two_sessions_cannot_both_place_the_same_pallet(): void
    {
        $a = $this->secondSession();
        $b = $this->secondSession();

        $insert = fn (PDO $pdo, int $locationId) => $pdo->exec(sprintf(
            'INSERT INTO inventory_current (pallet_id, location_id, zone_id, facility_id, site_id, stored_at, putaway_at, updated_at)
             VALUES (%d, %d, %d, %d, %d, NOW(), NOW(), NOW())',
            $this->pallet->id,
            $locationId,
            $this->location->zone_id,
            $this->location->facility_id,
            $this->location->site_id,
        ));

        $a->beginTransaction();
        $insert($a, $this->location->id);
        $a->commit();

        // The second session is a different connection with no knowledge of the
        // first. Only the primary key stands between it and a second location.
        $b->beginTransaction();
        try {
            $insert($b, $this->location->id);
            $b->commit();
            $this->fail('A second active location was accepted for the same pallet.');
        } catch (PDOException $e) {
            $b->rollBack();
            $this->assertSame('23000', $e->getCode(), 'Expected an integrity-constraint violation.');
        }

        $this->assertSame(1, InventoryCurrent::where('pallet_id', $this->pallet->id)->count());
    }

    public function test_a_held_pallet_lock_blocks_a_second_session(): void
    {
        $holder = $this->secondSession();
        $contender = $this->secondSession();

        $holder->beginTransaction();
        $holder->query("SELECT id FROM pallets WHERE id = {$this->pallet->id} FOR UPDATE")->fetchAll();

        $contender->beginTransaction();

        $blocked = false;
        try {
            $contender->query("SELECT id FROM pallets WHERE id = {$this->pallet->id} FOR UPDATE")->fetchAll();
        } catch (PDOException $e) {
            // 1205 = lock wait timeout. Being made to wait is the point: it is
            // what forces two operators on one pallet to serialise (CC-02).
            $blocked = str_contains($e->getMessage(), '1205') || $e->getCode() === 'HY000';
        } finally {
            $contender->rollBack();
            $holder->rollBack();
        }

        $this->assertTrue($blocked, 'A second session was able to take a lock the first was holding.');
    }

    public function test_the_lock_is_released_on_commit_and_the_second_session_sees_the_truth(): void
    {
        $first = $this->secondSession();
        $second = $this->secondSession();

        $first->beginTransaction();
        $first->query("SELECT id FROM pallets WHERE id = {$this->pallet->id} FOR UPDATE")->fetchAll();
        $first->exec(sprintf(
            "UPDATE pallets SET lifecycle_status = 'DISPATCHED' WHERE id = %d",
            $this->pallet->id,
        ));
        $first->commit();

        // The loser of the race reads the committed state, not what it saw
        // before waiting — which is why it can fail with an accurate message.
        $second->beginTransaction();
        $status = $second->query("SELECT lifecycle_status FROM pallets WHERE id = {$this->pallet->id} FOR UPDATE")->fetchColumn();
        $second->rollBack();

        $this->assertSame('DISPATCHED', $status);
    }

    public function test_transaction_references_stay_unique_under_contention(): void
    {
        $a = $this->secondSession();
        $b = $this->secondSession();

        $ref = 'PA-20260101-000001';

        $insert = fn (PDO $pdo) => $pdo->exec(sprintf(
            "INSERT INTO inventory_transactions (txn_ref, type, pallet_id, user_id, channel, created_at)
             VALUES ('%s', 'PUTAWAY', %d, %d, 'WEB', NOW())",
            $ref,
            $this->pallet->id,
            $this->author->id,
        ));

        $insert($a);

        try {
            $insert($b);
            $this->fail('A duplicate transaction reference was accepted.');
        } catch (PDOException $e) {
            $this->assertSame('23000', $e->getCode());
        }
    }

    public function test_foreign_keys_are_enforced_not_merely_declared(): void
    {
        $pdo = $this->secondSession();

        try {
            $pdo->exec(sprintf(
                'INSERT INTO inventory_current (pallet_id, location_id, zone_id, facility_id, site_id, stored_at, putaway_at, updated_at)
                 VALUES (%d, 999999, NULL, %d, %d, NOW(), NOW(), NOW())',
                $this->pallet->id,
                $this->location->facility_id,
                $this->location->site_id,
            ));
            $this->fail('A row referencing a non-existent location was accepted.');
        } catch (PDOException $e) {
            $this->assertSame('23000', $e->getCode());
        }
    }

    public function test_dates_round_trip_without_the_connection_shifting_them(): void
    {
        // A timezone mismatch between PHP and the server silently moves every
        // "today" figure across midnight (CFG-13, docs/05 §7).
        $pdo = $this->secondSession();

        $stamp = '2026-03-15 23:45:00';
        $pdo->exec(sprintf(
            "INSERT INTO inventory_current (pallet_id, location_id, zone_id, facility_id, site_id, stored_at, putaway_at, updated_at)
             VALUES (%d, %d, %d, %d, %d, '%s', '%s', NOW())",
            $this->pallet->id,
            $this->location->id,
            $this->location->zone_id,
            $this->location->facility_id,
            $this->location->site_id,
            $stamp,
            $stamp,
        ));

        $row = InventoryCurrent::where('pallet_id', $this->pallet->id)->firstOrFail();

        $this->assertSame($stamp, $row->putaway_at->format('Y-m-d H:i:s'));
        $this->assertSame($stamp, $row->stored_at->format('Y-m-d H:i:s'));
    }
}
