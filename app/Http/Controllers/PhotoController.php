<?php

namespace App\Http\Controllers;

use App\Models\Photo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PhotoController extends Controller
{
    /**
     * Storage path for saved photos.
     */
    protected string $storageDir;

    /**
     * PhotoController constructor.
     */
    public function __construct()
    {
        $this->storageDir = storage_path('app/public/photobooth');

        if (!File::exists($this->storageDir)) {
            File::makeDirectory($this->storageDir, 0755, true);
        }
    }

    /**
     * Display the photobooth interface.
     */
    public function index(Request $request): View
    {
        $sessionId = $request->session()->getId();

        $recentPhotos = Photo::query()
            ->where(function ($query) use ($sessionId) {
                $query->where('session_id', $sessionId)
                    ->orWhereNull('session_id');
            })
            ->where('type', 'single')
            ->latest()
            ->take(5)
            ->get();

        return view('photobooth', [
            'recentPhotos' => $recentPhotos,
            'sessionId' => $sessionId,
        ]);
    }

    /**
     * Retrieve the last 5 photos for the current session.
     */
    public function list(Request $request): JsonResponse
    {
        $sessionId = $request->session()->getId();

        $photos = Photo::query()
            ->where(function ($query) use ($sessionId) {
                if ($sessionId) {
                    $query->where('session_id', $sessionId)
                        ->orWhereNull('session_id');
                }
            })
            ->where('type', 'single')
            ->latest()
            ->take(5)
            ->get()
            ->map(function (Photo $photo): array {
                return [
                    'id' => $photo->id,
                    'filename' => $photo->filename,
                    'url' => route('photos.show', ['filename' => $photo->filename]),
                    'download_url' => route('photos.download', ['filename' => $photo->filename]),
                    'type' => $photo->type,
                    'created_at' => $photo->created_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'photos' => $photos,
        ]);
    }

    /**
     * Store a captured photo.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'image' => ['required', 'string'],
            'type' => ['nullable', 'string', 'in:single,strip'],
            'width' => ['nullable', 'integer'],
            'height' => ['nullable', 'integer'],
        ]);

        $sessionId = $request->session()->getId();
        $type = $validated['type'] ?? 'single';

        $imageData = $validated['image'];

        // Remove base64 data prefix if present
        if (preg_match('/^data:image\/(\w+);base64,/', $imageData, $matches)) {
            $extension = strtolower($matches[1]);
            $imageData = substr($imageData, strpos($imageData, ',') + 1);
        } else {
            $extension = 'png';
        }

        $decodedImage = base64_decode($imageData, true);

        if ($decodedImage === false) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid base64 image data provided.',
            ], 422);
        }

        $filename = 'booth_' . ($type === 'strip' ? 'strip_' : '') . Str::random(16) . '_' . time() . '.' . $extension;
        $filePath = $this->storageDir . DIRECTORY_SEPARATOR . $filename;

        File::put($filePath, $decodedImage);

        $photo = Photo::create([
            'session_id' => $sessionId,
            'type' => $type,
            'filename' => $filename,
            'path' => 'photobooth/' . $filename,
            'width' => $validated['width'] ?? null,
            'height' => $validated['height'] ?? null,
            'metadata' => [
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip(),
            ],
        ]);

        return response()->json([
            'success' => true,
            'photo' => [
                'id' => $photo->id,
                'filename' => $photo->filename,
                'url' => route('photos.show', ['filename' => $photo->filename]),
                'download_url' => route('photos.download', ['filename' => $photo->filename]),
                'type' => $photo->type,
                'created_at' => $photo->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Show/stream a photo file.
     */
    public function show(string $filename): BinaryFileResponse
    {
        $sanitized = basename($filename);
        $path = $this->storageDir . DIRECTORY_SEPARATOR . $sanitized;

        if (!File::exists($path)) {
            abort(404, 'Photo not found.');
        }

        return response()->file($path, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Force download of a photo file.
     */
    public function download(string $filename): BinaryFileResponse
    {
        $sanitized = basename($filename);
        $path = $this->storageDir . DIRECTORY_SEPARATOR . $sanitized;

        if (!File::exists($path)) {
            abort(404, 'Photo not found.');
        }

        return response()->download($path, $sanitized);
    }

    /**
     * Delete a photo record.
     */
    public function destroy(int $id): JsonResponse
    {
        $photo = Photo::findOrFail($id);

        $path = $this->storageDir . DIRECTORY_SEPARATOR . $photo->filename;
        if (File::exists($path)) {
            File::delete($path);
        }

        $photo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Photo removed successfully.',
        ]);
    }
}
