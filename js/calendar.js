// Sankalp Dashboard Calendar Controller (calendar.js)

window.SankalpCalendar = {
  currentDate: new Date(), // Focus month/year
  selectedDate: new Date(), // Selected day details focus
  showHolidays: true,

  // Static Holiday List
  staticHolidays: {
    '01-01': "New Year's Day",
    '01-14': "Makar Sankranti",
    '01-26': "Republic Day (India)",
    '03-03': "Holi Festival",
    '03-08': "International Women's Day",
    '03-20': "Eid al-Fitr",
    '04-03': "Good Friday",
    '04-22': "Earth Day",
    '05-01': "Labour Day / May Day",
    '06-05': "World Environment Day",
    '08-15': "Independence Day (India)",
    '09-05': "Teachers' Day",
    '10-02': "Gandhi Jayanti",
    '10-15': "World Students' Day (Kalam's Birthday)",
    '11-08': "Diwali (Festival of Lights)",
    '11-14': "Children's Day",
    '12-25': "Christmas Day"
  },

  init() {
    this.setupListeners();
    // Default focus to today
    this.selectedDate = new Date();
    this.currentDate = new Date();
  },

  setupListeners() {
    // Nav Buttons
    const prevBtn = document.getElementById('calendar-prev-month-btn');
    const nextBtn = document.getElementById('calendar-next-month-btn');
    const addEventBtn = document.getElementById('calendar-add-event-btn');
    const toggleHolidays = document.getElementById('calendar-toggle-holidays');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
      });
    }

    if (toggleHolidays) {
      toggleHolidays.addEventListener('change', (e) => {
        this.showHolidays = e.target.checked;
        this.render();
      });
    }

    // Modal Triggers
    const modal = document.getElementById('calendar-event-modal');
    const closeBtn = document.getElementById('close-calendar-modal');
    const cancelBtn = document.getElementById('cancel-calendar-btn');
    const form = document.getElementById('calendar-event-form');

    if (addEventBtn && modal) {
      addEventBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('calendar-event-id').value = '';
        
        // Default date is the currently selected date in the calendar
        const offset = this.selectedDate.getTimezoneOffset();
        const localDate = new Date(this.selectedDate.getTime() - (offset * 60 * 1000));
        document.getElementById('calendar-event-date').value = localDate.toISOString().split('T')[0];
        
        document.getElementById('calendar-modal-title').textContent = "New Calendar Event";
        modal.classList.add('active-modal');
      });
    }

    const closeModal = () => {
      if (modal) modal.classList.remove('active-modal');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Form submission
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('calendar-event-id').value;
        const title = document.getElementById('calendar-event-title').value.trim();
        const date = document.getElementById('calendar-event-date').value;
        const time = document.getElementById('calendar-event-time').value;
        const type = document.getElementById('calendar-event-type').value;
        const desc = document.getElementById('calendar-event-desc').value.trim();

        if (!title || !date) return;

        // Ensure array exists in state
        if (!window.Sankalp.state.calendarEvents) {
          window.Sankalp.state.calendarEvents = [];
        }

        if (id) {
          // Editing existing event
          const eventIndex = window.Sankalp.state.calendarEvents.findIndex(evt => evt.id === id);
          if (eventIndex > -1) {
            window.Sankalp.state.calendarEvents[eventIndex] = { id, title, date, time, type, description: desc };
          }
        } else {
          // Creating new event
          const newEvent = {
            id: `event-${Date.now()}`,
            title,
            date,
            time,
            type,
            description: desc
          };
          window.Sankalp.state.calendarEvents.push(newEvent);
        }

        window.Sankalp.saveState();
        closeModal();
        
        // Update selection date view to match the date of the event we just added/modified
        this.selectedDate = new Date(date);
        this.currentDate = new Date(date);
        
        this.render();
        window.Sankalp.showToast('📅 Personalized event logged!', 'success');
      });
    }
  },

  // Pre-load Holidays check helper
  getHolidaysForDate(dateStr) {
    if (!this.showHolidays) return [];
    
    // dateStr is in YYYY-MM-DD format
    const mmDd = dateStr.slice(5); // Get MM-DD
    const holidayTitle = this.staticHolidays[mmDd];
    
    if (holidayTitle) {
      return [{
        id: `holiday-${mmDd}`,
        title: holidayTitle,
        type: 'holiday',
        description: 'National / Global Observance'
      }];
    }
    return [];
  },

  render() {
    const monthYearDisplay = document.getElementById('calendar-month-year-display');
    const daysGrid = document.getElementById('calendar-days-grid');
    if (!daysGrid) return;

    daysGrid.innerHTML = '';

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Set Month Year title text
    if (monthYearDisplay) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
    }

    // First day of current month (Sunday = 0, Monday = 1, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();

    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Total days in previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const selectedStr = this.selectedDate.toISOString().split('T')[0];

    // Ensure state events is parsed correctly
    if (!window.Sankalp.state) return;
    if (!window.Sankalp.state.calendarEvents) {
      window.Sankalp.state.calendarEvents = [];
    }

    // Helper to format Date objects to Local YYYY-MM-DD
    const formatDateKey = (y, m, d) => {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    // Render cells from previous month to align layout grid
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      // Previous month date
      const prevMonthObj = new Date(year, month - 1, dayNum);
      const dateStr = formatDateKey(prevMonthObj.getFullYear(), prevMonthObj.getMonth(), dayNum);
      this.createDayCell(daysGrid, dayNum, dateStr, 'prev-month', selectedStr, todayStr);
    }

    // Render current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = formatDateKey(year, month, i);
      this.createDayCell(daysGrid, i, dateStr, 'current-month', selectedStr, todayStr);
    }

    // Render next month days to complete grid structure (6 rows * 7 days = 42 cells total)
    const totalRendered = firstDayIndex + totalDays;
    const remainingCells = 42 - totalRendered;
    for (let i = 1; i <= remainingCells; i++) {
      // Next month date
      const nextMonthObj = new Date(year, month + 1, i);
      const dateStr = formatDateKey(nextMonthObj.getFullYear(), nextMonthObj.getMonth(), i);
      this.createDayCell(daysGrid, i, dateStr, 'next-month', selectedStr, todayStr);
    }

    // Render Day details underneath
    this.renderDayDetails();
  },

  createDayCell(container, dayNum, dateStr, typeClass, selectedStr, todayStr) {
    const cell = document.createElement('div');
    cell.className = `calendar-day-cell ${typeClass}`;
    
    if (dateStr === todayStr) {
      cell.classList.add('today');
    }
    
    if (dateStr === selectedStr) {
      cell.classList.add('selected');
    }

    cell.innerHTML = `<span class="calendar-day-number">${dayNum}</span>`;

    // Fetch matching contents for indicators
    const items = this.getItemsForDate(dateStr);

    // Desktop Tags
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'calendar-day-events';
    
    // Mobile Dots
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'calendar-event-dots-mobile';

    // Append up to 3 indicator tags on grid cell, rest can be shown on details click
    items.slice(0, 3).forEach(item => {
      const tag = document.createElement('span');
      tag.className = `calendar-event-tag ${item.type}`;
      tag.textContent = item.title;
      tagsContainer.appendChild(tag);

      const dot = document.createElement('span');
      dot.className = `calendar-dot ${item.type}`;
      dotsContainer.appendChild(dot);
    });

    if (items.length > 3) {
      const overflowTag = document.createElement('span');
      overflowTag.className = 'calendar-event-tag other';
      overflowTag.style.textAlign = 'center';
      overflowTag.textContent = `+${items.length - 3} more`;
      tagsContainer.appendChild(overflowTag);

      const overflowDot = document.createElement('span');
      overflowDot.className = 'calendar-dot other';
      overflowDot.style.background = 'var(--text-muted)';
      dotsContainer.appendChild(overflowDot);
    }

    cell.appendChild(tagsContainer);
    cell.appendChild(dotsContainer);

    cell.addEventListener('click', () => {
      this.selectedDate = new Date(dateStr);
      
      // Update selected class in DOM
      document.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      
      this.renderDayDetails();
    });

    container.appendChild(cell);
  },

  getItemsForDate(dateStr) {
    const items = [];

    // 1. Preloaded Holidays
    const holidays = this.getHolidaysForDate(dateStr);
    items.push(...holidays);

    // 2. Custom Personalized Events
    const events = (window.Sankalp.state.calendarEvents || []).filter(e => e.date === dateStr);
    items.push(...events);

    // 3. User Tasks due on this day
    const tasks = (window.Sankalp.state.tasks || []).filter(t => t.dueDate === dateStr);
    tasks.forEach(t => {
      items.push({
        id: t.id,
        title: `Task: ${t.title}`,
        type: 'task',
        completed: t.completed,
        description: t.description || 'Action item due date'
      });
    });

    // 4. Study Planner targets due on this day
    const studies = (window.Sankalp.state.studyPlans || []).filter(s => s.date === dateStr);
    studies.forEach(s => {
      items.push({
        id: s.id,
        title: `Study: ${s.topic}`,
        type: 'study',
        completed: s.completed,
        description: `Subject: ${s.subject} (${s.hours} hours)`
      });
    });

    return items;
  },

  renderDayDetails() {
    const detailPanel = document.getElementById('calendar-day-details-panel');
    if (!detailPanel) return;

    const dateStr = this.selectedDate.toISOString().split('T')[0];
    const displayDate = this.selectedDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    const items = this.getItemsForDate(dateStr);

    let itemsHtml = '';
    if (items.length === 0) {
      itemsHtml = `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-size: 0.9rem;">
          No events, study plans, or tasks scheduled for this day.
        </div>
      `;
    } else {
      itemsHtml = items.map(item => {
        let metaHtml = '';
        if (item.time) metaHtml += `<span class="calendar-detail-item-desc">⏰ ${item.time}</span>`;
        if (item.description) {
          if (metaHtml) metaHtml += ` &bull; `;
          metaHtml += `<span class="calendar-detail-item-desc">${item.description}</span>`;
        }

        let actionButtonsHtml = '';
        // If it's a personalized user event, show delete & edit action
        if (item.id && item.id.startsWith('event-')) {
          actionButtonsHtml = `
            <button class="calendar-detail-btn" title="Edit Event" onclick="window.SankalpCalendar.editEvent('${item.id}')">
              <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button class="calendar-detail-btn btn-delete" title="Delete Event" onclick="window.SankalpCalendar.deleteEvent('${item.id}')">
              <svg viewBox="0 0 24 24"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>
            </button>
          `;
        }
        // If it's a task, show togglable checkbox
        else if (item.type === 'task') {
          actionButtonsHtml = `
            <button class="calendar-detail-btn btn-complete" title="${item.completed ? 'Mark Incomplete' : 'Complete Task'}" onclick="window.SankalpCalendar.toggleTask('${item.id}')">
              <svg viewBox="0 0 24 24" style="stroke: ${item.completed ? 'var(--accent-success)' : 'currentColor'}">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button class="calendar-detail-btn btn-delete" title="Delete Task" onclick="window.SankalpCalendar.deleteTask('${item.id}')">
              <svg viewBox="0 0 24 24"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>
            </button>
          `;
        }
        // If it's a study plan, show togglable checkbox
        else if (item.type === 'study') {
          actionButtonsHtml = `
            <button class="calendar-detail-btn btn-complete" title="${item.completed ? 'Mark Incomplete' : 'Complete Study Session'}" onclick="window.SankalpCalendar.toggleStudy('${item.id}')">
              <svg viewBox="0 0 24 24" style="stroke: ${item.completed ? 'var(--accent-success)' : 'currentColor'}">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button class="calendar-detail-btn btn-delete" title="Delete Study Plan" onclick="window.SankalpCalendar.deleteStudy('${item.id}')">
              <svg viewBox="0 0 24 24"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>
            </button>
          `;
        }

        const iconMap = {
          exam: '📝',
          meeting: '👥',
          holiday: '🎉',
          personal: '👤',
          other: '✨',
          task: '✔️',
          study: '📚'
        };

        return `
          <div class="calendar-detail-item ${item.completed ? 'completed' : ''}">
            <div class="calendar-detail-left">
              <div class="calendar-detail-icon ${item.type}">
                ${iconMap[item.type] || '📅'}
              </div>
              <div class="calendar-detail-content">
                <span class="calendar-detail-item-title">${item.title}</span>
                <div style="display: flex; gap: 0.35rem; align-items: center; margin-top: 0.1rem;">
                  <span class="task-summary-tag" style="padding: 0.05rem 0.35rem; font-size: 0.65rem; background: rgba(255,255,255,0.06); text-transform: uppercase; letter-spacing: 0.5px;">${item.type}</span>
                  ${metaHtml ? `<span style="font-size: 0.75rem; color: var(--text-muted);">&bull;</span> ${metaHtml}` : ''}
                </div>
              </div>
            </div>
            <div class="calendar-detail-actions">
              ${actionButtonsHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    detailPanel.innerHTML = `
      <div class="calendar-details-header">
        <h4 class="calendar-details-title">Schedules for ${displayDate}</h4>
        <button class="glass-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;" onclick="document.getElementById('calendar-add-event-btn').click()">
          + Add Event
        </button>
      </div>
      <div class="calendar-details-list">
        ${itemsHtml}
      </div>
    `;
  },

  // Event handlers invoked from inline HTML buttons
  deleteEvent(id) {
    if (!window.Sankalp.state.calendarEvents) return;
    
    window.Sankalp.state.calendarEvents = window.Sankalp.state.calendarEvents.filter(e => e.id !== id);
    window.Sankalp.saveState();
    this.render();
    window.Sankalp.showToast('🗑️ Calendar event deleted', 'info');
  },

  editEvent(id) {
    const event = window.Sankalp.state.calendarEvents.find(e => e.id === id);
    if (!event) return;

    const modal = document.getElementById('calendar-event-modal');
    if (!modal) return;

    document.getElementById('calendar-event-id').value = event.id;
    document.getElementById('calendar-event-title').value = event.title;
    document.getElementById('calendar-event-date').value = event.date;
    document.getElementById('calendar-event-time').value = event.time || '';
    document.getElementById('calendar-event-type').value = event.type;
    document.getElementById('calendar-event-desc').value = event.description || '';

    document.getElementById('calendar-modal-title').textContent = "Modify Calendar Event";
    modal.classList.add('active-modal');
  },

  // Interfacing directly with SankalpTasks
  toggleTask(taskId) {
    if (window.SankalpTasks) {
      window.SankalpTasks.toggleTaskCompletion(taskId);
      // Wait a moment for tasks.js state save and refresh, then refresh calendar
      setTimeout(() => this.render(), 100);
    }
  },

  deleteTask(taskId) {
    if (window.SankalpTasks) {
      window.SankalpTasks.deleteTask(taskId);
      setTimeout(() => this.render(), 100);
    }
  },

  // Interfacing directly with SankalpStudy
  toggleStudy(planId) {
    if (window.SankalpStudy) {
      window.SankalpStudy.toggleCompletion(planId);
      setTimeout(() => this.render(), 100);
    }
  },

  deleteStudy(planId) {
    if (window.SankalpStudy) {
      window.SankalpStudy.deletePlan(planId);
      setTimeout(() => this.render(), 100);
    }
  }
};
