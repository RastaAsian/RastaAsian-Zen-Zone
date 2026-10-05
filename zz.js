/* ---------------- AUTOPLAY VISUALIZER ---------------- */
window.addEventListener("load", () => {
    const audio = document.getElementById("audio-player");
    const playBtn = document.getElementById("zz-play-btn");
    const canvas = document.getElementById("music-visualizer");
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = 300; // Increased height for orb space

    let audioContext;
    let analyser;
    let bufferLength;
    let dataArray;
    let isPlaying = false;
    let bassPulseRadius = 0;

    // Initialize Web Audio API setup on user interaction / playback
    function initAudio() {
        if (audioContext) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
    }

    /* --- AUDIO FADE-IN FUNCTION --- */
    function fadeInAudio(duration = 2000) {
        audio.volume = 0;
        let start = null;

        function step(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            audio.volume = Math.min(progress / duration, 1);

            if (progress < duration) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    /* --- START PLAYBACK --- */
    function startAudio() {
        initAudio();
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        audio.play().then(() => {
            isPlaying = true;
            playBtn.style.display = "none";
            fadeInAudio(2000); // 2-second fade-in
        }).catch(() => {
            // If browser blocks unmuted autoplay, show fallback button
            playBtn.style.display = "block";
        });
    }

    /* --- AUTOPLAY ATTEMPT --- */
    startAudio();

    /* --- MANUAL FALLBACK --- */
    playBtn.addEventListener("click", () => {
        startAudio();
    });

    /* --- COSMIC BREATHING ORB DRAW FUNCTION --- */
    function drawBreathingOrb(centerX, centerY, baseRadius, breathScale) {
        const radius = baseRadius * breathScale;

        // Outer cosmic atmosphere glow
        const outerGlow = ctx.createRadialGradient(
            centerX, centerY, radius * 0.2,
            centerX, centerY, radius * 2.5
        );
        outerGlow.addColorStop(0, "rgba(255, 78, 205, 0.5)");
        outerGlow.addColorStop(0.5, "rgba(123, 91, 255, 0.25)");
        outerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core Orb Gradient
        const orbGradient = ctx.createRadialGradient(
            centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.1,
            centerX, centerY, radius
        );
        orbGradient.addColorStop(0, "#00d4ff");
        orbGradient.addColorStop(0.5, "#7b5bff");
        orbGradient.addColorStop(1, "#ff4ecd");

        ctx.shadowColor = "rgba(255, 78, 205, 0.8)";
        ctx.shadowBlur = 30 * breathScale;

        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    }

    /* --- VISUALIZER DRAW LOOP --- */
    function draw(timestamp) {
        requestAnimationFrame(draw);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Calculate 4-second continuous breathing rhythm (0.8x to 1.2x scale)
        const breathCycle = (Math.sin(timestamp * 0.0015) + 1) / 2; // Range 0 - 1
        const breathScale = 0.85 + breathCycle * 0.35;

        // IDLE STATE: Breathing Orb + Wave Animation before music starts
        if (!isPlaying || !analyser) {
            drawBreathingOrb(centerX, centerY, 40, breathScale);

            // Sync visualizer bars to the breath rhythm
            const barWidth = (canvas.width / 64) * 1.5;
            let x = 0;

            for (let i = 0; i < 64; i++) {
                const barHeight = (Math.sin(timestamp * 0.003 + i * 0.15) * 15 + 20) * breathScale;

                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, "#ff4ecd");
                gradient.addColorStop(0.5, "#7b5bff");
                gradient.addColorStop(1, "#00d4ff");

                ctx.fillStyle = gradient;
                ctx.shadowColor = "rgba(123, 91, 255, 0.5)";
                ctx.shadowBlur = 15;

                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 2;
            }
            return;
        }

        // ACTIVE STATE: Real-time frequency visualization & Bass Detection
        analyser.getByteFrequencyData(dataArray);

        // Compute average low-frequency (Bass) intensity across bins 0–5
        let bassSum = 0;
        const bassBinCount = 6;
        for (let i = 0; i < bassBinCount; i++) {
            bassSum += dataArray[i];
        }
        const bassAvg = bassSum / bassBinCount; // 0 - 255

        /* --- BASS PULSE IMPACT --- */
        if (bassAvg > 190) { // Threshold for bass hit
            bassPulseRadius = Math.max(bassPulseRadius, (bassAvg / 255) * (canvas.width * 0.45));
        }

        // Render Cosmic Bass Shockwave Pulse
        if (bassPulseRadius > 0) {
            const pulseGlow = ctx.createRadialGradient(
                centerX, centerY, bassPulseRadius * 0.2,
                centerX, centerY, bassPulseRadius
            );
            pulseGlow.addColorStop(0, "rgba(255, 78, 205, 0)");
            pulseGlow.addColorStop(0.7, "rgba(123, 91, 255, 0.35)");
            pulseGlow.addColorStop(1, "rgba(0, 212, 255, 0.7)");

            ctx.strokeStyle = pulseGlow;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(centerX, centerY, bassPulseRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Decay pulse over frames
            bassPulseRadius *= 0.92;
            if (bassPulseRadius < 2) bassPulseRadius = 0;
        }

        // Render central breathing orb scaled reactively by bass hit
        const activeOrbScale = breathScale * (1 + (bassAvg / 255) * 0.5);
        drawBreathingOrb(centerX, centerY, 35, activeOrbScale);

        // Render Frequency Equalizer Bars
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] * 1.2;

            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, "#ff4ecd");
            gradient.addColorStop(0.5, "#7b5bff");
            gradient.addColorStop(1, "#00d4ff");

            ctx.fillStyle = gradient;

            if (barHeight > 180) {
                ctx.shadowColor = "rgba(217, 168, 108, 0.8)";
                ctx.shadowBlur = 25;
            } else {
                ctx.shadowColor = "rgba(123, 91, 255, 0.4)";
                ctx.shadowBlur = 10;
            }

            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 2;
        }
    }

    // Start render loop immediately
    requestAnimationFrame(draw);
});