<?php

use App\Http\Controllers\PhotoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web & API Routes - PoseBooth
|--------------------------------------------------------------------------
|
| Main photobooth interactive interface, RESTful API endpoints for
| photo persistence, and public endpoints for serving/downloading photos.
|
*/

// Main Photobooth Single-Page View
Route::get('/', [PhotoController::class, 'index'])->name('photobooth');

// Photo API Routes
Route::prefix('api/photos')->group(function () {
    Route::get('/', [PhotoController::class, 'list'])->name('photos.list');
    Route::post('/', [PhotoController::class, 'store'])->name('photos.store');
    Route::delete('/{id}', [PhotoController::class, 'destroy'])->name('photos.destroy');
});

// Photo Asset & Download Routes
Route::get('/photos/{filename}', [PhotoController::class, 'show'])->name('photos.show');
Route::get('/photos/{filename}/download', [PhotoController::class, 'download'])->name('photos.download');
