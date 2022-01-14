<?php

namespace Tests\Unit;

use App\Action\Log\GetAllLogsAction;
use App\Action\Log\GetLogsByLevelAction;
use App\Models\Log;
use App\Repository\LogRepositoryInterface;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Helpers\WithLogs;
use Tests\TestCase;

class LogTest extends TestCase
{
    use WithLogs, RefreshDatabase;

    public function testCreateTestWithWrongLevel(): void
    {
        try {
            $data = $this->createLog('wrongLevel');
        } catch (Exception $exception){
            $data = [
                'level' => 'wrongLevel'
            ];
        }

        $this->assertDatabaseMissing('logs', $data);
    }

    public function testLogModel(): void
    {
        $log = $this->createLog();
        $this->assertTrue($log->id > 0);
    }

    public function testGetAllLogs(): void
    {
        $this->createLog();

        $data = $this->json('get', 'api/logs')
            ->assertHeader('Content-Type', 'application/json')
            ->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'level',
                    'driver',
                    'message',
                    'trace',
                    'channel',
                    'created_at'
                ]
            ])
            ->json();

        $this->assertNotEmpty($data);

        foreach ($data as $item) {
            $this->assertArrayHasKey('id', $item);
            $this->assertArrayHasKey('level', $item);
            $this->assertArrayHasKey('driver', $item);
            $this->assertArrayHasKey('message', $item);
            $this->assertArrayHasKey('trace', $item);
            $this->assertArrayHasKey('channel', $item);
            $this->assertArrayHasKey('created_at', $item);
        }
    }

    public function testGetLogsByLevel(): void
    {
        $this->createLog('info');

        $data = $this->json('get', 'api/logs/info')
            ->assertHeader('Content-Type', 'application/json')
            ->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'level',
                    'driver',
                    'message',
                    'trace',
                    'channel',
                    'created_at'
                ]
            ])
            ->json();

        $this->assertNotEmpty($data);

        foreach ($data as $item) {
            $this->assertTrue($item['level'] === 'info');
        }
    }

    public function testGetLogsByLevelEmpty(): void
    {
        $this->createLog('info');

        $data = $this->json('get', 'api/logs/debug')
            ->assertHeader('Content-Type', 'application/json')
            ->assertStatus(200)
            ->json();

        $this->assertEmpty($data);
    }

    public function testStatistic(): void
    {
        $this->createLog('info');

        $data = $this->json('get', 'api/logs/debug')
            ->assertHeader('Content-Type', 'application/json')
            ->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'info',
                    'warning',
                    'error',
                    'debug',
                    'critical',
                    'alert',
                    'emergency'
                ]
            ])
            ->json();

        $this->assertEmpty($data);
    }

    public function testGetAllAction()
    {
        $this->createLog('info');

        $action = $this->app->make(GetAllLogsAction::class);
        $response = $action->execute();

        $this->checkLogs($response->getLogs());
    }

    public function testGetByLevelAction()
    {
        $this->createLog();

        $action = $this->app->make(GetLogsByLevelAction::class);
        $response = $action->execute();

        $this->checkLogs($response->getLogs());
    }

    public function testRepository()
    {
        $this->createLog();

        $repository = $this->app->make(LogRepositoryInterface::class);
        $logs = $repository->findAll();

        $this->assertNotEmpty($logs);
        $this->checkLogs($logs);
    }

    private function checkLogs(array $logs): void
    {
        foreach ($logs as $log) {
            $this->assertInstanceOf(Log::class, $log);
        }
    }
}
