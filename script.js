document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const introOverlay = document.getElementById('intro-overlay');
    const video = document.getElementById('video');
    const countdownEl = document.getElementById('countdown');
    const flashEl = document.getElementById('flash');
    const photoIndexEl = document.getElementById('photo-index');
    const totalSlotsText = document.getElementById('total-slots-text');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const downloadBtn = document.getElementById('download-btn');
    const downloadGifBtn = document.getElementById('download-gif-btn');
    const strip = document.getElementById('booth-strip');
    const photoSlotsContainer = document.getElementById('photo-slots-container');
    const stripFooterText = document.getElementById('strip-footer-text');
    const stripDateText = document.getElementById('strip-date-text');
    const customTextInput = document.getElementById('custom-text-input');
    const timerSelect = document.getElementById('timer-select');
    const uploadInput = document.getElementById('upload-input');
    const printBtn = document.getElementById('print-btn');
    const download4rBtn = document.getElementById('download-4r-btn');
    const printImg = document.getElementById('print-img');
    const stripTabs = document.getElementById('strip-tabs');
    const secondStripBtn = document.getElementById('second-strip-btn');

    // Filter Sliders
    const sliderBrightness = document.getElementById('slider-brightness');
    const sliderContrast = document.getElementById('slider-contrast');
    const sliderSaturate = document.getElementById('slider-saturate');
    const valBrightness = document.getElementById('val-brightness');
    const valContrast = document.getElementById('val-contrast');
    const valSaturate = document.getElementById('val-saturate');

    // App States
    let currentFilter = 'filter-normal';
    let currentFrameColor = '#ffffff';
    let currentTemplate = 'classic';
    let currentShape = 'square';
    let maxSlots = 4;
    const MAX_SLOTS = 4;
    const FIXED_SLOTS = { gridportrait: 4, duov: 2, singlep: 1, strip3: 3 };
    let lastFreeSlots = 4;
    let timerDelay = 5;
    let photosTaken = 0;
    let stream = null;
    let defaultFooterText = '𝑀𝒾𝓇𝓃𝒶 𝒮𝓉𝓊𝒹𝒾𝑜';
    let retakeTargetIndex = null;
    let audioCtx = null;
    let activeTimerInterval = null;
    const capturedImages = new Array(MAX_SLOTS).fill(null);
    const newStripData = () => ({ imgs: new Array(MAX_SLOTS).fill(null), up: new Array(MAX_SLOTS).fill(false) });
    let strips = [newStripData(), newStripData()]; // data strip 1 & 2 (yang aktif ada di capturedImages)
    let activeStrip = 0;
    const isUploadedPhoto = new Array(MAX_SLOTS).fill(false);

    // Manual Adjust Values
    let manualAdj = { brightness: 100, contrast: 100, saturate: 100 };

    // Set Tanggal
    const today = new Date();
    if (stripDateText) {
        stripDateText.innerText = today.toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    }

    // Dismiss Intro Overlay (Disesuaikan dengan CSS)
    function hideIntroOverlay() {
        if (introOverlay) {
            setTimeout(() => {
                introOverlay.classList.add('fade-out');
                setTimeout(() => {
                    introOverlay.style.display = 'none';
                }, 1200);
            }, 2500);
        }
    }

    // Deteksi warna gelap (untuk menentukan warna teks di atas frame)
    function isDarkColor(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
        if (!m) return false;
        const n = parseInt(m[1], 16);
        const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
        return lum < 0.6;
    }

    function updateFooterTextColor() {
        const dark = isDarkColor(currentFrameColor);
        if (stripFooterText) stripFooterText.style.color = dark ? '#ffffff' : '';
        if (stripDateText) stripDateText.style.color = dark ? '#e2e8f0' : '';
    }

    // Audio Synth Beep & Shutter
    function playAudio(type) {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            if (type === 'beep') {
                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
            } else if (type === 'shutter') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.08);
            }
        } catch (e) {
            console.warn('Audio play error:', e);
        }
    }

    // Inisialisasi Kamera
    async function initCamera() {
        try {
            if (stream) stream.getTracks().forEach(track => track.stop());
            
            stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: 'user',
                    width: { ideal: 1920, max: 3840 },
                    height: { ideal: 1080, max: 2160 }
                }
            });
            video.srcObject = stream;
        } catch (err) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                video.srcObject = stream;
            } catch (fallbackErr) {
                alert('Akses kamera ditolak atau perangkat kamera tidak ditemukan.');
            }
        } finally {
            hideIntroOverlay();
        }
    }

    // Pattern Mask Heart
    function drawHeartMask(ctx, x, y, w, h) {
        ctx.beginPath();
        const topY = y + h * 0.18;
        const bottomY = y + h * 0.99;
        const centerX = x + w / 2;
        
        ctx.moveTo(centerX, topY);
        ctx.bezierCurveTo(
            x + w * 0.12, y - h * 0.18,
            x - w * 0.35, y + h * 0.40,
            centerX, bottomY
        );
        ctx.bezierCurveTo(
            x + w * 1.35, y + h * 0.40,
            x + w * 0.88, y - h * 0.18,
            centerX, topY
        );
        ctx.closePath();
        ctx.clip();
    }

    // Update Live CSS Filter + Manual Adjustment
    function updateAppliedFilter() {
        if (video) {
            video.className = `w-full h-full object-cover ${currentFilter}`;
            video.style.filter = getCombinedFilterStyle(currentFilter);
        }

        for (let i = 1; i <= MAX_SLOTS; i++) {
            const canvas = document.getElementById(`canvas-${i}`);
            if (canvas && !canvas.classList.contains('hidden')) {
                const uploadedClass = isUploadedPhoto[i - 1] ? 'uploaded-frame' : '';
                const heartClass = currentShape === 'heart' ? 'heart-shape-active' : '';
                canvas.className = `w-full h-full captured-frame ${uploadedClass} ${currentFilter} ${heartClass}`;
                canvas.style.filter = getCombinedFilterStyle(currentFilter);
            }
        }
    }

    function getCombinedFilterStyle(preset) {
        const presets = {
            'filter-vintage': 'sepia(0.35) contrast(0.95) brightness(1.05) saturate(1.1)',
            'filter-bw': 'grayscale(1) contrast(1.15) brightness(1.02)',
            'filter-warm': 'saturate(1.2) sepia(0.12) brightness(1.03)',
            'filter-cool': 'hue-rotate(10deg) saturate(1.1) brightness(1.03)',
            'filter-normal': ''
        };
        const base = presets[preset] || '';
        const pro = `brightness(${manualAdj.brightness}%) contrast(${manualAdj.contrast}%) saturate(${manualAdj.saturate}%)`;
        return `${base} ${pro}`.trim();
    }

    // Sliders Filter Listener
    [sliderBrightness, sliderContrast, sliderSaturate].forEach(slider => {
        if (!slider) return;
        slider.addEventListener('input', () => {
            manualAdj.brightness = sliderBrightness.value;
            manualAdj.contrast = sliderContrast.value;
            manualAdj.saturate = sliderSaturate.value;

            if (valBrightness) valBrightness.innerText = `${manualAdj.brightness}%`;
            if (valContrast) valContrast.innerText = `${manualAdj.contrast}%`;
            if (valSaturate) valSaturate.innerText = `${manualAdj.saturate}%`;

            updateAppliedFilter();
        });
    });

    // Event Listener Unggah Foto
    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            let slotIdx = photosTaken < maxSlots ? photosTaken : 0;

            files.slice(0, maxSlots - slotIdx).forEach((file, index) => {
                const currentSlot = slotIdx + index;
                if (currentSlot >= maxSlots) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        drawUploadedImageToCanvas(img, currentSlot);
                        photosTaken = Math.max(photosTaken, currentSlot + 1);
                        if (photoIndexEl) photoIndexEl.innerText = photosTaken;

                        if (photosTaken >= maxSlots) {
                            finishSession();
                        } else {
                            if (downloadBtn) downloadBtn.disabled = false;
                            if (downloadGifBtn) downloadGifBtn.disabled = false;
                            showRetakeBtns();
                        }
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });

            uploadInput.value = '';
        });
    }

    function drawUploadedImageToCanvas(img, slotIdx) {
        const targetCanvas = document.getElementById(`canvas-${slotIdx + 1}`);
        if (!targetCanvas) return;
        const ctx = targetCanvas.getContext('2d');

        const targetWidth = 1440;
        const targetHeight = 1080;
        targetCanvas.width = targetWidth;
        targetCanvas.height = targetHeight;

        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        let sWidth, sHeight, sx, sy;
        if (imgRatio > targetRatio) {
            sHeight = img.height;
            sWidth = img.height * targetRatio;
            sx = (img.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = img.width;
            sHeight = img.width / targetRatio;
            sx = 0;
            sy = (img.height - sHeight) / 2;
        }

        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        capturedImages[slotIdx] = targetCanvas.toDataURL('image/png', 1.0);
        isUploadedPhoto[slotIdx] = true;

        const heartClass = currentShape === 'heart' ? 'heart-shape-active' : '';
        targetCanvas.className = `w-full h-full captured-frame uploaded-frame ${currentFilter} ${heartClass}`;
        targetCanvas.style.filter = getCombinedFilterStyle(currentFilter);
        targetCanvas.classList.remove('hidden');
        updateStripUI();
    }

    if (customTextInput) {
        customTextInput.addEventListener('input', (e) => {
            const text = e.target.value.trim();
            if (stripFooterText) stripFooterText.innerText = text !== '' ? text : defaultFooterText;
        });
    }

    if (timerSelect) {
        timerSelect.addEventListener('change', (e) => {
            timerDelay = parseInt(e.target.value);
        });
    }

    function applyFrameTemplate(t) {
        if (!strip || !photoSlotsContainer) return;
        strip.dataset.tpl = t;
        strip.style.backgroundColor = currentFrameColor;
        strip.style.paddingTop = strip.style.paddingBottom = '';
        strip.style.paddingLeft = strip.style.paddingRight = '';

        let width = '240px', cls = 'grid grid-cols-1 gap-3 z-0';
        switch (t) {
            case 'strip3':    width = '220px'; cls = 'grid grid-cols-1 gap-2 z-0';
                strip.style.paddingTop = '115px'; strip.style.paddingLeft = strip.style.paddingRight = '19px'; break;
            case 'duov':      width = '300px'; cls = 'grid grid-cols-1 gap-2 z-0';
                strip.style.paddingTop = '48px'; strip.style.paddingLeft = strip.style.paddingRight = '31px'; break;
            case 'singlep':   width = '300px'; cls = 'grid grid-cols-1 gap-2 z-0';
                strip.style.paddingTop = '45px'; strip.style.paddingLeft = strip.style.paddingRight = '39px'; break;
            case 'gridportrait': width = '300px'; cls = 'grid grid-cols-2 gap-3 z-0';
                strip.style.paddingTop = '24px'; strip.style.paddingLeft = strip.style.paddingRight = '16px'; break;
        }
        strip.style.width = width;
        strip.style.aspectRatio = { gridportrait: '2 / 3', duov: '2 / 3', singlep: '2 / 3', strip3: '1 / 3' }[t] || '';
        photoSlotsContainer.className = cls;
        updateStripUI();
    }

    function setSlotCount(n) {
        maxSlots = n;
        if (totalSlotsText) totalSlotsText.innerText = n;
        for (let i = 1; i <= MAX_SLOTS; i++) {
            const slot = document.getElementById(`canvas-${i}`)?.parentElement;
            if (slot) slot.classList.toggle('hidden', i > n);
        }
    }

    function applyFrameShape(shape) {
        currentShape = shape;

        for (let i = 1; i <= MAX_SLOTS; i++) {
            const canvas = document.getElementById(`canvas-${i}`);
            if (canvas) {
                const parentSlot = canvas.parentElement;
                if (shape === 'heart') {
                    canvas.classList.add('heart-shape-active');
                    if (parentSlot) parentSlot.classList.add('heart-shape-active');
                } else {
                    canvas.classList.remove('heart-shape-active');
                    if (parentSlot) parentSlot.classList.remove('heart-shape-active');
                }
            }
        }
    }

    function startPhotobooth() {
        if (activeTimerInterval) clearInterval(activeTimerInterval);
        photosTaken = 0;
        retakeTargetIndex = null;
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerText = 'Bersiap...';
        }
        if (downloadBtn) downloadBtn.disabled = true;
        if (downloadGifBtn) downloadGifBtn.disabled = true;
        hideAllRetakeBtns();
        updateStripUI();
        
        for (let i = 1; i <= maxSlots; i++) {
            const canvas = document.getElementById(`canvas-${i}`);
            if (canvas) canvas.classList.add('hidden');
            isUploadedPhoto[i - 1] = false;
            capturedImages[i - 1] = null;
        }
        takeNextPhoto();
    }

    function takeNextPhoto() {
        if (photosTaken >= maxSlots) {
            finishSession();
            return;
        }

        let count = timerDelay;
        if (countdownEl) {
            countdownEl.classList.remove('hidden');
            countdownEl.innerText = count;
        }
        playAudio('beep');

        activeTimerInterval = setInterval(() => {
            count--;
            if (count > 0) {
                if (countdownEl) countdownEl.innerText = count;
                playAudio('beep');
            } else {
                clearInterval(activeTimerInterval);
                if (countdownEl) countdownEl.classList.add('hidden');

                playAudio('shutter');
                if (flashEl) {
                    flashEl.classList.remove('hidden');
                    setTimeout(() => flashEl.classList.add('hidden'), 150);
                }

                snapPhoto(photosTaken);
                photosTaken++;
                if (photoIndexEl) photoIndexEl.innerText = photosTaken;

                setTimeout(takeNextPhoto, 1200);
            }
        }, 1000);
    }

    function startSingleRetake(slotIndex) {
        if (activeTimerInterval) clearInterval(activeTimerInterval);
        retakeTargetIndex = slotIndex;
        if (startBtn) startBtn.disabled = true;
        if (downloadBtn) downloadBtn.disabled = true;
        if (downloadGifBtn) downloadGifBtn.disabled = true;
        hideAllRetakeBtns();

        let count = timerDelay;
        if (countdownEl) {
            countdownEl.classList.remove('hidden');
            countdownEl.innerText = count;
        }
        playAudio('beep');

        activeTimerInterval = setInterval(() => {
            count--;
            if (count > 0) {
                if (countdownEl) countdownEl.innerText = count;
                playAudio('beep');
            } else {
                clearInterval(activeTimerInterval);
                if (countdownEl) countdownEl.classList.add('hidden');

                playAudio('shutter');
                if (flashEl) {
                    flashEl.classList.remove('hidden');
                    setTimeout(() => flashEl.classList.add('hidden'), 150);
                }

                snapPhoto(retakeTargetIndex);
                finishSession();
            }
        }, 1000);
    }

    function snapPhoto(slotIdx) {
        const targetCanvas = document.getElementById(`canvas-${slotIdx + 1}`);
        if (!targetCanvas) return;
        const ctx = targetCanvas.getContext('2d');

        const targetWidth = 1440;
        const targetHeight = 1080;
        targetCanvas.width = targetWidth;
        targetCanvas.height = targetHeight;

        const vWidth = video.videoWidth || 1280;
        const vHeight = video.videoHeight || 720;
        const targetRatio = targetWidth / targetHeight;
        const videoRatio = vWidth / vHeight;

        let sWidth, sHeight, sx, sy;
        if (videoRatio > targetRatio) {
            sHeight = vHeight;
            sWidth = vHeight * targetRatio;
            sx = (vWidth - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = vWidth;
            sHeight = vWidth / targetRatio;
            sx = 0;
            sy = (vHeight - sHeight) / 2;
        }

        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        capturedImages[slotIdx] = targetCanvas.toDataURL('image/png', 1.0);
        isUploadedPhoto[slotIdx] = false;

        const heartClass = currentShape === 'heart' ? 'heart-shape-active' : '';
        targetCanvas.className = `w-full h-full captured-frame ${currentFilter} ${heartClass}`;
        targetCanvas.style.filter = getCombinedFilterStyle(currentFilter);
        targetCanvas.classList.remove('hidden');
        updateStripUI();
    }

    function finishSession() {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerText = 'Mulai Foto';
        }
        if (downloadBtn) downloadBtn.disabled = false;
        if (downloadGifBtn) downloadGifBtn.disabled = false;
        showRetakeBtns();
        updateStripUI();
    }

    function showRetakeBtns() {
        for (let i = 0; i < maxSlots; i++) {
            const btn = document.querySelector(`.btn-retake[data-slot="${i + 1}"]`);
            if (btn) btn.classList.remove('hidden');
        }
    }

    function hideAllRetakeBtns() {
        document.querySelectorAll('.btn-retake').forEach(b => b.classList.add('hidden'));
    }

    function resetPhotobooth() {
        if (activeTimerInterval) clearInterval(activeTimerInterval);
        strips = [newStripData(), newStripData()];
        activeStrip = 0;
        photosTaken = 0;
        retakeTargetIndex = null;
        if (photoIndexEl) photoIndexEl.innerText = '0';
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerText = 'Mulai Foto';
        }
        if (downloadBtn) downloadBtn.disabled = true;
        if (downloadGifBtn) downloadGifBtn.disabled = true;
        hideAllRetakeBtns();
        
        for (let i = 1; i <= MAX_SLOTS; i++) {
            const canvas = document.getElementById(`canvas-${i}`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.classList.add('hidden');
            }
            isUploadedPhoto[i - 1] = false;
            capturedImages[i - 1] = null;
        }
        updateStripUI();
    }

    // ==========================================
    // EXPORT PNG HD (SEMUA LAYOUT)
    // ==========================================
    // forPrint = true -> strip dibuat rasio 1:3 supaya pas 2 lajur di kertas 4R
    function getLayout(t, n, forPrint) {
        const r = 3 / 4;
        let W, H, rects = [], pad = 80, gap = 40, footerH = 260, textY = null, cx = null;

        if (t === 'gridportrait') {
            // Frame portrait 2:3 (1800 x 2700) = rasio 4R, 4 foto portrait 3:4 susunan 2x2
            W = 1800; H = 2700; pad = 80; gap = 60;
            const pw = (W - pad * 2 - gap) / 2, ph = pw * 4 / 3, top = 170;
            for (let i = 0; i < n; i++) rects.push({ x: pad + (i % 2) * (pw + gap), y: top + Math.floor(i / 2) * (ph + gap), w: pw, h: ph });
        } else if (t === 'strip3') {
            // Strip 1:3 (1200 x 3600), 3 foto landscape (3:2), ruang kosong lebar di atas & bawah.
            // Mode 2 strip: digabung Strip 1 + Strip 2 di kertas 4R
            W = 1200; H = 3600; pad = 104; gap = 51;
            const pw = W - pad * 2, ph = pw * 2 / 3, top = 630;
            for (let i = 0; i < n; i++) rects.push({ x: pad, y: top + i * (ph + gap), w: pw, h: ph });
            textY = top + ph * n + gap * (n - 1) + 330;
        } else if (t === 'duov') {
            // 2 foto landscape (3:2) bertumpuk, ruang kosong di atas & bawah. Frame 2:3 = 4R
            W = 1800; H = 2700; pad = 186; gap = 50;
            const pw = W - pad * 2, ph = pw * 2 / 3, top = 290;
            for (let i = 0; i < n; i++) rects.push({ x: pad, y: top + i * (ph + gap), w: pw, h: ph });
            textY = top + ph * 2 + gap + 190;
        } else if (t === 'singlep') {
            // 1 foto portrait (5:6) di tengah atas, ruang teks di bawah. Frame 2:3 = 4R
            W = 1800; H = 2700; pad = 233;
            const pw = W - pad * 2, ph = pw * 6 / 5, top = 271;
            rects.push({ x: pad, y: top, w: pw, h: ph });
            textY = top + ph + 165;
        } else { // classic (1 strip; digandakan jadi 2 saat cetak 4R)
            W = 1600; pad = 80; gap = 50; footerH = 260;
            const pw = W - pad * 2, ph = pw * r;
            for (let i = 0; i < n; i++) rects.push({ x: pad, y: pad + i * (ph + gap), w: pw, h: ph });
            H = pad * 2 + ph * n + gap * (n - 1) + footerH;
        }
        return { W, H, rects, cx: cx || [W / 2], textY: textY !== null ? textY : H - 120 };
    }

    function drawCover(ctx, img, x, y, w, h, mirror) {
        const r = w / h, ir = img.width / img.height;
        let sw = img.width, sh = img.height, sx = 0, sy = 0;
        if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; }
        else { sh = img.width / r; sy = (img.height - sh) / 2; }
        if (mirror) {
            ctx.translate(x + w, y); ctx.scale(-1, 1);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        } else {
            ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        }
    }

    // Render strip/frame jadi satu canvas (forPrint = ukuran khusus cetak 4R)
    function renderTemplateCanvas(forPrint, data) {
        data = data || { imgs: capturedImages, up: isUploadedPhoto };
        return new Promise((resolve, reject) => {
            const { W, H, rects, cx, textY } = getLayout(currentTemplate, maxSlots, forPrint);
            const masterCanvas = document.createElement('canvas');
            masterCanvas.width = W; masterCanvas.height = H;
            const mCtx = masterCanvas.getContext('2d');

            mCtx.fillStyle = currentFrameColor;
            mCtx.fillRect(0, 0, W, H);

            const promises = [];
            for (let i = 0; i < maxSlots; i++) {
                if (!data.imgs[i]) continue;
                promises.push(
                    loadImg(data.imgs[i]).then(img => ({ img, index: i })).catch(() => null)
                );
            }

            Promise.all(promises).then((results) => {
                results.filter(Boolean).forEach(({ img, index }) => {
                    const rc = rects[index];
                    if (!rc) return;
                    mCtx.save();
                    if (currentShape === 'heart') drawHeartMask(mCtx, rc.x, rc.y, rc.w, rc.h);
                    mCtx.filter = getCombinedFilterStyle(currentFilter);
                    drawCover(mCtx, img, rc.x, rc.y, rc.w, rc.h, !data.up[index]);
                    mCtx.restore();
                });

                mCtx.filter = 'none';
                const isDarkFrame = isDarkColor(currentFrameColor);

                const footerTextVal = stripFooterText ? stripFooterText.innerText : defaultFooterText;
                const dateTextVal = stripDateText ? stripDateText.innerText : '';
                mCtx.textAlign = 'center';
                cx.forEach(x => {
                    mCtx.fillStyle = isDarkFrame ? '#ffffff' : '#334155';
                    // Teks bergaya (Unicode script) tidak di-uppercase & tidak di-bold
                    const fancy = /[\u{1D400}-\u{1D7FF}]/u.test(footerTextVal);
                    mCtx.font = (fancy ? '60px' : 'bold 48px') + ' Arial, "Cambria Math", "Segoe UI Symbol", "Noto Sans Math", "Noto Sans Symbols", sans-serif';
                    mCtx.fillText(fancy ? footerTextVal : footerTextVal.toUpperCase(), x, textY);

                    mCtx.font = '28px Arial, sans-serif';
                    mCtx.fillStyle = isDarkFrame ? '#f1f5f9' : '#94a3b8';
                    mCtx.fillText(dateTextVal, x, textY + 55);
                });

                resolve(masterCanvas);
            }).catch(reject);
        });
    }

    function getBaseCanvas(forPrint, data) {
        return customFrame ? renderCustomFrameCanvas(data) : renderTemplateCanvas(forPrint, data);
    }

    function saveCanvas(canvas, fileName) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }

    async function downloadImage() {
        if (!downloadBtn) return;
        downloadBtn.disabled = true;
        downloadBtn.innerText = 'Mengunduh...';
        try {
            const canvas = await getBaseCanvas(false);
            const prefix = customFrame ? 'custom' : currentTemplate;
            saveCanvas(canvas, `zeetsnap-${prefix}-${Date.now()}.png`);
        } catch (err) {
            console.error('Gagal mengunduh gambar:', err);
            alert('Terjadi kesalahan saat mengunduh gambar.');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerText = 'Unduh Foto';
        }
    }

    // ==========================================
    // CETAK KERTAS 4R (4 x 6 inci, 1800 x 2700 px = 450 dpi)
    // ==========================================
    const SHEET_W = 1800;
    const SHEET_H = 2700;

    // ---- Mode 2 strip (khusus layout strip: Classic & frame PNG sempit) ----
    function isStripMode() {
        if (customFrame) return customFrame.img.width / customFrame.img.height < 0.5;
        return currentTemplate === 'classic' || currentTemplate === 'strip3';
    }

    function stripFilled(data) {
        return data.imgs.slice(0, maxSlots).filter(Boolean).length;
    }

    function getStripData(idx) {
        return idx === activeStrip ? { imgs: capturedImages, up: isUploadedPhoto } : strips[idx];
    }

    function updateStripUI() {
        if (!stripTabs) return;
        const on = isStripMode();
        stripTabs.classList.toggle('hidden', !on);
        if (!on) return;
        const counts = [0, 1].map(i => stripFilled(getStripData(i)));
        document.querySelectorAll('.btn-strip-tab').forEach(btn => {
            const idx = parseInt(btn.dataset.strip);
            btn.classList.toggle('strip-tab-active', idx === activeStrip);
            btn.textContent = `Strip ${idx + 1} (${counts[idx]}/${maxSlots})`;
        });
        if (secondStripBtn) {
            secondStripBtn.classList.toggle('hidden', !(activeStrip === 0 && counts[0] > 0 && !(startBtn && startBtn.disabled)));
            secondStripBtn.textContent = counts[1] > 0 ? '+ Foto Ulang Strip ke-2' : '+ Foto Strip ke-2 (untuk cetak 4R)';
        }
    }

    // Tampilkan ulang foto strip yang dipilih di preview
    function refreshCanvasesFromData() {
        for (let i = 1; i <= MAX_SLOTS; i++) {
            const canvas = document.getElementById(`canvas-${i}`);
            if (!canvas) continue;
            const src = i <= maxSlots ? capturedImages[i - 1] : null;
            if (!src) {
                canvas.classList.add('hidden');
                continue;
            }
            loadImg(src).then(img => {
                canvas.width = 1440;
                canvas.height = 1080;
                canvas.getContext('2d').drawImage(img, 0, 0, 1440, 1080);
                const uploadedClass = isUploadedPhoto[i - 1] ? 'uploaded-frame' : '';
                const heartClass = currentShape === 'heart' ? 'heart-shape-active' : '';
                canvas.className = `w-full h-full captured-frame ${uploadedClass} ${currentFilter} ${heartClass}`;
                canvas.style.filter = getCombinedFilterStyle(currentFilter);
            }).catch(() => {});
        }
    }

    function switchStrip(idx) {
        if (idx === activeStrip) return;
        if (startBtn && startBtn.disabled) return; // sedang sesi foto
        if (activeTimerInterval) clearInterval(activeTimerInterval);

        strips[activeStrip] = { imgs: capturedImages.slice(), up: isUploadedPhoto.slice() };
        activeStrip = idx;
        const d = strips[idx];
        for (let i = 0; i < MAX_SLOTS; i++) {
            capturedImages[i] = d.imgs[i];
            isUploadedPhoto[i] = d.up[i];
        }
        refreshCanvasesFromData();

        photosTaken = stripFilled({ imgs: capturedImages });
        if (photoIndexEl) photoIndexEl.innerText = photosTaken;
        hideAllRetakeBtns();
        const has = photosTaken > 0;
        if (downloadBtn) downloadBtn.disabled = !has;
        if (downloadGifBtn) downloadGifBtn.disabled = !has;
        if (has) showRetakeBtns();
        updateStripUI();
    }

    document.querySelectorAll('.btn-strip-tab').forEach(btn => {
        btn.addEventListener('click', () => switchStrip(parseInt(btn.dataset.strip)));
    });

    if (secondStripBtn) {
        secondStripBtn.addEventListener('click', () => {
            if (startBtn && startBtn.disabled) return;
            switchStrip(1);
            startPhotobooth(); // langsung mulai foto strip ke-2
        });
    }

    function buildSheet(baseA, baseB) {
        const sheet = document.createElement('canvas');
        sheet.width = SHEET_W; sheet.height = SHEET_H;
        const ctx = sheet.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, SHEET_W, SHEET_H);

        const place = (img, x, y, w, h, alignTop) => {
            const s = Math.min(w / img.width, h / img.height);
            const dw = img.width * s, dh = img.height * s;
            ctx.drawImage(img, x + (w - dw) / 2, alignTop ? y : y + (h - dh) / 2, dw, dh);
        };

        if (baseB) {
            // Strip 1 (kiri) + Strip 2 (kanan), masing-masing 2 x 6 inci, tinggal dipotong di tengah
            const half = SHEET_W / 2;
            place(baseA, 0, 0, half, SHEET_H, true);
            place(baseB, half, 0, half, SHEET_H, true);
            ctx.save();
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 2;
            ctx.setLineDash([20, 16]);
            ctx.beginPath();
            ctx.moveTo(half, 0);
            ctx.lineTo(half, SHEET_H);
            ctx.stroke();
            ctx.restore();
        } else {
            place(baseA, 0, 0, SHEET_W, SHEET_H, false);
        }
        return sheet;
    }

    // Susun lembar 4R: strip 1 + strip 2 (kalau strip 2 kosong, strip 1 digandakan)
    async function makeSheet() {
        if (!isStripMode()) {
            return buildSheet(await getBaseCanvas(true, getStripData(activeStrip)), null);
        }
        const filled = [0, 1].map(i => stripFilled(getStripData(i)));
        const a = filled[0] > 0 ? 0 : 1;
        const b = (a === 0 && filled[1] > 0) ? 1 : a;
        const baseA = await getBaseCanvas(true, getStripData(a));
        const baseB = b === a ? baseA : await getBaseCanvas(true, getStripData(b));
        return buildSheet(baseA, baseB);
    }

    async function printSheet() {
        if (!printBtn) return;
        printBtn.disabled = true;
        const oldLabel = printBtn.innerHTML;
        printBtn.innerText = 'Menyiapkan cetak...';
        try {
            const sheet = await makeSheet();
            printImg.onload = () => {
                window.print();
                printBtn.innerHTML = oldLabel;
                printBtn.disabled = downloadBtn.disabled;
            };
            printImg.src = sheet.toDataURL('image/png');
        } catch (err) {
            console.error('Gagal menyiapkan cetak:', err);
            alert('Terjadi kesalahan saat menyiapkan cetak.');
            printBtn.innerHTML = oldLabel;
            printBtn.disabled = downloadBtn.disabled;
        }
    }

    async function download4R() {
        if (!download4rBtn) return;
        download4rBtn.disabled = true;
        const oldText = download4rBtn.innerText;
        download4rBtn.innerText = 'Menyiapkan...';
        try {
            saveCanvas(await makeSheet(), `zeetsnap-4R-${Date.now()}.png`);
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat membuat file 4R.');
        } finally {
            download4rBtn.innerText = oldText;
            download4rBtn.disabled = downloadBtn.disabled;
        }
    }

    // ===== GIF encoder (tanpa library) =====
    function gifQuantize(rgba, w, h) {
        const n = w * h;
        const keys = new Uint16Array(n);
        const hist = new Uint32Array(32768);
        for (let i = 0, p = 0; i < n; i++, p += 4) {
            const k = ((rgba[p] >> 3) << 10) | ((rgba[p + 1] >> 3) << 5) | (rgba[p + 2] >> 3);
            keys[i] = k;
            hist[k]++;
        }
        const all = [];
        for (let k = 0; k < 32768; k++) if (hist[k]) all.push(k);

        const chan = (k, c) => c === 0 ? (k >> 10) & 31 : c === 1 ? (k >> 5) & 31 : k & 31;
        const makeBox = (list) => {
            let min = [31, 31, 31], max = [0, 0, 0], count = 0;
            for (const k of list) {
                count += hist[k];
                for (let c = 0; c < 3; c++) {
                    const v = chan(k, c);
                    if (v < min[c]) min[c] = v;
                    if (v > max[c]) max[c] = v;
                }
            }
            let axis = 0, range = -1;
            for (let c = 0; c < 3; c++) if (max[c] - min[c] > range) { range = max[c] - min[c]; axis = c; }
            return { list, count, axis, range };
        };

        const boxes = [makeBox(all)];
        while (boxes.length < 256) {
            let bi = -1, best = -1;
            for (let i = 0; i < boxes.length; i++) {
                const b = boxes[i];
                if (b.list.length > 1 && b.count > best) { best = b.count; bi = i; }
            }
            if (bi < 0) break;
            const b = boxes[bi];
            const ax = b.axis;
            b.list.sort((x, y) => chan(x, ax) - chan(y, ax));
            let acc = 0, cut = 1;
            for (let i = 0; i < b.list.length - 1; i++) {
                acc += hist[b.list[i]];
                cut = i + 1;
                if (acc >= b.count / 2) break;
            }
            boxes.splice(bi, 1, makeBox(b.list.slice(0, cut)), makeBox(b.list.slice(cut)));
        }

        const palette = new Uint8Array(768);
        const lut = new Uint8Array(32768);
        boxes.forEach((b, bi) => {
            let r = 0, g = 0, bl = 0;
            for (const k of b.list) {
                const c = hist[k];
                r += chan(k, 0) * c; g += chan(k, 1) * c; bl += chan(k, 2) * c;
                lut[k] = bi;
            }
            const t = b.count || 1;
            const r5 = Math.round(r / t), g5 = Math.round(g / t), b5 = Math.round(bl / t);
            palette[bi * 3] = (r5 << 3) | (r5 >> 2);
            palette[bi * 3 + 1] = (g5 << 3) | (g5 >> 2);
            palette[bi * 3 + 2] = (b5 << 3) | (b5 >> 2);
        });

        const indices = new Uint8Array(n);
        for (let i = 0; i < n; i++) indices[i] = lut[keys[i]];
        return { palette, indices };
    }

    function gifLZW(indices) {
        const minSize = 8, clear = 256, eoi = 257;
        let codeSize = minSize + 1, next = eoi + 1;
        const dict = new Map();
        const out = [];
        let cur = 0, bits = 0;
        const emit = (code) => {
            cur |= code << bits;
            bits += codeSize;
            while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
        };
        emit(clear);
        let prefix = indices[0];
        for (let i = 1; i < indices.length; i++) {
            const k = indices[i];
            const key = (prefix << 8) | k;
            const found = dict.get(key);
            if (found !== undefined) {
                prefix = found;
            } else {
                emit(prefix);
                if (next < 4096) {
                    if (next === (1 << codeSize)) codeSize++;
                    dict.set(key, next++);
                } else {
                    emit(clear);
                    dict.clear();
                    codeSize = minSize + 1;
                    next = eoi + 1;
                }
                prefix = k;
            }
        }
        emit(prefix);
        emit(eoi);
        if (bits > 0) out.push(cur & 255);
        return Uint8Array.from(out);
    }

    // frames: [{palette, lzw}], urutan sudah termasuk boomerang
    function gifBuild(frames, w, h, delayCs) {
        const parts = [];
        const head = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, w & 255, w >> 8, h & 255, h >> 8, 0x00, 0x00, 0x00,
            0x21, 0xFF, 0x0B, 0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00];
        parts.push(Uint8Array.from(head));
        for (const f of frames) {
            parts.push(Uint8Array.from([0x21, 0xF9, 0x04, 0x04, delayCs & 255, delayCs >> 8, 0x00, 0x00]));
            parts.push(Uint8Array.from([0x2C, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0x87]));
            parts.push(f.palette);
            parts.push(Uint8Array.from([8]));
            const d = f.lzw;
            const blocks = [];
            for (let i = 0; i < d.length; i += 255) {
                const len = Math.min(255, d.length - i);
                blocks.push(len);
                for (let j = 0; j < len; j++) blocks.push(d[i + j]);
            }
            blocks.push(0);
            parts.push(Uint8Array.from(blocks));
        }
        parts.push(Uint8Array.from([0x3B]));
        return parts;
    }

    // Export GIF Boomerang (encoder GIF buatan sendiri, tanpa library eksternal)
    async function downloadGIF() {
        if (!downloadGifBtn) return;

        const valid = [];
        for (let i = 0; i < maxSlots; i++) if (capturedImages[i]) valid.push(i);
        if (!valid.length) {
            alert('Tidak ada foto untuk dibuat GIF.');
            return;
        }

        const GW = 1280, GH = 960; // ukuran penuh (sama seperti sebelumnya)
        const oldLabel = 'Unduh GIF Boomerang';
        downloadGifBtn.disabled = true;

        try {
            const encoded = [];
            for (let n = 0; n < valid.length; n++) {
                downloadGifBtn.innerText = `Memproses GIF (${n + 1}/${valid.length})...`;
                await new Promise(r => setTimeout(r, 30)); // beri waktu UI update
                const i = valid[n];
                const img = await loadImg(capturedImages[i]);

                const c = document.createElement('canvas');
                c.width = GW; c.height = GH;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.fillStyle = currentFrameColor;
                ctx.fillRect(0, 0, GW, GH);

                ctx.save();
                if (currentShape === 'heart') drawHeartMask(ctx, 0, 0, GW, GH);
                ctx.filter = getCombinedFilterStyle(currentFilter);
                if (!isUploadedPhoto[i]) { ctx.translate(GW, 0); ctx.scale(-1, 1); }
                ctx.drawImage(img, 0, 0, GW, GH);
                ctx.restore();

                const q = gifQuantize(ctx.getImageData(0, 0, GW, GH).data, GW, GH);
                encoded.push({ palette: q.palette, lzw: gifLZW(q.indices) });
            }

            // Boomerang: 1 2 3 4 3 2
            const seq = [...encoded, ...encoded.slice(1, -1).reverse()];
            const blob = new Blob(gifBuild(seq, GW, GH, 40), { type: 'image/gif' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `zeetsnap-boomerang-${Date.now()}.gif`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (err) {
            console.error('Gagal membuat GIF:', err);
            alert('Gagal membuat GIF Boomerang.');
        } finally {
            downloadGifBtn.innerText = oldLabel;
            downloadGifBtn.disabled = false;
        }
    }

    // Event Listeners: Filter Buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('filter-active'));
            e.currentTarget.classList.add('filter-active');
            currentFilter = e.currentTarget.dataset.filter;
            updateAppliedFilter();
        });
    });

    // Event Listeners: Shape Buttons
    document.querySelectorAll('.btn-shape').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-shape').forEach(b => {
                b.classList.remove('shape-active', 'border-stone-300', 'bg-stone-50', 'font-bold');
                b.classList.add('border-stone-200', 'bg-white');
            });
            const target = e.currentTarget;
            target.classList.add('shape-active', 'border-stone-300', 'bg-stone-50', 'font-bold');
            applyFrameShape(target.dataset.shape);
        });
    });

    // Event Listeners: Template Buttons
    document.querySelectorAll('.btn-template').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-template').forEach(b => {
                b.classList.remove('template-active', 'border-stone-300', 'bg-stone-50', 'font-bold');
                b.classList.add('border-stone-200', 'bg-white');
            });
            const target = e.currentTarget;
            target.classList.add('template-active', 'border-stone-300', 'bg-stone-50', 'font-bold');
            currentTemplate = target.dataset.template;
            clearCustomFrame();

            const fixed = FIXED_SLOTS[currentTemplate];
            const wanted = fixed || lastFreeSlots;
            if (wanted !== maxSlots) {
                setSlotCount(wanted);
                resetPhotobooth();
            }
            applyFrameTemplate(currentTemplate);
        });
    });

    // Event Listeners: Color Buttons
    document.querySelectorAll('.btn-frame').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-frame').forEach(b => b.classList.remove('frame-active'));
            const target = e.currentTarget;
            target.classList.add('frame-active');
            currentFrameColor = target.dataset.color;
            defaultFooterText = target.dataset.footer || defaultFooterText;
            if (strip) strip.style.backgroundColor = currentFrameColor;
            updateFooterTextColor();
            
            if (customTextInput && !customTextInput.value.trim() && stripFooterText) {
                stripFooterText.innerText = defaultFooterText;
            }
        });
    });

    // Event Listener: Single Retake Buttons
    document.querySelectorAll('.btn-retake').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const slotIdx = parseInt(e.currentTarget.dataset.slot) - 1;
            startSingleRetake(slotIdx);
        });
    });

    if (startBtn) startBtn.addEventListener('click', startPhotobooth);
    if (resetBtn) resetBtn.addEventListener('click', resetPhotobooth);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadImage);
    if (downloadGifBtn) downloadGifBtn.addEventListener('click', downloadGIF);

    // ==========================================
    // FRAME CUSTOM
    // ==========================================
    // Frame permanen: taruh PNG di folder frames/ lalu tambah 1 baris di sini
    const FRAMES = [
        { name: 'Endless', src: 'frames/file_00000000b86881fabc2885aa6e92adce.png' },
        { name: 'toystory', src: 'frames/frame_toystory_transparan (2).png' },
        { name: 'blue', src: 'frames/frame_transparan_v11.png' },
        { name: 'spidergwen', src: 'frames/frame_spidergwen_transparan (1).png' },
        { name: 'Endles 4x4', src: 'frames/Endles 4x4.png' },
    ];
    let customFrame = null;
    const frameOverlay = document.getElementById('frame-overlay');
    const frameList = document.getElementById('custom-frame-list');
    const frameUpload = document.getElementById('frame-upload');

    function loadImg(src) {
        return new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = src;
        });
    }

    // Deteksi otomatis lubang transparan -> posisi dalam pecahan 0-1
    function detectSlots(img) {
        const W = 300, H = Math.round(img.height * W / img.width);
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data;
        const seen = new Uint8Array(W * H);
        const slots = [];

        for (let s = 0; s < W * H; s++) {
            if (seen[s] || d[s * 4 + 3] >= 20) continue;
            let minX = W, minY = H, maxX = 0, maxY = 0, count = 0;
            const st = [s]; seen[s] = 1;
            while (st.length) {
                const p = st.pop(), px = p % W, py = (p / W) | 0;
                count++;
                minX = Math.min(minX, px); maxX = Math.max(maxX, px);
                minY = Math.min(minY, py); maxY = Math.max(maxY, py);
                [[px+1,py],[px-1,py],[px,py+1],[px,py-1]].forEach(([nx, ny]) => {
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
                    const n = ny * W + nx;
                    if (!seen[n] && d[n * 4 + 3] < 20) { seen[n] = 1; st.push(n); }
                });
            }
            const touchesEdge = minX === 0 || minY === 0 || maxX === W - 1 || maxY === H - 1;
            if (count > W * H * 0.02 && !touchesEdge) {
                slots.push({ x: (minX - 1) / W, y: (minY - 1) / H, w: (maxX - minX + 3) / W, h: (maxY - minY + 3) / H });
            }
        }
        slots.sort((a, b) => (Math.abs(a.y - b.y) > 0.02 ? a.y - b.y : a.x - b.x));
        return slots.slice(0, 4);
    }

    function applyCustomFrame(f) {
        customFrame = f;
        maxSlots = f.slots.length;
        if (totalSlotsText) totalSlotsText.innerText = maxSlots;
        resetPhotobooth();

        strip.classList.add('custom-mode');
        strip.style.aspectRatio = `${f.img.width} / ${f.img.height}`;
        strip.style.width = '240px';
        frameOverlay.src = f.img.src;

        for (let i = 1; i <= MAX_SLOTS; i++) {
            const slot = document.getElementById(`canvas-${i}`).parentElement;
            const s = f.slots[i - 1];
            if (!s) { slot.classList.add('hidden'); continue; }
            slot.classList.remove('hidden');
            Object.assign(slot.style, {
                left: s.x * 100 + '%', top: s.y * 100 + '%',
                width: s.w * 100 + '%', height: s.h * 100 + '%'
            });
        }
        updateStripUI();
    }

    function clearCustomFrame() {
        if (!customFrame) return;
        customFrame = null;
        strip.classList.remove('custom-mode');
        strip.style.aspectRatio = '';
        frameOverlay.removeAttribute('src');
        for (let i = 1; i <= MAX_SLOTS; i++) {
            const slot = document.getElementById(`canvas-${i}`).parentElement;
            slot.style.cssText = '';
            slot.classList.toggle('hidden', i > maxSlots);
        }
        applyFrameTemplate(currentTemplate);
    }

    async function useFrame(src) {
        try {
            const img = await loadImg(src);
            const slots = detectSlots(img);
            if (!slots.length) {
                alert('Lubang foto transparan tidak ditemukan. Pastikan area foto di PNG transparan (bukan putih).');
                return;
            }
            applyCustomFrame({ img, slots });
        } catch (e) {
            alert('Gagal memuat frame.');
        }
    }

    FRAMES.forEach(f => {
        const b = document.createElement('button');
        b.textContent = f.name;
        b.className = 'py-2 text-[11px] font-medium rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition';
        b.addEventListener('click', () => useFrame(f.src));
        frameList.appendChild(b);
    });

    frameUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = ev => useFrame(ev.target.result);
        r.readAsDataURL(file);
        e.target.value = '';
    });

    // Render frame custom jadi satu canvas
    async function renderCustomFrameCanvas(data) {
        data = data || { imgs: capturedImages, up: isUploadedPhoto };
        const { img: frameImg, slots } = customFrame;
        const c = document.createElement('canvas');
        c.width = frameImg.width; c.height = frameImg.height;
        const ctx = c.getContext('2d');
        for (let i = 0; i < slots.length; i++) {
            if (!data.imgs[i]) continue;
            const photo = await loadImg(data.imgs[i]);
            const s = slots[i];
            const dx = s.x * c.width, dy = s.y * c.height, dw = s.w * c.width, dh = s.h * c.height;
            const r = dw / dh, pr = photo.width / photo.height;
            let sw = photo.width, sh = photo.height, sx = 0, sy = 0;
            if (pr > r) { sw = photo.height * r; sx = (photo.width - sw) / 2; }
            else { sh = photo.width / r; sy = (photo.height - sh) / 2; }

            ctx.save();
            ctx.filter = getCombinedFilterStyle(currentFilter);
            if (!data.up[i]) {
                ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
                ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, dw, dh);
            } else {
                ctx.drawImage(photo, sx, sy, sw, sh, dx, dy, dw, dh);
            }
            ctx.restore();
        }
        ctx.filter = 'none';
        ctx.drawImage(frameImg, 0, 0); // frame di atas foto
        return c;
    }

    // Tombol cetak mengikuti status tombol "Unduh Foto"
    if (downloadBtn) {
        const syncPrintBtns = () => {
            if (printBtn) printBtn.disabled = downloadBtn.disabled;
            if (download4rBtn) download4rBtn.disabled = downloadBtn.disabled;
        };
        new MutationObserver(syncPrintBtns).observe(downloadBtn, { attributes: true, attributeFilter: ['disabled'] });
    }
    if (printBtn) printBtn.addEventListener('click', printSheet);
    if (download4rBtn) download4rBtn.addEventListener('click', download4R);

    // ==========================================
    // KAMERA LAYAR PENUH (tablet / monitor)
    // ==========================================
    const camBox = document.getElementById('camera-box');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fsControls = document.getElementById('fs-controls');
    const fsStartBtn = document.getElementById('fs-start-btn');
    const fsResetBtn = document.getElementById('fs-reset-btn');
    const fsSecondBtn = document.getElementById('fs-second-strip-btn');
    let camFull = false;
    let camUsedApi = false;

    async function enterCamFull() {
        if (!camBox || camFull) return;
        camFull = true;
        camBox.classList.add('cam-full');
        document.body.classList.add('cam-lock');
        if (fullscreenBtn) fullscreenBtn.textContent = '\u2715 Keluar';
        try {
            if (camBox.requestFullscreen) {
                await camBox.requestFullscreen();
                camUsedApi = true;
            } else if (camBox.webkitRequestFullscreen) {
                camBox.webkitRequestFullscreen();
                camUsedApi = true;
            }
        } catch (e) {
            camUsedApi = false; // tetap tampil penuh lewat CSS
        }
    }

    function exitCamFull() {
        if (!camBox || !camFull) return;
        camFull = false;
        camBox.classList.remove('cam-full');
        document.body.classList.remove('cam-lock');
        if (fullscreenBtn) fullscreenBtn.textContent = 'Layar Penuh';
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl) {
            try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
        }
        camUsedApi = false;
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => (camFull ? exitCamFull() : enterCamFull()));
    }
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
        document.addEventListener(evt, () => {
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            if (!fsEl && camFull && camUsedApi) exitCamFull();
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && camFull) exitCamFull();
    });

    // Tombol di mode layar penuh meneruskan klik ke tombol aslinya
    if (fsStartBtn) fsStartBtn.addEventListener('click', () => startBtn && startBtn.click());
    if (fsResetBtn) fsResetBtn.addEventListener('click', () => resetBtn && resetBtn.click());
    if (fsSecondBtn) fsSecondBtn.addEventListener('click', () => secondStripBtn && secondStripBtn.click());

    function syncFsControls() {
        if (!startBtn) return;
        if (fsStartBtn) fsStartBtn.textContent = startBtn.textContent.trim();
        // saat sesi foto berjalan, sembunyikan tombol agar kamera bersih
        if (fsControls) fsControls.classList.toggle('fs-busy', startBtn.disabled);
        if (fsSecondBtn && secondStripBtn) {
            fsSecondBtn.textContent = secondStripBtn.textContent.trim();
            fsSecondBtn.classList.toggle('hidden', secondStripBtn.classList.contains('hidden') || stripTabs.classList.contains('hidden'));
        }
    }
    if (startBtn) {
        new MutationObserver(syncFsControls).observe(startBtn, { attributes: true, attributeFilter: ['disabled'], childList: true, characterData: true, subtree: true });
    }
    if (secondStripBtn) {
        new MutationObserver(syncFsControls).observe(secondStripBtn, { attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true });
    }
    if (stripTabs) {
        new MutationObserver(syncFsControls).observe(stripTabs, { attributes: true, attributeFilter: ['class'] });
    }

    updateStripUI();
    syncFsControls();
    initCamera();
});
