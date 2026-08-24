// Global Custom Alert / Confirm Dialog functions
window.showCustomAlert = function(title, message, callback) {
  const overlay = document.getElementById("custom-alert-overlay");
  const titleEl = document.getElementById("custom-alert-title");
  const msgEl = document.getElementById("custom-alert-message");
  const okBtn = document.getElementById("custom-alert-btn-ok");
  const cancelBtn = document.getElementById("custom-alert-btn-cancel");
  
  titleEl.innerHTML = title;
  msgEl.innerHTML = message;
  
  cancelBtn.style.display = "none";
  okBtn.textContent = "OK";
  okBtn.className = "btn btn-teal";
  
  overlay.style.display = "flex";
  
  okBtn.onclick = () => {
    overlay.style.display = "none";
    if (callback) callback();
  };
};

window.showCustomConfirm = function(title, message, onConfirm, onCancel) {
  const overlay = document.getElementById("custom-alert-overlay");
  const titleEl = document.getElementById("custom-alert-title");
  const msgEl = document.getElementById("custom-alert-message");
  const okBtn = document.getElementById("custom-alert-btn-ok");
  const cancelBtn = document.getElementById("custom-alert-btn-cancel");
  
  titleEl.innerHTML = title;
  msgEl.innerHTML = message;
  
  cancelBtn.style.display = "inline-flex";
  cancelBtn.className = "btn btn-secondary";
  okBtn.textContent = "Confirm";
  okBtn.className = "btn btn-teal";
  
  overlay.style.display = "flex";
  
  okBtn.onclick = () => {
    overlay.style.display = "none";
    if (onConfirm) onConfirm();
  };
  
  cancelBtn.onclick = () => {
    overlay.style.display = "none";
    if (onCancel) onCancel();
  };
};

