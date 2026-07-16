// admin.js
// Handles admin controls: Question Bank CRUD, tournament leaderboards, progression logic, and statistics.

const AdminPortal = {
  currentTab: "questions",
  editingQuestionId: null,

  getRoundName(roundNum) {
    const state = window.AppStore.getTournamentState();
    if (!state) return `Round ${roundNum}`;
    if (roundNum === 1) return state.round1Name || "Round 1";
    if (roundNum === 2) return state.round2Name || "Round 2";
    if (roundNum === 3) return state.round3Name || "Round 3";
    return `Round ${roundNum}`;
  },

  initDashboard() {
    this.renderStats();
    this.switchTab(this.currentTab);
  },

  switchTab(tabId) {
    this.currentTab = tabId;
    
    // Toggle active tab buttons
    document.querySelectorAll(".tab-btn").forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Toggle active sections
    document.querySelectorAll(".admin-content-section").forEach(sec => {
      if (sec.id === `admin-sec-${tabId}`) {
        sec.classList.add("active");
      } else {
        sec.classList.remove("active");
      }
    });

    // Render tab specific content
    if (tabId === "questions") {
      this.renderQuestionsList();
    } else if (tabId === "results") {
      this.renderStudentResults();
    } else if (tabId === "tournament") {
      this.renderTournamentTab();
    } else if (tabId === "settings") {
      const creds = window.AppStore.getAdminCredentials();
      document.getElementById("setting-admin-username").value = creds.username;
      document.getElementById("setting-admin-password").value = creds.password;
    }
  },

  renderStats() {
    const questions = window.AppStore.getQuestions();
    const results = window.AppStore.getResults();

    const totalQuestions = questions.length;
    const totalAttempts = results.length;
    let avgScore = 0;
    let highestScore = 0;

    if (totalAttempts > 0) {
      const sum = results.reduce((acc, curr) => acc + curr.accuracy, 0);
      avgScore = Math.round(sum / totalAttempts);
      highestScore = Math.round(Math.max(...results.map(r => r.accuracy)));
    }

    document.getElementById("admin-stat-questions").textContent = totalQuestions;
    document.getElementById("admin-stat-attempts").textContent = totalAttempts;
    document.getElementById("admin-stat-avg-score").textContent = avgScore + "%";
    document.getElementById("admin-stat-high-score").textContent = highestScore + "%";
  },

  // --- Questions Management ---
  renderQuestionsList() {
    const tableBody = document.getElementById("admin-questions-tbody");
    tableBody.innerHTML = "";

    const questions = window.AppStore.getQuestions();
    if (questions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <p>No questions found in bank. Add a question or reset to default questions.</p>
          </td>
        </tr>
      `;
      return;
    }

    questions.forEach((q, idx) => {
      const row = document.createElement("tr");
      
      const catClass = `cat-${q.category.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const questionSnippet = q.question.length > 50 ? q.question.substring(0, 47) + "..." : q.question;
      const correctOption = q.options[q.correct] || "Invalid index";
      const qRound = q.round || 1;

      row.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td><span class="cat-badge ${catClass}">${q.category}</span></td>
        <td><span class="score-badge" style="background:rgba(255,255,255,0.05); color:white; border-color:rgba(255,255,255,0.1)">${this.getRoundName(qRound)}</span></td>
        <td title="${q.question}">${questionSnippet}</td>
        <td title="Correct Option: ${correctOption}">${correctOption}</td>
        <td>
          <div class="action-btns-cell">
            <button class="btn btn-secondary btn-sm" onclick="AdminPortal.openEditQuestionModal('${q._id || q.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="AdminPortal.deleteQuestion('${q._id || q.id}')">Delete</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  deleteQuestion(id) {
    window.showCustomConfirm(
      "Delete Question",
      "Are you sure you want to delete this question?",
      () => {
        window.AppStore.deleteQuestion(id);
        this.renderQuestionsList();
        this.renderStats();
      }
    );
  },

  resetToDefaultQuestions() {
    window.showCustomConfirm(
      "Reset Questions",
      "This will overwrite existing questions with the standard preloaded set. Proceed?",
      () => {
        window.AppStore.resetQuestions();
        this.renderQuestionsList();
        this.renderStats();
      }
    );
  },

  // --- Question Modal Actions ---
  openAddQuestionModal() {
    this.editingQuestionId = null;
    document.getElementById("modal-q-title").textContent = "Add New Question";
    document.getElementById("question-form").reset();
    this.toggleModal("question-modal", true);
  },

  openEditQuestionModal(id) {
    const questions = window.AppStore.getQuestions();
    const q = questions.find(item => item._id === id || item.id === id);
    if (!q) return;

    this.editingQuestionId = id;
    document.getElementById("modal-q-title").textContent = "Edit Question";
    
    // Fill Form
    document.getElementById("q-category").value = q.category;
    document.getElementById("q-round").value = q.round || 1;
    document.getElementById("q-text").value = q.question;
    document.getElementById("q-opt0").value = q.options[0] || "";
    document.getElementById("q-opt1").value = q.options[1] || "";
    document.getElementById("q-opt2").value = q.options[2] || "";
    document.getElementById("q-opt3").value = q.options[3] || "";
    document.getElementById("q-correct").value = q.correct;
    document.getElementById("q-explanation").value = q.explanation || "";

    this.toggleModal("question-modal", true);
  },

  saveQuestion(event) {
    event.preventDefault();
    
    const category = document.getElementById("q-category").value;
    const round = parseInt(document.getElementById("q-round").value, 10);
    const questionText = document.getElementById("q-text").value.trim();
    const opt0 = document.getElementById("q-opt0").value.trim();
    const opt1 = document.getElementById("q-opt1").value.trim();
    const opt2 = document.getElementById("q-opt2").value.trim();
    const opt3 = document.getElementById("q-opt3").value.trim();
    const correctIndex = parseInt(document.getElementById("q-correct").value, 10);
    const explanation = document.getElementById("q-explanation").value.trim();

    if (!questionText || !opt0 || !opt1 || !opt2 || !opt3) {
      window.showCustomAlert("Validation Alert", "All fields including all 4 options are required.");
      return;
    }

    const questionData = {
      category,
      round,
      question: questionText,
      options: [opt0, opt1, opt2, opt3],
      correct: correctIndex,
      explanation
    };

    if (this.editingQuestionId) {
      window.AppStore.updateQuestion(this.editingQuestionId, questionData);
    } else {
      window.AppStore.addQuestion(questionData);
    }

    this.toggleModal("question-modal", false);
    this.renderQuestionsList();
    this.renderStats();
  },

  // --- Student Results Management ---
  renderStudentResults() {
    const tableBody = document.getElementById("admin-results-tbody");
    tableBody.innerHTML = "";

    const results = window.AppStore.getResults().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (results.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <p>No student evaluation records found.</p>
          </td>
        </tr>
      `;
      return;
    }

    results.forEach(res => {
      const dateStr = new Date(res.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const row = document.createElement("tr");
      row.style.cursor = "pointer";
      row.onclick = () => window.StudentPortal.showResults(res.id || res._id);

      const violationText = res.violations > 0 
        ? `<span style="color: var(--neon-pink); font-weight: bold;">${res.violations} ⚠️</span>`
        : `<span style="color: var(--text-muted); opacity: 0.6;">0</span>`;

      row.innerHTML = `
        <td><strong>${res.studentName}</strong></td>
        <td>${dateStr}</td>
        <td>${this.getRoundName(res.round)}</td>
        <td>${res.cognitiveProfile || "Balanced Thinker"}</td>
        <td><span class="score-badge">${res.score}/${res.total} (${Math.round(res.accuracy)}%)</span></td>
        <td>${res.timeTakenSeconds}s</td>
        <td>${violationText}</td>
      `;
      tableBody.appendChild(row);
    });
  },

  clearAllResults() {
    window.showCustomConfirm(
      "Clear All Results",
      "Are you sure you want to wipe all student testing records? This cannot be undone.",
      () => {
        window.AppStore.clearResults();
        this.renderStudentResults();
        this.renderStats();
      }
    );
  },

  // --- Tournament Management Panel ---
  renderTournamentTab() {
    const state = window.AppStore.getTournamentState();
    const results = window.AppStore.getResults();

    document.getElementById("tour-active-round-label").textContent = this.getRoundName(state.activeRound);
    
    const durationInput = document.getElementById("tour-round-duration");
    if (durationInput) {
      durationInput.value = state.roundDurationLimit || 10;
    }

    const r1Input = document.getElementById("tour-round1-name");
    const r2Input = document.getElementById("tour-round2-name");
    const r3Input = document.getElementById("tour-round3-name");
    if (r1Input) r1Input.value = state.round1Name || "Round 1";
    if (r2Input) r2Input.value = state.round2Name || "Round 2";
    if (r3Input) r3Input.value = state.round3Name || "Round 3";

    const opt1 = document.getElementById("q-round-opt-1");
    const opt2 = document.getElementById("q-round-opt-2");
    const opt3 = document.getElementById("q-round-opt-3");
    if (opt1) opt1.textContent = `${this.getRoundName(1)} (General Aptitude)`;
    if (opt2) opt2.textContent = `${this.getRoundName(2)} (Tech & Logic)`;
    if (opt3) opt3.textContent = `${this.getRoundName(3)} (Systems & AI)`;
    
    const panelWrap = document.getElementById("tour-controls-wrap");
    panelWrap.innerHTML = "";

    // Conclude active round button render
    if (state.winners && state.winners.length > 0) {
      panelWrap.innerHTML = `
        <div style="background: rgba(20, 184, 166, 0.1); border: 1px solid rgba(20, 184, 166, 0.2); padding: 20px; border-radius: var(--radius-sm); text-align: center; margin-bottom: 24px;">
          <h4 style="color: var(--neon-teal); font-size: 1.2rem; margin-bottom: 8px;">👑 Tournament Completed</h4>
          <p>The final winners have been evaluated and locked. You can reset the tournament below to restart.</p>
        </div>
      `;
    } else {
      const btnText = state.activeRound === 3 ? "Conclude Tournament & Declare Winners 👑" : `Conclude ${this.getRoundName(state.activeRound)} (Promote Top 50%) ➔`;
      panelWrap.innerHTML = `
        <div class="mb-24 flex-between" style="flex-wrap: wrap; gap: 16px; background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.1); padding: 20px; border-radius: var(--radius-sm);">
          <div>
            <h4>Execute Phase Conclusion</h4>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">Conclude testing. The top half of students will qualify for the next round.</p>
          </div>
          <button class="btn btn-teal" onclick="AdminPortal.concludeActiveRound()">${btnText}</button>
        </div>
      `;
    }

    // Render Leaders / Results for the Active Round
    this.renderTournamentLeaderboard(state, results);
  },

  renderTournamentLeaderboard(state, results) {
    const leaderTbody = document.getElementById("tour-leaderboard-tbody");
    leaderTbody.innerHTML = "";

    const activeRound = state.activeRound;
    
    // Get attempts matching the active round
    const roundAttempts = results.filter(r => r.round === activeRound);

    // Filter to keep only the highest scoring attempt per student (if duplicates exist)
    const uniqueStudentAttempts = {};
    roundAttempts.forEach(att => {
      const nameKey = att.studentName.toLowerCase();
      if (!uniqueStudentAttempts[nameKey] || att.score > uniqueStudentAttempts[nameKey].score) {
        uniqueStudentAttempts[nameKey] = att;
      }
    });

    const sortedAttempts = Object.values(uniqueStudentAttempts).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeTakenSeconds - b.timeTakenSeconds; // Speed tie-breaker
    });

    if (sortedAttempts.length === 0) {
      leaderTbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <p>No students have taken the ${this.getRoundName(activeRound)} test yet.</p>
          </td>
        </tr>
      `;
      return;
    }

    // If tournament concluded, rank winners. Otherwise, compute threshold for qualification
    const thresholdCount = Math.ceil(sortedAttempts.length / 2);

    sortedAttempts.forEach((att, index) => {
      const rank = index + 1;
      const row = document.createElement("tr");

      let statusBadge = "";
      if (state.winners && state.winners.length > 0) {
        const winRecord = state.winners.find(w => w.username.toLowerCase() === att.studentName.toLowerCase());
        if (winRecord) {
          statusBadge = `<span class="score-badge" style="background:rgba(20,184,166,0.15); color:var(--neon-teal); border-color:var(--neon-teal)">Winner Rank #${winRecord.rank}</span>`;
        } else {
          statusBadge = `<span class="score-badge" style="background:rgba(255,255,255,0.02); color:var(--text-muted); border-color:rgba(255,255,255,0.05)">Finished</span>`;
        }
      } else {
        if (activeRound === 3) {
          statusBadge = rank <= 3 
            ? `<span class="score-badge" style="background:rgba(20, 184, 166, 0.15); color:var(--neon-teal);">Top 3 Winner Candidate</span>`
            : `<span class="score-badge" style="background:rgba(244,63,94,0.1); color:var(--neon-pink);">Eliminated candidate</span>`;
        } else {
          statusBadge = rank <= thresholdCount
            ? `<span class="score-badge" style="background:rgba(99,102,241,0.15); color:var(--neon-indigo);">Qualifying Candidate</span>`
            : `<span class="score-badge" style="background:rgba(244,63,94,0.1); color:var(--neon-pink);">Elimination zone</span>`;
        }
      }

      const nameDisplay = att.violations > 0 
        ? `<strong>${att.studentName}</strong> <span style="color:var(--neon-pink); font-size:0.8rem; font-weight:bold;" title="${att.violations} Cheat Violations">(${att.violations} ⚠️)</span>`
        : `<strong>${att.studentName}</strong>`;

      row.innerHTML = `
        <td><strong>#${rank}</strong></td>
        <td>${nameDisplay}</td>
        <td>${att.score}/${att.total} (${Math.round(att.accuracy)}%)</td>
        <td>${att.timeTakenSeconds}s</td>
        <td>${statusBadge}</td>
      `;
      leaderTbody.appendChild(row);
    });
  },

  async saveRoundSettings(event) {
    event.preventDefault();
    const durationLimit = parseInt(document.getElementById("tour-round-duration").value, 10);
    if (isNaN(durationLimit) || durationLimit < 1) {
      window.showCustomAlert("Validation Alert", "Please enter a valid duration (minimum 1 minute).");
      return;
    }
    const r1Name = document.getElementById("tour-round1-name").value.trim() || "Round 1";
    const r2Name = document.getElementById("tour-round2-name").value.trim() || "Round 2";
    const r3Name = document.getElementById("tour-round3-name").value.trim() || "Round 3";

    const state = window.AppStore.getTournamentState();
    state.roundDurationLimit = durationLimit;
    state.round1Name = r1Name;
    state.round2Name = r2Name;
    state.round3Name = r3Name;

    await window.AppStore.saveTournamentState(state);
    window.showCustomAlert("Settings Saved", "Round settings saved successfully!");
    this.renderTournamentTab();
  },

  concludeActiveRound() {
    const state = window.AppStore.getTournamentState();
    const results = window.AppStore.getResults();
    const activeRound = state.activeRound;

    // Filter attempts for the active round
    const roundAttempts = results.filter(r => r.round === activeRound);
    
    // Unique candidates
    const uniqueStudentAttempts = {};
    roundAttempts.forEach(att => {
      const nameKey = att.studentName.toLowerCase();
      if (!uniqueStudentAttempts[nameKey] || att.score > uniqueStudentAttempts[nameKey].score) {
        uniqueStudentAttempts[nameKey] = att;
      }
    });

    const sortedAttempts = Object.values(uniqueStudentAttempts).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeTakenSeconds - b.timeTakenSeconds;
    });

    if (sortedAttempts.length === 0) {
      window.showCustomAlert("Round Conclude Alert", `No student attempts recorded for ${this.getRoundName(activeRound)}. Cannot conclude the round.`);
      return;
    }

    if (activeRound === 1) {
      const countToQualify = Math.ceil(sortedAttempts.length / 2);
      const promoted = sortedAttempts.slice(0, countToQualify).map(a => a.studentName);
      
      state.qualifiedForRound2 = promoted;
      state.activeRound = 2;
      window.AppStore.saveTournamentState(state);

      window.showCustomAlert(`${this.getRoundName(1)} Concluded`, `${this.getRoundName(1)} Concluded! ${promoted.length} students advanced to ${this.getRoundName(2)}:<br><strong>${promoted.join(", ")}</strong>`);
    } else if (activeRound === 2) {
      const countToQualify = Math.ceil(sortedAttempts.length / 2);
      const promoted = sortedAttempts.slice(0, countToQualify).map(a => a.studentName);

      state.qualifiedForRound3 = promoted;
      state.activeRound = 3;
      window.AppStore.saveTournamentState(state);

      window.showCustomAlert(`${this.getRoundName(2)} Concluded`, `${this.getRoundName(2)} Concluded! ${promoted.length} students advanced to ${this.getRoundName(3)}:<br><strong>${promoted.join(", ")}</strong>`);
    } else if (activeRound === 3) {
      // Crown top 3 winners
      const winners = sortedAttempts.slice(0, 3).map((a, idx) => ({
        username: a.studentName,
        score: a.score,
        total: a.total,
        accuracy: a.accuracy,
        archetype: a.cognitiveProfile,
        rank: idx + 1
      }));

      state.winners = winners;
      window.AppStore.saveTournamentState(state);

      const winnerNames = winners.map(w => `#${w.rank}: ${w.username} (${w.accuracy}%)`).join("<br>");
      window.showCustomAlert("Tournament Completed", `Tournament Completed! Winners Declared:<br><strong>${winnerNames}</strong>`);
    }

    this.renderTournamentTab();
    this.renderStats();
  },

  resetTournament() {
    window.showCustomConfirm(
      "Reset Tournament",
      "Wipe all tournament states, current rounds, qualifications, and student results to restart?",
      () => {
        window.AppStore.resetTournament();
        this.switchTab("questions");
        this.renderStats();
        window.showCustomAlert("Tournament Reset", "Tournament state has been reset successfully. All students can now take Round 1.");
      }
    );
  },

  // --- JSON Import / Export ---
  exportQuestions() {
    const questions = window.AppStore.getQuestions();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "ai_aptitude_questions.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  triggerJsonImport() {
    document.getElementById("json-import-input").click();
  },

  importQuestionsFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) {
          throw new Error("JSON file must contain an array of questions.");
        }

        const valid = imported.every(q => 
          q.category && 
          q.question && 
          Array.isArray(q.options) && 
          q.options.length >= 2 &&
          typeof q.correct === "number"
        );

        if (!valid) {
          throw new Error("One or more questions are missing required fields (category, question, options, correct).");
        }

        const database = window.AppStore.getQuestions();
        
        imported.forEach(q => {
          database.push({
            id: "q_import_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(),
            category: q.category,
            round: q.round || 1, // support imported rounds
            question: q.question,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation || ""
          });
        });

        window.AppStore.saveQuestions(database);
        alert(`Successfully imported ${imported.length} questions into the bank!`);
        this.renderQuestionsList();
        this.renderStats();
      } catch (err) {
        alert("Failed to parse JSON file: " + err.message);
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  },

  updateAdminCredentials(event) {
    event.preventDefault();
    const user = document.getElementById("setting-admin-username").value.trim();
    const pass = document.getElementById("setting-admin-password").value;

    if (!user || !pass) {
      alert("Admin username and password cannot be empty.");
      return;
    }

    window.AppStore.saveAdminCredentials({ username: user, password: pass });
    alert("Administrator credentials updated successfully! These changes will apply next time you log in.");
  },

  // --- Helper: Toggle Modals ---
  toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (show) {
      modal.classList.add("active");
    } else {
      modal.classList.remove("active");
    }
  }
};

window.AdminPortal = AdminPortal;
