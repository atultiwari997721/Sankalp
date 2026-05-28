// Sankalp Saarthi AI Study Guide Chatbot Logic (saarthi.js)

window.SankalpSaarthi = {
  currentGeneratedPlans: [],

  init() {
    this.setupListeners();
    this.checkSavedApiKey();
    this.appendInitialGreeting();
  },

  setupListeners() {
    const chatForm = document.getElementById('saarthi-chat-form');
    const apiToggleBtn = document.getElementById('toggle-key-settings-btn');
    const apiKeySaveBtn = document.getElementById('save-api-key-btn');
    const importBtn = document.getElementById('import-roadmap-btn');

    // Toggle API settings panel
    if (apiToggleBtn) {
      apiToggleBtn.addEventListener('click', () => {
        const panel = document.getElementById('api-key-settings-panel');
        if (panel) {
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    // Save API key
    if (apiKeySaveBtn) {
      apiKeySaveBtn.addEventListener('click', () => {
        const keyInput = document.getElementById('saarthi-api-key-input');
        if (keyInput) {
          const key = keyInput.value.trim();
          if (key) {
            localStorage.setItem('saarthi_api_key', key);
            window.Sankalp.showToast('🗝️ Gemini API Key saved locally.', 'success');
            document.getElementById('api-key-settings-panel').style.display = 'none';
          } else {
            localStorage.removeItem('saarthi_api_key');
            window.Sankalp.showToast('🗝️ API Key removed. Using local fallback.', 'info');
          }
        }
      });
    }

    // Suggestion Chips Auto-Fill
    const suggestionChips = document.querySelectorAll('.chip-suggestion');
    suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        const subject = chip.getAttribute('data-subject');
        const days = chip.getAttribute('data-days');

        document.getElementById('saarthi-input').value = prompt;
        document.getElementById('saarthi-subject').value = subject;
        document.getElementById('saarthi-days').value = days;

        // Auto submit
        this.submitUserQuery();
      });
    });

    // Chat submit
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitUserQuery();
      });
    }

    // Import roadmap
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importRoadmapPlans());
    }
  },

  checkSavedApiKey() {
    const key = localStorage.getItem('saarthi_api_key');
    const keyInput = document.getElementById('saarthi-api-key-input');
    if (key && keyInput) {
      keyInput.value = key;
    }
  },

  appendInitialGreeting() {
    const chatMessages = document.getElementById('saarthi-chat-messages');
    if (!chatMessages) return;
    chatMessages.innerHTML = ''; // Reset

    this.appendMessage('bot', `👋 Hello student! I am **Saarthi**, your personal AI study assistant.
    
    Paste your **syllabus** or describe your learning target in the input box, choose the subject and number of days, and I will structure a custom daily roadmap with resources (lectures, notes, practice Q&A) that you can import directly into your Study Planner!`);
  },

  appendMessage(sender, text) {
    const chatMessages = document.getElementById('saarthi-chat-messages');
    if (!chatMessages) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble bubble-${sender}`;
    
    // Parse simple markdown-like double asterisks for bold text
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    bubble.innerHTML = `
      <div class="bubble-sender-icon">${sender === 'bot' ? '🧠' : '👤'}</div>
      <div class="bubble-text">${formattedText}</div>
    `;

    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  showTypingIndicator() {
    const chatMessages = document.getElementById('saarthi-chat-messages');
    if (!chatMessages) return;

    const loader = document.createElement('div');
    loader.id = 'saarthi-typing-loader';
    loader.className = 'chat-bubble bubble-bot typing-indicator';
    loader.innerHTML = `
      <div class="bubble-sender-icon">🧠</div>
      <div class="bubble-text">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    `;

    chatMessages.appendChild(loader);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  hideTypingIndicator() {
    const loader = document.getElementById('saarthi-typing-loader');
    if (loader) loader.remove();
  },

  async submitUserQuery() {
    const promptInput = document.getElementById('saarthi-input');
    const subjectInput = document.getElementById('saarthi-subject');
    const daysInput = document.getElementById('saarthi-days');

    const prompt = promptInput.value.trim();
    const subject = subjectInput.value;
    const days = parseInt(daysInput.value) || 10;

    if (!prompt) return;

    // Clear inputs
    promptInput.value = '';

    // Append user query message
    this.appendMessage('user', `Syllabus Plan: "${prompt}" in ${days} days for ${subject}`);
    this.showTypingIndicator();

    // Hide previous roadmap if any
    document.getElementById('saarthi-roadmap-card').style.display = 'none';

    try {
      const apiKey = localStorage.getItem('saarthi_api_key') || '';
      
      const res = await fetch('/api/saarthi/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, subject, days, apiKey })
      });

      const data = await res.json();
      this.hideTypingIndicator();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate study roadmap');
      }

      this.currentGeneratedPlans = data.plans || [];
      this.appendMessage('bot', `💡 I have successfully structured a custom **${days}-day study roadmap** for **${subject}**! Check out the preview deck on the right and click "Add to Study Planner" to schedule it.`);
      this.renderRoadmapPreview();

    } catch (err) {
      this.hideTypingIndicator();
      this.appendMessage('bot', `❌ Sorry, I encountered an error: **${err.message}**. If you are using the Gemini model, verify your API Key in Settings.`);
      window.Sankalp.showToast('⚠️ AI roadmap generation failed.', 'danger');
    }
  },

  renderRoadmapPreview() {
    const deck = document.getElementById('saarthi-roadmap-deck');
    const cardPanel = document.getElementById('saarthi-roadmap-card');
    if (!deck || !cardPanel) return;

    deck.innerHTML = '';
    
    if (this.currentGeneratedPlans.length === 0) {
      cardPanel.style.display = 'none';
      return;
    }

    cardPanel.style.display = 'block';

    this.currentGeneratedPlans.forEach(plan => {
      const item = document.createElement('div');
      item.className = 'roadmap-scroll-item glass-panel';
      
      let subtasksListHtml = '';
      if (plan.subtasks && plan.subtasks.length > 0) {
        subtasksListHtml = `
          <ul class="roadmap-subtask-list">
            ${plan.subtasks.map(s => `<li>&bull; ${s}</li>`).join('')}
          </ul>
        `;
      }

      item.innerHTML = `
        <div class="roadmap-item-header">
          <span class="roadmap-item-day">Day ${plan.day}</span>
          <span class="roadmap-item-hours">${plan.hours} hrs</span>
        </div>
        <h4 class="roadmap-item-topic">${plan.topic}</h4>
        ${subtasksListHtml}
      `;
      deck.appendChild(item);
    });
  },

  importRoadmapPlans() {
    if (this.currentGeneratedPlans.length === 0) return;

    if (!window.Sankalp.state.studyPlans) {
      window.Sankalp.state.studyPlans = [];
    }

    // Map plans to date objects starting today
    const today = new Date();
    
    this.currentGeneratedPlans.forEach((plan, idx) => {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + idx); // today, tomorrow, etc.
      
      const newPlan = {
        id: `study-${Date.now()}-${idx}`,
        subject: plan.subject,
        topic: plan.topic,
        date: targetDate.toISOString().split('T')[0],
        hours: plan.hours || 2,
        completed: false,
        subtasks: (plan.subtasks || []).map(s => ({
          title: s,
          completed: false
        }))
      };

      window.Sankalp.state.studyPlans.push(newPlan);
    });

    window.Sankalp.saveState();
    
    // Refresh Dashboard study summaries
    if (window.SankalpStudy) {
      window.SankalpStudy.renderDashboardSummary();
    }

    window.Sankalp.showToast('📚 Study schedule loaded into your planner!', 'success');
    window.Sankalp.switchView('study');

    // Reset preview
    this.currentGeneratedPlans = [];
    document.getElementById('saarthi-roadmap-card').style.display = 'none';
  }
};
