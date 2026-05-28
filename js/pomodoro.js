// Sankalp Pomodoro Timer & Audio Synthesizer (pomodoro.js)

window.SankalpTimer = {
  duration: 25 * 60, // 25 minutes
  timeLeft: 25 * 60,
  timerId: null,
  isRunning: false,
  timerMode: 'work', // work, shortBreak, longBreak
  activeTask: null,
  
  // Audio Synthesizer variables
  audioCtx: null,
  activeSound: null, // rain, lofi, zen, null
  soundNodes: {},    // Map of active Web Audio nodes

  init() {
    this.setupListeners();
    this.resetTimer();
  },

  setupListeners() {
    // Play / Pause Button
    const playPauseBtn = document.getElementById('play-pause-timer-btn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this.toggleTimer());
    }

    // Reset Button
    const resetBtn = document.getElementById('reset-timer-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetTimer());
    }

    // Skip Button
    const skipBtn = document.getElementById('skip-timer-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skipSession());
    }

    // Mode Presets
    const presetBtns = document.querySelectorAll('.timer-presets .preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.getAttribute('data-mode');
        this.timerMode = mode;

        if (mode === 'work') this.duration = 25 * 60;
        else if (mode === 'short') this.duration = 5 * 60;
        else if (mode === 'long') this.duration = 15 * 60;

        this.resetTimer();
      });
    });

    // Sound Cards
    const soundCards = document.querySelectorAll('.sound-card');
    soundCards.forEach(card => {
      const soundName = card.getAttribute('data-sound');
      const volumeSlider = card.querySelector('.sound-volume-slider');

      card.addEventListener('click', (e) => {
        // Skip volume slider clicks
        if (e.target === volumeSlider) return;

        this.toggleSound(soundName);
      });

      if (volumeSlider) {
        volumeSlider.addEventListener('input', () => {
          this.setSoundVolume(soundName, volumeSlider.value);
        });
      }
    });

    // Fullscreen Focus Toggles
    const fullscreenBtn = document.getElementById('pomodoro-fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // Standard fullscreen change listeners
    document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
  },

  setActiveTask(task) {
    this.activeTask = task;
    const display = document.getElementById('timer-active-task-name');
    const container = document.getElementById('timer-task-display-container');
    if (display && container) {
      display.textContent = `Focusing on: ${task.title}`;
      container.style.display = 'flex';
    }
  },

  clearActiveTask() {
    this.activeTask = null;
    const container = document.getElementById('timer-task-display-container');
    if (container) {
      container.style.display = 'none';
    }
  },

  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  },

  startTimer() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateControlsUI();

    this.timerId = setInterval(() => {
      this.timeLeft--;
      this.updateClockUI();

      if (this.timeLeft <= 0) {
        this.timerCompleted();
      }
    }, 1000);

    // Auto-start ambient noise if selected
    if (this.activeSound) {
      this.playSynth(this.activeSound);
    }
  },

  pauseTimer() {
    if (!this.isRunning) return;

    this.isRunning = false;
    clearInterval(this.timerId);
    this.timerId = null;
    this.updateControlsUI();

    // Stop ambient noise on pause
    this.stopSynth();
  },

  resetTimer() {
    this.pauseTimer();
    this.timeLeft = this.duration;
    this.updateClockUI();
  },

  skipSession() {
    this.pauseTimer();
    window.Sankalp.showToast('⏭️ Session skipped', 'info');
    
    // Cycle through modes
    const presets = document.querySelectorAll('.timer-presets .preset-btn');
    if (this.timerMode === 'work') {
      this.timerMode = 'short';
      this.duration = 5 * 60;
      presets[0].classList.remove('active');
      presets[1].classList.add('active');
    } else {
      this.timerMode = 'work';
      this.duration = 25 * 60;
      presets[1].classList.remove('active');
      presets[2].classList.remove('active');
      presets[0].classList.add('active');
    }
    
    this.resetTimer();
  },

  timerCompleted() {
    this.pauseTimer();
    this.triggerCompletedSound();

    if (this.timerMode === 'work') {
      window.Sankalp.state.user.focusMinutes += Math.round(this.duration / 60);
      window.Sankalp.saveState();
      
      if (this.activeTask) {
        window.SankalpTasks.toggleTaskCompletion(this.activeTask.id);
        this.clearActiveTask();
      }
      
      window.Sankalp.showToast('🏆 Focus session complete! Time to take a break.', 'success');
      this.timerMode = 'short';
      this.duration = 5 * 60;
      
      const presets = document.querySelectorAll('.timer-presets .preset-btn');
      presets.forEach(b => b.classList.remove('active'));
      presets[1].classList.add('active');
    } else {
      window.Sankalp.showToast('💪 Break over! Let\'s get back to focus.', 'info');
      this.timerMode = 'work';
      this.duration = 25 * 60;
      
      const presets = document.querySelectorAll('.timer-presets .preset-btn');
      presets.forEach(b => b.classList.remove('active'));
      presets[0].classList.add('active');
    }

    this.resetTimer();
  },

  updateClockUI() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    const clockFace = document.querySelector('.clock-time');
    if (clockFace) clockFace.textContent = formatted;

    const progressRing = document.querySelector('.clock-progress');
    if (progressRing) {
      const offset = 816 - (816 * this.timeLeft) / this.duration;
      progressRing.style.strokeDashoffset = offset;
    }

    document.title = this.isRunning ? `(${formatted}) Sankalp` : 'Sankalp';

    const label = document.querySelector('.clock-state-label');
    if (label) {
      if (this.timerMode === 'work') label.textContent = 'Focus Session';
      else if (this.timerMode === 'short') label.textContent = 'Short Break';
      else if (this.timerMode === 'long') label.textContent = 'Long Break';
    }
  },

  updateControlsUI() {
    const playPauseBtn = document.getElementById('play-pause-timer-btn');
    if (!playPauseBtn) return;

    if (this.isRunning) {
      playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" fill="white" />
          <rect x="14" y="4" width="4" height="16" fill="white" />
        </svg>
      `;
    } else {
      playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="white"/></svg>
      `;
    }
  },

  // Fullscreen Handlers
  toggleFullscreen() {
    const clockPanel = document.getElementById('pomodoro-clock-panel');
    if (!clockPanel) return;

    const isFS = document.fullscreenElement ||
                 document.webkitFullscreenElement ||
                 document.mozFullScreenElement ||
                 document.msFullscreenElement;

    if (!isFS) {
      if (clockPanel.requestFullscreen) {
        clockPanel.requestFullscreen();
      } else if (clockPanel.webkitRequestFullscreen) {
        clockPanel.webkitRequestFullscreen();
      } else if (clockPanel.mozRequestFullScreen) {
        clockPanel.mozRequestFullScreen();
      } else if (clockPanel.msRequestFullscreen) {
        clockPanel.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  },

  handleFullscreenChange() {
    const clockPanel = document.getElementById('pomodoro-clock-panel');
    if (!clockPanel) return;

    const isFS = document.fullscreenElement ||
                 document.webkitFullscreenElement ||
                 document.mozFullScreenElement ||
                 document.msFullscreenElement;

    if (isFS) {
      clockPanel.classList.add('fullscreen-focus-mode');
      window.Sankalp.showToast('🔇 Fullscreen Focus mode active. Press ESC to exit.', 'success');
    } else {
      clockPanel.classList.remove('fullscreen-focus-mode');
    }
  },

  // ----------------------------------------------------
  // AMBIENT SOUND GENERATOR (Web Audio Synthesizers)
  // ----------------------------------------------------
  
  initAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  toggleSound(soundName) {
    this.initAudioContext();

    const clickedCard = document.querySelector(`.sound-card[data-sound="${soundName}"]`);
    const wasActive = clickedCard.classList.contains('active');

    document.querySelectorAll('.sound-card').forEach(c => c.classList.remove('active'));
    this.stopSynth();

    if (wasActive) {
      this.activeSound = null;
      window.Sankalp.showToast('🔇 Ambient sound turned off', 'info');
    } else {
      clickedCard.classList.add('active');
      this.activeSound = soundName;
      
      if (this.isRunning) {
        this.playSynth(soundName);
      } else {
        window.Sankalp.showToast(`🎧 ${soundName.toUpperCase()} selected. Plays when timer runs.`, 'info');
      }
    }
  },

  setSoundVolume(soundName, volume) {
    if (this.activeSound === soundName && this.soundNodes.gainNode) {
      this.soundNodes.gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    }
  },

  playSynth(soundName) {
    this.stopSynth();
    this.initAudioContext();

    const slider = document.querySelector(`.sound-card[data-sound="${soundName}"] .sound-volume-slider`);
    const initialVolume = slider ? parseFloat(slider.value) : 0.5;

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(initialVolume, this.audioCtx.currentTime);
    gainNode.connect(this.audioCtx.destination);
    this.soundNodes.gainNode = gainNode;

    if (soundName === 'rain') {
      this.synthesizeRain(gainNode);
    } else if (soundName === 'lofi') {
      this.synthesizeLofi(gainNode);
    } else if (soundName === 'zen') {
      this.synthesizeZen(gainNode);
    }
  },

  stopSynth() {
    Object.keys(this.soundNodes).forEach(key => {
      const node = this.soundNodes[key];
      if (node) {
        try {
          if (node.stop) node.stop();
          node.disconnect();
        } catch (e) {}
      }
    });
    this.soundNodes = {};
  },

  synthesizeRain(outputNode) {
    const ctx = this.audioCtx;
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(500, ctx.currentTime);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(400, ctx.currentTime);
    bandpass.Q.setValueAtTime(0.7, ctx.currentTime);

    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = noiseBuffer;
    crackleSource.loop = true;

    const crackleHighpass = ctx.createBiquadFilter();
    crackleHighpass.type = 'highpass';
    crackleHighpass.frequency.setValueAtTime(6000, ctx.currentTime);

    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.04, ctx.currentTime);

    noiseSource.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(outputNode);

    crackleSource.connect(crackleHighpass);
    crackleHighpass.connect(crackleGain);
    crackleGain.connect(outputNode);

    noiseSource.start();
    crackleSource.start();

    this.soundNodes.source1 = noiseSource;
    this.soundNodes.source2 = crackleSource;
  },

  synthesizeLofi(outputNode) {
    const ctx = this.audioCtx;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(130.81, ctx.currentTime);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(164.81, ctx.currentTime);
    
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(196.00, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(100, ctx.currentTime);

    const wobbleLfo = ctx.createOscillator();
    wobbleLfo.frequency.setValueAtTime(4, ctx.currentTime);
    
    const wobbleGain = ctx.createGain();
    wobbleGain.gain.setValueAtTime(0.05, ctx.currentTime);

    const tremolo = ctx.createGain();
    tremolo.gain.setValueAtTime(0.6, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    
    filter.connect(tremolo);
    tremolo.connect(outputNode);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    wobbleLfo.connect(wobbleGain);
    wobbleGain.connect(tremolo.gain);

    osc1.start();
    osc2.start();
    osc3.start();
    lfo.start();
    wobbleLfo.start();

    this.soundNodes.source1 = osc1;
    this.soundNodes.source2 = osc2;
    this.soundNodes.source3 = osc3;
    this.soundNodes.lfo = lfo;
    this.soundNodes.wobble = wobbleLfo;
  },

  synthesizeZen(outputNode) {
    const ctx = this.audioCtx;
    const bufferSize = 4 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(120, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.05, ctx.currentTime);
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(50, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(outputNode);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSource.start();
    lfo.start();

    this.soundNodes.source1 = noiseSource;
    this.soundNodes.lfo = lfo;

    const frequencies = [523.25, 587.33, 659.25, 783.99, 880.00];
    
    const triggerChime = () => {
      if (this.activeSound !== 'zen' || !this.isRunning) return;

      const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
      const osc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const ringOsc = ctx.createOscillator();
      ringOsc.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);
      const ringGain = ctx.createGain();
      ringGain.gain.setValueAtTime(0.1, ctx.currentTime);

      chimeGain.gain.setValueAtTime(0.0, ctx.currentTime);
      chimeGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.0);

      osc.connect(chimeGain);
      ringOsc.connect(ringGain);
      ringGain.connect(chimeGain);
      chimeGain.connect(outputNode);

      osc.start();
      ringOsc.start();
      
      osc.stop(ctx.currentTime + 4.1);
      ringOsc.stop(ctx.currentTime + 4.1);

      const delay = Math.random() * 5000 + 4000;
      this.soundNodes[`chime_${Date.now()}`] = osc;
      
      setTimeout(triggerChime, delay);
    };

    setTimeout(triggerChime, 3000);
  },

  triggerCompletedSound() {
    this.initAudioContext();
    const ctx = this.audioCtx;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.3);
  }
};
