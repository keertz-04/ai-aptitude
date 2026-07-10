// store.js
// REST API database Client mapping frontend calls to MongoDB via a memory cache for instant responsiveness.

// Dynamically sets the backend server target: uses relative URL when hosted locally, and points to Render backend URL when hosted on Vercel.
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.location.port === '5500' ? 'http://localhost:3000' : '')
  : 'https://ai-aptitude-e6lj.onrender.com'; // User's deployed Render backend URL

function fetchApi(path, options) {
  return fetch(`${API_BASE}${path}`, options);
}

const AppStore = {
  _questions: [],
  _results: [],
  _adminCredentials: { username: "admin", password: "admin" },
  _tournamentState: { activeRound: 1, qualifiedForRound2: [], qualifiedForRound3: [], winners: [] },

  // --- Initialize & Server Sync ---
  init() {
    // Initialized at app bootstrap
  },

  async syncFromServer() {
    try {
      // 1. Fetch Admin credentials
      const adminRes = await fetchApi('/api/auth/admin/credentials');
      if (adminRes.ok) {
        this._adminCredentials = await adminRes.json();
      }

      // 2. Fetch Tournament state
      const tourRes = await fetchApi('/api/tournament');
      if (tourRes.ok) {
        this._tournamentState = await tourRes.json();
      }

      // 3. Fetch Questions bank
      const qRes = await fetchApi('/api/questions');
      if (qRes.ok) {
        this._questions = await qRes.json();
      }

      // 4. Fetch Results attempts logs
      const rRes = await fetchApi('/api/results');
      if (rRes.ok) {
        this._results = await rRes.json();
      }

      console.log('Database synchronization completed successfully.');
    } catch (err) {
      console.error('Failed to sync data from server:', err);
    }
  },

  // --- Tournament State Management ---
  getTournamentState() {
    return this._tournamentState;
  },

  async saveTournamentState(state) {
    this._tournamentState = state;
    try {
      const res = await fetchApi('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      if (res.ok) {
        this._tournamentState = await res.json();
      }
    } catch (err) {
      console.error('Failed to save tournament state:', err);
    }
  },

  async resetTournament() {
    this._tournamentState = {
      activeRound: 1,
      qualifiedForRound2: [],
      qualifiedForRound3: [],
      winners: []
    };
    this._results = [];
    try {
      await fetchApi('/api/tournament/reset', { method: 'POST' });
    } catch (err) {
      console.error('Failed to reset tournament database:', err);
    }
  },

  // --- Questions CRUD ---
  getQuestions() {
    return this._questions;
  },

  async addQuestion(questionData) {
    try {
      const res = await fetchApi('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      });
      if (res.ok) {
        const saved = await res.json();
        this._questions.push(saved);
        return saved;
      }
    } catch (err) {
      console.error('Failed to add question:', err);
    }
  },

  async updateQuestion(id, updatedData) {
    // Map local ID properties or mongo _id
    const qIndex = this._questions.findIndex(q => q.id === id || q._id === id);
    if (qIndex === -1) return false;
    
    const dbId = this._questions[qIndex]._id || id;
    
    // Update local cache
    this._questions[qIndex] = { ...this._questions[qIndex], ...updatedData };

    try {
      const res = await fetchApi(`/api/questions/${dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        this._questions[qIndex] = await res.json();
        return true;
      }
    } catch (err) {
      console.error('Failed to update question:', err);
    }
    return false;
  },

  async deleteQuestion(id) {
    const qIndex = this._questions.findIndex(q => q.id === id || q._id === id);
    if (qIndex === -1) return;

    const dbId = this._questions[qIndex]._id || id;
    this._questions.splice(qIndex, 1);

    try {
      await fetchApi(`/api/questions/${dbId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  },

  async resetQuestions() {
    try {
      const res = await fetchApi('/api/setup/reset-defaults', { method: 'POST' });
      if (res.ok) {
        const qRes = await fetchApi('/api/questions');
        if (qRes.ok) {
          this._questions = await qRes.json();
        }
      }
    } catch (err) {
      console.error('Failed to reset questions database:', err);
    }
  },

  // --- Results CRUD ---
  getResults() {
    return this._results;
  },

  async saveResult(result) {
    try {
      const res = await fetchApi('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
      if (res.ok) {
        const saved = await res.json();
        this._results.push(saved);
        return saved;
      }
    } catch (err) {
      console.error('Failed to save result:', err);
    }
    
    // Fallback locally
    const fallback = { id: 'fallback_' + Date.now(), timestamp: new Date().toISOString(), ...result };
    this._results.push(fallback);
    return fallback;
  },

  async clearResults() {
    this._results = [];
    try {
      await fetchApi('/api/results', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear results logs:', err);
    }
  },

  // --- Session Management ---
  getCurrentUser() {
    const userStr = sessionStorage.getItem("ai_aptitude_current_user");
    return userStr ? JSON.parse(userStr) : null;
  },

  setCurrentUser(user) {
    if (user) {
      sessionStorage.setItem("ai_aptitude_current_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("ai_aptitude_current_user");
    }
  },

  // --- Student Management & Authentication ---
  async registerStudent(username, password) {
    const res = await fetchApi('/api/auth/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Student registration failed.');
    }
    return data;
  },

  async authenticateStudent(username, regNo) {
    const res = await fetchApi('/api/auth/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, regNo })
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  },

  // --- Admin Credentials Management ---
  getAdminCredentials() {
    return this._adminCredentials;
  },

  async saveAdminCredentials(creds) {
    this._adminCredentials = creds;
    try {
      await fetchApi('/api/auth/admin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });
    } catch (err) {
      console.error('Failed to update admin credentials:', err);
    }
  }
};

window.AppStore = AppStore;
