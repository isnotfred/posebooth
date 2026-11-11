<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full bg-[#000000] text-zinc-100">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>PoseBooth</title>

    <!-- Tailwind & App Assets -->
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @endif

    <style>
        :root {
            --brand-primary: #FF9000;
            --brand-dark: #000000;
            --brand-surface: #0a0a0a;
            --brand-elevated: #141414;
            --brand-border: #242424;
        }

        /* Flash animation */
        @keyframes cameraFlash {
            0% { opacity: 0.95; }
            100% { opacity: 0; }
        }
        .animate-flash {
            animation: cameraFlash 0.45s ease-out forwards;
        }

        /* Pulse aura for hand indicator */
        @keyframes pulseRing {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 0.4; }
            100% { transform: scale(0.95); opacity: 0.8; }
        }
        .pulse-ring {
            animation: pulseRing 1.5s infinite ease-in-out;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #000000;
        }
        ::-webkit-scrollbar-thumb {
            background: #2a2a2a;
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #FF9000;
        }

        /* Print formatting for photo strip */
        @media print {
            body * {
                visibility: hidden !important;
            }
            #rollModal, #rollModal * {
                visibility: visible !important;
            }
            #photoRollCanvas {
                position: fixed !important;
                left: 50% !important;
                top: 0 !important;
                transform: translateX(-50%) !important;
                width: 3.5in !important;
                height: auto !important;
                box-shadow: none !important;
                border: none !important;
            }
            .strip-no-print {
                display: none !important;
            }
        }
    </style>

    <!-- TensorFlow.js & PoseNet (Local bundle with CDN fallback) -->
    <script src="{{ asset('vendor/posenet/tf.min.js') }}" onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js';"></script>
    <script src="{{ asset('vendor/posenet/posenet.min.js') }}" onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/@tensorflow-models/posenet@2.2.2/dist/posenet.min.js';"></script>
