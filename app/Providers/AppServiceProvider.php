<?php

namespace App\Providers;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
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
