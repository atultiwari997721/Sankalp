// Sankalp Core Application Logic (app.js)

// Global Application State
window.Sankalp = {
  state: null,
  activeView: 'dashboard',

  // Fetch full state from Express Backend
  async fetchState() {
    const username = localStorage.getItem('sankalp_user');
    if (!username) {
      this.state = this.getFallbackState();
      return this.state;
    }

    try {
      const response = await fetch(`/api/state?username=${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error('API server unreachable.');
      this.state = await response.json();
      return this.state;
    } catch (err) {
      console.error('Failed to fetch state, falling back to local memory:', err);
      this.state = this.getFallbackState();
      return this.state;
    }
  },

  // Save current state back to Express Backend
  async saveState() {
    const username = localStorage.getItem('sankalp_user');
    if (!username) return;

    try {
      const response = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, state: this.state })
      });
      if (!response.ok) throw new Error('Failed to save state.');
      
      // Update dashboard items when state changes
      if (this.activeView === 'dashboard') {
        this.renderDashboard();
      }
    } catch (err) {
      console.error('Failed to sync state with backend:', err);
      this.showToast('⚠️ Saving error. Changes kept in browser cache.', 'danger');
    }
  },

  getFallbackState() {
    return {
      user: { name: 'Champ', theme: 'dark', focusMinutes: 0, streakCount: 0, lastActiveDate: null },
      tasks: [],
      habits: [],
      journal: {},
      studyPlans: []
    };
  },

  // Initialize Application
  async init() {
    // 1. Setup Mobile Sidebar drawer triggers (always available)
    this.setupMobileSidebar();
    
    // 2. Setup theme switcher (guarded for null states)
    this.setupTheme();
    
    // 3. Setup Navigation & Routing (guarded)
    this.setupRouter();
    
    // 4. Setup Dynamic Mouse Spotlight for Cards
    this.setupCardSpotlight();
    
    // 5. Initialize Clock updates immediately on load
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // 6. Initialize sub-module listeners (safe to do before loading data)
    if (window.SankalpTasks) window.SankalpTasks.init();
    if (window.SankalpTimer) window.SankalpTimer.init();
    if (window.SankalpHabits) window.SankalpHabits.init();
    if (window.SankalpJournal) window.SankalpJournal.init();
    if (window.SankalpZen) window.SankalpZen.init();
    if (window.SankalpStudy) window.SankalpStudy.init();
    if (window.SankalpSaarthi) window.SankalpSaarthi.init();

    // 7. Initialize Auth state
    if (window.SankalpAuth) window.SankalpAuth.init();
    
    const username = localStorage.getItem('sankalp_user');
    if (!username) {
      // Hold state-dependent rendering until user logs in successfully
      return;
    }

    // 8. Fetch user specific state and render
    await this.fetchState();
    this.setupEditableGreeting();
    this.renderDashboard();
    
    this.showToast(`⚡ Welcome, ${username}! Let's make today productive.`, 'success');
  },

  // Page Navigation Router
  setupRouter() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.id === 'sidebar-logout-btn') return;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    // Handle initial default route
    this.switchView('dashboard');
  },

  switchView(viewName) {
    this.activeView = viewName;
    
    // Update active class on links
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update active section
    document.querySelectorAll('.view-section').forEach(section => {
      if (section.id === `${viewName}-view`) {
        section.classList.add('active-view');
      } else {
        section.classList.remove('active-view');
      }
    });

    // Trigger specific renders on view switch (only if state is loaded)
    if (this.state) {
      if (viewName === 'dashboard') {
        this.renderDashboard();
      } else if (viewName === 'tasks' && window.SankalpTasks) {
        window.SankalpTasks.render();
      } else if (viewName === 'habits' && window.SankalpHabits) {
        window.SankalpHabits.render();
      } else if (viewName === 'journal' && window.SankalpJournal) {
        window.SankalpJournal.render();
      } else if (viewName === 'study' && window.SankalpStudy) {
        window.SankalpStudy.render();
      } else if (viewName === 'saarthi' && window.SankalpSaarthi) {
        window.SankalpSaarthi.renderRoadmapPreview();
      }
    }
  },

  // Dark/Light Theme Handler
  setupTheme() {
    const themeSwitch = document.querySelector('.theme-switch');
    if (!themeSwitch) return;
    
    // Apply loaded theme (fallback to dark if state not loaded)
    const userTheme = (this.state && this.state.user) ? this.state.user.theme : 'dark';
    document.documentElement.setAttribute('data-theme', userTheme);
    
    themeSwitch.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      
      if (this.state && this.state.user) {
        this.state.user.theme = newTheme;
        this.saveState();
      }
      
      this.showToast(`🌙 Theme set to ${newTheme.toUpperCase()}`, 'info');
    });
  },

  // Edit Name in Greeting
  setupEditableGreeting() {
    const nameEl = document.querySelector('.greeting-name');
    if (!nameEl) return;

    nameEl.addEventListener('click', () => {
      const currentName = nameEl.textContent.trim();
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.maxLength = 15;
      input.classList.add('greeting-name-input');
      
      nameEl.replaceWith(input);
      input.focus();

      const finishEditing = () => {
        const newName = input.value.trim() || 'Champ';
        const span = document.createElement('span');
        span.className = 'greeting-name';
        span.textContent = newName;
        input.replaceWith(span);
        
        if (this.state && this.state.user) {
          this.state.user.name = newName;
          this.saveState();
        }
        
        // Rebind click listener
        this.setupEditableGreeting();
      };

      input.addEventListener('blur', finishEditing);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') finishEditing();
      });
    });
  },

  // Glow Cards mouse cursor listener (premium glowing spotlight)
  setupCardSpotlight() {
    document.addEventListener('mousemove', (e) => {
      const cards = document.querySelectorAll('.glow-card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  },

  // Mobile navigation drawers
  setupMobileSidebar() {
    const burger = document.getElementById('mobile-hamburger-btn');
    const sidebar = document.getElementById('app-sidebar');
    const main = document.getElementById('app-main-content');
    
    if (burger && sidebar) {
      burger.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('mobile-active');
      });
      
      // Close sidebar when clicking main content area
      if (main) {
        main.addEventListener('click', () => {
          sidebar.classList.remove('mobile-active');
        });
      }
      
      // Close sidebar on clicking navigation link
      document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
          sidebar.classList.remove('mobile-active');
        });
      });
    }
  },

  // Clock Update
  updateClock() {
    const timeEl = document.querySelector('.dashboard-date-time');
    const dayEl = document.querySelector('.dashboard-date-day');
    if (!timeEl || !dayEl) return;

    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    dayEl.textContent = now.toLocaleDateString('en-US', options);
  },

  // Render Dashboard Specific Metrics
  renderDashboard() {
    if (!this.state) return; // Prevent crashes if loaded before fetchState

    // Greeting greeting time of day
    const hours = new Date().getHours();
    let greet = 'Good night';
    if (hours >= 5 && hours < 12) greet = 'Good morning';
    else if (hours >= 12 && hours < 17) greet = 'Good afternoon';
    else if (hours >= 17 && hours < 22) greet = 'Good evening';

    const greetingTextEl = document.querySelector('.greeting-text h2');
    if (greetingTextEl) {
      greetingTextEl.innerHTML = `👋 ${greet}, <span class="greeting-name">${this.state.user.name || 'Champ'}</span>`;
      this.setupEditableGreeting(); // Re-bind since we re-wrote innerHTML
    }

    // Affirmations
    const quotes = [
      "Believe you can and you're halfway there. - Theodore Roosevelt",
      "Action is the foundational key to all success. - Pablo Picasso",
      "Focus on being productive instead of busy. - Tim Ferriss",
      "Do what you can, with what you have, where you are. - Theodore Roosevelt",
      "The best way to predict the future is to create it. - Peter Drucker",
      "Sankalp is your determination. Stand firm in your purpose today."
    ];
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24));
    const currentQuote = quotes[dayOfYear % quotes.length];
    
    const quoteEl = document.querySelector('.affirmation-text');
    if (quoteEl) quoteEl.textContent = currentQuote;

    // Task stats
    const todayTasks = this.state.tasks || [];
    const completedTasksCount = todayTasks.filter(t => t.completed).length;
    const totalTasksCount = todayTasks.length;
    const tasksPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    // Update circular ring
    const ringProgressEl = document.querySelector('.ring-progress');
    const ringPercentEl = document.querySelector('.ring-percent');
    if (ringProgressEl && ringPercentEl) {
      ringPercentEl.textContent = `${tasksPercent}%`;
      const offset = 440 - (440 * tasksPercent) / 100;
      ringProgressEl.style.strokeDashoffset = offset;
    }

    // Stats values
    document.getElementById('stat-tasks-val').textContent = `${completedTasksCount}/${totalTasksCount}`;
    document.getElementById('stat-focus-val').textContent = `${this.state.user.focusMinutes}m`;
    
    // Streaks
    let maxStreak = 0;
    (this.state.habits || []).forEach(h => {
      if (h.streak > maxStreak) maxStreak = h.streak;
    });
    document.getElementById('stat-streak-val').textContent = maxStreak > 0 ? `${maxStreak}d` : '0d';

    // Mood Selector Integration
    this.renderDashboardMoodSelector();

    // Render Study plans summary widget
    if (window.SankalpStudy) {
      window.SankalpStudy.renderDashboardSummary();
    }

    // Today's summary list
    const summaryList = document.querySelector('#dashboard-view .tasks-summary-list:not(#dashboard-study-summary)');
    if (summaryList) {
      summaryList.innerHTML = '';
      if (totalTasksCount === 0) {
        summaryList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-size: 0.9rem;">No tasks scheduled for today. Create some in Tasks view!</div>`;
      } else {
        todayTasks.forEach(task => {
          const item = document.createElement('div');
          item.className = `task-summary-item ${task.completed ? 'completed' : ''}`;
          
          let priorityClass = '';
          if (task.priority === 'high') priorityClass = 'background: rgba(239, 68, 68, 0.12); color: var(--accent-danger); border: 1px solid rgba(239, 68, 68, 0.25)';
          else if (task.priority === 'medium') priorityClass = 'background: rgba(251, 191, 36, 0.12); color: var(--accent-warning); border: 1px solid rgba(251, 191, 36, 0.25)';
          else priorityClass = 'background: rgba(52, 211, 153, 0.12); color: var(--accent-success); border: 1px solid rgba(52, 211, 153, 0.25)';

          item.innerHTML = `
            <div class="task-summary-left">
              <span class="task-summary-title">${task.title}</span>
            </div>
            <div class="task-summary-meta">
              <span class="task-summary-tag" style="${priorityClass}">${task.priority.toUpperCase()}</span>
              <span class="task-summary-tag">${task.category}</span>
            </div>
          `;
          summaryList.appendChild(item);
        });
      }
    }
  },

  renderDashboardMoodSelector() {
    const todayStr = new Date().toISOString().split('T')[0];
    const journalEntry = (this.state.journal || {})[todayStr] || {};
    const selectedMood = journalEntry.mood || '';

    const moodBtns = document.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => {
      const moodVal = btn.getAttribute('data-mood');
      if (moodVal === selectedMood) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }

      btn.onclick = () => {
        if (!this.state.journal) this.state.journal = {};
        if (!this.state.journal[todayStr]) {
          this.state.journal[todayStr] = { mood: '', morning: '', evening: '' };
        }
        
        const isSelected = btn.classList.contains('selected');
        const newMood = isSelected ? '' : moodVal;
        
        this.state.journal[todayStr].mood = newMood;
        this.saveState();
        this.renderDashboardMoodSelector();
        
        const moodValLabel = document.getElementById('stat-mood-val');
        if (moodValLabel) {
          moodValLabel.textContent = newMood ? btn.querySelector('.mood-emoji').textContent : 'N/A';
        }

        if (newMood) {
          this.showToast(`Mood logged: ${newMood}! Feel free to reflect in Journal.`, 'success');
        }
      };
    });

    const moodValLabel = document.getElementById('stat-mood-val');
    if (moodValLabel) {
      const activeBtn = document.querySelector('.mood-btn.selected');
      moodValLabel.textContent = activeBtn ? activeBtn.querySelector('.mood-emoji').textContent : 'N/A';
    }
  },

  // Global Toast Notification Helper
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        z-index: 100000;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'glass-panel';
    
    let accentColor = 'var(--accent-primary)';
    if (type === 'success') accentColor = 'var(--accent-success)';
    else if (type === 'danger') accentColor = 'var(--accent-danger)';
    else if (type === 'info') accentColor = 'var(--accent-cyan)';
    
    toast.style.cssText = `
      padding: 0.85rem 1.5rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-primary);
      border-left: 4px solid ${accentColor};
      background: var(--panel-bg);
      pointer-events: auto;
      transform: translateX(100px);
      opacity: 0;
      transition: all var(--transition-normal);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      toast.style.transform = 'translateX(100px)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => window.Sankalp.init());
