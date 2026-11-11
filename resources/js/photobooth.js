/**
 * PoseBooth - Main Controller
 * Theme: #FF9000 & #000000 | Vector Icons Only
 */

class Photobooth {
    constructor() {
        // State
        this.net = null;
        this.stream = null;
        this.isModelLoaded = false;
        this.isDetecting = false;
        this.showSkeleton = true; // Default ON
        this.handTriggerEnabled = true;
        this.isCountingDown = false;
        this.isCoolingDown = false;
        this.isMirrored = true;
        this.isAudioMuted = false;
        this.selectedFilter = 'normal';
        this.activeTheme = 'amber'; // Default #FF9000 & #000000

        // Photos queue: strictly last 5
        this.photos = []; // [{ id, dataUrl, timestamp, filter, serverId, serverUrl }]
        this.maxPhotos = 5;

        // Photo roll rendering state
        this.isRenderingRoll = false;
        this.currentRenderPromise = null;

        // Series mode state
        this.isSeriesActive = false;
        this.seriesPhotoCount = 0;

        // Hand raise detection smoothing
        this.handRaiseCounter = 0;
        this.handRaiseThreshold = 3; // frames needed to confirm raise

        // Audio Context
        this.audioCtx = null;

        // DOM elements
        this.initDOMElements();

        // Bind events
        this.bindEvents();

        // Load saved photos from localStorage or server
        this.loadStoredPhotos();

        // Start Clock
        this.startClock();

        // Auto initialize camera & PoseNet
        this.initCameraAndModel();
    }

    initDOMElements() {
        this.video = document.getElementById('webcamVideo');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.overlayCtx = this.overlayCanvas ? this.overlayCanvas.getContext('2d') : null;
        this.captureCanvas = document.getElementById('captureCanvas');

        // Status elements
        this.aiStatusPill = document.getElementById('aiStatusPill');
        this.aiStatusDot = document.getElementById('aiStatusDot');
        this.aiStatusText = document.getElementById('aiStatusText');
        this.gestureDot = document.getElementById('gestureDot');
        this.gestureText = document.getElementById('gestureText');
        this.activeFilterBadge = document.getElementById('activeFilterBadge');
        this.skeletonIndicator = document.getElementById('skeletonIndicator');
        this.cooldownBanner = document.getElementById('cooldownBanner');
        this.cameraLoadingScreen = document.getElementById('cameraLoadingScreen');
        this.cameraFlash = document.getElementById('cameraFlash');

        // Countdown elements
        this.countdownOverlay = document.getElementById('countdownOverlay');
        this.countdownNumber = document.getElementById('countdownNumber');
        this.countdownSubtext = document.getElementById('countdownSubtext');
        this.countdownSvgCircle = document.getElementById('countdownSvgCircle');

        // Buttons
        this.btnToggleSkeleton = document.getElementById('btnToggleSkeleton');
        this.skeletonBtnLabel = document.getElementById('skeletonBtnLabel');
        this.btnToggleHandDetect = document.getElementById('btnToggleHandDetect');
        this.handDetectBtnLabel = document.getElementById('handDetectBtnLabel');
        this.btnStartTimer = document.getElementById('btnStartTimer');
        this.btnInstantSnap = document.getElementById('btnInstantSnap');
        this.btnToggleMirror = document.getElementById('btnToggleMirror');
        this.btnToggleAudio = document.getElementById('btnToggleAudio');
        this.audioIconContainer = document.getElementById('audioIconContainer');
        this.selectFilter = document.getElementById('selectFilter');
        this.btnGrantCamera = document.getElementById('btnGrantCamera');
        this.btnSeriesMode = document.getElementById('btnSeriesMode');

        // Gallery & Roll
        this.photosListContainer = document.getElementById('photosListContainer');
        this.photoCountBadge = document.getElementById('photoCountBadge');
        this.btnOpenRollModal = document.getElementById('btnOpenRollModal');
        this.btnDownloadAll = document.getElementById('btnDownloadAll');
        this.btnClearPhotos = document.getElementById('btnClearPhotos');

        // Roll Modal elements
        this.rollModal = document.getElementById('rollModal');
        this.btnCloseRollModal = document.getElementById('btnCloseRollModal');
        this.rollPreviewContainer = document.getElementById('rollPreviewContainer');
        this.rollLoadingIndicator = document.getElementById('rollLoadingIndicator');
        this.photoRollCanvas = document.getElementById('photoRollCanvas');
        this.btnDownloadRoll = document.getElementById('btnDownloadRoll');
        this.btnPrintRoll = document.getElementById('btnPrintRoll');
        this.btnSaveRollToServer = document.getElementById('btnSaveRollToServer');
        this.rollSaveStatus = document.getElementById('rollSaveStatus');
        this.inputRollTitle = document.getElementById('inputRollTitle');
        this.inputRollSubtitle = document.getElementById('inputRollSubtitle');
        this.checkIncludeDate = document.getElementById('checkIncludeDate');

        // Single Preview Modal elements
        this.previewModal = document.getElementById('previewModal');
        this.btnClosePreviewModal = document.getElementById('btnClosePreviewModal');
        this.previewImage = document.getElementById('previewImage');
        this.previewTitle = document.getElementById('previewTitle');
        this.btnDeleteFromPreview = document.getElementById('btnDeleteFromPreview');
        this.btnDownloadFromPreview = document.getElementById('btnDownloadFromPreview');
        this.activePreviewIndex = null;
    }

