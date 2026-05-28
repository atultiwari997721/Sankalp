// Sankalp Habit Tracker Logic (habits.js)

window.SankalpHabits = {
  selectedColor: '#6366f1', // Default indigo

  init() {
    this.setupListeners();
  },

  setupListeners() {
    const addHabitBtn = document.getElementById('add-habit-btn');
    const habitModal = document.getElementById('habit-modal');
    const closeModalBtn = document.getElementById('close-habit-modal');
    const cancelModalBtn = document.getElementById('cancel-habit-btn');
    const habitForm = document.getElementById('habit-form');

    if (addHabitBtn && habitModal) {
      addHabitBtn.addEventListener('click', () => {
        habitForm.reset();
        this.selectedColor = '#6366f1';
        this.selectColorOption(this.selectedColor);
        habitModal.classList.add('active-modal');
      });
    }

    const closeModal = () => {
      habitModal.classList.remove('active-modal');
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    
    if (habitModal) {
      habitModal.addEventListener('click', (e) => {
        if (e.target === habitModal) closeModal();
      });
    }

    // Color Pickers
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        const color = opt.getAttribute('data-color');
        this.selectedColor = color;
        this.selectColorOption(color);
      });
    });

    // Form Submit
    if (habitForm) {
      habitForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('habit-title').value.trim();
        const frequency = document.getElementById('habit-frequency').value;

        if (!title) return;

        const newHabit = {
          id: `habit-${Date.now()}`,
          title,
          frequency,
          color: this.selectedColor,
          history: {}, // Stores completions { "YYYY-MM-DD": true }
          streak: 0,
          bestStreak: 0
        };

        window.Sankalp.state.habits.push(newHabit);
        window.Sankalp.saveState();
        this.render();

        closeModal();
        window.Sankalp.showToast('🌱 Habit tracker initialized!', 'success');
      });
    }
  },

  selectColorOption(color) {
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(opt => {
      if (opt.getAttribute('data-color') === color) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
  },

  render() {
    const listEl = document.getElementById('habits-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!window.Sankalp.state) return;
    const habits = window.Sankalp.state.habits || [];

    if (habits.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 4rem; color: var(--text-secondary);" class="glass-panel">
          <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 0.5rem;">No habits tracked yet</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Start small. Build habits you can maintain daily.</span>
        </div>
      `;
      return;
    }

    // Get dates of the current week (Monday to Sunday)
    const weekDates = this.getCurrentWeekDates();

    habits.forEach(habit => {
      const card = document.createElement('div');
      card.className = 'habit-card glass-panel glow-card';
      card.style.borderLeft = `4px solid ${habit.color}`;

      // Calculate streak dynamically before rendering
      this.recalculateStreak(habit);

      // Render week check columns
      let gridColsHtml = '';
      weekDates.forEach(dateInfo => {
        const isCompleted = habit.history[dateInfo.dateStr] === true;
        const isFuture = new Date(dateInfo.dateStr) > new Date();
        
        let colClass = 'habit-day-check';
        if (isCompleted) colClass += ' completed';
        if (isFuture) colClass += ' future';

        gridColsHtml += `
          <div class="habit-day-col">
            <span class="habit-day-name">${dateInfo.label}</span>
            <div class="${colClass}" 
                 data-date="${dateInfo.dateStr}" 
                 onclick="${isFuture ? '' : `window.SankalpHabits.toggleHabitDay('${habit.id}', '${dateInfo.dateStr}')`}">
              <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="habit-card-top">
          <div class="habit-info-group">
            <span class="habit-title">${habit.title}</span>
            <span class="habit-frequency">${habit.frequency}</span>
          </div>
          
          <div class="habit-streaks">
            <div class="streak-badge current-streak" title="Current daily streak">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              <span>🔥 ${habit.streak} days</span>
            </div>
            <div class="streak-badge best-streak" title="All-time best streak">
              <span>🏆 Best: ${habit.bestStreak}</span>
            </div>
            <button class="habit-delete-btn" title="Delete Habit" onclick="window.SankalpHabits.deleteHabit('${habit.id}')">
              <svg viewBox="0 0 24 24"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>
            </button>
          </div>
        </div>

        <div class="habit-week-grid">
          ${gridColsHtml}
        </div>
      `;

      listEl.appendChild(card);
    });
  },

  // Get date strings for Monday -> Sunday of current week
  getCurrentWeekDates() {
    const today = new Date();
    const day = today.getDay(); // 0 is Sun, 1 is Mon, etc.
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(today.setDate(diff));

    const week = [];
    const daysLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(monday);
      nextDate.setDate(monday.getDate() + i);
      const dateStr = nextDate.toISOString().split('T')[0];
      week.push({
        label: `${daysLabels[i]} ${nextDate.getDate()}`,
        dateStr
      });
    }
    return week;
  },

  toggleHabitDay(habitId, dateStr) {
    const habit = window.Sankalp.state.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (habit.history[dateStr]) {
      delete habit.history[dateStr];
    } else {
      habit.history[dateStr] = true;
      this.playCheckChime(habit.color);
    }

    this.recalculateStreak(habit);
    window.Sankalp.saveState();
    this.render();
  },

  // Recalculates current and best streaks based on completion dates
  recalculateStreak(habit) {
    const history = habit.history;
    const completedDates = Object.keys(history)
      .filter(d => history[d] === true)
      .sort((a, b) => new Date(b) - new Date(a)); // Sort descending (latest first)

    if (completedDates.length === 0) {
      habit.streak = 0;
      return;
    }

    let streak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);
    
    let yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latestDateStr = completedDates[0];
    const latestDate = new Date(latestDateStr);
    latestDate.setHours(0,0,0,0);

    // If the latest checkoff is older than yesterday, the streak is broken
    if (latestDate < yesterday) {
      habit.streak = 0;
      return;
    }

    // Traverse backwards starting from the latest completed day
    let currentCheck = new Date(latestDate);
    
    while (true) {
      const checkStr = currentCheck.toISOString().split('T')[0];
      if (history[checkStr] === true) {
        streak++;
        // Go to previous day
        currentCheck.setDate(currentCheck.getDate() - 1);
      } else {
        break;
      }
    }

    habit.streak = streak;
    if (streak > (habit.bestStreak || 0)) {
      habit.bestStreak = streak;
    }
  },

  deleteHabit(habitId) {
    window.Sankalp.state.habits = window.Sankalp.state.habits.filter(h => h.id !== habitId);
    window.Sankalp.saveState();
    this.render();
    window.Sankalp.showToast('🗑️ Habit removed', 'info');
  },

  // Quick sound effect synthesizer for checks
  playCheckChime(color) {
    if (window.SankalpTimer) {
      window.SankalpTimer.initAudioContext();
      const ctx = window.SankalpTimer.audioCtx;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    }
  }
};
