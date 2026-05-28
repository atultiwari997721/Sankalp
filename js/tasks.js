// Sankalp Tasks Logic (tasks.js)

window.SankalpTasks = {
  currentCategoryFilter: 'all',
  currentPriorityFilter: 'all',
  subtasksBuilderList: [], // Temp list of subtasks when creating

  init() {
    this.setupListeners();
  },

  setupListeners() {
    // Add Task Button -> Opens Modal
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const closeModalBtn = document.getElementById('close-task-modal');
    const cancelModalBtn = document.getElementById('cancel-task-btn');
    const taskForm = document.getElementById('task-form');

    if (addTaskBtn && taskModal) {
      addTaskBtn.addEventListener('click', () => {
        // Reset form and temp subtasks
        taskForm.reset();
        this.subtasksBuilderList = [];
        this.renderSubtaskChips();
        
        // Set default date to today
        document.getElementById('task-due').value = new Date().toISOString().split('T')[0];

        taskModal.classList.add('active-modal');
      });
    }

    const closeModal = () => {
      taskModal.classList.remove('active-modal');
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    
    // Close modal on clicking backdrop
    if (taskModal) {
      taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
      });
    }

    // Subtask Builder Input trigger
    const subtaskInput = document.getElementById('task-subtask-input');
    const addSubtaskBtn = document.getElementById('add-subtask-chip-btn');
    
    const addSubtaskChip = () => {
      const val = subtaskInput.value.trim();
      if (val) {
        this.subtasksBuilderList.push({
          id: `sub-temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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

    // Task Form Submit
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('task-title').value.trim();
        const desc = document.getElementById('task-desc').value.trim();
        const category = document.getElementById('task-category').value;
        const priority = document.getElementById('task-priority').value;
        const dueDate = document.getElementById('task-due').value;

        if (!title) return;

        const newTask = {
          id: `task-${Date.now()}`,
          title,
          description: desc,
          category,
          priority,
          completed: false,
          dueDate,
          subtasks: [...this.subtasksBuilderList]
        };

        window.Sankalp.state.tasks.push(newTask);
        window.Sankalp.saveState();
        this.render();
        
        closeModal();
        window.Sankalp.showToast('✅ Task added successfully!', 'success');
      });
    }

    // Setup Category filters
    const categoryChips = document.querySelectorAll('#category-filters .filter-chip');
    categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentCategoryFilter = chip.getAttribute('data-filter');
        this.render();
      });
    });

    // Setup Priority filters
    const priorityChips = document.querySelectorAll('#priority-filters .filter-chip');
    priorityChips.forEach(chip => {
      chip.addEventListener('click', () => {
        priorityChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentPriorityFilter = chip.getAttribute('data-filter');
        this.render();
      });
    });
  },

  renderSubtaskChips() {
    const listEl = document.getElementById('subtask-chip-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    this.subtasksBuilderList.forEach((sub, idx) => {
      const chip = document.createElement('div');
      chip.className = 'subtask-chip';
      chip.innerHTML = `
        <span>${sub.title}</span>
        <span class="subtask-chip-remove">&times;</span>
      `;
      chip.querySelector('.subtask-chip-remove').onclick = () => {
        this.subtasksBuilderList.splice(idx, 1);
        this.renderSubtaskChips();
      };
      listEl.appendChild(chip);
    });
  },

  // Main task board rendering
  render() {
    const gridEl = document.getElementById('tasks-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    let filtered = window.Sankalp.state.tasks || [];

    // Filter categories
    if (this.currentCategoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === this.currentCategoryFilter);
    }

    // Filter priorities
    if (this.currentPriorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === this.currentPriorityFilter);
    }

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-secondary);" class="glass-panel">
          <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 0.5rem;">No tasks found</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Adjust your filters or add a new task to get started.</span>
        </div>
      `;
      return;
    }

    filtered.forEach(task => {
      const card = document.createElement('div');
      card.className = `task-card glass-panel glow-card priority-${task.priority} ${task.completed ? 'completed' : ''}`;
      card.id = `card-${task.id}`;

      // Calculate subtask completions
      const totalSub = task.subtasks ? task.subtasks.length : 0;
      const compSub = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
      const progressPercent = totalSub > 0 ? Math.round((compSub / totalSub) * 100) : 0;

      // Subtasks list rendering HTML
      let subtasksHtml = '';
      if (totalSub > 0) {
        subtasksHtml = `
          <div class="task-subtasks-section">
            <div class="subtask-progress-container" onclick="window.SankalpTasks.toggleSubtaskListCollapse('${task.id}')">
              <span>Checklist (${compSub}/${totalSub})</span>
              <div class="subtask-progress-bar">
                <div class="subtask-progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <span id="arrow-${task.id}" style="font-size: 0.7rem; font-weight: bold; transform: rotate(180deg); transition: transform 0.2s;">▲</span>
            </div>
            <div class="subtasks-list" id="list-${task.id}">
              ${task.subtasks.map(sub => `
                <div class="subtask-item ${sub.completed ? 'completed' : ''}" onclick="window.SankalpTasks.toggleSubtask('${task.id}', '${sub.id}')">
                  <div class="subtask-checkbox">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span>${sub.title}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="task-card-header">
          <div class="task-checkbox-container">
            <div class="task-custom-checkbox" onclick="window.SankalpTasks.toggleTaskCompletion('${task.id}')">
              <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <span class="task-title">${task.title}</span>
          </div>
          <div class="task-card-actions">
            ${!task.completed ? `
              <button class="task-action-btn btn-play" title="Start Focus Timer" onclick="window.SankalpTasks.startTimerForTask('${task.id}')">
                <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            ` : ''}
            <button class="task-action-btn btn-delete" title="Delete Task" onclick="window.SankalpTasks.deleteTask('${task.id}')">
              <svg viewBox="0 0 24 24"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>
            </button>
          </div>
        </div>
        
        <div class="task-card-details">
          ${task.description ? `<p class="task-desc">${task.description}</p>` : ''}
          <div class="task-meta-row">
            <span class="task-due-date">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/></svg>
              ${this.formatDueDate(task.dueDate)}
            </span>
            <span class="task-category-badge">${task.category}</span>
          </div>
        </div>
        
        ${subtasksHtml}
      `;

      gridEl.appendChild(card);
    });
  },

  formatDueDate(dateStr) {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const dateOnly = date.toISOString().split('T')[0];
    const todayOnly = today.toISOString().split('T')[0];
    const tomorrowOnly = tomorrow.toISOString().split('T')[0];

    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === tomorrowOnly) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  toggleTaskCompletion(taskId) {
    const task = window.Sankalp.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    
    // Complete all subtasks if task is completed
    if (task.completed && task.subtasks) {
      task.subtasks.forEach(s => s.completed = true);
    }
    
    window.Sankalp.saveState();
    this.render();

    if (task.completed) {
      window.Sankalp.showToast('🎉 Task completed! Keep going.', 'success');
      this.playParticleAnimation(taskId);
    }
  },

  toggleSubtask(taskId, subId) {
    const task = window.Sankalp.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const sub = task.subtasks.find(s => s.id === subId);
    if (!sub) return;

    sub.completed = !sub.completed;
    
    // If all subtasks are complete, check the main task
    const allDone = task.subtasks.every(s => s.completed);
    if (allDone && !task.completed) {
      task.completed = true;
      window.Sankalp.showToast('🎉 All checklist items done! Task completed.', 'success');
    } else if (!allDone && task.completed) {
      task.completed = false;
    }

    window.Sankalp.saveState();
    this.render();
  },

  toggleSubtaskListCollapse(taskId) {
    const list = document.getElementById(`list-${taskId}`);
    const arrow = document.getElementById(`arrow-${taskId}`);
    if (!list || !arrow) return;

    if (list.style.display === 'none') {
      list.style.display = 'flex';
      arrow.style.transform = 'rotate(180deg)';
    } else {
      list.style.display = 'none';
      arrow.style.transform = 'rotate(90deg)';
    }
  },

  deleteTask(taskId) {
    window.Sankalp.state.tasks = window.Sankalp.state.tasks.filter(t => t.id !== taskId);
    window.Sankalp.saveState();
    this.render();
    window.Sankalp.showToast('🗑️ Task removed', 'info');
  },

  startTimerForTask(taskId) {
    const task = window.Sankalp.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (window.SankalpTimer) {
      window.SankalpTimer.setActiveTask(task);
      window.Sankalp.switchView('pomodoro');
      window.Sankalp.showToast(`🎯 Focus timer started for: "${task.title}"`, 'success');
    }
  },

  // Premium particle pop effect when task is checked off!
  playParticleAnimation(taskId) {
    const card = document.getElementById(`card-${taskId}`);
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${Math.random() * 8 + 4}px;
        height: ${Math.random() * 8 + 4}px;
        background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary), var(--accent-cyan));
        border-radius: 50%;
        pointer-events: none;
        z-index: 99999;
        transition: transform 0.8s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.8s ease-out;
      `;
      document.body.appendChild(particle);

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 80 + 40;
      const targetX = Math.cos(angle) * speed;
      const targetY = Math.sin(angle) * speed;

      setTimeout(() => {
        particle.style.transform = `translate(${targetX}px, ${targetY}px) scale(0)`;
        particle.style.opacity = '0';
        setTimeout(() => particle.remove(), 800);
      }, 20);
    }
  }
};
