// store.js
// REST API database Client mapping frontend calls to MongoDB via a memory cache for instant responsiveness.

// Dynamically sets the backend server target: uses relative URL when hosted locally, and points to Render backend URL when hosted on Vercel.
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.location.port === '5500' ? 'http://localhost:3000' : '')
  : 'https://ai-aptitude1.onrender.com'; // Deployed Render backend Web Service URL

function fetchApi(path, options) {
  return fetch(`${API_BASE}${path}`, options);
}

const AppStore = {
  _questions: [],
  _results: [],
  _students: [],
  _adminCredentials: { username: "admin", password: "admin" },
  _tournamentState: {},

  // --- Initialize & Server Sync ---
  init() {
    // Initialized at app bootstrap
  },

  async syncFromServer() {
    try {
      // 1. Fetch Admin credentials
      const adminRes = await fetchApi(`/api/auth/admin/credentials?t=${Date.now()}`);
      if (adminRes.ok) {
        this._adminCredentials = await adminRes.json();
      }

      // 2. Fetch Tournament state
      const tourRes = await fetchApi(`/api/tournament?t=${Date.now()}`);
      if (tourRes.ok) {
        this._tournamentState = await tourRes.json();
      }

      // 3. Fetch Questions bank
      const qRes = await fetchApi(`/api/questions?t=${Date.now()}`);
      if (qRes.ok) {
        this._questions = await qRes.json();
      }

      // 4. Fetch Results attempts logs
      const rRes = await fetchApi(`/api/results?t=${Date.now()}`);
      if (rRes.ok) {
        this._results = await rRes.json();
      }

      console.log('Database synchronization completed successfully.');
    } catch (err) {
      console.error('Failed to sync data from server:', err);
    }
  },

  async fetchResults() {
    try {
      const rRes = await fetchApi(`/api/results?t=${Date.now()}`);
      if (rRes.ok) {
        this._results = await rRes.json();
      }
    } catch (err) {
      console.error('Failed to fetch results from server:', err);
    }
  },

  async fetchTournamentState() {
    try {
      const tourRes = await fetchApi(`/api/tournament?t=${Date.now()}`);
      if (tourRes.ok) {
        this._tournamentState = await tourRes.json();
      }
    } catch (err) {
      console.error('Failed to fetch tournament state from server:', err);
    }
  },

  async fetchStudents() {
    try {
      const sRes = await fetchApi(`/api/admin/students?t=${Date.now()}`);
      if (sRes.ok) {
        this._students = await sRes.json();
      }
    } catch (err) {
      console.error('Failed to fetch registered students list:', err);
    }
  },

  getStudents() {
    return this._students;
  },

  // --- Tournament State Management ---
  getTournamentState(dept) {
    if (!this._tournamentState) {
      this._tournamentState = {};
    }
    
    // Auto-resolve department
    let targetDept = dept;
    if (!targetDept) {
      const user = this.getCurrentUser();
      if (user && user.role === 'student' && user.department) {
        targetDept = user.department;
      } else {
        targetDept = 'IT';
      }
    }
    targetDept = targetDept.toUpperCase();
    
    if (!this._tournamentState[targetDept]) {
      this._tournamentState[targetDept] = {
        department: targetDept,
        activeRound: 1,
        qualifiedForRound2: [],
        qualifiedForRound3: [],
        winners: [],
        roundDurationLimit: 10,
        round1Name: "Round 1",
        round2Name: "Round 2",
        round3Name: "Round 3",
        institutionName: "Ganadipathy Tulsi's Jain Engineering College",
        departmentName: targetDept === 'IT' ? 'Department of Information Technology' : (targetDept === 'AIDS' ? 'Department of Artificial Intelligence and Data Science' : 'Department of Computer Science and Business Systems')
      };
    }
    return this._tournamentState[targetDept];
  },

  async saveTournamentState(state) {
    if (!state.department) {
      state.department = 'IT';
    }
    const dept = state.department.toUpperCase();
    this._tournamentState[dept] = state;
    try {
      const res = await fetchApi('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      if (res.ok) {
        const saved = await res.json();
        this._tournamentState[dept] = saved;
      }
    } catch (err) {
      console.error('Failed to save tournament state:', err);
    }
  },

  async resetTournament(dept) {
    const targetDept = dept ? dept.toUpperCase() : 'IT';
    if (this._tournamentState[targetDept]) {
      this._tournamentState[targetDept].activeRound = 1;
      this._tournamentState[targetDept].qualifiedForRound2 = [];
      this._tournamentState[targetDept].qualifiedForRound3 = [];
      this._tournamentState[targetDept].winners = [];
    }
    try {
      await fetchApi(`/api/tournament/reset?department=${targetDept}`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to reset tournament database:', err);
    }
  },

  async resetAllTournaments() {
    const DEPARTMENTS = ['IT', 'AIDS', 'CSBS'];
    for (const dept of DEPARTMENTS) {
      if (this._tournamentState[dept]) {
        this._tournamentState[dept].activeRound = 1;
        this._tournamentState[dept].qualifiedForRound2 = [];
        this._tournamentState[dept].qualifiedForRound3 = [];
        this._tournamentState[dept].winners = [];
      }
    }
    try {
      await fetchApi('/api/tournament/reset-all', { method: 'POST' });
    } catch (err) {
      console.error('Failed to reset all tournaments:', err);
    }
  },

  async resetStudents(dept) {
    const targetDept = dept ? dept.toUpperCase() : 'IT';
    try {
      const res = await fetchApi(`/api/students/reset?department=${targetDept}`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.error('Failed to reset registered students:', err);
      return false;
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

  async authenticateStudent(username, regNo, department, year) {
    const res = await fetchApi('/api/auth/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, regNo, department, year })
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  },

  async fetchStudentQuestions(regNo, department) {
    const res = await fetchApi(`/api/student/questions?regNo=${encodeURIComponent(regNo)}&department=${encodeURIComponent(department)}&t=${Date.now()}`);
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to fetch assessment questions.');
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
