// Sankalp Study Planner Logic (study.js)

window.SankalpStudy = {
  tempSubtasks: [],

  init() {
    this.setupListeners();
  },

  setupListeners() {
    const addStudyBtn = document.getElementById('add-study-plan-btn');
    const studyModal = document.getElementById('study-modal');
    const closeModalBtn = document.getElementById('close-study-modal');
    const cancelModalBtn = document.getElementById('cancel-study-btn');
    const studyForm = document.getElementById('study-form');

    if (addStudyBtn && studyModal) {
      addStudyBtn.addEventListener('click', () => {
        studyForm.reset();
        this.tempSubtasks = [];
        this.renderSubtaskChips();
        
        // Set default date to today
        document.getElementById('study-date').value = new Date().toISOString().split('T')[0];
        studyModal.classList.add('active-modal');
      });
    }

    const closeModal = () => {
      studyModal.classList.remove('active-modal');
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    if (studyModal) {
      studyModal.addEventListener('click', (e) => {
        if (e.target === studyModal) closeModal();
      });
    }

    // Subtask Builder
    const subtaskInput = document.getElementById('study-subtask-input');
    const addSubtaskBtn = document.getElementById('add-study-subtask-btn');

    const addSubtaskChip = () => {
      const val = subtaskInput.value.trim();
      if (val) {
        this.tempSubtasks.push({
          title: val,
          completed: false
        });
        subtaskInput.value = '';
        this.renderSubtaskChips();
      }
    };

    if (addSubtaskBtn && subtaskInput) {
      addSubtaskBtn.addEventListener('click', addSubtaskChip);
      subtaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSubtaskChip();
        }
      });
    }

    // Form Submit
    if (studyForm) {
      studyForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const subject = document.getElementById('study-subject').value.trim();
        const topic = document.getElementById('study-topic').value.trim();
        const date = document.getElementById('study-date').value;
        const hours = parseFloat(document.getElementById('study-hours').value) || 1;

        if (!subject || !topic) return;

        const newPlan = {
          id: `study-${Date.now()}`,
          subject,
          topic,
          date,
          hours,
          completed: false,
          subtasks: [...this.tempSubtasks]
        };

        if (!window.Sankalp.state.studyPlans) {
          window.Sankalp.state.studyPlans = [];
        }

        window.Sankalp.state.studyPlans.push(newPlan);
        window.Sankalp.saveState();
        this.render();

        closeModal();
        window.Sankalp.showToast('📚 Study schedule logged!', 'success');
      });
    }
  },

  renderSubtaskChips() {
    const listEl = document.getElementById('study-subtask-chips');
    if (!listEl) return;
    listEl.innerHTML = '';

    this.tempSubtasks.forEach((sub, idx) => {
      const chip = document.createElement('div');
      chip.className = 'subtask-chip';
      chip.innerHTML = `
        <span>${sub.title}</span>
        <span class="subtask-chip-remove">&times;</span>
      `;
      chip.querySelector('.subtask-chip-remove').onclick = () => {
        this.tempSubtasks.splice(idx, 1);
        this.renderSubtaskChips();
      };
      listEl.appendChild(chip);
    });
  },

  render() {
    const gridEl = document.getElementById('study-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    if (!window.Sankalp.state) return;
    const plans = window.Sankalp.state.studyPlans || [];

    // Sort chronologically by date
    plans.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (plans.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-secondary);" class="glass-panel">
          <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 0.5rem;">No study plans scheduled</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Set clear date-wise milestones to ease your learning journey.</span>
        </div>
      `;
      return;
    }

    plans.forEach(plan => {
      const card = document.createElement('div');
      card.className = `study-card glass-panel glow-card ${plan.completed ? 'completed' : ''}`;
      
      const totalSteps = plan.subtasks ? plan.subtasks.length : 0;
      const compSteps = plan.subtasks ? plan.subtasks.filter(s => s.completed).length : 0;
      const progressPercent = totalSteps > 0 ? Math.round((compSteps / totalSteps) * 100) : 0;

      let subtasksHtml = '';
      if (totalSteps > 0) {
        subtasksHtml = `
          <div class="study-steps-section">
            <div class="study-progress-row">
              <span>Study Progress (${compSteps}/${totalSteps})</span>
              <div class="study-progress-bar">
                <div class="study-progress-fill" style="width: ${progressPercent}%; background: var(--accent-success);"></div>
              </div>
            </div>
            <div class="study-steps-list">
              ${plan.subtasks.map((step, idx) => `
                <div class="study-step-item ${step.completed ? 'completed' : ''}" onclick="window.SankalpStudy.toggleStep('${plan.id}', ${idx})">
                  <div class="study-step-check">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span>${step.title}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="study-card-header">
          <div>
            <span class="study-subject-badge">${plan.subject}</span>
            <h3 class="study-card-title">${plan.topic}</h3>
          </div>
          <div class="study-card-actions">
            <button class="study-action-btn" title="Delete Plan" onclick="window.SankalpStudy.deletePlan('${plan.id}')">
              <svg viewBox="0 0 24 24"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>
            </button>
          </div>
        </div>

        <div class="study-card-details">
          <div class="study-meta-item">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/></svg>
            <span>Target Date: ${this.formatStudyDate(plan.date)}</span>
          </div>
          <div class="study-meta-item">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Duration: ${plan.hours} Hours</span>
          </div>
        </div>

        ${subtasksHtml}

        <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
          <button class="glass-btn btn-primary" onclick="window.SankalpStudy.toggleCompletion('${plan.id}')">
            ${plan.completed ? 'Mark Incomplete' : 'Complete Study Plan'}
          </button>
        </div>
      `;

      gridEl.appendChild(card);
    });
  },

  formatStudyDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  },

  toggleCompletion(planId) {
    const plan = window.Sankalp.state.studyPlans.find(p => p.id === planId);
    if (!plan) return;

    plan.completed = !plan.completed;
    
    // Complete all subtasks if completing main
    if (plan.completed && plan.subtasks) {
      plan.subtasks.forEach(s => s.completed = true);
    }

    window.Sankalp.saveState();
    this.render();

    if (plan.completed) {
      window.Sankalp.showToast('🎉 Study goals achieved! Wonderful work.', 'success');
      
      // Award study focus minutes to user automatically as a productivity booster!
      const userState = window.Sankalp.state.user;
      userState.focusMinutes += Math.round(plan.hours * 60);
      window.Sankalp.saveState();
    }
  },

  toggleStep(planId, stepIdx) {
    const plan = window.Sankalp.state.studyPlans.find(p => p.id === planId);
    if (!plan || !plan.subtasks || !plan.subtasks[stepIdx]) return;

    plan.subtasks[stepIdx].completed = !plan.subtasks[stepIdx].completed;

    // Check if all steps completed
    const allDone = plan.subtasks.every(s => s.completed);
    if (allDone && !plan.completed) {
      plan.completed = true;
      window.Sankalp.showToast('🎉 All study tasks finished!', 'success');
      window.Sankalp.state.user.focusMinutes += Math.round(plan.hours * 60);
    } else if (!allDone && plan.completed) {
      plan.completed = false;
    }

    window.Sankalp.saveState();
    this.render();
  },

  deletePlan(planId) {
    window.Sankalp.state.studyPlans = window.Sankalp.state.studyPlans.filter(p => p.id !== planId);
    window.Sankalp.saveState();
    this.render();
    window.Sankalp.showToast('🗑️ Study plan deleted', 'info');
  },

  // Renders the study logs on the main dashboard
  renderDashboardSummary() {
    const dashboardContainer = document.getElementById('dashboard-study-summary');
    if (!dashboardContainer) return;

    dashboardContainer.innerHTML = '';
    if (!window.Sankalp.state) return;
    const plans = window.Sankalp.state.studyPlans || [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter to get plans due today or upcoming
    const activePlans = plans.filter(p => !p.completed);

    if (activePlans.length === 0) {
      dashboardContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-size: 0.85rem;">
          No active study plans scheduled. Go to Study Planner to map your calendar!
        </div>
      `;
      return;
    }

    // Sort upcoming plans
    activePlans.sort((a,b) => new Date(a.date) - new Date(b.date));

    // Show top 3 plans
    activePlans.slice(0, 3).forEach(plan => {
      const isToday = plan.date === todayStr;
      
      const item = document.createElement('div');
      item.className = 'task-summary-item';
      
      item.innerHTML = `
        <div class="task-summary-left">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-success); display: inline-block;"></span>
          <span class="task-summary-title">${plan.topic}</span>
        </div>
        <div class="task-summary-meta">
          <span class="task-summary-tag" style="background: rgba(56, 189, 248, 0.12); color: var(--accent-cyan); border: 1px solid rgba(56, 189, 248, 0.25)">
            ${plan.subject}
          </span>
          <span class="task-summary-tag" style="${isToday ? 'background: rgba(52, 211, 153, 0.15); color: var(--accent-success);' : ''}">
            ${isToday ? 'TODAY' : this.formatStudyDate(plan.date)}
          </span>
        </div>
      `;
      dashboardContainer.appendChild(item);
    });
  }
};
