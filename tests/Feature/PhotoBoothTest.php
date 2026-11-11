<?php

namespace Tests\Feature;

use App\Models\Photo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhotoBoothTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test the photobooth page loads successfully.
     */
    public function test_photobooth_page_renders(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertSee('<title>PoseBooth</title>', false);
        $response->assertSee('POSE', false);
        $response->assertSee('BOOTH', false);
    }

    /**
     * Test uploading a captured single photo via API.
     */
    public function test_can_upload_captured_photo(): void
    {
        // 1x1 transparent PNG base64
        $fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $response = $this->postJson(route('photos.store'), [
            'image' => $fakeBase64,
            'type' => 'single',
            'width' => 640,
            'height' => 480,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseCount('photos', 1);

        $photo = Photo::first();
        $this->assertNotNull($photo);
        $this->assertEquals('single', $photo->type);
        $this->assertEquals(640, $photo->width);
        $this->assertEquals(480, $photo->height);

        // Test downloading the photo
        $downloadResponse = $this->get(route('photos.show', ['filename' => $photo->filename]));
        $downloadResponse->assertStatus(200);
    }

    /**
     * Test uploading a photo roll strip.
     */
    public function test_can_upload_photo_strip(): void
    {
        $fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $response = $this->postJson(route('photos.store'), [
            'image' => $fakeBase64,
            'type' => 'strip',
            'width' => 600,
            'height' => 2000,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $photo = Photo::where('type', 'strip')->first();
        $this->assertNotNull($photo);
        $this->assertEquals('strip', $photo->type);
    }

    /**
     * Test listing photos returns only recent 5 photos.
     */
    public function test_list_photos_returns_recent_photos(): void
    {
        // Create 7 photos
        for ($i = 1; $i <= 7; $i++) {
            Photo::create([
                'session_id' => null,
                'type' => 'single',
                'filename' => "test_{$i}.png",
                'path' => "photobooth/test_{$i}.png",
            ]);
        }

        $response = $this->getJson(route('photos.list'));
        $response->assertStatus(200);

        $data = $response->json('photos');
        $this->assertCount(5, $data);
    }

    /**
     * Test deleting a photo.
     */
    public function test_can_delete_photo(): void
    {
        $photo = Photo::create([
            'type' => 'single',
            'filename' => 'dummy_to_delete.png',
            'path' => 'photobooth/dummy_to_delete.png',
        ]);

        $response = $this->deleteJson(route('photos.destroy', ['id' => $photo->id]));
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $this->assertDatabaseMissing('photos', ['id' => $photo->id]);
    }
}
