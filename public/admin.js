// admin.js
// Handles admin controls: Question Bank CRUD, tournament leaderboards, progression logic, and statistics.

const AdminPortal = {
  currentTab: "questions",
  selectedDepartment: "IT",
  editingQuestionId: null,

  getRoundName(roundNum) {
    const dept = this.selectedDepartment === "ALL" ? "IT" : this.selectedDepartment;
    const state = window.AppStore.getTournamentState(dept);
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

  async switchTab(tabId) {
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

    // Show/hide department selector globally based on active tab
    const selectorCard = document.getElementById("admin-global-dept-selector-card");
    if (selectorCard) {
      if (tabId === "results" || tabId === "tournament" || tabId === "students") {
        selectorCard.style.display = "flex";
      } else {
        selectorCard.style.display = "none";
      }
    }

    // Render tab specific content
    if (tabId === "questions") {
      this.renderQuestionsList();
    } else if (tabId === "results") {
      await window.AppStore.fetchResults();
      this.renderStudentResults();
      this.renderStats();
    } else if (tabId === "students") {
      await window.AppStore.fetchStudents();
      this.renderRegisteredStudents();
      this.renderStats();
    } else if (tabId === "tournament") {
      await window.AppStore.fetchTournamentState();
      if (this.selectedDepartment === "ALL") {
        document.getElementById("dept-overview-summary-container").style.display = "block";
        document.getElementById("tour-department-specific-card").style.display = "none";
        await this.renderAllDepartmentsSummary();
      } else {
        document.getElementById("dept-overview-summary-container").style.display = "none";
        document.getElementById("tour-department-specific-card").style.display = "block";
        this.renderTournamentTab();
      }
      this.renderStats();
    } else if (tabId === "settings") {
      const creds = window.AppStore.getAdminCredentials();
      document.getElementById("setting-admin-username").value = creds.username;
      document.getElementById("setting-admin-password").value = creds.password;
    }
  },

  renderStats() {
    const questions = window.AppStore.getQuestions();
    let results = window.AppStore.getResults();

    if (this.selectedDepartment !== "ALL") {
      results = results.filter(r => r.department === this.selectedDepartment);
    }

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

    const filterVal = document.getElementById("admin-q-round-filter") ? document.getElementById("admin-q-round-filter").value : "all";

    let questions = window.AppStore.getQuestions();
    
    // Apply filter
    if (filterVal !== "all") {
      const targetRound = parseInt(filterVal, 10);
      questions = questions.filter(q => q.round === targetRound);
    }

    if (questions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <p>No questions found in bank matching filter. Add a question or reset to default questions.</p>
          </td>
        </tr>
      `;
      return;
    }

    questions.forEach((q, idx) => {
      const row = document.createElement("tr");
      
      const catClass = `cat-${q.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const qRound = q.round || 1;
      const qType = q.questionType || "mcq";
      const qTypeLabel = qType === "image_connection" ? "Connections" : "MCQ";

      let questionSnippet = q.question.length > 50 ? q.question.substring(0, 47) + "..." : q.question;
      if (qType === "image_connection") {
        const imageCount = q.images ? q.images.filter(img => !!img).length : 0;
        questionSnippet = `🖼 ${imageCount} Images — ${questionSnippet}`;
      }

      let correctDisplay = "";
      if (qType === "image_connection") {
        correctDisplay = q.correctAnswerString || "";
      } else {
        correctDisplay = q.options && q.options[q.correct] !== undefined ? q.options[q.correct] : `Index ${q.correct}`;
      }

      // Styles for high-contrast badges in light theme
      const roundBadgeStyle = "background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.78rem;";
      
      const typeBadgeStyle = qType === "image_connection"
        ? "background: #ccfbf1; color: #115e59; border: 1px solid #99f6e4; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.78rem;"
        : "background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.78rem;";

      row.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td><span style="${roundBadgeStyle}">${this.getRoundName(qRound)}</span></td>
        <td><span style="${typeBadgeStyle}">${qTypeLabel}</span></td>
        <td title="${q.question}">${questionSnippet}</td>
        <td title="Correct Answer: ${correctDisplay}">${correctDisplay}</td>
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
  uploadedImages: [null, null, null],

  toggleQuestionTypeFields() {
    const roundVal = document.getElementById("q-round").value;
    const mcqDiv = document.getElementById("q-mcq-fields");
    const connDiv = document.getElementById("q-connections-fields");

    const opt0 = document.getElementById("q-opt0");
    const opt1 = document.getElementById("q-opt1");
    const opt2 = document.getElementById("q-opt2");
    const opt3 = document.getElementById("q-opt3");
    const correctText = document.getElementById("q-correct-text");

    if (roundVal === "2") {
      // Tech Connections
      mcqDiv.style.display = "none";
      connDiv.style.display = "block";
      
      opt0.removeAttribute("required");
      opt1.removeAttribute("required");
      opt2.removeAttribute("required");
      opt3.removeAttribute("required");
      correctText.setAttribute("required", "true");
    } else {
      // MCQ
      mcqDiv.style.display = "block";
      connDiv.style.display = "none";
      
      opt0.setAttribute("required", "true");
      opt1.setAttribute("required", "true");
      opt2.setAttribute("required", "true");
      opt3.setAttribute("required", "true");
      correctText.removeAttribute("required");
    }
  },

  previewImageFile(imgIndex) {
    const fileInput = document.getElementById(`q-img${imgIndex}-file`);
    const previewDiv = document.getElementById(`q-img${imgIndex}-preview`);
    const imgEl = document.getElementById(`q-img${imgIndex}-img`);
    const removeBtn = document.getElementById(`q-img${imgIndex}-remove`);

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        imgEl.src = base64;
        previewDiv.style.display = "block";
        removeBtn.style.display = "block";
        this.uploadedImages[imgIndex - 1] = base64;
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
  },

  removeImageFile(imgIndex) {
    const fileInput = document.getElementById(`q-img${imgIndex}-file`);
    const previewDiv = document.getElementById(`q-img${imgIndex}-preview`);
    const imgEl = document.getElementById(`q-img${imgIndex}-img`);
    const removeBtn = document.getElementById(`q-img${imgIndex}-remove`);

    if (fileInput) fileInput.value = "";
    if (imgEl) imgEl.src = "";
    if (previewDiv) previewDiv.style.display = "none";
    if (removeBtn) removeBtn.style.display = "none";
    this.uploadedImages[imgIndex - 1] = null;
  },

  openAddQuestionModal() {
    this.editingQuestionId = null;
    document.getElementById("modal-q-title").textContent = "Add New Question";
    document.getElementById("question-form").reset();
    
    this.uploadedImages = [null, null, null];
    for (let i = 1; i <= 3; i++) {
      this.removeImageFile(i);
    }

    // Set default target round to 1
    document.getElementById("q-round").value = "1";
    this.toggleQuestionTypeFields();

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
    
    this.uploadedImages = [null, null, null];
    for (let i = 1; i <= 3; i++) {
      this.removeImageFile(i);
    }

    if (q.questionType === "image_connection") {
      document.getElementById("q-correct-text").value = q.correctAnswerString || "";
      if (q.images && q.images.length > 0) {
        q.images.forEach((imgSrc, idx) => {
          if (imgSrc) {
            this.uploadedImages[idx] = imgSrc;
            const previewDiv = document.getElementById(`q-img${idx + 1}-preview`);
            const imgEl = document.getElementById(`q-img${idx + 1}-img`);
            const removeBtn = document.getElementById(`q-img${idx + 1}-remove`);
            if (imgEl) imgEl.src = imgSrc;
            if (previewDiv) previewDiv.style.display = "block";
            if (removeBtn) removeBtn.style.display = "block";
          }
        });
      }
    } else {
      document.getElementById("q-opt0").value = q.options && q.options[0] ? q.options[0] : "";
      document.getElementById("q-opt1").value = q.options && q.options[1] ? q.options[1] : "";
      document.getElementById("q-opt2").value = q.options && q.options[2] ? q.options[2] : "";
      document.getElementById("q-opt3").value = q.options && q.options[3] ? q.options[3] : "";
      document.getElementById("q-correct").value = q.correct !== undefined ? q.correct : 0;
    }

    this.toggleQuestionTypeFields();
    document.getElementById("q-explanation").value = q.explanation || "";

    this.toggleModal("question-modal", true);
  },

  async saveQuestion(event) {
    event.preventDefault();
    
    const category = document.getElementById("q-category").value;
    const round = parseInt(document.getElementById("q-round").value, 10);
    const questionText = document.getElementById("q-text").value.trim();
    const explanation = document.getElementById("q-explanation").value.trim();

    if (!questionText) {
      window.showCustomAlert("Validation Alert", "Question description is required.");
      return;
    }

    const questionData = {
      category,
      round,
      question: questionText,
      explanation
    };

    if (round === 2) {
      questionData.questionType = "image_connection";
      const correctAns = document.getElementById("q-correct-text").value.trim();
      if (!correctAns) {
        window.showCustomAlert("Validation Alert", "Correct answer string is required for Round 2.");
        return;
      }
      questionData.correctAnswerString = correctAns;
      
      questionData.images = this.uploadedImages.map(img => img || ""); // preserves indices or order without sending nulls
    } else {
      questionData.questionType = "mcq";
      const opt0 = document.getElementById("q-opt0").value.trim();
      const opt1 = document.getElementById("q-opt1").value.trim();
      const opt2 = document.getElementById("q-opt2").value.trim();
      const opt3 = document.getElementById("q-opt3").value.trim();
      const correctIndex = parseInt(document.getElementById("q-correct").value, 10);

      if (!opt0 || !opt1 || !opt2 || !opt3) {
        window.showCustomAlert("Validation Alert", "All 4 MCQ options are required.");
        return;
      }
      questionData.options = [opt0, opt1, opt2, opt3];
      questionData.correct = correctIndex;
    }

    let success = false;
    if (this.editingQuestionId) {
      success = await window.AppStore.updateQuestion(this.editingQuestionId, questionData);
    } else {
      const saved = await window.AppStore.addQuestion(questionData);
      success = !!saved;
    }

    if (success) {
      this.toggleModal("question-modal", false);
      this.renderQuestionsList();
      this.renderStats();
    } else {
      window.showCustomAlert("Error Alert", "Failed to save the question. Please verify your image size or server connectivity.");
    }
  },

  // --- Student Results Management ---
  renderStudentResults() {
    const tableBody = document.getElementById("admin-results-tbody");
    tableBody.innerHTML = "";

    let results = window.AppStore.getResults();
    if (this.selectedDepartment !== "ALL") {
      results = results.filter(r => r.department === this.selectedDepartment);
    }
    results = results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (results.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-state">
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

      // Calculate cumulative score across all rounds for this specific student
      const studentAllAttempts = window.AppStore.getResults().filter(r => 
        (res.regNo && r.regNo && r.regNo.toLowerCase() === res.regNo.toLowerCase()) || 
        r.studentName.toLowerCase() === res.studentName.toLowerCase()
      );
      const overallScore = studentAllAttempts.reduce((s, curr) => s + curr.score, 0);
      const overallTotal = studentAllAttempts.reduce((s, curr) => s + curr.total, 0);
      const overallPercent = overallTotal > 0 ? Math.round((overallScore / overallTotal) * 100) : 0;

      row.innerHTML = `
        <td><strong>${res.studentName}</strong></td>
        <td><span class="category-tag">${res.department || "IT"}</span></td>
        <td>${res.year || "2nd Year"}</td>
        <td>${dateStr}</td>
        <td>${this.getRoundName(res.round)}</td>
        <td><span class="score-badge">${res.score}/${res.total} (${Math.round(res.accuracy)}%)</span></td>
        <td><span class="score-badge" style="background: rgba(99, 102, 241, 0.15); color: var(--neon-indigo); border-color: var(--neon-indigo);">${overallPercent}%</span></td>
        <td>${res.timeTakenSeconds}s</td>
        <td>${violationText}</td>
      `;
      tableBody.appendChild(row);
    });
  },

  renderRegisteredStudents() {
    const tableBody = document.getElementById("admin-students-tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    let students = window.AppStore.getStudents();
    if (this.selectedDepartment !== "ALL") {
      students = students.filter(s => s.department === this.selectedDepartment);
    }
    students = students.sort((a, b) => a.username.localeCompare(b.username));

    if (students.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <p>No registered students found.</p>
          </td>
        </tr>
      `;
      return;
    }

    students.forEach(s => {
      const row = document.createElement("tr");
      
      let statusStyle = "";
      if (s.status.includes("Winner") || s.status.includes("🥇") || s.status.includes("🥈") || s.status.includes("🥉")) {
        statusStyle = "background: rgba(20, 184, 166, 0.15); color: var(--neon-teal); border: 1px solid var(--neon-teal);";
      } else if (s.status.includes("Eliminated")) {
        statusStyle = "background: rgba(244, 63, 94, 0.1); color: var(--neon-pink); border: 1px solid rgba(244, 63, 94, 0.2);";
      } else {
        statusStyle = "background: rgba(99, 102, 241, 0.15); color: var(--neon-indigo); border: 1px solid rgba(99, 102, 241, 0.2);";
      }

      row.innerHTML = `
        <td><strong>${s.username}</strong></td>
        <td><code>${s.regNo.toUpperCase()}</code></td>
        <td><span class="category-tag">${s.department}</span></td>
        <td>${s.year || "2nd Year"}</td>
        <td><span class="score-badge" style="${statusStyle}">${s.status}</span></td>
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

  clearStudentsDirectory() {
    const dept = this.selectedDepartment;
    const targetText = dept === "ALL" 
      ? "ALL departments (IT, AIDS, and CSBS)" 
      : `the ${dept} department`;

    window.showCustomConfirm(
      "Wipe Registered Students",
      `🚨 WARNING: Are you sure you want to delete all registered student profiles for ${targetText}? This will clear their credentials and profile entries. This action cannot be undone.`,
      async () => {
        const success = await window.AppStore.resetStudents(dept);
        if (success) {
          await window.AppStore.fetchStudents();
          this.renderRegisteredStudents();
          this.renderStats();
          window.showCustomAlert("Success", `Registered student directory for ${targetText} cleared successfully.`);
        } else {
          window.showCustomAlert("Error", "Failed to clear student directory.");
        }
      }
    );
  },

  // --- Tournament Management Panel ---
  renderTournamentTab() {
    const dept = this.selectedDepartment;
    const state = window.AppStore.getTournamentState(dept);
    const results = window.AppStore.getResults().filter(r => r.department === dept);

    document.getElementById("tour-active-round-label").textContent = this.getRoundName(state.activeRound);
    
    const r1Input = document.getElementById("tour-round1-name");
    const r2Input = document.getElementById("tour-round2-name");
    const r3Input = document.getElementById("tour-round3-name");
    if (r1Input) r1Input.value = state.round1Name || "General Tech Quiz";
    if (r2Input) r2Input.value = state.round2Name || "Tech Connections";
    if (r3Input) r3Input.value = state.round3Name || "Core Tech";

    const r1Dur = document.getElementById("tour-round1-duration");
    const r2Dur = document.getElementById("tour-round2-duration");
    const r3Dur = document.getElementById("tour-round3-duration");
    if (r1Dur) r1Dur.value = state.round1Duration || 10;
    if (r2Dur) r2Dur.value = state.round2Duration || 15;
    if (r3Dur) r3Dur.value = state.round3Duration || 10;

    const r1C = document.getElementById("tour-round1-correct");
    const r1N = document.getElementById("tour-round1-negative");
    const r2C = document.getElementById("tour-round2-correct");
    const r2N = document.getElementById("tour-round2-negative");
    const r3C = document.getElementById("tour-round3-correct");
    const r3N = document.getElementById("tour-round3-negative");

    if (r1C) r1C.value = state.round1CorrectMarks !== undefined ? state.round1CorrectMarks : 1;
    if (r1N) r1N.value = 0;
    if (r2C) r2C.value = state.round2CorrectMarks !== undefined ? state.round2CorrectMarks : 2;
    if (r2N) r2N.value = state.round2NegativeMarks !== undefined ? state.round2NegativeMarks : 1;
    if (r3C) r3C.value = state.round3CorrectMarks !== undefined ? state.round3CorrectMarks : 2;
    if (r3N) r3N.value = state.round3NegativeMarks !== undefined ? state.round3NegativeMarks : 1;

    const instInput = document.getElementById("tour-institution-name");
    const deptInput = document.getElementById("tour-department-name");
    if (instInput) instInput.value = state.institutionName || "Ganadipathy Tulsi's Jain Engineering College";
    if (deptInput) deptInput.value = state.departmentName || "Department of Information Technology";

    const opt1 = document.getElementById("q-round-opt-1");
    const opt2 = document.getElementById("q-round-opt-2");
    const opt3 = document.getElementById("q-round-opt-3");
    if (opt1) opt1.textContent = `Round 1 (General Tech Quiz)`;
    if (opt2) opt2.textContent = `Round 2 (Tech Connections)`;
    if (opt3) opt3.textContent = `Round 3 (Core Tech)`;
    
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
    const dept = this.selectedDepartment;
    
    const r1Name = document.getElementById("tour-round1-name").value.trim() || "General Tech Quiz";
    const r2Name = document.getElementById("tour-round2-name").value.trim() || "Tech Connections";
    const r3Name = document.getElementById("tour-round3-name").value.trim() || "Core Tech";

    const r1Duration = parseInt(document.getElementById("tour-round1-duration").value, 10) || 10;
    const r2Duration = parseInt(document.getElementById("tour-round2-duration").value, 10) || 15;
    const r3Duration = parseInt(document.getElementById("tour-round3-duration").value, 10) || 10;

    const r1CorrectMarks = parseInt(document.getElementById("tour-round1-correct").value, 10) || 1;
    const r2CorrectMarks = parseInt(document.getElementById("tour-round2-correct").value, 10) || 2;
    const r2NegativeMarks = parseInt(document.getElementById("tour-round2-negative").value, 10) || 1;
    const r3CorrectMarks = parseInt(document.getElementById("tour-round3-correct").value, 10) || 2;
    const r3NegativeMarks = parseInt(document.getElementById("tour-round3-negative").value, 10) || 1;

    const state = window.AppStore.getTournamentState(dept);
    
    state.round1Name = r1Name;
    state.round2Name = r2Name;
    state.round3Name = r3Name;
    
    state.round1Duration = r1Duration;
    state.round2Duration = r2Duration;
    state.round3Duration = r3Duration;
    
    // Fallback for general duration limit (active round duration)
    if (state.activeRound === 1) state.roundDurationLimit = r1Duration;
    else if (state.activeRound === 2) state.roundDurationLimit = r2Duration;
    else if (state.activeRound === 3) state.roundDurationLimit = r3Duration;

    state.round1CorrectMarks = r1CorrectMarks;
    state.round1NegativeMarks = 0; // always 0
    state.round2CorrectMarks = r2CorrectMarks;
    state.round2NegativeMarks = r2NegativeMarks;
    state.round3CorrectMarks = r3CorrectMarks;
    state.round3NegativeMarks = r3NegativeMarks;

    await window.AppStore.saveTournamentState(state);
    window.showCustomAlert("Settings Saved", `Round settings for ${dept} saved successfully!`);
    this.renderTournamentTab();
  },

  async saveBrandingSettings(event) {
    event.preventDefault();
    const dept = this.selectedDepartment;
    const instName = document.getElementById("tour-institution-name").value.trim() || "Ganadipathy Tulsi's Jain Engineering College";
    const deptName = document.getElementById("tour-department-name").value.trim() || "Department of Information Technology";

    const state = window.AppStore.getTournamentState(dept);
    state.institutionName = instName;
    state.departmentName = deptName;

    await window.AppStore.saveTournamentState(state);
    window.AppRouter.updateBranding();
    window.showCustomAlert("Branding Saved", `Branding settings for ${dept} saved successfully!`);
    this.renderTournamentTab();
  },

  async concludeActiveRound() {
    const dept = this.selectedDepartment;
    try {
      const res = await fetchApi('/api/tournament/conclude-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: dept })
      });

      if (!res.ok) {
        const data = await res.json();
        window.showCustomAlert("Error Concluding Round", data.error || "Failed to conclude round.");
        return;
      }

      const data = await res.json();
      window.AppStore._tournamentState[dept] = data.state;

      if (data.activeRound === 2 || data.activeRound === 3) {
        window.showCustomAlert(
          `${this.getRoundName(data.activeRound - 1)} Concluded`,
          `${this.getRoundName(data.activeRound - 1)} Concluded! ${data.promoted.length} students advanced to ${this.getRoundName(data.activeRound)}:<br><strong>${data.promoted.join(", ")}</strong>`
        );
      } else if (data.activeRound === 4) {
        const winnerNames = data.winners.map(w => `#${w.rank}: ${w.username} (${w.accuracy}%)`).join("<br>");
        window.showCustomAlert("Tournament Completed", `Tournament Completed! Winners Declared:<br><strong>${winnerNames}</strong>`);
      }

      this.renderTournamentTab();
      this.renderStats();
    } catch (err) {
      console.error('Failed to conclude round:', err);
      window.showCustomAlert("Error", "Server error concluding active round.");
    }
  },

  resetTournament() {
    const dept = this.selectedDepartment;
    window.showCustomConfirm(
      "Reset Department Tournament",
      `Are you sure you want to reset the tournament for <strong>${dept}</strong>? All student results and progress for ${dept} will be deleted. This cannot be undone.`,
      async () => {
        await window.AppStore.resetTournament(dept);
        window.showCustomAlert("Tournament Reset", `Tournament state for ${dept} has been reset successfully.`);
        this.renderTournamentTab();
        this.renderStats();
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

  async changeSelectedDept(dept) {
    this.selectedDepartment = dept;
    
    // Update active button state in the selector
    document.querySelectorAll(".dept-select-btn").forEach(btn => {
      if (btn.dataset.dept === dept) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Fetch latest results, states, and students from server in parallel
    await Promise.all([
      window.AppStore.fetchResults(),
      window.AppStore.fetchTournamentState(),
      window.AppStore.fetchStudents()
    ]);

    // Render the content depending on department selection
    if (dept === "ALL") {
      document.getElementById("dept-overview-summary-container").style.display = "block";
      document.getElementById("tour-department-specific-card").style.display = "none";
      await this.renderAllDepartmentsSummary();
    } else {
      document.getElementById("dept-overview-summary-container").style.display = "none";
      document.getElementById("tour-department-specific-card").style.display = "block";
      this.renderTournamentTab();
    }
    if (this.currentTab === "results") {
      this.renderStudentResults();
    } else if (this.currentTab === "students") {
      this.renderRegisteredStudents();
    }
    this.renderStats();
  },

  async renderAllDepartmentsSummary() {
    try {
      const res = await fetchApi('/api/admin/department-summary');
      if (!res.ok) return;
      const summaries = await res.json();

      const DEPARTMENTS = ['IT', 'AIDS', 'CSBS'];
      DEPARTMENTS.forEach(dept => {
        const s = summaries[dept];
        const lowerDept = dept.toLowerCase();
        
        document.getElementById(`summary-${lowerDept}-status`).textContent = `Active: ${s.activeRoundName || ('Round ' + s.activeRound)}`;
        document.getElementById(`summary-${lowerDept}-total`).textContent = s.totalStudents;
        document.getElementById(`summary-${lowerDept}-completed`).textContent = s.completedCount;
        document.getElementById(`summary-${lowerDept}-idle`).textContent = s.idleCount;
        document.getElementById(`summary-${lowerDept}-qualified`).textContent = s.qualifiedCount;

        const winnersEl = document.getElementById(`summary-${lowerDept}-winners`);
        winnersEl.innerHTML = "";
        
        if (s.winners && s.winners.length > 0) {
          s.winners.sort((a,b) => a.rank - b.rank).forEach(w => {
            const medal = w.rank === 1 ? "🥇" : (w.rank === 2 ? "🥈" : "🥉");
            winnersEl.innerHTML += `<div>${medal} <strong>${w.username}</strong> (${w.score}/${w.total})</div>`;
          });
        } else {
          winnersEl.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.85rem;">Winners not declared yet</span>`;
        }

        // Render quick conclude buttons inside the overview cards
        const actionEl = document.getElementById(`summary-${lowerDept}-action`);
        if (actionEl) {
          actionEl.innerHTML = "";
          if (s.winners && s.winners.length > 0) {
            actionEl.innerHTML = `<span class="score-badge" style="width: 100%; text-align: center; background: rgba(20, 184, 166, 0.1); color: var(--neon-teal); border-color: rgba(20, 184, 166, 0.2);">🏆 Completed</span>`;
          } else {
            const btnText = s.activeRound === 3 ? "Conclude Tournament 👑" : `Conclude Round ${s.activeRound} ➔`;
            actionEl.innerHTML = `<button class="btn btn-teal btn-sm" style="width: 100%; justify-content: center;" onclick="AdminPortal.concludeDeptRound('${dept}')">${btnText}</button>`;
          }
        }
      });
    } catch (err) {
      console.error('Failed to render all departments summary:', err);
    }
  },

  async concludeDeptRound(dept) {
    try {
      const res = await fetchApi('/api/tournament/conclude-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: dept })
      });

      if (!res.ok) {
        const data = await res.json();
        window.showCustomAlert("Error Concluding Round", data.error || "Failed to conclude round.");
        return;
      }

      const data = await res.json();
      window.AppStore._tournamentState[dept] = data.state;

      if (data.activeRound === 2 || data.activeRound === 3) {
        window.showCustomAlert(
          `${data.state.round1Name || 'Round 1'} Concluded`,
          `${data.state.round1Name || 'Round 1'} Concluded! ${data.promoted.length} students advanced to ${data.state.round2Name || 'Round 2'}:<br><strong>${data.promoted.join(", ")}</strong>`
        );
      } else if (data.activeRound === 4) {
        const winnerNames = data.winners.map(w => `#${w.rank}: ${w.username} (${w.accuracy}%)`).join("<br>");
        window.showCustomAlert("Tournament Completed", `Tournament Completed! Winners Declared:<br><strong>${winnerNames}</strong>`);
      }

      this.renderAllDepartmentsSummary();
      this.renderStats();
    } catch (err) {
      console.error('Failed to conclude round:', err);
      window.showCustomAlert("Error", "Server error concluding active round.");
    }
  },

  resetAllTournaments() {
    window.showCustomConfirm(
      "RESET ALL DEPARTMENTS",
      "🚨 WARNING: This will completely reset the tournament state and delete all student attempts across ALL departments (IT, AIDS, and CSBS). This action is highly destructive and cannot be undone. Are you sure you want to proceed?",
      async () => {
        await window.AppStore.resetAllTournaments();
        window.showCustomAlert("Reset Successful", "All departments have been reset successfully.");
        this.renderTournamentTab();
        this.renderStats();
      }
    );
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
