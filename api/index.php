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

// Forward request to Laravel public/index.php
require __DIR__ . '/../public/index.php';

