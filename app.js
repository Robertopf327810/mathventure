/* =========================================================================
   MÓDULO DE BASE DE DATOS Y PERSISTENCIA (LOCALSTORAGE)
   ========================================================================= */
const StorageDB = {
  KEY_USERS: "mathventure_users",
  KEY_SESSION: "mathventure_session",

  getUsers() {
    return JSON.parse(localStorage.getItem(this.KEY_USERS) || "{}");
  },

  saveUser(username, password) {
    const users = this.getUsers();
    if (users[username]) return false;
    users[username] = {
      password: password,
      progress: {
        sumas: null,
        restas: null,
        multiplicaciones: null,
        divisiones: null,
        problemas: null
      }
    };
    localStorage.setItem(this.KEY_USERS, JSON.stringify(users));
    return true;
  },

  validateUser(username, password) {
    const users = this.getUsers();
    return users[username] && users[username].password === password;
  },

  setSession(username) {
    localStorage.setItem(this.KEY_SESSION, username);
  },

  getSession() {
    return localStorage.getItem(this.KEY_SESSION);
  },

  clearSession() {
    localStorage.removeItem(this.KEY_SESSION);
  },

  getUserData(username) {
    const users = this.getUsers();
    return users[username] || null;
  },

  updateTopicResult(username, topicKey, score, total, percentage) {
    const users = this.getUsers();
    if (!users[username]) return;
    users[username].progress[topicKey] = {
      score: score,
      total: total,
      percentage: percentage,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.KEY_USERS, JSON.stringify(users));
  }
};

/* =========================================================================
   ESTADO GLOBAL
   ========================================================================= */
let authMode = "login";
let currentUser = null;
let currentTopic = "";
let currentQuestions = [];
let currentQuestionIndex = 0;
let lives = 3;
let score = 0;
let isAnswerChecked = false;

/* =========================================================================
   VISTAS Y AUTENTICACIÓN
   ========================================================================= */
function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(viewId);
  if (target) target.classList.add("active");
}

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById("tab-login").classList.toggle("active", mode === "login");
  document.getElementById("tab-register").classList.toggle("active", mode === "register");
  document.getElementById("auth-submit-btn").innerText = mode === "login" ? "Ingresar" : "Crear Cuenta";
}

function handleAuth(e) {
  e.preventDefault();
  const u = document.getElementById("auth-username").value.trim();
  const p = document.getElementById("auth-password").value;

  if (!u || !p) return;

  if (authMode === "register") {
    const ok = StorageDB.saveUser(u, p);
    if (!ok) {
      alert("El usuario ya existe. Intenta con otro nombre.");
      return;
    }
    StorageDB.setSession(u);
    currentUser = u;
    goToMap();
  } else {
    const ok = StorageDB.validateUser(u, p);
    if (!ok) {
      alert("Usuario o contraseña incorrectos.");
      return;
    }
    StorageDB.setSession(u);
    currentUser = u;
    goToMap();
  }
}

function logout() {
  StorageDB.clearSession();
  currentUser = null;
  document.getElementById("auth-username").value = "";
  document.getElementById("auth-password").value = "";
  showView("view-auth");
}

function goToMap() {
  if (!currentUser) return;
  document.getElementById("map-username").innerText = currentUser;
  renderProgressMap();
  showView("view-map");
}

function renderProgressMap() {
  const data = StorageDB.getUserData(currentUser);
  if (!data) return;

  const topics = ["sumas", "restas", "multiplicaciones", "divisiones", "problemas"];
  topics.forEach(t => {
    const el = document.getElementById(`score-${t}`);
    const p = data.progress[t];
    if (p) {
      el.innerText = `${p.score}/${p.total} (${p.percentage}%)`;
      el.style.color = p.percentage >= 70 ? "var(--success)" : "var(--danger)";
    } else {
      el.innerText = "Sin completar";
      el.style.color = "var(--text-muted)";
    }
  });
}

/* =========================================================================
   LÓGICA DEL JUEGO (QUIZ)
   ========================================================================= */
function startTopic(topicKey) {
  currentTopic = topicKey;
  currentQuestions = [...QUESTIONS_DB[topicKey]].sort(() => Math.random() - 0.5);
  currentQuestionIndex = 0;
  lives = 3;
  score = 0;
  isAnswerChecked = false;

  updateLivesDisplay();
  renderQuestion();
  showView("view-quiz");
}