</head>
<body class="min-h-full flex flex-col bg-[#000000] text-zinc-100 selection:bg-[#FF9000] selection:text-black antialiased">

    <!-- Top Navigation / Branding Header -->
    <header class="border-b border-[#202020] bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF9000] to-[#FF6B00] flex items-center justify-center shadow-lg shadow-[#FF9000]/25 text-black">
                <!-- Camera Vector -->
                <svg class="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                </svg>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="font-black tracking-tight text-lg text-white">POSE<span class="text-[#FF9000]">BOOTH</span></h1>
                    <span class="px-2 py-0.5 text-[10px] font-bold bg-[#FF9000]/15 text-[#FF9000] border border-[#FF9000]/30 rounded-full tracking-wider uppercase">
                        AI Gesture Trigger
                    </span>
                </div>
                <p class="text-xs text-zinc-400">Raise hand to start 5s timer &bull; Stores last 5 captures</p>
            </div>
        </div>

        <div class="flex items-center gap-3">
            <!-- Model status indicator -->
            <div id="aiStatusPill" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111] border border-[#262626] text-xs text-zinc-300">
                <span class="w-2 h-2 rounded-full bg-[#FF9000] animate-pulse" id="aiStatusDot"></span>
                <span id="aiStatusText" class="font-medium">Loading PoseNet AI...</span>
            </div>

            <!-- Current Time -->
            <div class="hidden sm:flex text-xs font-mono text-zinc-400 bg-[#0c0c0c] px-3 py-1.5 rounded-lg border border-[#202020]" id="liveClock">
                00:00:00
            </div>
        </div>
    </header>

    <!-- Main Workspace Container -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <!-- Left Column: Camera Stage & Live Controls (7 cols on desktop) -->
        <div class="lg:col-span-7 flex flex-col gap-4">

            <!-- Camera Viewport Card -->
            <div class="relative bg-[#0a0a0a] border border-[#222222] rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center">

                <!-- Video + Canvas Frame -->
                <div class="relative w-full aspect-[4/3] bg-[#000000] overflow-hidden flex items-center justify-center group" id="viewportContainer">
                    
                    <!-- Viewfinder Studio Corner Reticles -->
                    <div class="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#FF9000]/60 pointer-events-none z-10"></div>
                    <div class="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#FF9000]/60 pointer-events-none z-10"></div>
                    <div class="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#FF9000]/60 pointer-events-none z-10"></div>
                    <div class="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#FF9000]/60 pointer-events-none z-10"></div>

                    <!-- Raw Video Stream -->
                    <video id="webcamVideo" width="640" height="480" class="w-full h-full object-cover transform -scale-x-100" playsinline autoplay muted></video>

                    <!-- PoseNet & Skeleton Overlay Canvas -->
                    <canvas id="overlayCanvas" width="640" height="480" class="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 z-10"></canvas>

                    <!-- Hidden Offscreen Canvas for Snapshot Capturing -->
                    <canvas id="captureCanvas" class="hidden"></canvas>

                    <!-- Flash overlay -->
                    <div id="cameraFlash" class="absolute inset-0 bg-white pointer-events-none opacity-0 z-30 transition-opacity"></div>

                    <!-- Countdown Display Overlay -->
                    <div id="countdownOverlay" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 hidden">
                        <div class="relative flex items-center justify-center">
                            <!-- SVG Animated Countdown Circle -->
                            <svg class="w-40 h-40 transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" stroke-width="8" class="text-zinc-900/90" fill="transparent"/>
                                <circle id="countdownSvgCircle" cx="80" cy="80" r="70" stroke="currentColor" stroke-width="8" class="text-[#FF9000] transition-all duration-1000 ease-linear" fill="transparent" stroke-dasharray="440" stroke-dashoffset="0" stroke-linecap="round"/>
                            </svg>
                            <!-- Number or 'SMILE!' text -->
                            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span id="countdownNumber" class="text-7xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] tracking-tight">5</span>
                                <span id="countdownSubtext" class="text-xs uppercase tracking-widest font-bold text-[#FF9000] mt-1 drop-shadow">Get Ready</span>
                            </div>
                        </div>
                    </div>

                    <!-- Gesture Detection Live Badge (Top Left of Camera) -->
                    <div class="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#000000]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium">
                        <span id="gestureDot" class="w-2.5 h-2.5 rounded-full bg-zinc-500"></span>
                        <span id="gestureText" class="text-zinc-200">Waiting for camera...</span>
                    </div>

                    <!-- Mirror / Filter Tag (Top Right of Camera) -->
                    <div class="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-[#000000]/80 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 text-xs text-zinc-300">
                        <span id="activeFilterBadge" class="font-medium text-zinc-300">Normal</span>
                    </div>

                    <!-- Skeleton Active Badge (Bottom Left) -->
                    <div id="skeletonIndicator" class="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-[#000000]/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-[#FF9000]/40 text-[11px] font-semibold text-[#FF9000]">
                        <!-- Skeleton icon vector -->
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="5" r="2"/>
                            <path d="M12 7v8M8 10h8M9 21l3-6 3 6M9 13l-2 5M15 13l2 5"/>
                        </svg>
                        <span>Skeleton Active</span>
                    </div>

                    <!-- Cooldown Warning (if recently captured) -->
                    <div id="cooldownBanner" class="absolute bottom-3 right-3 z-20 hidden items-center gap-1.5 bg-[#000000]/90 backdrop-blur-md px-3 py-1 rounded-md border border-[#FF9000]/30 text-xs text-[#FF9000]">
                        <!-- Clock icon vector -->
                        <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>Ready for next pose...</span>
                    </div>

                    <!-- Loading / Camera Permission Placeholder -->
                    <div id="cameraLoadingScreen" class="absolute inset-0 bg-[#000000] flex flex-col items-center justify-center p-6 text-center z-30">
                        <div class="w-16 h-16 rounded-2xl bg-[#111111] border border-[#2a2a2a] flex items-center justify-center mb-4 text-[#FF9000]">
                            <!-- Video camera vector -->
                            <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7"/>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                            </svg>
                        </div>
                        <h3 class="text-base font-bold text-white mb-1">Requesting Camera Access</h3>
                        <p class="text-xs text-zinc-400 max-w-sm mb-4">Please allow camera permissions in your browser to start the photobooth and activate PoseNet hand-tracking.</p>
                        <button id="btnGrantCamera" class="px-5 py-2.5 bg-[#FF9000] hover:bg-[#e07e00] text-black text-xs font-bold rounded-xl shadow-lg shadow-[#FF9000]/25 transition cursor-pointer">
                            Grant Camera Access
                        </button>
                    </div>

                </div>

                <!-- Primary Camera Control Bar -->
                <div class="w-full bg-[#0a0a0a] border-t border-[#202020] p-3.5 flex flex-wrap items-center justify-between gap-3">
                    
                    <!-- Left: Feature Toggles -->
                    <div class="flex items-center gap-2">
                        <!-- Show Skeleton Toggle -->
                        <button id="btnToggleSkeleton" type="button" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#FF9000]/40 bg-[#FF9000]/10 text-[#FF9000] hover:bg-[#FF9000]/20 transition cursor-pointer">
                            <!-- Skeleton vector -->
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="5" r="2"/>
                                <path d="M12 7v8M8 10h8M9 21l3-6 3 6M9 13l-2 5M15 13l2 5"/>
                            </svg>
                            <span id="skeletonBtnLabel">Skeleton: ON</span>
                        </button>

                        <!-- Hand Detection Toggle -->
                        <button id="btnToggleHandDetect" type="button" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#FF9000]/40 bg-[#FF9000]/10 text-[#FF9000] hover:bg-[#FF9000]/20 transition cursor-pointer">
                            <!-- Hand vector -->
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 11V6a2 2 0 0 0-4 0v4M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a7 7 0 0 0 14 0v-4a2 2 0 0 0-4 0"/>
                            </svg>
                            <span id="handDetectBtnLabel">Hand Trigger: ON</span>
                        </button>

                        <!-- Photo Filter Select -->
                        <div class="relative">
                            <select id="selectFilter" class="bg-[#141414] text-zinc-200 text-xs rounded-xl border border-[#2a2a2a] px-3 py-2 pr-7 appearance-none focus:outline-none focus:border-[#FF9000] cursor-pointer">
                                <option value="normal">Filter: Normal</option>
                                <option value="vintage">Filter: Retro Film</option>
                                <option value="noir">Filter: Noir B&W</option>
                                <option value="warm">Filter: Warm Glow</option>
                                <option value="cyber">Filter: Cyber Amber</option>
                                <option value="sepia">Filter: Sepia</option>
                            </select>
                            <span class="absolute right-2.5 top-3 pointer-events-none text-zinc-400">
                                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </span>
                        </div>
                    </div>

                    <!-- Center: Manual Shutter & Timer Buttons -->
                    <div class="flex items-center gap-2">
                        <!-- Manual 5s Timer Trigger -->
                        <button id="btnStartTimer" type="button" class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1f1f1f] text-zinc-200 border border-[#2a2a2a] hover:border-[#FF9000]/50 transition active:scale-95 cursor-pointer">
                            <!-- Timer vector -->
                            <svg class="w-4 h-4 text-[#FF9000]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="13" r="8"/>
                                <path d="M12 9v4l2 2M5 3L2 6M22 6l-3-3M12 2v3"/>
                            </svg>
                            <span>5s Timer</span>
                        </button>

                        <!-- Instant Snap Button -->
                        <button id="btnInstantSnap" type="button" class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#FF9000] hover:bg-[#e07e00] text-black shadow-lg shadow-[#FF9000]/25 transition active:scale-95 cursor-pointer">
                            <!-- Shutter vector -->
                            <svg class="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span>Snap Now</span>
                        </button>
                    </div>

                    <!-- Right: Utilities (Mirror, Sound) -->
                    <div class="flex items-center gap-2">
                        <!-- Mirror Toggle -->
                        <button id="btnToggleMirror" title="Toggle Mirror View" class="p-2 rounded-xl bg-[#141414] text-zinc-300 hover:text-white hover:bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#FF9000]/40 transition cursor-pointer">
                            <!-- Flip horizontal vector -->
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 2v20"/>
                            </svg>
                        </button>

                        <!-- Audio Toggle -->
                        <button id="btnToggleAudio" title="Toggle Sound FX" class="p-2 rounded-xl bg-[#141414] text-zinc-300 hover:text-white hover:bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#FF9000]/40 transition cursor-pointer">
                            <!-- Speaker vector -->
                            <span id="audioIconContainer">
                                <svg class="w-4 h-4 text-[#FF9000]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>
                                </svg>
                            </span>
                        </button>
                    </div>

                </div>

            </div>

            <!-- Quick Instructions / Gesture Guide Banner -->
            <div class="bg-[#0a0a0a] border border-[#222222] rounded-xl p-4 flex items-start gap-3.5">
                <div class="w-9 h-9 rounded-lg bg-[#FF9000]/10 border border-[#FF9000]/25 text-[#FF9000] flex items-center justify-center shrink-0">
                    <!-- Info icon vector -->
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                </div>
                <div class="text-xs leading-relaxed text-zinc-300">
                    <span class="font-bold text-white">How it works:</span>
                    Raise either your <span class="text-[#FF9000] font-semibold">left or right hand above your head or shoulder</span> in front of the camera. The AI will detect your pose, highlight your wrist with an orange glowing pulse, and trigger a <span class="text-[#FF9000] font-semibold">5-second countdown</span> before capturing the picture!
                </div>
            </div>

            <!-- Keyboard shortcuts footer guide -->
            <div class="flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-400">
                <span class="flex items-center gap-1.5"><kbd class="px-1.5 py-0.5 rounded bg-[#141414] border border-[#262626] text-zinc-300 font-mono text-[10px]">Space</kbd> 5s Timer</span>
                <span class="flex items-center gap-1.5"><kbd class="px-1.5 py-0.5 rounded bg-[#141414] border border-[#262626] text-zinc-300 font-mono text-[10px]">S</kbd> Toggle Skeleton</span>
                <span class="flex items-center gap-1.5"><kbd class="px-1.5 py-0.5 rounded bg-[#141414] border border-[#262626] text-zinc-300 font-mono text-[10px]">H</kbd> Hand Trigger</span>
                <span class="flex items-center gap-1.5"><kbd class="px-1.5 py-0.5 rounded bg-[#141414] border border-[#262626] text-zinc-300 font-mono text-[10px]">M</kbd> Mute Audio</span>
                <span class="flex items-center gap-1.5"><kbd class="px-1.5 py-0.5 rounded bg-[#141414] border border-[#262626] text-zinc-300 font-mono text-[10px]">Esc</kbd> Close Modal</span>
            </div>

        </div>

        <!-- Right Column: Recent 5 Photos Filmstrip & Roll Exporter (5 cols on desktop) -->
        <div class="lg:col-span-5 flex flex-col gap-4">

            <!-- Card: The 5-Photo Gallery / Filmstrip -->
            <div class="bg-[#0a0a0a] border border-[#222222] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
                
                <!-- Gallery Header -->
                <div class="flex items-center justify-between pb-3 border-b border-[#202020]">
                    <div class="flex items-center gap-2">
                        <h2 class="font-bold text-sm text-white">Recent Captures</h2>
                        <span id="photoCountBadge" class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#141414] border border-[#2a2a2a] text-[#FF9000]">
                            0 / 5
                        </span>
                    </div>
                    <span class="text-[11px] text-zinc-400">Stores last 5 photos</span>
                </div>

                <!-- 5 Photo Slots (Vertical list) -->
                <div id="photosListContainer" class="flex flex-col gap-3 min-h-[360px]">
                    <!-- Dynamically populated or slot placeholders -->
                </div>

                <!-- Gallery Actions (Export Roll / Series Mode / Download All / Clear) -->
                <div class="pt-3 border-t border-[#202020] flex flex-col gap-2.5">
                    
                    <!-- Primary Call to Action: Export Vertical Photo Roll -->
                    <button id="btnOpenRollModal" type="button" class="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#FF9000] hover:bg-[#e07e00] text-black shadow-lg shadow-[#FF9000]/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        <!-- Film vector -->
                        <svg class="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                            <line x1="7" y1="2" x2="7" y2="22"/>
                            <line x1="17" y1="2" x2="17" y2="22"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <line x1="2" y1="7" x2="7" y2="7"/>
                            <line x1="2" y1="17" x2="7" y2="17"/>
                            <line x1="17" y1="17" x2="22" y2="17"/>
                            <line x1="17" y1="7" x2="22" y2="7"/>
                        </svg>
                        <span>Save Last 5 as Photo Roll (Vertical Strip)</span>
                    </button>

                    <div class="flex items-center gap-2">
                        <!-- Auto 5-Shot Series Mode -->
                        <button id="btnSeriesMode" type="button" class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#FF9000] hover:border-[#FF9000]/40 flex items-center justify-center gap-1.5 transition cursor-pointer">
                            <!-- Burst camera vector -->
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="12" cy="12" r="4"/>
                            </svg>
                            <span>5-Pose Series</span>
                        </button>

                        <!-- Download All Button -->
                        <button id="btnDownloadAll" type="button" class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-zinc-200 hover:border-[#FF9000]/40 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            <!-- Download vector -->
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            <span>Download All (5)</span>
                        </button>

                        <!-- Clear All Photos -->
                        <button id="btnClearPhotos" type="button" class="py-2 px-3 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/40 border border-[#2a2a2a] text-zinc-400 flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            <!-- Trash vector -->
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            <span>Clear</span>
                        </button>
                    </div>

                </div>

            </div>

        </div>

    </main>

    <!-- MODAL 1: Vertical Photo Roll Preview & Customizer -->
    <div id="rollModal" class="fixed inset-0 bg-[#000000]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-[#0a0a0a] border border-[#262626] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-[#202020] flex items-center justify-between strip-no-print">
                <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg bg-[#FF9000]/15 flex items-center justify-center text-[#FF9000]">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                            <line x1="7" y1="2" x2="7" y2="22"/>
                            <line x1="17" y1="2" x2="17" y2="22"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-white">Classic Photobooth Roll Strip</h3>
                        <p class="text-xs text-zinc-400">Vertical compilation of your last 5 captures</p>
                    </div>
                </div>
                <button id="btnCloseRollModal" class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#1a1a1a] text-lg cursor-pointer">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <!-- Modal Body (Preview Canvas + Customizer) -->
            <div class="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                <!-- Left: Roll Strip Canvas Live Preview -->
                <div id="rollPreviewContainer" class="md:col-span-6 bg-[#000000] p-4 rounded-xl border border-[#222222] flex flex-col items-center justify-start overflow-y-auto max-h-[540px]">
                    <div id="rollLoadingIndicator" class="hidden flex items-center justify-center gap-2 py-8 text-xs text-[#FF9000]">
                        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 2a10 10 0 0 1 10 10"/>
                        </svg>
                        <span>Generating photo roll...</span>
                    </div>
                    <canvas id="photoRollCanvas" class="max-w-full h-auto rounded shadow-2xl border border-[#222222] block shrink-0"></canvas>
                </div>

                <!-- Right: Customizer Controls -->
                <div class="md:col-span-6 flex flex-col gap-4 text-xs strip-no-print">
                    <div>
                        <label class="block font-semibold text-zinc-300 mb-1.5">Strip Theme</label>
                        <div class="grid grid-cols-2 gap-2" id="stripThemeSelector">
                            <button type="button" data-theme="amber" class="strip-theme-btn p-2 rounded-lg border-2 border-[#FF9000] bg-[#000000] text-[#FF9000] font-bold text-center cursor-pointer">
                                Amber & Black
                            </button>
                            <button type="button" data-theme="noir" class="strip-theme-btn p-2 rounded-lg border border-[#2a2a2a] bg-[#111111] text-white font-bold text-center cursor-pointer">
                                Deep Noir
                            </button>
                            <button type="button" data-theme="white" class="strip-theme-btn p-2 rounded-lg border border-[#2a2a2a] bg-white text-black font-bold text-center cursor-pointer">
                                Pure White
                            </button>
                            <button type="button" data-theme="vintage" class="strip-theme-btn p-2 rounded-lg border border-[#2a2a2a] bg-amber-50 text-amber-950 font-bold text-center cursor-pointer">
                                Warm Film
                            </button>
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-zinc-300 mb-1">Header Title</label>
                        <input id="inputRollTitle" type="text" value="POSEBOOTH" class="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF9000]">
                    </div>

                    <div>
                        <label class="block font-semibold text-zinc-300 mb-1">Footer Caption</label>
                        <input id="inputRollSubtitle" type="text" value="SHOT WITH POSENET AI" class="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF9000]">
                    </div>

                    <div class="flex items-center gap-2">
                        <input id="checkIncludeDate" type="checkbox" checked class="rounded bg-[#141414] border-[#2a2a2a] text-[#FF9000] focus:ring-0">
                        <label for="checkIncludeDate" class="text-zinc-300 font-medium">Include date and timestamp</label>
                    </div>

                    <div class="p-3 rounded-lg bg-[#141414] border border-[#262626] text-zinc-400 leading-relaxed text-[11px]">
                        The roll contains high-resolution prints of your last 5 captures, complete with vintage film borders and styling.
                    </div>
                </div>

            </div>

            <!-- Modal Footer Actions -->
            <div class="px-6 py-4 bg-[#050505] border-t border-[#202020] flex items-center justify-between gap-3 strip-no-print">
                <span id="rollSaveStatus" class="text-xs text-zinc-400"></span>
                <div class="flex items-center gap-2">
                    <button id="btnPrintRoll" type="button" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1f1f1f] text-zinc-200 border border-[#2a2a2a] transition cursor-pointer">
                        <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        <span>Print</span>
                    </button>
                    <button id="btnSaveRollToServer" type="button" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1f1f1f] text-zinc-200 border border-[#2a2a2a] transition cursor-pointer">
                        <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                        </svg>
                        <span>Save Cloud</span>
                    </button>
                    <button id="btnDownloadRoll" type="button" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#FF9000] hover:bg-[#e07e00] text-black shadow-md shadow-[#FF9000]/25 transition cursor-pointer">
                        <svg class="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        <span>Download PNG</span>
                    </button>
                </div>
            </div>

        </div>
    </div>

    <!-- MODAL 2: Single Photo Full Preview -->
    <div id="previewModal" class="fixed inset-0 bg-[#000000]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-[#0a0a0a] border border-[#262626] rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div class="px-5 py-3.5 border-b border-[#202020] flex items-center justify-between">
                <h3 id="previewTitle" class="text-xs font-bold text-white">Photo Preview</h3>
                <button id="btnClosePreviewModal" class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#1a1a1a] text-lg cursor-pointer">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="p-4 bg-[#000000] flex items-center justify-center">
                <img id="previewImage" src="" alt="Capture Preview" class="max-w-full max-h-[70vh] rounded-lg object-contain shadow-2xl">
            </div>
            <div class="px-5 py-3.5 bg-[#050505] border-t border-[#202020] flex items-center justify-between">
                <button id="btnDeleteFromPreview" class="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition cursor-pointer">
                    Delete
                </button>
                <button id="btnDownloadFromPreview" class="px-4 py-1.5 bg-[#FF9000] hover:bg-[#e07e00] text-black font-bold text-xs rounded-lg shadow transition cursor-pointer">
                    Download Photo
                </button>
            </div>
        </div>
    </div>

</body>
</html>
