# PoseBooth

> AI-powered gesture photobooth with real-time PoseNet tracking, 5-second countdown timer, rolling 5-photo FIFO gallery, and vertical photo strip compiler. Built on Laravel 13 and PHP 8.5.

---

## Overview

**PoseBooth** is a modern photobooth web application designed for interactive, hands-free picture taking. By leveraging TensorFlow.js and Google's PoseNet AI model, the application monitors the webcam feed and automatically initiates a 5-second countdown whenever a user raises their hand above shoulder height.

The user interface features a retro studio aesthetic built around a strict palette of **`#FF9000` (amber/orange)** and **`#000000` (pure black)**, styled with crisp SVG vector icons and zero emojis.

---

## Key Features

- **Hands-Free Gesture Trigger**: Uses PoseNet MobileNetV1 to track anatomical keypoints in real time. Raising either hand above shoulder/head height automatically triggers the photo capture sequence with built-in frame smoothing and a 3-second cooldown prevention mechanism.
- **5-Second Countdown with Web Audio Synthesizer**: Animated SVG progress ring with synchronized sound synthesis powered by the Web Audio API (rhythmic beeps, harmonic smile chord, and mechanical shutter noise without external audio files), topped with a full-frame viewport flash.
- **Strict 5-Photo Rolling Gallery**: Users can snap unlimited photos, but the application displays and persists only the last 5 captures in a FIFO (First-In, First-Out) queue.
- **Vertical Photo Roll (Strip) Compiler**: High-resolution (600px print width) vertical canvas compiler that stitches the 5 captures into a classic photobooth strip with customizable header titles, timestamps, subtitles, decorative separator rules, and vintage barcodes.
- **4 Photo Strip Themes**:
  - **Amber & Black**: Signature `#FF9000` on `#000000`
  - **Deep Noir**: Monochromatic dark theme
  - **Pure White**: Minimalist clean studio print
  - **Warm Film**: Retro sepia & cream tones
- **Real-Time Skeleton Tracking**: Toggleable neon amber (`#FF9000`) anatomical bone connections and joint nodes rendered over the live camera feed with glowing wrist highlights.
- **Live Video Filters**: Retro Film, Noir B&W, Warm Glow, Cyber Amber, and Sepia applied seamlessly via CSS hardware acceleration and HTML5 canvas filters.
- **Flexible Export Options**:
  - Download individual photos as PNG
  - Bulk download all photos with staggered timing
  - Print vertical photo strips formatted for standard 3.5in print media
  - Save photo strips directly to the cloud backend
- **Offline PoseNet Fallback**: Bundled local TensorFlow.js and PoseNet vendor scripts with automated CDN fallback for zero-downtime reliability.
- **Resilient Storage**: Browser storage with automated fallback synchronization against the Laravel backend REST API.

---

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Start 5-second Countdown Timer |
| <kbd>S</kbd> | Toggle Skeleton Overlay (ON / OFF) |
| <kbd>H</kbd> | Toggle Hand-Raise Gesture Trigger (ON / OFF) |
| <kbd>M</kbd> | Toggle Sound FX (Mute / Unmute) |
| <kbd>Esc</kbd> | Close Active Modal Window |

---

## Architecture & Tech Stack

- **Backend Framework**: [Laravel 13](https://laravel.com/) running on **PHP 8.5**
- **Frontend Layer**: Blade Templates, Tailwind CSS v4, [Vite 8](https://vitejs.dev/)
- **Machine Learning**: [TensorFlow.js 3.11](https://www.tensorflow.org/js) & [PoseNet 2.2](https://github.com/tensorflow/tfjs-models/tree/master/posenet) (MobileNetV1 Architecture)
- **Audio Engine**: Web Audio API (Parametric oscillator and noise synthesis)
- **Database**: SQLite (default, zero configuration) or MySQL / PostgreSQL
- **Testing**: PHPUnit feature test suite with 100% route coverage

---

## Directory Structure

```
├── app/
│   ├── Http/Controllers/
│   │   └── PhotoController.php    # Photobooth view, REST API, upload & download handlers
│   └── Models/
│       └── Photo.php              # Eloquent model with typed casts & fillable attributes
├── database/
│   ├── migrations/
│   │   └── 2026_11_10_130049_create_photos_table.php # Schema for single & strip captures
├── public/
│   └── vendor/posenet/            # Bundled TensorFlow.js and PoseNet offline assets
├── resources/
│   ├── css/
│   │   └── app.css                # Tailwind CSS v4 design system
│   ├── js/
│   │   ├── app.js                 # Vite entry point
│   │   └── photobooth.js          # Core Photobooth controller, PoseNet loop, & canvas compiler
│   └── views/
│       └── photobooth.blade.php   # Studio interface, camera viewport, & modal windows
├── routes/
│   └── web.php                    # Application routes and API endpoints
└── tests/
    └── Feature/
        └── PhotoBoothTest.php     # Comprehensive feature test suite
```

---

## RESTful API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Main interactive photobooth single-page interface |
| `GET` | `/api/photos` | List last 5 captures for the current session |
| `POST` | `/api/photos` | Upload and persist a captured photo (`single` or `strip`) |
| `DELETE` | `/api/photos/{id}` | Delete a stored photo record and remove image file |
| `GET` | `/photos/{filename}` | Stream / serve photo file |
| `GET` | `/photos/{filename}/download` | Force file download of a photo |

---

## Getting Started

### Prerequisites

- **PHP 8.5+** with `pdo_sqlite`, `fileinfo`, `mbstring`, and `openssl` extensions enabled
- **Composer** (v2.x)
- **Node.js** (v20+ or v22+) & **npm**
- A modern browser with webcam permissions (Chrome, Edge, Firefox, Safari)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/isnotfred/posebooth.git
   cd posebooth
   ```

2. **Install PHP dependencies**:
   ```bash
   composer install
   ```

3. **Install JavaScript dependencies**:
   ```bash
   npm install
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. **Run database migrations**:
   ```bash
   php artisan migrate
   ```

6. **Compile frontend assets**:
   ```bash
   npm run build
   ```
   *(For active development with hot-reload, run `npm run dev` instead).*

7. **Start the local server**:
   ```bash
   php artisan serve
   ```

8. **Open in browser**:
   Visit [http://127.0.0.1:8000](http://127.0.0.1:8000) and grant camera access when prompted.

---

## Running Automated Tests

To run the complete PHPUnit test suite:

```bash
php artisan test
```

---

## Connecting & Pushing to GitHub

To push this codebase to the repository at `https://github.com/isnotfred/posebooth.git`:

```bash
# Initialize git repository
git init

# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: PoseBooth photobooth application"

# Set default branch to main
git branch -M main

# Add remote origin
git remote add origin https://github.com/isnotfred/posebooth.git

# Push to GitHub
git push -u origin main
```

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
