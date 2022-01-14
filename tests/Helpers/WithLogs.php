<?php

namespace Tests\Helpers;

use App\Models\Log;

trait WithLogs
{
    public function createLog(
        string $level = 'info',
        string $driver = 'database',
        string $message = 'message',
        string $trace = 'trace',
        string $channel = 'default'
    ): \Illuminate\Database\Eloquent\Collection|\Illuminate\Database\Eloquent\Model| Log
    {
        return \App\Models\Log::factory()->create([
            'level' => $level,
            'driver' => $driver,
            'message' => $message,
            'trace' => $trace,
            'channel' => $channel
        ]);
    }
}
