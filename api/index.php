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

