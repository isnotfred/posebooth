<?php

namespace App\Providers;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Enforce HTTPS behind Vercel reverse proxy to prevent mixed content blocking
        if (app()->environment('production') || isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL'])) {
            URL::forceScheme('https');
        }

        // Ensure database tables exist in serverless environments where /tmp/database.sqlite starts empty
        if (config('database.default') === 'sqlite') {
            try {
                if (!Schema::hasTable('photos')) {
                    Artisan::call('migrate', ['--force' => true]);
                }
            } catch (\Throwable $e) {
                // Ignore to avoid blocking requests if artisan fails
            }
        }
    }
}
