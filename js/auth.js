// Sankalp Authentication Controller (auth.js)

window.SankalpAuth = {
  currentUser: null,

  init() {
    this.setupListeners();
    this.checkSession();
  },

  setupListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('link-show-signup');
    const showLoginLink = document.getElementById('link-show-login');

    const authLoginCard = document.getElementById('auth-login-card');
    const authSignupCard = document.getElementById('auth-signup-card');

    if (showSignupLink && authLoginCard && authSignupCard) {
      showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        authLoginCard.style.display = 'none';
        authSignupCard.style.display = 'block';
      });
    }

    if (showLoginLink && authLoginCard && authSignupCard) {
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        authSignupCard.style.display = 'none';
        authLoginCard.style.display = 'block';
      });
    }

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) return;

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Login failed');
          }

          window.Sankalp.showToast(`🔑 Access Granted: Welcome back, ${data.username}!`, 'success');
          
          // Save session
          localStorage.setItem('sankalp_user', data.username);
          this.currentUser = data.username;

          // Hide Auth Screen
          document.getElementById('auth-screen-overlay').style.display = 'none';

          // Initialize/Reload App State
          await window.Sankalp.fetchState();
          window.Sankalp.renderDashboard();
          window.Sankalp.switchView('dashboard');
        } catch (err) {
          window.Sankalp.showToast(`⚠️ ${err.message}`, 'danger');
        }
      });
    }

    // Signup Form Submit
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        if (!username || !password) return;

        if (password !== confirmPassword) {
          window.Sankalp.showToast('⚠️ Passwords do not match.', 'danger');
          return;
        }

        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Registration failed');
          }

          window.Sankalp.showToast('🌱 Account created successfully! Please log in.', 'success');
          
          // Redirect to login tab
          authSignupCard.style.display = 'none';
          authLoginCard.style.display = 'block';
          
          // Pre-populate username
          document.getElementById('login-username').value = username;
          document.getElementById('login-password').value = '';
          document.getElementById('login-password').focus();
        } catch (err) {
          window.Sankalp.showToast(`⚠️ ${err.message}`, 'danger');
        }
      });
    }

    // Logout Button
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  },

  checkSession() {
    const user = localStorage.getItem('sankalp_user');
    const overlay = document.getElementById('auth-screen-overlay');

    if (user) {
      this.currentUser = user;
      if (overlay) overlay.style.display = 'none';
    } else {
      this.currentUser = null;
      if (overlay) overlay.style.display = 'flex';
      
      // Default views
      const authLoginCard = document.getElementById('auth-login-card');
      const authSignupCard = document.getElementById('auth-signup-card');
      if (authLoginCard) authLoginCard.style.display = 'block';
      if (authSignupCard) authSignupCard.style.display = 'none';
    }
  },

  logout() {
    localStorage.removeItem('sankalp_user');
    this.currentUser = null;
    
    // Stop any active timer and music
    if (window.SankalpTimer) {
      window.SankalpTimer.pauseTimer();
      window.SankalpTimer.stopSynth();
      document.querySelectorAll('.sound-card').forEach(c => c.classList.remove('active'));
    }

    // Stop Zen breathing
    if (window.SankalpZen) {
      window.SankalpZen.exitZenMode();
    }

    window.Sankalp.showToast('🔒 Logged out safely.', 'info');
    this.checkSession();
  }
};