const AppRouter = {
  currentView: "landing",

  switchView(viewId) {
    if (window.StudentPortal && window.StudentPortal.isTestActive && viewId !== "test-taking") {
      window.showCustomAlert("Navigation Blocked", "⚠️ Navigation Blocked: You cannot navigate away from the active test screen until you submit the assessment.");
      return;
    }
    this.currentView = viewId;
    sessionStorage.setItem("currentView", viewId);
    if (viewId !== "results") {
      sessionStorage.removeItem("activeResultId");
    }

    // Toggle active view panel
    document.querySelectorAll(".view-panel").forEach(panel => {
      if (panel.id === `view-${viewId}`) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    // Toggle visibility of the floating side mascot
    const sideRobot = document.getElementById("side-robot-helper");
    if (sideRobot) {
      if (viewId === "landing" || viewId === "test-taking") {
        // Hide on landing view and during active testing to prevent distraction
        sideRobot.style.display = "none";
      } else {
        sideRobot.style.display = "flex";
      }
    }

    // Update global header elements based on session state
    this.updateHeader();
    this.updateBranding();

    // Call view-specific load hooks
    if (viewId === "student-dashboard") {
      window.StudentPortal.initDashboard();
    } else if (viewId === "admin-dashboard") {
      window.AdminPortal.initDashboard();
    }
  },

  updateBranding() {
    const user = window.AppStore.getCurrentUser();
    const instEl = document.getElementById("landing-institution-title");
    const deptEl = document.getElementById("landing-department-title");

    if (user && user.role === 'student') {
      const dept = user.department;
      const state = window.AppStore.getTournamentState(dept);
      if (state) {
        if (instEl) instEl.textContent = state.institutionName || "Ganadipathy Tulsi's Jain Engineering College";
        let deptColor = "#D69A32";
        if (dept === "AIDS") deptColor = "#167A8F";
        else if (dept === "CSBS") deptColor = "#2688D8";
        if (deptEl) {
          const displayDept = dept === "AIDS" ? "AI&DS" : dept;
          deptEl.innerHTML = `<span style="color: #0B5873;">Department of ${displayDept}</span>`;
        }
      }
    } else {
      // Default branding for guests / landing screen
      const state = window.AppStore.getTournamentState('IT');
      if (state) {
        if (instEl) instEl.textContent = state.institutionName || "Ganadipathy Tulsi's Jain Engineering College";
      }
      if (deptEl) {
        deptEl.innerHTML = `Department of IT, AI&DS & CSBS`;
        deptEl.style.color = "#0B5873";
      }
    }
  },

  updateHeader() {
    const user = window.AppStore.getCurrentUser();
    const navPanel = document.getElementById("nav-user-panel");
    const logoutBtn = document.getElementById("btn-header-logout");
    const guestPanel = document.getElementById("nav-guest-panel");

    if (user) {
      if (guestPanel) guestPanel.style.display = "none";
      navPanel.style.display = "flex";
      logoutBtn.style.display = "inline-flex";

      const badge = document.getElementById("header-user-badge");
      badge.className = `user-badge ${user.role}-badge`;
      badge.innerHTML = `<span class="badge-dot"></span>${user.username} (${user.role.toUpperCase()})`;
    } else {
      if (guestPanel) guestPanel.style.display = "flex";
      navPanel.style.display = "none";
      logoutBtn.style.display = "none";
    }
  }
};

const AppAuth = {
  authRole: "student", // "student" or "admin"
  isSignUpMode: false,

  openAuth(role) {
    this.authRole = role;
    this.isSignUpMode = false;
    
    // Clear forms
    document.getElementById("auth-form").reset();
    
    this.updateAuthFormView();
    window.AppRouter.switchView("auth");
  },

  toggleAuthMode() {
    this.isSignUpMode = !this.isSignUpMode;
    this.updateAuthFormView();
  },

  updateAuthFormView() {
    const title = document.getElementById("auth-title");
    const desc = document.getElementById("auth-desc");
    const submitBtn = document.getElementById("btn-auth-submit");
    const toggleBlock = document.getElementById("auth-toggle-container");
    const usernameLabel = document.querySelector("label[for='auth-username']");
    const usernameInput = document.getElementById("auth-username");
    const regNoContainer = document.getElementById("auth-regno-container");
    const regNoInput = document.getElementById("auth-regno");
    const passwordContainer = document.getElementById("auth-password-container");
    const passwordInput = document.getElementById("auth-password");
    const deptContainer = document.getElementById("auth-department-container");

    if (this.authRole === "admin") {
      title.textContent = "Admin Portal Secure Login";
      desc.textContent = "Enter system administrator credentials.";
      submitBtn.textContent = "Sign In as Administrator 🛡️";
      toggleBlock.style.display = "none"; // Admin cannot sign up
      
      // Admin requires password
      if (passwordContainer) passwordContainer.style.display = "block";
      if (passwordInput) passwordInput.required = true;
      if (regNoContainer) regNoContainer.style.display = "none";
      if (regNoInput) regNoInput.required = false;
      if (deptContainer) deptContainer.style.display = "none";
      if (usernameLabel) usernameLabel.textContent = "Username";
      if (usernameInput) {
        usernameInput.placeholder = "e.g. admin";
        usernameInput.setAttribute("autocomplete", "username");
      }
    } else {
      toggleBlock.style.display = "none"; // Student cannot sign up
      this.isSignUpMode = false;
      title.textContent = "Student Portal Entry";
      desc.textContent = "Enter your display name and registration details to enter.";
      submitBtn.textContent = "Enter Student Dashboard &rarr;";
      
      // Student requires Reg No & Dept but NOT password
      if (passwordContainer) passwordContainer.style.display = "none";
      if (passwordInput) {
        passwordInput.required = false;
        passwordInput.value = "";
      }
      if (regNoContainer) regNoContainer.style.display = "block";
      if (regNoInput) regNoInput.required = true;
      if (deptContainer) deptContainer.style.display = "block";
      if (usernameLabel) usernameLabel.textContent = "Student Name / Username";
      if (usernameInput) {
        usernameInput.placeholder = "e.g. John Doe";
        usernameInput.removeAttribute("autocomplete");
      }
    }
  },

  async handleAuthSubmit(event) {
    event.preventDefault();
    const userVal = document.getElementById("auth-username").value.trim();
    const regNoVal = document.getElementById("auth-regno") ? document.getElementById("auth-regno").value.trim() : "";
    const passVal = document.getElementById("auth-password").value;
    const deptEl = document.getElementById("auth-department");
    const deptVal = deptEl ? deptEl.value : "IT";

    if (this.authRole === "admin") {
      if (!userVal || !passVal) {
        alert("Please provide both username and password.");
        return;
      }
      // Validate against dynamic credentials stored in AppStore
      const adminCreds = window.AppStore.getAdminCredentials();
      if (userVal.toLowerCase() === adminCreds.username.toLowerCase() && passVal === adminCreds.password) {
        const user = { username: "Administrator", role: "admin" };
        window.AppStore.setCurrentUser(user);
        window.AppRouter.switchView("admin-dashboard");
      } else {
        alert("Invalid administrator username or password.");
      }
    } else {
      // Student portal auth (Username & Reg No, no passwords)
      if (!userVal || !regNoVal) {
        window.showCustomAlert("Authentication Alert", "Please provide both your display name and registration number.");
        return;
      }
      const student = await window.AppStore.authenticateStudent(userVal, regNoVal, deptVal);
      if (student) {
        const user = { username: student.username, role: "student", regNo: student.regNo, department: student.department };
        window.AppStore.setCurrentUser(user);
        window.AppRouter.switchView("student-dashboard");
      } else {
        window.showCustomAlert("Access Denied", "Failed to access student portal.");
      }
    }
  },

  logout() {
    if (window.StudentPortal && window.StudentPortal.isTestActive) {
      window.showCustomAlert("Action Blocked", "⚠️ Action Blocked: You cannot log out while the assessment is active.");
      return;
    }
    sessionStorage.removeItem("currentView");
    sessionStorage.removeItem("activeResultId");
    window.AppStore.setCurrentUser(null);
    window.AppRouter.switchView("landing");
  }
};

// Bootstrap application on page load
window.addEventListener("DOMContentLoaded", async () => {
  window.AppStore.init();
  
  // Wait for the local data cache to sync from MongoDB
  await window.AppStore.syncFromServer();

  // Load custom branding titles from state
  window.AppRouter.updateBranding();

  const user = window.AppStore.getCurrentUser();
  if (user) {
    const savedView = sessionStorage.getItem("currentView");
    const savedResultId = sessionStorage.getItem("activeResultId");

    if (user.role === "admin") {
      window.AppRouter.switchView("admin-dashboard");
    } else {
      if (savedView === "results" && savedResultId) {
        // Asynchronously restore results review details screen
        window.StudentPortal.showResults(savedResultId);
      } else {
        window.AppRouter.switchView("student-dashboard");
      }
    }
  } else {
    window.AppRouter.switchView("landing");
  }

  // Set event listeners for forms
  document.getElementById("auth-form").addEventListener("submit", (e) => window.AppAuth.handleAuthSubmit(e));
  document.getElementById("question-form").addEventListener("submit", (e) => window.AdminPortal.saveQuestion(e));
  
  const brandForm = document.getElementById("branding-settings-form");
  if (brandForm) {
    brandForm.addEventListener("submit", (e) => window.AdminPortal.saveBrandingSettings(e));
  }
});

// Bind to window
window.AppRouter = AppRouter;
window.AppAuth = AppAuth;
