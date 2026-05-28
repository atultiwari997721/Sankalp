// Sankalp Zen Mode Breathing & Breath-Synced Audio Synth (zen.js)

window.SankalpZen = {
  breathingInterval: null,
  breathPhase: 0, // 0: inhale, 1: hold, 2: exhale, 3: hold
  audioCtx: null,
  windGain: null,
  windFilter: null,
  noiseSource: null,
  isAudioActive: false,

  init() {
    this.setupListeners();
  },

  setupListeners() {
    const startZenBtn = document.getElementById('start-zen-btn');
    const exitZenBtn = document.getElementById('exit-zen-btn');
    const soundToggle = document.getElementById('zen-sound-checkbox');

    if (startZenBtn) {
      startZenBtn.addEventListener('click', () => this.enterZenMode());
    }

    if (exitZenBtn) {
      exitZenBtn.addEventListener('click', () => this.exitZenMode());
    }

    if (soundToggle) {
      soundToggle.addEventListener('change', () => {
        this.toggleZenAudio(soundToggle.checked);
      });
    }
  },

  enterZenMode() {
    document.body.classList.add('zen-overlay-active');
    window.Sankalp.showToast('🧘 Entering Zen Space. Distractions muted.', 'info');
    
    // Sync checkbox state
    const soundToggle = document.getElementById('zen-sound-checkbox');
    if (soundToggle) {
      this.toggleZenAudio(soundToggle.checked);
    }

    this.startBreathingCycle();
  },

  exitZenMode() {
    document.body.classList.remove('zen-overlay-active');
    this.stopBreathingCycle();
    this.stopZenAudio();
    
    // Reset checkbox state
    const soundToggle = document.getElementById('zen-sound-checkbox');
    if (soundToggle) soundToggle.checked = false;

    window.Sankalp.showToast('🧘 Returning from Zen Space.', 'info');
  },

  startBreathingCycle() {
    const bubbleInner = document.getElementById('zen-bubble-inner');
    const textEl = document.getElementById('zen-bubble-text');
    const descEl = document.getElementById('zen-desc-text');

    if (!bubbleInner || !textEl || !descEl) return;

    this.breathPhase = 0;
    
    const runPhase = () => {
      // Clear previous classes
      bubbleInner.classList.remove('breath-inhale', 'breath-hold', 'breath-exhale');
      void bubbleInner.offsetWidth; // Force reflow trigger

      // Phases: 0 = Inhale (4s), 1 = Hold (4s), 2 = Exhale (4s), 3 = Hold (4s)
      switch (this.breathPhase) {
        case 0:
          textEl.textContent = 'BREATHE IN';
          descEl.textContent = 'Fill your lungs slowly and feel the expansion.';
          bubbleInner.classList.add('breath-inhale');
          this.rampAudioFrequency(280, 4); // Inhale: wind rises
          break;
        case 1:
          textEl.textContent = 'HOLD';
          descEl.textContent = 'Suspend your breath. Rest in the stillness.';
          bubbleInner.classList.add('breath-hold');
          this.rampAudioFrequency(280, 4); // Hold: wind holds high
          break;
        case 2:
          textEl.textContent = 'BREATHE OUT';
          descEl.textContent = 'Release completely, let go of any tension.';
          bubbleInner.classList.add('breath-exhale');
          this.rampAudioFrequency(100, 4); // Exhale: wind falls
          break;
        case 3:
          textEl.textContent = 'HOLD';
          descEl.textContent = 'Remain empty. Reset and prepare for the next cycle.';
          this.rampAudioFrequency(100, 4); // Hold: wind holds low
          break;
      }

      this.breathPhase = (this.breathPhase + 1) % 4;
    };

    runPhase();
    this.breathingInterval = setInterval(runPhase, 4000);
  },

  stopBreathingCycle() {
    if (this.breathingInterval) {
      clearInterval(this.breathingInterval);
      this.breathingInterval = null;
    }

    const bubbleInner = document.getElementById('zen-bubble-inner');
    const textEl = document.getElementById('zen-bubble-text');
    const descEl = document.getElementById('zen-desc-text');

    if (bubbleInner) {
      bubbleInner.classList.remove('breath-inhale', 'breath-hold', 'breath-exhale');
      bubbleInner.style.transform = 'scale(1)';
    }
    if (textEl) textEl.textContent = 'START';
    if (descEl) descEl.textContent = 'Begin your box breathing session.';
  },

  // ----------------------------------------------------
  // BREATH-SYNCHRONIZED OCEAN WAVE GENERATOR
  // ----------------------------------------------------

  initAudio() {
    if (this.audioCtx) return;

    this.audioCtx = window.SankalpTimer.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    // Generate White Noise Buffer
    const bufferSize = 4 * this.audioCtx.sampleRate;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.noiseSource = this.audioCtx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    // Filter to shape wind waves (low frequency resonance)
    this.windFilter = this.audioCtx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(100, this.audioCtx.currentTime);
    this.windFilter.Q.setValueAtTime(4.0, this.audioCtx.currentTime); // resonance peaks the breathing wave

    this.windGain = this.audioCtx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime); // starts silent

    // Connect
    this.noiseSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.audioCtx.destination);
  },

  toggleZenAudio(active) {
    if (active) {
      this.initAudio();
      this.isAudioActive = true;
      
      try {
        this.noiseSource.start(0);
      } catch (e) {
        // Source already started, ignore
      }

      // Fade in gain
      this.windGain.gain.linearRampToValueAtTime(0.35, this.audioCtx.currentTime + 1.0);
    } else {
      this.stopZenAudio();
    }
  },

  rampAudioFrequency(targetFreq, duration) {
    if (!this.isAudioActive || !this.windFilter) return;

    const t = this.audioCtx.currentTime;
    
    // Cancel future events to prevent queuing overlaps
    this.windFilter.frequency.cancelScheduledValues(t);
    this.windGain.gain.cancelScheduledValues(t);
    
    // Ramp frequency matching inhale/exhale
    this.windFilter.frequency.linearRampToValueAtTime(targetFreq, t + duration);

    // Ramp volume slightly with frequency so inhale sounds fuller
    const targetVolume = targetFreq > 150 ? 0.4 : 0.2;
    this.windGain.gain.linearRampToValueAtTime(targetVolume, t + duration);
  },

  stopZenAudio() {
    this.isAudioActive = false;
    if (this.windGain && this.audioCtx) {
      this.windGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.windGain.gain.linearRampToValueAtTime(0.0, this.audioCtx.currentTime + 0.5);
    }
    setTimeout(() => {
      if (!this.isAudioActive && this.noiseSource) {
        try {
          this.noiseSource.stop();
        } catch (e) {}
        this.noiseSource = null;
        this.windFilter = null;
        this.windGain = null;
        this.audioCtx = null;
      }
    }, 600);
  }
};
