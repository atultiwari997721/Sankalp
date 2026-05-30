// Sankalp Pomodoro Timer & Audio Synthesizer (pomodoro.js)

window.SankalpTimer = {
  duration: 25 * 60, // 25 minutes
  timeLeft: 25 * 60,
  timerId: null,
  isRunning: false,
  timerMode: 'work', // work, shortBreak, longBreak
  activeTask: null,
  
  // PiP & Clock Designs State
  pipWindow: null,
  localPipEl: null,
  clockDesign: 'ring',
  clockColor: 'blue',
  customColorVal: null,
  nativeWidth: 320,
  nativeHeight: 350,
  localWidth: 240,
  localHeight: 290,
  localTop: null,
  localLeft: null,
  localResizeObserver: null,
  
  // Audio Synthesizer variables
  audioCtx: null,
  activeSound: null, // rain, lofi, zen, null
  soundNodes: {},    // Map of active Web Audio nodes

  init() {
    this.loadPipSettings();
    this.setupListeners();
    this.resetTimer();

    // Apply loaded state to clock
    this.setClockDesign(this.clockDesign);
    this.setClockColor(this.clockColor);

    // Sync design button active states in UI
    const designBtns = document.querySelectorAll('.clock-design-switcher .design-btn');
    designBtns.forEach(btn => {
      if (btn.getAttribute('data-design') === this.clockDesign) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Sync custom color inputs in UI
    if (this.clockColor === 'custom' && this.customColorVal) {
      const customDot = document.getElementById('custom-color-dot');
      if (customDot) customDot.style.background = this.customColorVal;
      
      const customPicker = document.getElementById('custom-color-picker');
      if (customPicker) customPicker.value = this.customColorVal;
    }
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
    const customTimerInputs = document.getElementById('custom-timer-inputs');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.getAttribute('data-mode');
        this.timerMode = mode;

        if (mode === 'work') {
          this.duration = 25 * 60;
          if (customTimerInputs) customTimerInputs.style.display = 'none';
          this.resetTimer();
        } else if (mode === 'short') {
          this.duration = 5 * 60;
          if (customTimerInputs) customTimerInputs.style.display = 'none';
          this.resetTimer();
        } else if (mode === 'long') {
          this.duration = 15 * 60;
          if (customTimerInputs) customTimerInputs.style.display = 'none';
          this.resetTimer();
        } else if (mode === 'custom') {
          if (customTimerInputs) customTimerInputs.style.display = 'flex';
          const minsInput = document.getElementById('custom-minutes-input');
          if (minsInput) {
            minsInput.value = Math.ceil(this.duration / 60);
          }
        }
      });
    });

    // Custom Apply Button
    const applyCustomBtn = document.getElementById('apply-custom-timer-btn');
    if (applyCustomBtn) {
      applyCustomBtn.addEventListener('click', () => {
        const minsInput = document.getElementById('custom-minutes-input');
        if (minsInput) {
          const val = parseInt(minsInput.value, 10);
          if (isNaN(val) || val < 1 || val > 180) {
            window.Sankalp.showToast('⚠️ Please enter a duration between 1 and 180 minutes', 'warning');
            return;
          }
          this.duration = val * 60;
          this.resetTimer();
          window.Sankalp.showToast(`⏱️ Duration set to ${val} minutes`, 'success');
        }
      });
    }

    // PiP Button Click
    const pipBtn = document.getElementById('pomodoro-pip-btn');
    if (pipBtn) {
      pipBtn.addEventListener('click', () => this.togglePiP());
    }

    // Design Switcher Buttons
    const designBtns = document.querySelectorAll('.clock-design-switcher .design-btn');
    designBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        designBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setClockDesign(btn.getAttribute('data-design'));
      });
    });

    // Color Switcher Buttons
    const colorDots = document.querySelectorAll('.clock-color-switcher .color-dot');
    colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const colorName = dot.getAttribute('data-color');
        if (colorName !== 'custom') {
          this.setClockColor(colorName);
        }
      });
    });

    // Custom Color Picker
    const customColorPicker = document.getElementById('custom-color-picker');
    if (customColorPicker) {
      customColorPicker.addEventListener('input', (e) => {
        this.setCustomClockColor(e.target.value);
      });
      customColorPicker.addEventListener('change', (e) => {
        this.setCustomClockColor(e.target.value);
      });
    }

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
    
    const customTimerInputs = document.getElementById('custom-timer-inputs');
    if (customTimerInputs) customTimerInputs.style.display = 'none';

    // Cycle through modes
    const presets = document.querySelectorAll('.timer-presets .preset-btn');
    presets.forEach(b => b.classList.remove('active'));

    if (this.timerMode === 'work' || this.timerMode === 'custom') {
      this.timerMode = 'short';
      this.duration = 5 * 60;
      if (presets[1]) presets[1].classList.add('active');
    } else {
      this.timerMode = 'work';
      this.duration = 25 * 60;
      if (presets[0]) presets[0].classList.add('active');
    }
    
    this.resetTimer();
  },

  timerCompleted() {
    this.pauseTimer();
    this.triggerCompletedSound();

    const customTimerInputs = document.getElementById('custom-timer-inputs');
    if (customTimerInputs) customTimerInputs.style.display = 'none';

    if (this.timerMode === 'work' || this.timerMode === 'custom') {
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
      if (presets[1]) presets[1].classList.add('active');
    } else {
      window.Sankalp.showToast('💪 Break over! Let\'s get back to focus.', 'info');
      this.timerMode = 'work';
      this.duration = 25 * 60;
      
      const presets = document.querySelectorAll('.timer-presets .preset-btn');
      presets.forEach(b => b.classList.remove('active'));
      if (presets[0]) presets[0].classList.add('active');
    }

    this.resetTimer();
  },

  updateClockUI() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const progressPercent = ((this.duration - this.timeLeft) / this.duration) * 100;
    
    // Update main clock text
    const clockFace = document.querySelector('.clock-time');
    if (clockFace) clockFace.textContent = formatted;

    // Update main progress circle
    const progressRing = document.querySelector('.clock-progress');
    if (progressRing) {
      const offset = 816 - (816 * this.timeLeft) / this.duration;
      progressRing.style.strokeDashoffset = offset;
    }

    // Update main hourglass bar
    const hourglassFill = document.querySelector('.clock-hourglass-fill');
    if (hourglassFill) {
      hourglassFill.style.width = `${progressPercent}%`;
    }

    document.title = this.isRunning ? `(${formatted}) Sankalp` : 'Sankalp';

    let stateText = 'Focus Session';
    if (this.timerMode === 'work') stateText = 'Focus Session';
    else if (this.timerMode === 'short') stateText = 'Short Break';
    else if (this.timerMode === 'long') stateText = 'Long Break';
    else if (this.timerMode === 'custom') stateText = 'Custom Session';

    const label = document.querySelector('.clock-state-label');
    if (label) label.textContent = stateText;

    // Update native PiP window clock if open
    if (this.pipWindow) {
      const pipDoc = this.pipWindow.document;
      const pipTime = pipDoc.querySelector('.clock-time');
      if (pipTime) pipTime.textContent = formatted;
      
      const pipProgress = pipDoc.querySelector('.clock-progress');
      if (pipProgress) {
        const offset = 816 - (816 * this.timeLeft) / this.duration;
        pipProgress.style.strokeDashoffset = offset;
      }
      
      const pipHourglassFill = pipDoc.querySelector('.clock-hourglass-fill');
      if (pipHourglassFill) {
        pipHourglassFill.style.width = `${progressPercent}%`;
      }
      
      const pipLabel = pipDoc.querySelector('.clock-state-label');
      if (pipLabel) pipLabel.textContent = stateText;
    }

    // Update local floating overlay PiP if open
    if (this.localPipEl) {
      const localTime = this.localPipEl.querySelector('.clock-time');
      if (localTime) localTime.textContent = formatted;

      const localProgress = this.localPipEl.querySelector('.clock-progress');
      if (localProgress) {
        const offset = 816 - (816 * this.timeLeft) / this.duration;
        localProgress.style.strokeDashoffset = offset;
      }

      const localHourglassFill = this.localPipEl.querySelector('.clock-hourglass-fill');
      if (localHourglassFill) {
        localHourglassFill.style.width = `${progressPercent}%`;
      }

      const localLabel = this.localPipEl.querySelector('.clock-state-label');
      if (localLabel) localLabel.textContent = stateText;
    }
  },

  updateControlsUI() {
    const playPauseBtn = document.getElementById('play-pause-timer-btn');
    
    const playSVG = `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>`;
    const pauseSVG = `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>`;

    if (playPauseBtn) {
      playPauseBtn.innerHTML = this.isRunning ? 
        `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="white" /><rect x="14" y="4" width="4" height="16" fill="white" /></svg>` : 
        `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="white"/></svg>`;
    }

    if (this.pipWindow) {
      const pipPlayBtn = this.pipWindow.document.getElementById('pip-play-pause');
      if (pipPlayBtn) {
        pipPlayBtn.innerHTML = this.isRunning ? pauseSVG : playSVG;
      }
    }

    if (this.localPipEl) {
      const localPlayBtn = this.localPipEl.querySelector('#local-pip-play-pause');
      if (localPlayBtn) {
        localPlayBtn.innerHTML = this.isRunning ? pauseSVG : playSVG;
      }
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
  },

  setClockDesign(design) {
    this.clockDesign = design;
    const clockContainers = document.querySelectorAll('.clock-container');
    clockContainers.forEach(container => {
      container.className = `clock-container design-${design}`;
    });
    
    const hourglass = document.getElementById('clock-hourglass-container');
    if (hourglass) {
      hourglass.style.display = (design === 'hourglass') ? 'block' : 'none';
    }

    if (this.localPipEl) {
      const pipClock = this.localPipEl.querySelector('.clock-container');
      if (pipClock) {
        pipClock.className = `clock-container design-${design}`;
        const pipHourglass = pipClock.querySelector('.clock-hourglass-container');
        if (pipHourglass) {
          pipHourglass.style.display = (design === 'hourglass') ? 'block' : 'none';
        }
      }
    }

    if (this.pipWindow) {
      const pipClock = this.pipWindow.document.querySelector('.clock-container');
      if (pipClock) {
        pipClock.className = `clock-container design-${design}`;
        const pipHourglass = pipClock.querySelector('.clock-hourglass-container');
        if (pipHourglass) {
          pipHourglass.style.display = (design === 'hourglass') ? 'block' : 'none';
        }
      }
    }

    this.updateClockUI();
    this.savePipSettings();
  },

  async togglePiP() {
    if (this.pipWindow) {
      this.pipWindow.close();
      this.pipWindow = null;
      return;
    }

    if (this.localPipEl) {
      this.toggleLocalOverlayPiP();
    }

    if ('documentPictureInPicture' in window) {
      try {
        const designSettings = this.getDesignSettings(this.clockDesign);
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: designSettings.nativeWidth || 320,
          height: designSettings.nativeHeight || 350,
        });
        this.pipWindow = pipWindow;

        // Clone style sheets
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            if (styleSheet.cssRules) {
              const newStyle = pipWindow.document.createElement('style');
              [...styleSheet.cssRules].forEach((rule) => {
                newStyle.appendChild(pipWindow.document.createTextNode(rule.cssText));
              });
              pipWindow.document.head.appendChild(newStyle);
            } else if (styleSheet.href) {
              const newLink = pipWindow.document.createElement('link');
              newLink.rel = 'stylesheet';
              newLink.href = styleSheet.href;
              pipWindow.document.head.appendChild(newLink);
            }
          } catch (e) {
            if (styleSheet.href) {
              const newLink = pipWindow.document.createElement('link');
              newLink.rel = 'stylesheet';
              newLink.href = styleSheet.href;
              pipWindow.document.head.appendChild(newLink);
            }
          }
        });

        // Add pip-specific custom styles
        const pipStyle = pipWindow.document.createElement('style');
        pipStyle.textContent = `
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: ${window.Sankalp.state?.theme === 'light' ? '#edf1f3' : '#060912'} !important;
            font-family: 'Outfit', sans-serif;
            overflow: hidden;
            color: ${window.Sankalp.state?.theme === 'light' ? '#1e293b' : '#f8fafc'};
          }
          .pip-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100vw;
            height: 100vh;
            padding: 2vmin;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
          }
          .pip-container .clock-container {
            transform: scale(var(--pip-zoom, 1)) !important;
            transform-origin: center !important;
            margin-bottom: 0px !important;
            height: 80vmin !important;
            width: 80vmin !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
          }
          .pip-container .clock-container.design-hourglass {
            width: 90vw !important;
            height: 80vh !important;
          }
          .pip-container .clock-face {
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .pip-container .clock-time {
            font-size: 20vmin !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            transition: transform 0.25s ease-in-out !important;
          }
          .pip-container .clock-container.design-digital .clock-time {
            font-size: 24vmin !important;
          }
          .pip-container .clock-container.design-retro .clock-time {
            font-size: 14vmin !important;
            padding: 1.5vmin 4vmin !important;
          }
          .pip-container:hover .clock-time {
            transform: translateY(-2.5vmin) !important;
          }
          .pip-container .clock-state-label {
            font-size: 3.5vmin !important;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease-in-out, transform 0.25s ease-in-out;
            margin-top: 1vmin;
          }
          .pip-container:hover .clock-state-label {
            opacity: 1;
            transform: translateY(-1vmin);
          }
          .pip-controls {
            display: flex;
            gap: 4vw;
            margin-top: 1.5vmin;
            z-index: 10;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease-in-out, transform 0.25s ease-in-out;
            transform: translateY(2vmin);
          }
          .pip-container:hover .pip-controls {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
          }
          .pip-btn {
            width: 11vmin;
            height: 11vmin;
            max-width: 44px;
            max-height: 44px;
            min-width: 24px;
            min-height: 24px;
            border-radius: 50%;
            background: rgba(168, 85, 247, 0.1);
            border: 1px solid rgba(168, 85, 247, 0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #7c3aed;
            transition: all 0.2s ease;
          }
          [data-theme="dark"] .pip-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
          }
          .pip-btn:hover {
            transform: scale(1.05);
            background: rgba(168, 85, 247, 0.2);
          }
          [data-theme="dark"] .pip-btn:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          .pip-btn svg {
            width: 5vmin;
            height: 5vmin;
            max-width: 18px;
            max-height: 18px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2.5;
          }
          .pip-container .clock-hourglass-container {
            width: 45vmin !important;
            height: 2vmin !important;
            max-height: 8px !important;
            background: rgba(255,255,255,0.05) !important;
            border-radius: 999px !important;
            margin-top: 1.5vmin !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
          }
        `;
        pipWindow.document.head.appendChild(pipStyle);
        pipWindow.document.body.setAttribute('data-theme', window.Sankalp.state?.theme || 'dark');

        const pipContainer = pipWindow.document.createElement('div');
        pipContainer.className = 'pip-container';
        pipContainer.style.setProperty('--pip-zoom', designSettings.zoom || 1.0);
        pipContainer.innerHTML = `
          <div class="clock-container design-${this.clockDesign}">
            <svg class="clock-svg" viewBox="0 0 280 280">
              <defs>
                <linearGradient id="timer-gradient-pip" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--accent-primary, #60a5fa)"/>
                  <stop offset="100%" stop-color="var(--accent-secondary, #c084fc)"/>
                </linearGradient>
              </defs>
              <circle class="clock-bg" cx="140" cy="140" r="130" stroke="rgba(255,255,255,0.03)" stroke-width="8" fill="none"/>
              <circle class="clock-progress" cx="140" cy="140" r="130" stroke="url(#timer-gradient-pip)" stroke-width="8" stroke-dasharray="816" stroke-dashoffset="816" stroke-linecap="round" fill="none"/>
            </svg>
            <div class="clock-face">
              <div class="clock-time">25:00</div>
              <div class="clock-state-label">Focus Session</div>
            </div>
            <div class="clock-hourglass-container" style="display: ${this.clockDesign === 'hourglass' ? 'block' : 'none'};">
              <div class="clock-hourglass-fill"></div>
            </div>
          </div>
          <div class="pip-controls">
            <button class="pip-btn" id="pip-play-pause" title="Play/Pause"></button>
            <button class="pip-btn" id="pip-reset" title="Reset">
              <svg viewBox="0 0 24 24"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2L2.5 8m0 8l.7.8A10 10 0 0 0 20.8 16.8l.7-.8"/></svg>
            </button>
            <button class="pip-btn" id="pip-zoom-out" title="Zoom Out">
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="pip-btn" id="pip-zoom-in" title="Zoom In">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        `;

        pipWindow.document.body.appendChild(pipContainer);

        pipContainer.querySelector('#pip-play-pause').addEventListener('click', () => this.toggleTimer());
        pipContainer.querySelector('#pip-reset').addEventListener('click', () => this.resetTimer());
        
        pipContainer.querySelector('#pip-zoom-in').addEventListener('click', () => {
          const settings = this.getDesignSettings(this.clockDesign);
          this.updateZoom((settings.zoom || 1.0) + 0.1);
        });
        pipContainer.querySelector('#pip-zoom-out').addEventListener('click', () => {
          const settings = this.getDesignSettings(this.clockDesign);
          this.updateZoom((settings.zoom || 1.0) - 0.1);
        });

        pipContainer.addEventListener('wheel', (e) => {
          e.preventDefault();
          const settings = this.getDesignSettings(this.clockDesign);
          let currentZoom = settings.zoom || 1.0;
          if (e.deltaY < 0) {
            this.updateZoom(Math.min(2.5, currentZoom + 0.05));
          } else {
            this.updateZoom(Math.max(0.5, currentZoom - 0.05));
          }
        }, { passive: false });

        let resizeTimeout;
        pipWindow.addEventListener('resize', () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            const currentDesign = this.clockDesign;
            const settings = this.getDesignSettings(currentDesign);
            settings.nativeWidth = pipWindow.innerWidth;
            settings.nativeHeight = pipWindow.innerHeight;
            this.savePipSettings();
          }, 200);
        });

        this.updateClockUI();
        this.updateControlsUI();
        this.setClockColor(this.clockColor);

        pipWindow.addEventListener('pagehide', () => {
          this.pipWindow = null;
        });

      } catch (err) {
        console.warn('Native Document PiP failed, using local overlay fallback:', err);
        this.toggleLocalOverlayPiP();
      }
    } else {
      this.toggleLocalOverlayPiP();
    }
  },

  toggleLocalOverlayPiP() {
    if (this.localPipEl) {
      if (this.localResizeObserver) {
        this.localResizeObserver.disconnect();
        this.localResizeObserver = null;
      }
      this.localPipEl.remove();
      this.localPipEl = null;
      return;
    }

    if (this.pipWindow) {
      this.pipWindow.close();
      this.pipWindow = null;
    }

    const designSettings = this.getDesignSettings(this.clockDesign);
    const pipContainer = document.createElement('div');
    pipContainer.id = 'pomodoro-local-pip';
    pipContainer.className = 'glass-panel glow-card';
    
    pipContainer.style.position = 'fixed';
    
    if (designSettings.localTop !== null && designSettings.localLeft !== null) {
      let topVal = parseFloat(designSettings.localTop);
      let leftVal = parseFloat(designSettings.localLeft);
      if (isNaN(topVal)) topVal = 100;
      if (isNaN(leftVal)) leftVal = 100;
      if (topVal < 0) topVal = 0;
      if (leftVal < 0) leftVal = 0;
      if (topVal > window.innerHeight - 100) topVal = window.innerHeight - 100;
      if (leftVal > window.innerWidth - 100) leftVal = window.innerWidth - 100;
      
      pipContainer.style.top = topVal + 'px';
      pipContainer.style.left = leftVal + 'px';
      pipContainer.style.bottom = 'auto';
      pipContainer.style.right = 'auto';
    } else {
      pipContainer.style.bottom = '2rem';
      pipContainer.style.right = '2rem';
    }

    pipContainer.style.width = (designSettings.localWidth || 240) + 'px';
    pipContainer.style.height = (designSettings.localHeight || 290) + 'px';
    pipContainer.style.setProperty('--pip-zoom', designSettings.zoom || 1.0);
    
    pipContainer.style.zIndex = '99999';
    pipContainer.style.display = 'flex';
    pipContainer.style.flexDirection = 'column';
    pipContainer.style.alignItems = 'center';
    pipContainer.style.justifyContent = 'center';
    pipContainer.style.padding = '1rem';
    pipContainer.style.cursor = 'grab';
    pipContainer.style.userSelect = 'none';

    pipContainer.innerHTML = `
      <div class="local-pip-header" style="position: absolute; top: 0.5rem; left: 0.5rem; right: 0.5rem; display: flex; justify-content: space-between; align-items: center; cursor: move; width: calc(100% - 1rem); padding-bottom: 0.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 700; letter-spacing: 1px;">FOCUS OVERLAY</span>
        <button id="close-local-pip" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted); padding: 2px;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="clock-container design-${this.clockDesign}">
        <svg class="clock-svg" viewBox="0 0 280 280">
          <circle class="clock-bg" cx="140" cy="140" r="130" fill="none" />
          <circle class="clock-progress" cx="140" cy="140" r="130" stroke="url(#timer-gradient)" fill="none" />
        </svg>
        <div class="clock-face">
          <div class="clock-time">25:00</div>
          <div class="clock-state-label">Focus Session</div>
        </div>
        <div class="clock-hourglass-container" style="display: ${this.clockDesign === 'hourglass' ? 'block' : 'none'};">
          <div class="clock-hourglass-fill"></div>
        </div>
      </div>

      <div class="pip-controls" style="display: flex; gap: 1rem; margin-top: 0.2rem; z-index: 10;">
        <button class="control-btn" id="local-pip-play-pause" style="width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); color: #7c3aed; cursor: pointer;"></button>
        <button class="control-btn" id="local-pip-reset" style="width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: var(--glass-border); cursor: pointer;" title="Reset">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--text-primary)" stroke-width="2" fill="none"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2L2.5 8m0 8l.7.8A10 10 0 0 0 20.8 16.8l.7-.8"/></svg>
        </button>
        <button class="control-btn" id="local-pip-zoom-out" style="width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: var(--glass-border); cursor: pointer;" title="Zoom Out">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--text-primary)" stroke-width="2" fill="none"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="control-btn" id="local-pip-zoom-in" style="width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: var(--glass-border); cursor: pointer;" title="Zoom In">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--text-primary)" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(pipContainer);
    this.localPipEl = pipContainer;

    this.dragElement(pipContainer);

    pipContainer.querySelector('#close-local-pip').addEventListener('click', () => {
      this.toggleLocalOverlayPiP();
    });

    pipContainer.querySelector('#local-pip-play-pause').addEventListener('click', () => this.toggleTimer());
    pipContainer.querySelector('#local-pip-reset').addEventListener('click', () => this.resetTimer());

    pipContainer.querySelector('#local-pip-zoom-in').addEventListener('click', () => {
      const settings = this.getDesignSettings(this.clockDesign);
      this.updateZoom((settings.zoom || 1.0) + 0.1);
    });
    pipContainer.querySelector('#local-pip-zoom-out').addEventListener('click', () => {
      const settings = this.getDesignSettings(this.clockDesign);
      this.updateZoom((settings.zoom || 1.0) - 0.1);
    });

    pipContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const settings = this.getDesignSettings(this.clockDesign);
      let currentZoom = settings.zoom || 1.0;
      if (e.deltaY < 0) {
        this.updateZoom(Math.min(2.5, currentZoom + 0.05));
      } else {
        this.updateZoom(Math.max(0.5, currentZoom - 0.05));
      }
    }, { passive: false });

    let resizeTimeout;
    this.localResizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const el = entry.target;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const currentDesign = this.clockDesign;
          const settings = this.getDesignSettings(currentDesign);
          settings.localWidth = el.offsetWidth;
          settings.localHeight = el.offsetHeight;
          this.savePipSettings();
        }, 200);
      }
    });
    this.localResizeObserver.observe(pipContainer);

    this.updateClockUI();
    this.updateControlsUI();
    this.setClockColor(this.clockColor);
  },

  dragElement(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = elmnt.querySelector('.local-pip-header') || elmnt;
    
    header.onmousedown = dragMouseDown;
    header.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
      elmnt.style.cursor = 'grabbing';
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      let newTop = elmnt.offsetTop - pos2;
      let newLeft = elmnt.offsetLeft - pos1;
      
      const maxLeft = window.innerWidth - elmnt.offsetWidth;
      const maxTop = window.innerHeight - elmnt.offsetHeight;
      
      if (newLeft < 0) newLeft = 0;
      if (newLeft > maxLeft) newLeft = maxLeft;
      if (newTop < 0) newTop = 0;
      if (newTop > maxTop) newTop = maxTop;
      
      elmnt.style.top = newTop + "px";
      elmnt.style.left = newLeft + "px";
      elmnt.style.bottom = "auto";
      elmnt.style.right = "auto";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      elmnt.style.cursor = 'grab';
      
      const timerObj = window.SankalpTimer;
      const currentDesign = timerObj.clockDesign;
      const settings = timerObj.getDesignSettings(currentDesign);
      settings.localTop = elmnt.style.top;
      settings.localLeft = elmnt.style.left;
      timerObj.savePipSettings();
    }

    function dragTouchStart(e) {
      const touch = e.touches[0];
      pos3 = touch.clientX;
      pos4 = touch.clientY;
      document.ontouchend = closeDragTouch;
      document.ontouchmove = elementTouchDrag;
    }

    function elementTouchDrag(e) {
      const touch = e.touches[0];
      pos1 = pos3 - touch.clientX;
      pos2 = pos4 - touch.clientY;
      pos3 = touch.clientX;
      pos4 = touch.clientY;

      let newTop = elmnt.offsetTop - pos2;
      let newLeft = elmnt.offsetLeft - pos1;

      const maxLeft = window.innerWidth - elmnt.offsetWidth;
      const maxTop = window.innerHeight - elmnt.offsetHeight;

      if (newLeft < 0) newLeft = 0;
      if (newLeft > maxLeft) newLeft = maxLeft;
      if (newTop < 0) newTop = 0;
      if (newTop > maxTop) newTop = maxTop;

      elmnt.style.top = newTop + "px";
      elmnt.style.left = newLeft + "px";
      elmnt.style.bottom = "auto";
      elmnt.style.right = "auto";
    }

    function closeDragTouch() {
      document.ontouchend = null;
      document.ontouchmove = null;
      
      const timerObj = window.SankalpTimer;
      const currentDesign = timerObj.clockDesign;
      const settings = timerObj.getDesignSettings(currentDesign);
      settings.localTop = elmnt.style.top;
      settings.localLeft = elmnt.style.left;
      timerObj.savePipSettings();
    }
  },

  setClockColor(colorName) {
    if (colorName === 'custom') {
      this.setCustomClockColor(this.customColorVal || '#60a5fa');
      return;
    }

    this.clockColor = colorName;
    
    // Restore custom color dot to rainbow gradient if switching back to presets
    const customDot = document.getElementById('custom-color-dot');
    if (customDot) {
      customDot.style.background = 'linear-gradient(135deg, red, orange, yellow, green, blue, purple)';
    }
    
    const colorMapping = {
      blue: { primary: '#60a5fa', secondary: '#a5f3fc' },
      purple: { primary: '#c084fc', secondary: '#f472b6' },
      pink: { primary: '#f472b6', secondary: '#fbcfe8' },
      cyan: { primary: '#38bdf8', secondary: '#99f6e4' },
      green: { primary: '#34d399', secondary: '#a7f3d0' },
      amber: { primary: '#fbbf24', secondary: '#fde68a' }
    };
    
    const colors = colorMapping[colorName] || colorMapping.blue;

    // Apply active class & styles to color switcher dots
    const dots = document.querySelectorAll('.clock-color-switcher .color-dot');
    dots.forEach(dot => {
      const dotColor = dot.getAttribute('data-color');
      if (dotColor === colorName) {
        dot.style.borderColor = 'var(--text-primary)';
        dot.classList.add('active');
        dot.style.boxShadow = `0 0 10px ${colors.primary}`;
      } else {
        dot.style.borderColor = 'transparent';
        dot.classList.remove('active');
        dot.style.boxShadow = 'none';
      }
    });

    // Apply colors to the main Clock Container
    const clockContainers = document.querySelectorAll('.clock-container');
    clockContainers.forEach(container => {
      container.style.setProperty('--accent-primary', colors.primary);
      container.style.setProperty('--accent-secondary', colors.secondary);
      container.style.setProperty('--glow-color', colors.primary);
    });

    // Apply colors to the local PiP overlay
    if (this.localPipEl) {
      const pipClock = this.localPipEl.querySelector('.clock-container');
      if (pipClock) {
        pipClock.style.setProperty('--accent-primary', colors.primary);
        pipClock.style.setProperty('--accent-secondary', colors.secondary);
        pipClock.style.setProperty('--glow-color', colors.primary);
      }
    }

    // Apply colors to the native PiP window
    if (this.pipWindow) {
      const pipClock = this.pipWindow.document.querySelector('.clock-container');
      if (pipClock) {
        pipClock.style.setProperty('--accent-primary', colors.primary);
        pipClock.style.setProperty('--accent-secondary', colors.secondary);
        pipClock.style.setProperty('--glow-color', colors.primary);
      }
      
      const stops = this.pipWindow.document.querySelectorAll('#timer-gradient-pip stop');
      if (stops.length >= 2) {
        stops[0].setAttribute('stop-color', colors.primary);
        stops[1].setAttribute('stop-color', colors.secondary);
      }
    }
    this.savePipSettings();
  },

  setCustomClockColor(hexColor) {
    this.clockColor = 'custom';
    this.customColorVal = hexColor;
    
    const primaryColor = hexColor;
    const secondaryColor = this.adjustColorBrightness(hexColor, 40);

    // Apply active class & custom background to the custom picker dot
    const dots = document.querySelectorAll('.clock-color-switcher .color-dot');
    dots.forEach(dot => {
      const dotColor = dot.getAttribute('data-color');
      if (dotColor === 'custom') {
        dot.style.borderColor = 'var(--text-primary)';
        dot.classList.add('active');
        dot.style.boxShadow = `0 0 10px ${primaryColor}`;
        dot.style.background = primaryColor; // update rainbow dot to chosen custom hex color!
      } else {
        dot.style.borderColor = 'transparent';
        dot.classList.remove('active');
        dot.style.boxShadow = 'none';
      }
    });

    // Apply custom colors locally to Main Clock Containers
    const clockContainers = document.querySelectorAll('.clock-container');
    clockContainers.forEach(container => {
      container.style.setProperty('--accent-primary', primaryColor);
      container.style.setProperty('--accent-secondary', secondaryColor);
      container.style.setProperty('--glow-color', primaryColor);
    });

    // Apply custom colors to local PiP overlay
    if (this.localPipEl) {
      const pipClock = this.localPipEl.querySelector('.clock-container');
      if (pipClock) {
        pipClock.style.setProperty('--accent-primary', primaryColor);
        pipClock.style.setProperty('--accent-secondary', secondaryColor);
        pipClock.style.setProperty('--glow-color', primaryColor);
      }
    }

    // Apply custom colors to native PiP window
    if (this.pipWindow) {
      const pipClock = this.pipWindow.document.querySelector('.clock-container');
      if (pipClock) {
        pipClock.style.setProperty('--accent-primary', primaryColor);
        pipClock.style.setProperty('--accent-secondary', secondaryColor);
        pipClock.style.setProperty('--glow-color', primaryColor);
      }
      
      const stops = this.pipWindow.document.querySelectorAll('#timer-gradient-pip stop');
      if (stops.length >= 2) {
        stops[0].setAttribute('stop-color', primaryColor);
        stops[1].setAttribute('stop-color', secondaryColor);
      }
    }
    this.savePipSettings();
  },

  adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1,3), 16);
    let G = parseInt(hex.substring(3,5), 16);
    let B = parseInt(hex.substring(5,7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  },

  savePipSettings() {
    const settings = {
      clockDesign: this.clockDesign,
      clockColor: this.clockColor,
      customColorVal: this.customColorVal,
      designs: this.pipDesigns || {
        ring: { nativeWidth: 320, nativeHeight: 350, localWidth: 240, localHeight: 290, localTop: null, localLeft: null, zoom: 1.0 },
        digital: { nativeWidth: 320, nativeHeight: 250, localWidth: 240, localHeight: 180, localTop: null, localLeft: null, zoom: 1.0 },
        hourglass: { nativeWidth: 320, nativeHeight: 250, localWidth: 240, localHeight: 180, localTop: null, localLeft: null, zoom: 1.0 },
        retro: { nativeWidth: 320, nativeHeight: 280, localWidth: 240, localHeight: 200, localTop: null, localLeft: null, zoom: 1.0 }
      }
    };
    localStorage.setItem('sankalp_pip_settings', JSON.stringify(settings));
  },

  loadPipSettings() {
    const defaultDesigns = {
      ring: { nativeWidth: 320, nativeHeight: 350, localWidth: 240, localHeight: 290, localTop: null, localLeft: null, zoom: 1.0 },
      digital: { nativeWidth: 320, nativeHeight: 250, localWidth: 240, localHeight: 180, localTop: null, localLeft: null, zoom: 1.0 },
      hourglass: { nativeWidth: 320, nativeHeight: 250, localWidth: 240, localHeight: 180, localTop: null, localLeft: null, zoom: 1.0 },
      retro: { nativeWidth: 320, nativeHeight: 280, localWidth: 240, localHeight: 200, localTop: null, localLeft: null, zoom: 1.0 }
    };

    try {
      const dataStr = localStorage.getItem('sankalp_pip_settings');
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        this.clockDesign = parsed.clockDesign || 'ring';
        this.clockColor = parsed.clockColor || 'blue';
        this.customColorVal = parsed.customColorVal || null;
        
        this.pipDesigns = { ...defaultDesigns };
        if (parsed.designs) {
          for (const key in defaultDesigns) {
            if (parsed.designs[key]) {
              this.pipDesigns[key] = { ...defaultDesigns[key], ...parsed.designs[key] };
            }
          }
        }
      } else {
        this.clockDesign = 'ring';
        this.clockColor = 'blue';
        this.customColorVal = null;
        this.pipDesigns = defaultDesigns;
      }
    } catch (e) {
      console.warn('Failed to load PiP settings, using defaults:', e);
      this.clockDesign = 'ring';
      this.clockColor = 'blue';
      this.customColorVal = null;
      this.pipDesigns = defaultDesigns;
    }
  },

  getDesignSettings(design) {
    if (!this.pipDesigns) {
      this.loadPipSettings();
    }
    if (!this.pipDesigns[design]) {
      this.pipDesigns[design] = {
        nativeWidth: 320,
        nativeHeight: 350,
        localWidth: 240,
        localHeight: 290,
        localTop: null,
        localLeft: null,
        zoom: 1.0
      };
    }
    return this.pipDesigns[design];
  },

  updateZoom(zoom) {
    const currentDesign = this.clockDesign;
    const settings = this.getDesignSettings(currentDesign);
    settings.zoom = Math.max(0.5, Math.min(2.5, Math.round(zoom * 100) / 100));
    
    if (this.localPipEl) {
      this.localPipEl.style.setProperty('--pip-zoom', settings.zoom);
    }
    
    if (this.pipWindow) {
      const pipContainer = this.pipWindow.document.querySelector('.pip-container');
      if (pipContainer) {
        pipContainer.style.setProperty('--pip-zoom', settings.zoom);
      }
    }
    
    this.savePipSettings();
  }
};