    bindEvents() {
        // Feature buttons
        this.btnToggleSkeleton?.addEventListener('click', () => this.toggleSkeleton());
        this.btnToggleHandDetect?.addEventListener('click', () => this.toggleHandDetect());
        this.btnStartTimer?.addEventListener('click', () => this.startCountdown(5));
        this.btnInstantSnap?.addEventListener('click', () => this.capturePhoto());
        this.btnToggleMirror?.addEventListener('click', () => this.toggleMirror());
        this.btnToggleAudio?.addEventListener('click', () => this.toggleAudio());
        this.btnGrantCamera?.addEventListener('click', () => this.initCameraAndModel());
        this.btnSeriesMode?.addEventListener('click', () => this.startSeriesMode());

        // Filter change
        this.selectFilter?.addEventListener('change', (e) => this.setFilter(e.target.value));

        // Roll modal
        this.btnOpenRollModal?.addEventListener('click', () => this.openRollModal());
        this.btnCloseRollModal?.addEventListener('click', () => this.closeRollModal());
        this.btnDownloadRoll?.addEventListener('click', () => this.downloadPhotoRoll());
        this.btnPrintRoll?.addEventListener('click', () => window.print());
        this.btnSaveRollToServer?.addEventListener('click', () => this.saveRollToServer());

        // Roll customizer inputs
        this.inputRollTitle?.addEventListener('input', () => this.renderPhotoRoll());
        this.inputRollSubtitle?.addEventListener('input', () => this.renderPhotoRoll());
        this.checkIncludeDate?.addEventListener('change', () => this.renderPhotoRoll());

        // Strip theme buttons
        document.querySelectorAll('.strip-theme-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.strip-theme-btn').forEach(b => {
                    b.classList.remove('border-[#FF9000]', 'border-2');
                    b.classList.add('border-[#2a2a2a]', 'border');
                });
                btn.classList.add('border-[#FF9000]', 'border-2');
                btn.classList.remove('border-[#2a2a2a]');
                this.activeTheme = btn.dataset.theme;
                this.renderPhotoRoll();
            });
        });

        // Preview modal
        this.btnClosePreviewModal?.addEventListener('click', () => this.closePreviewModal());
        this.btnDownloadFromPreview?.addEventListener('click', () => {
            if (this.activePreviewIndex !== null && this.photos[this.activePreviewIndex]) {
                this.downloadSinglePhoto(this.photos[this.activePreviewIndex]);
            }
        });
        this.btnDeleteFromPreview?.addEventListener('click', () => {
            if (this.activePreviewIndex !== null) {
                this.deletePhoto(this.activePreviewIndex);
                this.closePreviewModal();
            }
        });

        // Gallery actions
        this.btnDownloadAll?.addEventListener('click', () => this.downloadAllPhotos());
        this.btnClearPhotos?.addEventListener('click', () => this.clearAllPhotos());

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space') {
                e.preventDefault();
                this.startCountdown(5);
            } else if (e.key === 's' || e.key === 'S') {
                this.toggleSkeleton();
            } else if (e.key === 'h' || e.key === 'H') {
                this.toggleHandDetect();
            } else if (e.key === 'm' || e.key === 'M') {
                this.toggleAudio();
            }
        });

        // Window resize
        window.addEventListener('resize', () => this.syncCanvasDimensions());
    }

    startClock() {
        const liveClock = document.getElementById('liveClock');
        const updateClock = () => {
            const now = new Date();
            if (liveClock) {
                liveClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // ==========================================
    // AUDIO SYNTHESIZER (Web Audio API)
    // ==========================================
    initAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playBeep(freq = 600, duration = 0.12, type = 'sine') {
        if (this.isAudioMuted) return;
        try {
            this.initAudio();
            if (!this.audioCtx) return;

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

            gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {
            console.warn('Audio playback error', e);
        }
    }

    playSmileChord() {
        if (this.isAudioMuted) return;
        this.playBeep(523.25, 0.25, 'triangle'); // C5
        setTimeout(() => this.playBeep(659.25, 0.25, 'triangle'), 80); // E5
        setTimeout(() => this.playBeep(783.99, 0.35, 'triangle'), 160); // G5
    }

    playShutterSound() {
        if (this.isAudioMuted) return;
        try {
            this.initAudio();
            if (!this.audioCtx) return;

            // Synthesize realistic mechanical shutter
            const bufferSize = this.audioCtx.sampleRate * 0.12;
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.audioCtx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
            filter.Q.setValueAtTime(1.5, this.audioCtx.currentTime);

            const gain = this.audioCtx.createGain();
            gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioCtx.destination);

            noise.start();
            noise.stop(this.audioCtx.currentTime + 0.12);
        } catch (e) {
            console.warn('Shutter sound error', e);
        }
    }

    toggleAudio() {
        this.isAudioMuted = !this.isAudioMuted;
        if (this.audioIconContainer) {
            if (this.isAudioMuted) {
                // Speaker muted vector
                this.audioIconContainer.innerHTML = `
                    <svg class="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <line x1="23" y1="9" x2="17" y2="15"/>
                        <line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                `;
            } else {
                // Speaker active vector
                this.audioIconContainer.innerHTML = `
                    <svg class="w-4 h-4 text-[#FF9000]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </svg>
                `;
            }
        }
    }

    // ==========================================
    // CAMERA & POSENET INITIALIZATION
    // ==========================================
    async initCameraAndModel() {
        this.updateAIStatus('loading', 'Starting Camera...');

        try {
            // Request camera stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
                audio: false,
            });

            this.stream = stream;
            this.video.srcObject = stream;

            await new Promise((resolve) => {
                const onReady = () => {
                    this.video.play();
                    this.syncCanvasDimensions();
                    resolve();
                };

                if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
                    onReady();
                } else {
                    this.video.onloadedmetadata = onReady;
                }
            });

            // Hide camera permission screen
            if (this.cameraLoadingScreen) {
                this.cameraLoadingScreen.classList.add('hidden');
            }

            this.updateGestureStatus('neutral', 'Camera active. Initializing PoseNet AI...');

            // Load PoseNet model
            await this.loadPoseNetModel();

        } catch (error) {
            console.error('Camera/PoseNet init failed:', error);
            this.updateAIStatus('error', 'Camera access blocked');
            if (this.cameraLoadingScreen) {
                this.cameraLoadingScreen.classList.remove('hidden');
                this.cameraLoadingScreen.innerHTML = `
                    <div class="w-16 h-16 rounded-2xl bg-[#141414] border border-red-900/60 text-red-500 flex items-center justify-center mb-4">
                        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <h3 class="text-sm font-bold text-white mb-1">Camera Access Blocked</h3>
                    <p class="text-xs text-zinc-400 max-w-sm mb-4">Please enable webcam permissions in your browser address bar and refresh the page.</p>
                    <button onclick="location.reload()" class="px-5 py-2.5 bg-[#FF9000] hover:bg-[#e07e00] text-black text-xs font-bold rounded-xl shadow transition">Try Again</button>
                `;
            }
        }
    }

    async loadPoseNetModel() {
        let attempts = 0;
        while (!window.posenet && attempts < 10) {
            await new Promise(r => setTimeout(r, 400));
            attempts++;
        }

        if (!window.posenet) {
            this.updateAIStatus('error', 'PoseNet library not found');
            return;
        }

        try {
            this.updateAIStatus('loading', 'Loading PoseNet AI Model...');

            // MobileNetV1 with stride 16 and resolution 257 for high-speed tracking
            this.net = await window.posenet.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                inputResolution: 257,
                multiplier: 0.75,
            });

            this.isModelLoaded = true;
            this.updateAIStatus('ready', 'PoseNet Active');
            this.updateGestureStatus('ready', 'Raise hand to start 5s timer');

            // Begin real-time detection loop
            this.startPoseLoop();
        } catch (err) {
            console.error('Failed to load PoseNet model:', err);
            this.updateAIStatus('error', 'PoseNet error: ' + (err.message || 'Check connection'));
            this.updateGestureStatus('error', 'Model load error. Click "5s Timer" or "Snap Now" to take photos.');
        }
    }

    syncCanvasDimensions() {
        if (!this.video || !this.overlayCanvas) return;
        const width = this.video.videoWidth || this.video.clientWidth || 640;
        const height = this.video.videoHeight || this.video.clientHeight || 480;

        // Set video.width and video.height numerical properties directly for PoseNet
        if (this.video.width !== width) this.video.width = width;
        if (this.video.height !== height) this.video.height = height;

        if (this.overlayCanvas.width !== width || this.overlayCanvas.height !== height) {
            this.overlayCanvas.width = width;
            this.overlayCanvas.height = height;
        }
    }

    updateAIStatus(state, text) {
        if (!this.aiStatusText || !this.aiStatusDot) return;
        this.aiStatusText.textContent = text;

        this.aiStatusDot.className = 'w-2 h-2 rounded-full';
        if (state === 'ready') {
            this.aiStatusDot.classList.add('bg-[#FF9000]', 'shadow-[0_0_8px_#FF9000]');
        } else if (state === 'loading') {
            this.aiStatusDot.classList.add('bg-[#FF9000]', 'animate-pulse');
        } else {
            this.aiStatusDot.classList.add('bg-red-500');
        }
    }

    updateGestureStatus(state, text) {
        if (!this.gestureText || !this.gestureDot) return;
        this.gestureText.textContent = text;

        this.gestureDot.className = 'w-2.5 h-2.5 rounded-full';
        if (state === 'raised') {
            this.gestureDot.classList.add('bg-[#FF9000]', 'shadow-[0_0_10px_#FF9000]', 'animate-ping');
        } else if (state === 'counting') {
            this.gestureDot.classList.add('bg-[#FF9000]', 'shadow-[0_0_8px_#FF9000]');
        } else if (state === 'ready') {
            this.gestureDot.classList.add('bg-[#FF9000]');
        } else {
            this.gestureDot.classList.add('bg-zinc-600');
        }
    }

    // ==========================================
    // POSE DETECTION & SKELETON RENDER LOOP
    // ==========================================
    startPoseLoop() {
        if (this.isDetecting) return;
        this.isDetecting = true;

        const loop = async () => {
            if (!this.isDetecting) return;

            if (this.net && this.video.readyState >= 2) {
                try {
                    if (this.video.videoWidth > 0 && (this.video.width !== this.video.videoWidth || this.overlayCanvas.width !== this.video.videoWidth)) {
                        this.syncCanvasDimensions();
                    }

                    const pose = await this.net.estimateSinglePose(this.video, {
                        flipHorizontal: false,
                    });

                    if (pose && pose.keypoints) {
                        this.processPose(pose);
                    }
                } catch (e) {
                    console.error('Pose estimation error:', e);
                }
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    processPose(pose) {
        if (!this.overlayCtx) return;

        // Clear previous overlay frame
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        if (!pose || !pose.keypoints) return;

        const keypoints = pose.keypoints;
        const keypointMap = {};
        keypoints.forEach(k => { keypointMap[k.part] = k; });

        const minConfidence = 0.2; // Sensitive confidence threshold

        const nose = keypointMap['nose'];
        const leftEye = keypointMap['leftEye'];
        const rightEye = keypointMap['rightEye'];
        const leftShoulder = keypointMap['leftShoulder'];
        const rightShoulder = keypointMap['rightShoulder'];
        const leftWrist = keypointMap['leftWrist'];
        const rightWrist = keypointMap['rightWrist'];

        // Determine reference head and shoulder Y positions
        // In image coordinates, y=0 is top of frame. Smaller y means higher up!
        let headY = 200;
        if (nose && nose.score >= minConfidence) {
            headY = nose.position.y;
        } else if (leftEye && leftEye.score >= minConfidence) {
            headY = leftEye.position.y;
        } else if (rightEye && rightEye.score >= minConfidence) {
            headY = rightEye.position.y;
        }

        let shoulderY = headY + 50;
        if (leftShoulder && leftShoulder.score >= minConfidence && rightShoulder && rightShoulder.score >= minConfidence) {
            shoulderY = Math.min(leftShoulder.position.y, rightShoulder.position.y);
        } else if (leftShoulder && leftShoulder.score >= minConfidence) {
            shoulderY = leftShoulder.position.y;
        } else if (rightShoulder && rightShoulder.score >= minConfidence) {
            shoulderY = rightShoulder.position.y;
        }

        // Hand is considered raised if the wrist is above the shoulder level
        const raiseThresholdY = shoulderY - 10;

        let isLeftHandRaised = false;
        let isRightHandRaised = false;

        if (leftWrist && leftWrist.score >= minConfidence && leftWrist.position.y < raiseThresholdY) {
            isLeftHandRaised = true;
        }

        if (rightWrist && rightWrist.score >= minConfidence && rightWrist.position.y < raiseThresholdY) {
            isRightHandRaised = true;
        }

        const isHandRaised = (isLeftHandRaised || isRightHandRaised);

        // 1. Draw Skeleton overlay with theme styling (#FF9000 & #000000)
        if (this.showSkeleton) {
            this.drawSkeleton(keypoints, minConfidence);
        }

        // 2. Highlight raised wrist with an animated glowing pulse (#FF9000)
        if (isLeftHandRaised && leftWrist) {
            this.drawRaisedHandGlow(leftWrist.position.x, leftWrist.position.y);
        }
        if (isRightHandRaised && rightWrist) {
            this.drawRaisedHandGlow(rightWrist.position.x, rightWrist.position.y);
        }

        // 4. Gesture state machine
        if (this.isCountingDown) {
            this.updateGestureStatus('counting', 'Countdown running! Smile!');
            return;
        }

        if (this.isCoolingDown) {
            this.updateGestureStatus('neutral', 'Preparing for next pose...');
            return;
        }

        if (!this.handTriggerEnabled) {
            this.updateGestureStatus('neutral', 'Hand trigger paused (Click 5s Timer or Snap)');
            return;
        }

        if (isHandRaised) {
            this.handRaiseCounter++;
            this.updateGestureStatus('raised', 'Hand detected! Triggering timer...');

            if (this.handRaiseCounter >= this.handRaiseThreshold) {
                this.handRaiseCounter = 0;
                this.startCountdown(5);
            }
        } else {
            this.handRaiseCounter = 0;
            this.updateGestureStatus('ready', 'Raise hand to start 5s timer');
        }
    }

    drawRaisedHandGlow(x, y) {
        const ctx = this.overlayCtx;
        ctx.save();

        // Outer pulsing aura in #FF9000
        ctx.beginPath();
        ctx.arc(x, y, 36, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 144, 0, 0.3)';
        ctx.fill();

        // Amber/orange glowing stroke ring
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, 2 * Math.PI);
        ctx.strokeStyle = '#FF9000';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#FF9000';
        ctx.shadowBlur = 18;
        ctx.stroke();

        // Inner white core
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
    }

    drawSkeleton(keypoints, minConfidence) {
        const ctx = this.overlayCtx;

        // Anatomical joint connections
        const connections = [
            // Head
            ['nose', 'leftEye'], ['leftEye', 'leftEar'],
            ['nose', 'rightEye'], ['rightEye', 'rightEar'],
            // Torso
            ['leftShoulder', 'rightShoulder'],
            ['leftShoulder', 'leftHip'],
            ['rightShoulder', 'rightHip'],
            ['leftHip', 'rightHip'],
            // Left Arm
            ['leftShoulder', 'leftElbow'],
            ['leftElbow', 'leftWrist'],
            // Right Arm
            ['rightShoulder', 'rightElbow'],
            ['rightElbow', 'rightWrist'],
            // Left Leg
            ['leftHip', 'leftKnee'],
            ['leftKnee', 'leftAnkle'],
            // Right Leg
            ['rightHip', 'rightKnee'],
            ['rightKnee', 'rightAnkle'],
        ];

        const map = {};
        keypoints.forEach(k => { map[k.part] = k; });

        ctx.save();

        // Draw bone lines with theme styling (#FF9000)
        connections.forEach(([partA, partB]) => {
            const kpA = map[partA];
            const kpB = map[partB];

            if (kpA && kpB && kpA.score >= minConfidence && kpB.score >= minConfidence) {
                ctx.beginPath();
                ctx.moveTo(kpA.position.x, kpA.position.y);
                ctx.lineTo(kpB.position.x, kpB.position.y);

                if (partA.includes('Wrist') || partB.includes('Wrist')) {
                    ctx.strokeStyle = '#FFFFFF'; // white wrist connectors
                } else if (partA.includes('Shoulder') && partB.includes('Shoulder')) {
                    ctx.strokeStyle = '#FFA726'; // amber
                } else {
                    ctx.strokeStyle = '#FF9000'; // primary brand orange
                }

                ctx.lineWidth = 4;
                ctx.shadowColor = '#FF9000';
                ctx.shadowBlur = 10;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        });

        // Draw joint nodes
        keypoints.forEach((kp) => {
            if (kp.score >= minConfidence) {
                ctx.beginPath();
                ctx.arc(kp.position.x, kp.position.y, 6, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#FF9000';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#FF9000';
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.stroke();
            }
        });

        ctx.restore();
    }

    // ==========================================
    // COUNTDOWN & PHOTO CAPTURE
    // ==========================================
    startCountdown(seconds = 5) {
        if (this.isCountingDown) return;

        this.initAudio();
        this.isCountingDown = true;
        let timeLeft = seconds;

        if (this.countdownOverlay) {
            this.countdownOverlay.classList.remove('hidden');
        }

        const totalCircumference = 440; // 2 * PI * 70

        const tick = () => {
            if (this.countdownNumber) {
                this.countdownNumber.textContent = timeLeft > 0 ? timeLeft : 'SNAP';
            }

            if (this.countdownSubtext) {
                if (timeLeft === 1) {
                    this.countdownSubtext.textContent = 'Smile!';
                } else {
                    this.countdownSubtext.textContent = this.isSeriesActive ? `Pose ${this.seriesPhotoCount + 1} of 5` : 'Strike a Pose';
                }
            }

            // Animate SVG circular progress
            if (this.countdownSvgCircle) {
                const fraction = (seconds - timeLeft) / seconds;
                const offset = totalCircumference * fraction;
                this.countdownSvgCircle.style.strokeDashoffset = offset;
            }

            // Audio beep
            if (timeLeft > 1) {
                this.playBeep(650, 0.12);
            } else if (timeLeft === 1) {
                this.playSmileChord();
            }

            if (timeLeft <= 0) {
                this.executeCapture();
            } else {
                timeLeft--;
                setTimeout(tick, 1000);
            }
        };

        tick();
    }

    executeCapture() {
        // Shutter sound
        this.playShutterSound();

        // Flash visual effect
        if (this.cameraFlash) {
            this.cameraFlash.classList.remove('animate-flash');
            void this.cameraFlash.offsetWidth;
            this.cameraFlash.classList.add('animate-flash');
        }

        // Capture photo
        this.capturePhoto();

        // Reset countdown display
        if (this.countdownOverlay) {
            this.countdownOverlay.classList.add('hidden');
        }
        if (this.countdownSvgCircle) {
            this.countdownSvgCircle.style.strokeDashoffset = '0';
        }

        this.isCountingDown = false;

        // Series mode handler: take up to 5 poses automatically
        if (this.isSeriesActive) {
            this.seriesPhotoCount++;
            if (this.seriesPhotoCount < 5) {
                this.updateGestureStatus('counting', `Prepare for Pose ${this.seriesPhotoCount + 1}...`);
                setTimeout(() => {
                    this.startCountdown(4);
                }, 2000);
                return;
            } else {
                this.isSeriesActive = false;
                this.seriesPhotoCount = 0;
                // Auto open the vertical photo strip
                setTimeout(() => this.openRollModal(), 1200);
            }
        }

        // Enter 3s cooldown so user doesn't immediately re-trigger while lowering hand
        this.isCoolingDown = true;
        if (this.cooldownBanner) {
            this.cooldownBanner.classList.remove('hidden');
        }

        setTimeout(() => {
            this.isCoolingDown = false;
            if (this.cooldownBanner) {
                this.cooldownBanner.classList.add('hidden');
            }
        }, 3000);
    }

    startSeriesMode() {
        if (this.isCountingDown) return;
        // Start a fresh 5-pose series so slots 1 through 5 are occupied by this session
        this.photos = [];
        this.savePhotosToStorage();
        this.renderPhotosList();

        this.isSeriesActive = true;
        this.seriesPhotoCount = 0;
        this.startCountdown(5);
    }

    capturePhoto() {
        if (!this.video || this.video.readyState < 2) return;

        const width = this.video.videoWidth || 1280;
        const height = this.video.videoHeight || 720;

        this.captureCanvas.width = width;
        this.captureCanvas.height = height;

        const ctx = this.captureCanvas.getContext('2d');

        ctx.save();

        // Mirror flip to match camera viewport
        if (this.isMirrored) {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
        }

        // Apply selected filter to canvas context
        this.applyFilterToContext(ctx, this.selectedFilter);

        // Draw crisp video frame
        ctx.drawImage(this.video, 0, 0, width, height);

        ctx.restore();

        // Convert to high quality PNG data URL
        const dataUrl = this.captureCanvas.toDataURL('image/png', 0.95);

        const newPhoto = {
            id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            dataUrl: dataUrl,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            filter: this.selectedFilter,
            width: width,
            height: height,
        };

        // Add to photos queue
        this.photos.push(newPhoto);

        // Keep strictly last 5
        if (this.photos.length > this.maxPhotos) {
            this.photos.shift(); // remove oldest
        }

        // Persist to localStorage
        this.savePhotosToStorage();

        // Update gallery UI
        this.renderPhotosList();

        // Upload to Laravel backend in background
        this.uploadPhotoToServer(newPhoto);
    }

    applyFilterToContext(ctx, filterName) {
        if (filterName === 'vintage') {
            ctx.filter = 'contrast(115%) brightness(105%) sepia(25%) saturate(120%)';
        } else if (filterName === 'noir') {
            ctx.filter = 'grayscale(100%) contrast(140%) brightness(95%)';
        } else if (filterName === 'warm') {
            ctx.filter = 'sepia(35%) saturate(140%) brightness(102%) hue-rotate(-10deg)';
        } else if (filterName === 'cyber') {
            ctx.filter = 'contrast(125%) saturate(150%) sepia(20%) hue-rotate(20deg)';
        } else if (filterName === 'sepia') {
            ctx.filter = 'sepia(80%) contrast(110%) brightness(95%)';
        } else {
            ctx.filter = 'none';
        }
    }

    setFilter(filterName) {
        this.selectedFilter = filterName;
        if (this.activeFilterBadge) {
            this.activeFilterBadge.textContent = filterName.charAt(0).toUpperCase() + filterName.slice(1);
        }

        // Apply CSS filter to live video
        if (this.video) {
            if (filterName === 'vintage') {
                this.video.style.filter = 'contrast(115%) brightness(105%) sepia(25%) saturate(120%)';
            } else if (filterName === 'noir') {
                this.video.style.filter = 'grayscale(100%) contrast(140%) brightness(95%)';
            } else if (filterName === 'warm') {
                this.video.style.filter = 'sepia(35%) saturate(140%) brightness(102%) hue-rotate(-10deg)';
            } else if (filterName === 'cyber') {
                this.video.style.filter = 'contrast(125%) saturate(150%) sepia(20%) hue-rotate(20deg)';
            } else if (filterName === 'sepia') {
                this.video.style.filter = 'sepia(80%) contrast(110%) brightness(95%)';
            } else {
                this.video.style.filter = 'none';
            }
        }
    }

    toggleSkeleton() {
        this.showSkeleton = !this.showSkeleton;
        if (this.skeletonBtnLabel) {
            this.skeletonBtnLabel.textContent = this.showSkeleton ? 'Skeleton: ON' : 'Skeleton: OFF';
        }
        if (this.btnToggleSkeleton) {
            if (this.showSkeleton) {
                this.btnToggleSkeleton.className = 'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#FF9000]/40 bg-[#FF9000]/10 text-[#FF9000] hover:bg-[#FF9000]/20 transition cursor-pointer';
            } else {
                this.btnToggleSkeleton.className = 'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#2a2a2a] bg-[#141414] text-zinc-400 hover:text-white transition cursor-pointer';
            }
        }
        if (this.skeletonIndicator) {
            if (this.showSkeleton) {
                this.skeletonIndicator.classList.remove('hidden');
                this.skeletonIndicator.classList.add('flex');
            } else {
                this.skeletonIndicator.classList.add('hidden');
                this.skeletonIndicator.classList.remove('flex');
            }
        }
    }

    toggleHandDetect() {
        this.handTriggerEnabled = !this.handTriggerEnabled;
        if (this.handDetectBtnLabel) {
            this.handDetectBtnLabel.textContent = this.handTriggerEnabled ? 'Hand Trigger: ON' : 'Hand Trigger: OFF';
        }
        if (this.btnToggleHandDetect) {
            if (this.handTriggerEnabled) {
                this.btnToggleHandDetect.className = 'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#FF9000]/40 bg-[#FF9000]/10 text-[#FF9000] hover:bg-[#FF9000]/20 transition cursor-pointer';
            } else {
                this.btnToggleHandDetect.className = 'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#2a2a2a] bg-[#141414] text-zinc-400 hover:text-white transition cursor-pointer';
            }
        }
    }

    toggleMirror() {
        this.isMirrored = !this.isMirrored;
        if (this.video && this.overlayCanvas) {
            if (this.isMirrored) {
                this.video.classList.add('-scale-x-100');
                this.overlayCanvas.classList.add('-scale-x-100');
            } else {
                this.video.classList.remove('-scale-x-100');
                this.overlayCanvas.classList.remove('-scale-x-100');
            }
        }
    }

    // ==========================================
    // GALLERY: LAST 5 PHOTOS MANAGEMENT
    // ==========================================
    renderPhotosList() {
        if (!this.photosListContainer) return;

        this.photosListContainer.innerHTML = '';
        const count = this.photos.length;

        if (this.photoCountBadge) {
            this.photoCountBadge.textContent = `${count} / ${this.maxPhotos}`;
        }

        const hasPhotos = count > 0;
        if (this.btnOpenRollModal) {
            this.btnOpenRollModal.disabled = !hasPhotos;
            const rollSpan = this.btnOpenRollModal.querySelector('span');
            if (rollSpan) {
                rollSpan.textContent = count === 5
                    ? 'Save Last 5 as Photo Roll (Vertical Strip)'
                    : `Save ${count} Photo${count === 1 ? '' : 's'} as Photo Roll (Vertical Strip)`;
            }
        }
        if (this.btnDownloadAll) this.btnDownloadAll.disabled = !hasPhotos;
        if (this.btnClearPhotos) this.btnClearPhotos.disabled = !hasPhotos;

        // Render exactly 5 slots with vectors
        for (let i = 0; i < this.maxPhotos; i++) {
            const photo = this.photos[i];
            const slotIndex = i + 1;

            const slotEl = document.createElement('div');
            slotEl.className = 'flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ';

            if (photo) {
                slotEl.className += 'bg-[#0f0f0f] border-[#222222] hover:border-[#FF9000]/40 shadow-sm';
                slotEl.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="relative w-14 h-11 bg-black rounded-lg overflow-hidden border border-[#2a2a2a] cursor-pointer group" data-action="preview" data-index="${i}">
                            <img src="${photo.dataUrl}" alt="Photo ${slotIndex}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#FF9000]">
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <circle cx="11" cy="11" r="8"/>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FF9000]/15 text-[#FF9000] border border-[#FF9000]/30">
                                    #${slotIndex}
                                </span>
                                <span class="text-xs font-semibold text-white">${photo.timestamp}</span>
                            </div>
                            <span class="text-[10px] text-zinc-400 capitalize">${photo.filter || 'Normal'} Filter</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button type="button" class="p-2 rounded-lg bg-[#181818] hover:bg-[#222222] text-zinc-300 hover:text-[#FF9000] border border-[#282828] text-xs cursor-pointer" data-action="download" data-index="${i}" title="Download Photo">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                        </button>
                        <button type="button" class="p-2 rounded-lg bg-[#181818] hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-[#282828] text-xs cursor-pointer" data-action="delete" data-index="${i}" title="Delete Photo">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                `;
            } else {
                slotEl.className += 'bg-[#080808] border-[#1a1a1a] border-dashed text-zinc-600';
                slotEl.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-14 h-11 rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] flex items-center justify-center text-xs font-mono text-zinc-600">
                            0${slotIndex}
                        </div>
                        <div class="text-xs text-zinc-500">
                            <span>Slot ${slotIndex}: Empty</span>
                            <div class="text-[10px] text-zinc-600">Raise hand to capture</div>
                        </div>
                    </div>
                    <div class="text-zinc-700">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </div>
                `;
            }

            this.photosListContainer.appendChild(slotEl);
        }

        // Add event listeners to photo action buttons
        this.photosListContainer.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const action = target.dataset.action;
                const index = parseInt(target.dataset.index, 10);

                if (action === 'preview') {
                    this.openPreviewModal(index);
                } else if (action === 'download') {
                    this.downloadSinglePhoto(this.photos[index]);
                } else if (action === 'delete') {
                    this.deletePhoto(index);
                }
            });
        });
    }

    downloadSinglePhoto(photo) {
        if (!photo) return;
        const src = photo.download_url || photo.dataUrl || photo.url || photo.serverUrl;
        if (!src) return;

        const a = document.createElement('a');
        a.href = src;
        a.download = `photobooth-${photo.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    downloadAllPhotos() {
        if (this.photos.length === 0) return;
        this.photos.forEach((photo, idx) => {
            setTimeout(() => {
                const src = photo.download_url || photo.dataUrl || photo.url || photo.serverUrl;
                if (!src) return;
                const a = document.createElement('a');
                a.href = src;
                a.download = `photobooth-photo-${idx + 1}-${photo.id}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, idx * 250);
        });
    }

    deletePhoto(index) {
        const photo = this.photos[index];
        if (!photo) return;

        if (photo.serverId) {
            fetch(`/api/photos/${photo.serverId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            }).catch(console.error);
        }

        this.photos.splice(index, 1);
        this.savePhotosToStorage();
        this.renderPhotosList();
    }

    clearAllPhotos() {
        if (!confirm('Are you sure you want to clear your current photobooth session photos?')) return;
        this.photos = [];
        this.savePhotosToStorage();
        this.renderPhotosList();
    }

    openPreviewModal(index) {
        const photo = this.photos[index];
        if (!photo) return;

        this.activePreviewIndex = index;
        if (this.previewImage) this.previewImage.src = photo.dataUrl;
        if (this.previewTitle) this.previewTitle.textContent = `Photo #${index + 1} (${photo.timestamp})`;
        if (this.previewModal) this.previewModal.classList.remove('hidden');
    }

    closePreviewModal() {
        if (this.previewModal) this.previewModal.classList.add('hidden');
        this.activePreviewIndex = null;
    }

    savePhotosToStorage() {
        try {
            localStorage.setItem('posenet_booth_photos', JSON.stringify(this.photos));
        } catch (e) {
            console.warn('Storage quota reached', e);
        }
    }

    async loadStoredPhotos() {
        try {
            const stored = localStorage.getItem('posenet_booth_photos');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.photos = parsed.slice(-this.maxPhotos);
                }
            }
        } catch (e) {
            console.warn('Error reading stored photos', e);
        }

        // If no stored photos in localStorage, try fetching from backend API
        if (this.photos.length === 0) {
            try {
                const res = await fetch('/api/photos');
                const data = await res.json();
                if (data && Array.isArray(data.photos) && data.photos.length > 0) {
                    // Server returns newest first, reverse so oldest is first (slot 1 to slot 5)
                    const serverPhotos = [...data.photos].reverse();
                    this.photos = serverPhotos.map((p, idx) => ({
                        id: 'server_' + p.id,
                        serverId: p.id,
                        dataUrl: p.url,
                        url: p.url,
                        timestamp: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `Photo #${idx + 1}`,
                        filter: 'normal',
                    }));
                }
            } catch (err) {
                console.warn('Could not sync photos from server:', err);
            }
        }

        this.renderPhotosList();
    }

    async uploadPhotoToServer(photo) {
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch('/api/photos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    image: photo.dataUrl,
                    type: 'single',
                    width: photo.width,
                    height: photo.height,
                }),
            });

            const data = await res.json();
            if (data.success && data.photo) {
                photo.serverId = data.photo.id;
                photo.serverUrl = data.photo.url;
                this.savePhotosToStorage();
            }
        } catch (err) {
            console.warn('Background server save failed:', err);
        }
    }

    // ==========================================
    // VERTICAL PHOTO ROLL (STRIP) GENERATOR
    // ==========================================
    async openRollModal() {
        if (this.photos.length === 0) return;
        if (this.rollModal) this.rollModal.classList.remove('hidden');
        if (this.rollPreviewContainer) {
            this.rollPreviewContainer.scrollTop = 0;
        }
        await this.renderPhotoRoll();
        if (this.rollPreviewContainer) {
            this.rollPreviewContainer.scrollTop = 0;
        }
    }

    closeRollModal() {
        if (this.rollModal) this.rollModal.classList.add('hidden');
    }

    async renderPhotoRoll() {
        if (!this.photoRollCanvas || this.photos.length === 0) return;

        // If a render is already running, wait for it
        if (this.isRenderingRoll && this.currentRenderPromise) {
            return this.currentRenderPromise;
        }

        this.isRenderingRoll = true;
        if (this.rollLoadingIndicator) {
            this.rollLoadingIndicator.classList.remove('hidden');
        }

        this.currentRenderPromise = (async () => {
            try {
                // Strictly take up to 5 photos from the queue
                const count = Math.min(this.photos.length, this.maxPhotos);
                const photosToRender = this.photos.slice(0, count);

                // Step 1: Preload ALL images in parallel before touching canvas
                const loadedItems = await Promise.all(
                    photosToRender.map(async (photo, idx) => {
                        const src = photo.dataUrl || photo.url || photo.serverUrl;
                        if (!src) return null;
                        try {
                            const img = await this.loadImage(src);
                            return { photo, img, index: idx };
                        } catch (err) {
                            console.error(`Error preloading roll photo #${idx + 1}:`, err);
                            return null;
                        }
                    })
                );

                const validItems = loadedItems.filter(item => item !== null);
                if (validItems.length === 0) return;

                const renderCount = validItems.length;
                const canvas = this.photoRollCanvas;
                const ctx = canvas.getContext('2d');

                // Dimensions: 600px width for sharp print quality
                const stripWidth = 600;
                const padding = 36;
                const photoWidth = stripWidth - (padding * 2); // 528px
                const photoHeight = Math.round(photoWidth * (3 / 4)); // 396px (4:3 aspect ratio)
                const photoGap = 24;

                const headerHeight = 150;
                const footerHeight = 130;
                const stripHeight = headerHeight + (renderCount * photoHeight) + ((renderCount - 1) * photoGap) + footerHeight;

                canvas.width = stripWidth;
                canvas.height = stripHeight;

                // Theme palette with #FF9000 & #000000 primary theme
                const themes = {
                    amber: {
                        bg: '#000000',
                        textMain: '#FF9000',
                        textSub: '#d4d4d8',
                        border: '#FF9000',
                        photoBorder: '#141414',
                        shadow: 'rgba(255, 144, 0, 0.25)',
                    },
                    noir: {
                        bg: '#09090b',
                        textMain: '#ffffff',
                        textSub: '#a1a1aa',
                        border: '#27272a',
                        photoBorder: '#18181b',
                        shadow: 'rgba(0,0,0,0.6)',
                    },
                    white: {
                        bg: '#ffffff',
                        textMain: '#000000',
                        textSub: '#52525b',
                        border: '#e4e4e7',
                        photoBorder: '#ffffff',
                        shadow: 'rgba(0,0,0,0.12)',
                    },
                    vintage: {
                        bg: '#fefce8',
                        textMain: '#451a03',
                        textSub: '#78350f',
                        border: '#fef08a',
                        photoBorder: '#ffffff',
                        shadow: 'rgba(120,53,15,0.15)',
                    },
                };

                const t = themes[this.activeTheme] || themes.amber;

                // Background
                ctx.fillStyle = t.bg;
                ctx.fillRect(0, 0, stripWidth, stripHeight);

                // Outer border
                ctx.strokeStyle = t.border;
                ctx.lineWidth = 4;
                ctx.strokeRect(2, 2, stripWidth - 4, stripHeight - 4);

                // Header Title
                const titleText = (this.inputRollTitle?.value || 'POSEBOOTH').toUpperCase();
                ctx.fillStyle = t.textMain;
                ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.letterSpacing = '3px';
                ctx.fillText(titleText, stripWidth / 2, 65);

                // Header Date & Time
                if (this.checkIncludeDate?.checked) {
                    const now = new Date();
                    const dateStr = now.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    }).toUpperCase() + ' // ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    ctx.fillStyle = t.textSub;
                    ctx.font = '500 13px monospace';
                    ctx.fillText(dateStr, stripWidth / 2, 95);
                }

                // Decorative separator line
                ctx.strokeStyle = t.border;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(padding, 115);
                ctx.lineTo(stripWidth - padding, 115);
                ctx.stroke();

                // Draw each photo sequentially starting from headerHeight
                let currentY = headerHeight;

                for (let i = 0; i < validItems.length; i++) {
                    const { photo, img, index } = validItems[i];
                    const slotNum = index + 1;

                    // Photo frame shadow
                    ctx.save();
                    ctx.shadowColor = t.shadow;
                    ctx.shadowBlur = 14;
                    ctx.shadowOffsetY = 4;

                    // Photo frame background
                    ctx.fillStyle = t.photoBorder;
                    this.roundRect(ctx, padding - 4, currentY - 4, photoWidth + 8, photoHeight + 8, 8);
                    ctx.fill();
                    ctx.restore();

                    // Aspect fill crop (center crop into 4:3)
                    const imgAspect = img.width / img.height;
                    const targetAspect = photoWidth / photoHeight;
                    let sx = 0, sy = 0, sw = img.width, sh = img.height;
                    if (imgAspect > targetAspect) {
                        sw = img.height * targetAspect;
                        sx = (img.width - sw) / 2;
                    } else {
                        sh = img.width / targetAspect;
                        sy = (img.height - sh) / 2;
                    }

                    // Clip & draw image with rounded corners
                    ctx.save();
                    this.roundRect(ctx, padding, currentY, photoWidth, photoHeight, 6);
                    ctx.clip();
                    ctx.drawImage(img, sx, sy, sw, sh, padding, currentY, photoWidth, photoHeight);
                    ctx.restore();

                    // Border around photo
                    ctx.strokeStyle = t.border === '#FF9000' ? '#FF9000' : 'rgba(0,0,0,0.15)';
                    ctx.lineWidth = 1.5;
                    this.roundRect(ctx, padding, currentY, photoWidth, photoHeight, 6);
                    ctx.stroke();

                    // Sequential badge at corner (01, 02, etc.)
                    ctx.fillStyle = '#000000';
                    this.roundRect(ctx, padding + 12, currentY + 12, 38, 22, 4);
                    ctx.fill();
                    ctx.strokeStyle = '#FF9000';
                    ctx.lineWidth = 1;
                    this.roundRect(ctx, padding + 12, currentY + 12, 38, 22, 4);
                    ctx.stroke();

                    ctx.fillStyle = '#FF9000';
                    ctx.font = 'bold 11px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`0${slotNum}`, padding + 31, currentY + 27);

                    currentY += photoHeight + photoGap;
                }

                // Footer Section
                const footerY = currentY - photoGap + 35;

                // Decorative separator
                ctx.strokeStyle = t.border;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(padding, footerY);
                ctx.lineTo(stripWidth - padding, footerY);
                ctx.stroke();

                // Custom Subtitle / Caption
                const subtitleText = (this.inputRollSubtitle?.value || 'SHOT WITH POSENET AI').toUpperCase();
                ctx.fillStyle = t.textSub;
                ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.letterSpacing = '1.5px';
                ctx.fillText(subtitleText, stripWidth / 2, footerY + 32);

                // Photobooth barcode
                this.drawBarcode(ctx, stripWidth / 2 - 90, footerY + 45, 180, 24, t.textMain);

                if (this.rollPreviewContainer) {
                    this.rollPreviewContainer.scrollTop = 0;
                }
            } finally {
                this.isRenderingRoll = false;
                this.currentRenderPromise = null;
                if (this.rollLoadingIndicator) {
                    this.rollLoadingIndicator.classList.add('hidden');
                }
            }
        })();

        return this.currentRenderPromise;
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    drawBarcode(ctx, x, y, width, height, color) {
        ctx.fillStyle = color;
        const barCount = 42;
        const baseWidth = width / barCount;
        for (let i = 0; i < barCount; i++) {
            if ((i * 7) % 3 !== 0) {
                const barW = (i % 2 === 0) ? baseWidth * 0.8 : baseWidth * 1.5;
                ctx.fillRect(x + (i * baseWidth), y, barW, height);
            }
        }
    }

    async downloadPhotoRoll() {
        if (this.isRenderingRoll && this.currentRenderPromise) {
            await this.currentRenderPromise;
        } else {
            await this.renderPhotoRoll();
        }

        if (!this.photoRollCanvas) return;
        const dataUrl = this.photoRollCanvas.toDataURL('image/png', 0.95);

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `photobooth-roll-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async saveRollToServer() {
        if (this.isRenderingRoll && this.currentRenderPromise) {
            await this.currentRenderPromise;
        } else {
            await this.renderPhotoRoll();
        }

        if (!this.photoRollCanvas) return;
        if (this.rollSaveStatus) {
            this.rollSaveStatus.textContent = 'Saving to server...';
        }

        try {
            const dataUrl = this.photoRollCanvas.toDataURL('image/png', 0.95);
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const res = await fetch('/api/photos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    image: dataUrl,
                    type: 'strip',
                    width: this.photoRollCanvas.width,
                    height: this.photoRollCanvas.height,
                }),
            });

            const data = await res.json();
            if (data.success && this.rollSaveStatus) {
                this.rollSaveStatus.textContent = 'Saved to cloud successfully';
                setTimeout(() => {
                    if (this.rollSaveStatus) this.rollSaveStatus.textContent = '';
                }, 3000);
            }
        } catch (err) {
            console.error('Failed to save roll to server:', err);
            if (this.rollSaveStatus) {
                this.rollSaveStatus.textContent = 'Upload failed. Use Download PNG.';
            }
        }
    }
}

// Bootstrap when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.photobooth = new Photobooth();
});
