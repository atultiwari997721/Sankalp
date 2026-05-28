// Sankalp Journal & Mood Reflections Logic (journal.js)

window.SankalpJournal = {
  selectedMood: '',

  init() {
    this.setupListeners();
  },

  setupListeners() {
    const saveBtn = document.getElementById('save-journal-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveCurrentEntry());
    }
  },

  render() {
    const todayStr = new Date().toISOString().split('T')[0];
    const state = window.Sankalp.state;
    if (!state) return;
    const entry = state.journal[todayStr] || { mood: '', morning: '', evening: '' };

    // Format current date
    const dateLabel = document.getElementById('journal-date-label');
    if (dateLabel) {
      const now = new Date();
      dateLabel.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    }

    // Set textareas
    const morningInput = document.getElementById('journal-morning-input');
    const eveningInput = document.getElementById('journal-evening-input');
    if (morningInput) morningInput.value = entry.morning || '';
    if (eveningInput) eveningInput.value = entry.evening || '';

    // Set mood status
    const statusText = document.getElementById('journal-mood-status-text');
    if (statusText) {
      statusText.innerHTML = entry.mood 
        ? `Mood logged: <strong>${entry.mood}</strong>` 
        : 'No mood logged on Dashboard today.';
    }

    // Render Past entries list
    this.renderHistory();
  },

  saveCurrentEntry() {
    const todayStr = new Date().toISOString().split('T')[0];
    const morningVal = document.getElementById('journal-morning-input').value.trim();
    const eveningVal = document.getElementById('journal-evening-input').value.trim();

    if (!window.Sankalp.state.journal[todayStr]) {
      window.Sankalp.state.journal[todayStr] = { mood: '', morning: '', evening: '' };
    }

    const entry = window.Sankalp.state.journal[todayStr];
    entry.morning = morningVal;
    entry.evening = eveningVal;

    window.Sankalp.saveState();
    this.renderHistory();
    
    window.Sankalp.showToast('📝 Reflections saved successfully', 'success');
  },

  renderHistory() {
    const historyList = document.getElementById('journal-history-list');
    if (!historyList) return;
    historyList.innerHTML = '';

    const entries = window.Sankalp.state.journal || {};
    const sortedDates = Object.keys(entries).sort((a, b) => new Date(b) - new Date(a));

    if (sortedDates.length === 0) {
      historyList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">No previous entries. Start writing today!</div>`;
      return;
    }

    sortedDates.forEach(dateStr => {
      const entry = entries[dateStr];
      if (!entry.morning && !entry.evening && !entry.mood) return;

      const item = document.createElement('div');
      item.className = 'history-item';
      
      const emojiMap = {
        'Amazing': '🤩',
        'Good': '🙂',
        'Neutral': '😐',
        'Tired': '🥱',
        'Bad': '😔'
      };
      
      const emoji = emojiMap[entry.mood] || '📝';
      const preview = entry.morning || entry.evening || 'Mood logged only.';
      const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-date">${formattedDate}</span>
          <span class="history-item-mood">${emoji}</span>
        </div>
        <p class="history-item-preview">${preview}</p>
      `;

      item.onclick = () => this.showHistoryEntryModal(dateStr, entry, emoji);
      historyList.appendChild(item);
    });
  },

  showHistoryEntryModal(dateStr, entry, emoji) {
    // Create temporary backdrop modal
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop active-modal';
    modalBackdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    modalBackdrop.innerHTML = `
      <div class="modal-container glass-panel" style="max-width: 600px; max-height: 85vh; overflow-y: auto; padding: 2.2rem; display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1rem;">
          <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">${formattedDate}</h2>
          <span style="font-size: 1.8rem;">${emoji}</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 1.25rem; flex: 1;">
          <div>
            <h4 style="font-family: var(--font-heading); color: var(--accent-cyan); font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
              ☀️ Morning Focus
            </h4>
            <p style="font-size: 0.95rem; line-height: 1.5; color: var(--text-secondary); background: rgba(255,255,255,0.02); padding: 1rem; border-radius: var(--border-radius-md); border: 1px solid rgba(255,255,255,0.02); white-space: pre-wrap;">
              ${entry.morning || '*No morning reflections logged.*'}
            </p>
          </div>
          
          <div>
            <h4 style="font-family: var(--font-heading); color: var(--accent-secondary); font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
              🌙 Evening Reflections
            </h4>
            <p style="font-size: 0.95rem; line-height: 1.5; color: var(--text-secondary); background: rgba(255,255,255,0.02); padding: 1rem; border-radius: var(--border-radius-md); border: 1px solid rgba(255,255,255,0.02); white-space: pre-wrap;">
              ${entry.evening || '*No evening reflections logged.*'}
            </p>
          </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
          <button class="glass-btn btn-primary" id="close-history-view-btn">Close Entry</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    const closeBtn = modalBackdrop.querySelector('#close-history-view-btn');
    closeBtn.onclick = () => {
      modalBackdrop.remove();
    };

    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) modalBackdrop.remove();
    };
  }
};
