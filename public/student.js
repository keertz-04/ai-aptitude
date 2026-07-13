// student.js
// Handles student dashboard rendering, active round test filters, qualification calculations, and SVG radar charts.

const StudentPortal = {
  activeQuestions: [],
  currentIndex: 0,
  answers: [],
  timerInterval: null,
  secondsElapsed: 0,
  tabViolations: 0,
  isTestActive: false,

  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  preventExitHandler(e) {
    if (StudentPortal.isTestActive) {
      e.preventDefault();
      e.returnValue = "Warning: Exiting the assessment will discard your active progress. Are you sure you want to proceed?";
      return e.returnValue;
    }
  },

  handleTabLeave() {
    if (!StudentPortal.isTestActive) return;
    if (StudentPortal.isAlertShowing) return;

    StudentPortal.tabViolations++;
    
    const violationsChip = document.getElementById("test-violations-count");
    if (violationsChip) {
      violationsChip.textContent = `Violations: ${StudentPortal.tabViolations}/1`;
    }

    StudentPortal.isAlertShowing = true;
    window.showCustomAlert(
      "Assessment Terminated",
      "🚫 Swapping tabs or leaving the assessment screen is strictly prohibited. Your active test has been automatically submitted.",
      () => {
        StudentPortal.isAlertShowing = false;
        StudentPortal.submitTest();
      }
    );
  },

  preventCheat(e) {
    if (StudentPortal.isTestActive) {
      e.preventDefault();
      window.showCustomAlert("Action Blocked", "⚠️ Copying, pasting, cutting, and right-clicking are strictly prohibited during the assessment to maintain test integrity.");
    }
  },

  preventDragStart(e) {
    if (StudentPortal.isTestActive) {
      e.preventDefault();
    }
  },

  handleKeyDownCheat(e) {
    if (!StudentPortal.isTestActive) return;
    
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      window.showCustomAlert("Action Blocked", "⚠️ Developer tools are disabled during the test.");
      return;
    }
    
    // Ctrl+Shift+I, J, C, Ctrl+U (source), Ctrl+P (print), Ctrl+S (save), Ctrl+F (find)
    if (e.ctrlKey && (
      (e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || 
      e.keyCode === 85 || // Ctrl+U
      e.keyCode === 80 || // Ctrl+P
      e.keyCode === 83 || // Ctrl+S
      e.keyCode === 70    // Ctrl+F
    )) {
      e.preventDefault();
      window.showCustomAlert("Action Blocked", "⚠️ This keyboard shortcut is disabled during the assessment.");
      return;
    }
  },

  initDashboard() {
    const user = window.AppStore.getCurrentUser();
    if (!user || user.role !== "student") return;

    // Set greeting
    document.getElementById("student-username-greet").textContent = user.username;

    // Render Stats
    this.renderStats(user.username);

    // Calculate and render Tournament Status and CTA controls
    this.renderTournamentStatus(user.username);

    // Render History
    this.renderHistory(user.username);
  },

  renderStats(username) {
    const results = window.AppStore.getResults().filter(r => r.studentName.toLowerCase() === username.toLowerCase());
    const totalTests = results.length;
    let avgScore = 0;
    let highestScore = 0;

    if (totalTests > 0) {
      const sum = results.reduce((acc, curr) => acc + curr.accuracy, 0);
      avgScore = Math.round(sum / totalTests);
      highestScore = Math.round(Math.max(...results.map(r => r.accuracy)));
    }

    document.getElementById("stat-tests-completed").textContent = totalTests;
    document.getElementById("stat-avg-score").textContent = avgScore + "%";
    document.getElementById("stat-highest-score").textContent = highestScore + "%";
  },

  renderTournamentStatus(username) {
    const tourState = window.AppStore.getTournamentState();
    const results = window.AppStore.getResults();

    const activeRound = tourState.activeRound;
    const isWinner = tourState.winners.find(w => w.username.toLowerCase() === username.toLowerCase());

    const statusBanner = document.getElementById("student-dashboard-status-banner") || this.createStatusBannerElement();
    const startTestBtn = document.getElementById("btn-student-start-test");

    // Check if tournament is completely concluded (winners declared)
    if (tourState.winners && tourState.winners.length > 0) {
      if (isWinner) {
        statusBanner.className = "status-notice status-winner mb-24";
        statusBanner.innerHTML = `
          <div class="status-notice-icon">🏆</div>
          <div>
            <h4>🎉 Crowned Winner!</h4>
            <p>Outstanding job! You completed the tournament in <strong>Rank #${isWinner.rank}</strong> with a score of ${isWinner.score}/${isWinner.total} (${Math.round(isWinner.accuracy)}%). Your AI Profile Archetype: ${isWinner.archetype}.</p>
          </div>
        `;
      } else {
        statusBanner.className = "status-notice status-eliminated mb-24";
        statusBanner.innerHTML = `
          <div class="status-notice-icon">🏁</div>
          <div>
            <h4>Tournament Concluded</h4>
            <p>The evaluation cycle has completed. While you were not selected as a top-3 winner this time, your efforts show great analytical promise. Every challenge is a stepping stone to mastery—keep training, exploring new AI topologies, and refining your skills. The next tournament is yours to conquer! 🚀</p>
          </div>
        `;
      }
      startTestBtn.style.display = "none";
      return;
    }

    // Check if user is eliminated in previous rounds
    let isEliminated = false;
    if (activeRound === 2 && !tourState.qualifiedForRound2.some(name => name.toLowerCase() === username.toLowerCase())) {
      isEliminated = true;
    } else if (activeRound === 3 && !tourState.qualifiedForRound3.some(name => name.toLowerCase() === username.toLowerCase())) {
      isEliminated = true;
    }

    if (isEliminated) {
      statusBanner.className = "status-notice status-eliminated mb-24";
      statusBanner.innerHTML = `
        <div class="status-notice-icon">❌</div>
        <div>
          <h4>Keep Pushing Forward!</h4>
          <p>You did not qualify to advance to Round ${activeRound} this time, but this is just the beginning of your growth journey. Analytical and computational reasoning is a muscle that strengthens with practice. Review your past test logs, focus on your growth areas, and come back stronger! Failure is not the opposite of success; it is a part of it. 🌟</p>
        </div>
      `;
      startTestBtn.style.display = "none";
      return;
    }

    // Check if student has already taken the test for the active round
    const takenActiveRound = results.some(r => r.studentName.toLowerCase() === username.toLowerCase() && r.round === activeRound);

    if (takenActiveRound) {
      statusBanner.className = "status-notice status-waiting mb-24";
      statusBanner.innerHTML = `
        <div class="status-notice-icon">⏳</div>
        <div>
          <h4>Round ${activeRound} Complete</h4>
          <p>Awaiting administrator evaluation. The cohort leaderboards are being compiled to determine progression.</p>
        </div>
      `;
      startTestBtn.style.display = "none";
    } else {
      // Eligible to take the active round
      statusBanner.className = "status-notice status-active mb-24";
      if (activeRound > 1) {
        statusBanner.innerHTML = `
          <div class="status-notice-icon">🎉</div>
          <div>
            <h4>Congratulations! You have Qualified!</h4>
            <p>Outstanding job! Your strong performance in the previous round has earned you a spot in <strong>Round ${activeRound}</strong>. You have demonstrated excellent cognitive execution. Prepare yourself, and click below to launch the next assessment phase! ⚡</p>
          </div>
        `;
      } else {
        statusBanner.innerHTML = `
          <div class="status-notice-icon">⚡</div>
          <div>
            <h4>Eligible for Round ${activeRound}</h4>
            <p>Round ${activeRound} is now active. Launch your test session to submit your evaluation metrics.</p>
          </div>
        `;
      }
      startTestBtn.style.display = "inline-flex";
      startTestBtn.textContent = `Start Round ${activeRound} Assessment ⚡`;
    }
  },

  createStatusBannerElement() {
    const parent = document.querySelector(".student-dashboard-view");
    const banner = document.createElement("div");
    banner.id = "student-dashboard-status-banner";
    // Insert before welcome banner
    parent.insertBefore(banner, parent.firstChild);
    return banner;
  },

  renderHistory(username) {
    const historyList = document.getElementById("past-results-list");
    historyList.innerHTML = "";

    const results = window.AppStore.getResults()
      .filter(r => r.studentName.toLowerCase() === username.toLowerCase())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (results.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <p>No tests taken yet. Ready to measure your aptitude?</p>
        </div>
      `;
      return;
    }

    results.forEach(res => {
      const dateStr = new Date(res.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const card = document.createElement("div");
      card.className = "past-result-card";
      card.onclick = () => this.showResults(res._id || res.id);

      card.innerHTML = `
        <div class="result-card-info">
          <h4>${res.cognitiveProfile || "Aptitude Assessment"}</h4>
          <p>${dateStr} • Round ${res.round} • Duration: ${res.timeTakenSeconds}s</p>
        </div>
        <div class="result-card-score">
          <span class="score-badge">R${res.round}: ${res.score}/${res.total} (${Math.round(res.accuracy)}%)</span>
        </div>
      `;
      historyList.appendChild(card);
    });
  },

  // --- Test-Taking Flow ---
  startTest() {
    const tourState = window.AppStore.getTournamentState();
    const activeRound = tourState.activeRound;

    // Filter questions by active round
    const questions = window.AppStore.getQuestions().filter(q => q.round === activeRound);
    if (questions.length === 0) {
      window.showCustomAlert("Round Alert", `No questions have been configured for Round ${activeRound} in the bank. Please contact an admin.`);
      return;
    }

    // Initialize test variables and shuffle questions
    this.activeQuestions = this.shuffleArray(questions);
    this.currentIndex = 0;
    this.answers = new Array(this.activeQuestions.length).fill(null);
    this.secondsElapsed = 0;

    // Setup Proctoring / Anti-cheat listeners
    this.isTestActive = true;
    this.tabViolations = 0;
    this.isAlertShowing = false;

    // Visual violations count reset
    const violationsChip = document.getElementById("test-violations-count");
    if (violationsChip) {
      violationsChip.style.display = "inline-flex";
      violationsChip.textContent = `Violations: 0/1`;
    }

    // Bind event handlers so they can be removed exactly
    this.boundPreventExitHandler = this.preventExitHandler.bind(this);
    this.boundHandleTabLeave = this.handleTabLeave.bind(this);
    this.boundPreventCheat = this.preventCheat.bind(this);
    this.boundPreventDragStart = this.preventDragStart.bind(this);
    this.boundKeyDownCheat = this.handleKeyDownCheat.bind(this);

    window.addEventListener("beforeunload", this.boundPreventExitHandler);
    window.addEventListener("blur", this.boundHandleTabLeave);
    document.addEventListener("visibilitychange", this.boundHandleTabLeave);
    document.addEventListener("copy", this.boundPreventCheat);
    document.addEventListener("paste", this.boundPreventCheat);
    document.addEventListener("cut", this.boundPreventCheat);
    document.addEventListener("contextmenu", this.boundPreventCheat);
    document.addEventListener("keydown", this.boundKeyDownCheat);
    document.addEventListener("dragstart", this.boundPreventDragStart);

    // Start timer (countdown based on admin roundDurationLimit)
    const limitMinutes = tourState.roundDurationLimit || 10;
    const totalSecondsAllowed = limitMinutes * 60;
    
    const displayMins = String(limitMinutes).padStart(2, "0");
    document.getElementById("test-timer").textContent = `${displayMins}:00`;
    
    // Clear old timers
    clearInterval(this.timerInterval);
    
    // Setup warning colors on timer chip
    const timerChip = document.querySelector(".timer-chip");
    if (timerChip) {
      timerChip.style.background = "";
      timerChip.style.borderColor = "";
    }

    this.timerInterval = setInterval(() => {
      this.secondsElapsed++;
      const secondsLeft = totalSecondsAllowed - this.secondsElapsed;
      
      if (secondsLeft <= 0) {
        clearInterval(this.timerInterval);
        window.showCustomAlert(
          "Time is up!",
          "Time is up! Your assessment is being submitted automatically.",
          () => this.submitTest()
        );
        return;
      }
      
      const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
      const secs = String(secondsLeft % 60).padStart(2, "0");
      document.getElementById("test-timer").textContent = `${mins}:${secs}`;
      
      // Warn when 1 minute (60s) remains
      if (secondsLeft === 60 && timerChip) {
        timerChip.style.background = "rgba(244, 63, 94, 0.2)";
        timerChip.style.borderColor = "var(--neon-pink)";
      }
    }, 1000);

    // Switch view
    window.AppRouter.switchView("test-taking");
    this.renderQuestion();
  },

  renderQuestion() {
    const question = this.activeQuestions[this.currentIndex];
    
    // Chips & details
    document.getElementById("test-question-category").textContent = question.category;
    document.getElementById("test-question-index").textContent = `Question ${this.currentIndex + 1} of ${this.activeQuestions.length}`;

    // Progress Bar
    const progressPercent = ((this.currentIndex) / this.activeQuestions.length) * 100;
    document.getElementById("test-progress").style.width = `${progressPercent}%`;

    // Question title
    document.getElementById("test-question-text").textContent = question.question;

    // Options list
    const optionsContainer = document.getElementById("test-options-container");
    optionsContainer.innerHTML = "";

    question.options.forEach((opt, idx) => {
      const optionBtn = document.createElement("button");
      optionBtn.className = "option-btn";
      if (this.answers[this.currentIndex] === idx) {
        optionBtn.classList.add("selected");
      }
      optionBtn.onclick = () => this.selectOption(idx);

      const marker = String.fromCharCode(65 + idx); // A, B, C, D
      optionBtn.innerHTML = `
        <div class="option-marker">${marker}</div>
        <div class="option-text">${opt}</div>
      `;
      optionsContainer.appendChild(optionBtn);
    });

    // Control buttons state
    const prevBtn = document.getElementById("btn-test-prev");
    const nextBtn = document.getElementById("btn-test-next");

    prevBtn.disabled = this.currentIndex === 0;
    if (this.currentIndex === this.activeQuestions.length - 1) {
      nextBtn.innerHTML = `Complete Assessment <span style="font-size:1.1rem">⚡</span>`;
      nextBtn.classList.add("btn-teal");
      nextBtn.classList.remove("btn-primary");
    } else {
      nextBtn.innerHTML = `Next Question &rarr;`;
      nextBtn.classList.remove("btn-teal");
      nextBtn.classList.add("btn-primary");
    }
  },

  selectOption(optIndex) {
    this.answers[this.currentIndex] = optIndex;
    
    // Visual update
    const btns = document.querySelectorAll(".option-btn");
    btns.forEach((btn, idx) => {
      if (idx === optIndex) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  },

  nextQuestion() {
    if (this.currentIndex < this.activeQuestions.length - 1) {
      this.currentIndex++;
      this.renderQuestion();
    } else {
      const unansweredCount = this.answers.filter(a => a === null).length;
      if (unansweredCount > 0) {
        window.showCustomConfirm(
          "Unanswered Questions",
          `⚠️ You have <strong>${unansweredCount}</strong> question(s) that you haven't answered yet.<br><br>Are you sure you want to finish and submit the assessment?`,
          () => this.submitTest()
        );
      } else {
        window.showCustomConfirm(
          "Confirm Submission",
          "Are you sure you want to finish and submit your assessment?",
          () => this.submitTest()
        );
      }
    }
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderQuestion();
    }
  },

  async submitTest() {
    clearInterval(this.timerInterval);

    // Disable Proctoring / Cleanup listeners
    this.isTestActive = false;
    window.removeEventListener("beforeunload", this.boundPreventExitHandler || this.preventExitHandler);
    window.removeEventListener("blur", this.boundHandleTabLeave || this.handleTabLeave);
    document.removeEventListener("visibilitychange", this.boundHandleTabLeave || this.handleTabLeave);
    document.removeEventListener("copy", this.boundPreventCheat || this.preventCheat);
    document.removeEventListener("paste", this.boundPreventCheat || this.preventCheat);
    document.removeEventListener("cut", this.boundPreventCheat || this.preventCheat);
    document.removeEventListener("contextmenu", this.boundPreventCheat || this.preventCheat);
    document.removeEventListener("keydown", this.boundKeyDownCheat || this.handleKeyDownCheat);
    document.removeEventListener("dragstart", this.boundPreventDragStart || this.preventDragStart);

    // Reset warning style on timer chip if it was warnings
    const timerChip = document.querySelector(".timer-chip");
    if (timerChip) {
      timerChip.style.background = "";
      timerChip.style.borderColor = "";
    }

    // Hide violations count badge
    const violationsChip = document.getElementById("test-violations-count");
    if (violationsChip) {
      violationsChip.style.display = "none";
    }

    const user = window.AppStore.getCurrentUser();
    const studentName = user ? user.username : "Guest Student";
    const tourState = window.AppStore.getTournamentState();
    const activeRound = tourState.activeRound;

    // AI Evaluation
    const evaluation = window.AIEvaluator.evaluate(this.activeQuestions, this.answers, this.secondsElapsed);

    // Save in store, snapping the active questions taken
    const resultToSave = {
      studentName,
      answers: this.answers,
      questions: this.activeQuestions,
      round: activeRound,
      violations: this.tabViolations, // Save violations
      ...evaluation
    };

    const savedResult = await window.AppStore.saveResult(resultToSave);

    // Redirect to results view
    this.showResults(savedResult._id || savedResult.id);
  },

  // --- Results Reporting & Visualization ---
  showResults(resultId) {
    if (!resultId) {
      alert("Test results not found.");
      return;
    }
    const results = window.AppStore.getResults();
    const res = results.find(r => r._id === resultId || r.id === resultId);
    if (!res) {
      alert("Test results not found.");
      return;
    }

    // Set correct Return view path based on user role dynamically
    const user = window.AppStore.getCurrentUser();
    const returnBtn = document.querySelector("#view-results button[onclick*='switchView']");
    if (returnBtn) {
      if (user && user.role === "admin") {
        returnBtn.setAttribute("onclick", "AppRouter.switchView('admin-dashboard')");
      } else {
        returnBtn.setAttribute("onclick", "AppRouter.switchView('student-dashboard')");
      }
    }

    // Dynamic Header
    document.getElementById("results-archetype-badge").textContent = "Result Overview";
    
    // Circular Progress Ring animation
    const circle = document.getElementById("results-ring-circle");
    const percent = Math.round(res.accuracy);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference}`;
    
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = `${circumference}`;
    setTimeout(() => {
      circle.style.strokeDashoffset = `${offset}`;
    }, 100);

    document.getElementById("results-score-num").textContent = `${res.score}`;
    document.getElementById("results-total-num").textContent = `/${res.total}`;

    // Statistics Rows
    document.getElementById("res-val-time").textContent = `${res.timeTakenSeconds} seconds`;
    document.getElementById("res-val-pacing").textContent = `${res.avgTimePerQuestion.toFixed(1)}s / q`;
    
    // Render AI Assessment Summary removed from UI

    // Render Questions Review & Mistakes
    let questions = res.questions;
    if (!questions || questions.length === 0) {
      questions = window.AppStore.getQuestions().filter(q => q.round === res.round);
    }
    this.renderQuestionsReview(questions || [], res.answers);

    // Switch view
    window.AppRouter.switchView("results");
  },

  renderQuestionsReview(questions, answers) {
    const container = document.getElementById("mistakes-list-wrap");
    if (!container) return;
    container.innerHTML = "";

    if (!questions || questions.length === 0) {
      container.innerHTML = "<p class='text-muted' style='text-align: center; padding: 20px;'>No questions to display.</p>";
      return;
    }

    questions.forEach((q, idx) => {
      const studentAnsIdx = answers[idx];
      const correctAnsIdx = q.correct;
      const isCorrect = studentAnsIdx === correctAnsIdx;

      const qCard = document.createElement("div");
      qCard.className = `mistake-card ${isCorrect ? "q-correct" : "q-incorrect"}`;

      // Format options
      let optionsHtml = "";
      q.options.forEach((opt, oIdx) => {
        let optClass = "review-option";
        let optLabel = "";

        if (oIdx === correctAnsIdx) {
          optClass += " review-correct-option";
          optLabel = " (Correct Answer)";
        }
        if (oIdx === studentAnsIdx) {
          optClass += " review-selected-option";
          if (!isCorrect) {
            optClass += " review-incorrect-selection";
            optLabel = " (Your Selection - Incorrect)";
          } else {
            optLabel = " (Your Selection - Correct)";
          }
        }

        const marker = String.fromCharCode(65 + oIdx); // A, B, C, D
        optionsHtml += `
          <div class="${optClass}">
            <span class="option-marker">${marker}</span>
            <span class="option-text">${opt}${optLabel}</span>
          </div>
        `;
      });

      const badgeHtml = isCorrect 
        ? `<span class="badge badge-success">✓ Correct</span>`
        : `<span class="badge badge-danger">✗ Incorrect</span>`;

      qCard.innerHTML = `
        <div class="mistake-card-header">
          <div class="mistake-q-num">Question ${idx + 1} <span class="category-tag">${q.category}</span></div>
          ${badgeHtml}
        </div>
        <div class="mistake-q-text">${q.question}</div>
        <div class="review-options-list">
          ${optionsHtml}
        </div>
        <div class="mistake-explanation">
          <strong>Explanation:</strong> ${q.explanation || "No explanation provided."}
        </div>
      `;
      container.appendChild(qCard);
    });
  },
};

window.StudentPortal = StudentPortal;