function updateLivesDisplay() {
  const hearts = "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, 3 - lives));
  document.getElementById("quiz-lives").innerText = hearts;
}

function renderQuestion() {
  isAnswerChecked = false;
  const qData = currentQuestions[currentQuestionIndex];
  const total = currentQuestions.length;

  const pct = (currentQuestionIndex / total) * 100;
  document.getElementById("quiz-progress-fill").style.width = `${pct}%`;
  document.getElementById("quiz-step-counter").innerText = `Pregunta ${currentQuestionIndex + 1} de ${total}`;
  document.getElementById("quiz-question-text").innerText = qData.q;

  const tray = document.getElementById("feedback-tray");
  tray.className = "feedback-tray";

  const container = document.getElementById("quiz-options-container");
  container.innerHTML = "";

  qData.opts.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerText = optText;
    btn.onclick = () => selectOption(idx);
    container.appendChild(btn);
  });
}

function selectOption(selectedIndex) {
  if (isAnswerChecked) return;
  isAnswerChecked = true;

  const qData = currentQuestions[currentQuestionIndex];
  const isCorrect = selectedIndex === qData.a;
  const buttons = document.querySelectorAll(".option-btn");

  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === qData.a) {
      btn.style.borderColor = "var(--success)";
      btn.style.backgroundColor = "#dcfce7";
    } else if (idx === selectedIndex && !isCorrect) {
      btn.style.borderColor = "var(--danger)";
      btn.style.backgroundColor = "#fee2e2";
    }
  });

  const tray = document.getElementById("feedback-tray");
  const title = document.getElementById("feedback-title");
  const exp = document.getElementById("feedback-explanation");

  if (isCorrect) {
    score++;
    tray.className = "feedback-tray correct";
    title.innerText = "¡Correcto! 🎉";
    exp.innerText = "Excelente razonamiento.";
  } else {
    lives--;
    updateLivesDisplay();
    tray.className = "feedback-tray wrong";
    title.innerText = "¡Incorrecto! ❌";
    exp.innerText = `La respuesta correcta era: ${qData.opts[qData.a]}`;
  }
}

function nextQuestion() {
  if (lives <= 0) {
    finishTopic(false);
    return;
  }

  currentQuestionIndex++;
  if (currentQuestionIndex >= currentQuestions.length) {
    finishTopic(true);
  } else {
    renderQuestion();
  }
}

function confirmExit() {
  if (confirm("¿Seguro que deseas salir? Perderás el progreso de esta sesión.")) {
    goToMap();
  }
}

/* =========================================================================
   PUNTAJE FINAL Y REINICIO
   ========================================================================= */
function finishTopic(completed) {
  const total = currentQuestions.length;
  const pct = Math.round((score / total) * 100);

  StorageDB.updateTopicResult(currentUser, currentTopic, score, total, pct);

  const icon = document.getElementById("summary-icon");
  const title = document.getElementById("summary-title");
  const subtitle = document.getElementById("summary-subtitle");

  if (!completed && lives <= 0) {
    icon.innerText = "💔";
    title.innerText = "Te has quedado sin vidas";
    subtitle.innerText = "¡No te desanimes! Repasa el tema y vuelve a intentarlo.";
  } else {
    icon.innerText = pct >= 70 ? "🌟" : "👍";
    title.innerText = pct >= 70 ? "¡Excelente trabajo!" : "¡Buen esfuerzo!";
    subtitle.innerText = "Completaste las 20 preguntas del módulo.";
  }

  document.getElementById("summary-correct").innerText = `${score} / ${total}`;
  document.getElementById("summary-pct").innerText = `${pct}%`;
  document.getElementById("summary-points").innerText = `${score * 10}`;

  showView("view-summary");
}

function restartCurrentTopic() {
  if (currentTopic) {
    startTopic(currentTopic);
  } else {
    goToMap();
  }
}

/* =========================================================================
   INICIALIZACIÓN
   ========================================================================= */
window.addEventListener("DOMContentLoaded", () => {
  const sessionUser = StorageDB.getSession();
  if (sessionUser && StorageDB.getUserData(sessionUser)) {
    currentUser = sessionUser;
    goToMap();
  } else {
    showView("view-auth");
  }
});