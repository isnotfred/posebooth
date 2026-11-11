<?php

/**
 * Serverless entry point for Vercel deployment.
 * Prepares writable directories in /tmp for view compilation and cache.
 */

$serverlessDirs = [
    '/tmp/storage/framework/views',
    '/tmp/storage/framework/cache/data',
    '/tmp/storage/framework/sessions',
    '/tmp/storage/logs',
    '/tmp/storage/app/public/photobooth',
];

foreach ($serverlessDirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

// Fallback APP_KEY if not configured in environment
if (empty($_ENV['APP_KEY']) && empty(getenv('APP_KEY'))) {
    $defaultKey = 'base64:eGwG8H9PzC9T8Ef0s6lJg/1dIEyRV9DV0C2KgqpJ2no=';
    putenv("APP_KEY={$defaultKey}");
    $_ENV['APP_KEY'] = $defaultKey;
    $_SERVER['APP_KEY'] = $defaultKey;
}

// Ensure SQLite database exists in writable /tmp
$sqliteDb = '/tmp/database.sqlite';
if (!file_exists($sqliteDb)) {
    if (file_exists(__DIR__ . '/../database/database.sqlite') && filesize(__DIR__ . '/../database/database.sqlite') > 0) {
        @copy(__DIR__ . '/../database/database.sqlite', $sqliteDb);
    } else {
        @touch($sqliteDb);
    }
}

// Forward request to Laravel public/index.php
require __DIR__ . '/../public/index.php';

