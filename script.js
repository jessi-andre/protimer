// ==================== SISTEMA DE USUARIOS ====================
let currentUser = null;
let isGuest = false;

function initAuth() {
  const savedUser = localStorage.getItem('currentUser');
  const guestMode = localStorage.getItem('guestMode');
  
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    isGuest = false;
    showApp();
  } else if (guestMode === 'true') {
    isGuest = true;
    showApp();
  } else {
    showAuthModal();
  }
}

function showAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
}

function hideAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

function showApp() {
  hideAuthModal();
  
  if (isGuest) {
    document.getElementById('userInfoSection').style.display = 'none';
    document.getElementById('loginPromptBtn').style.display = 'flex';
  } else {
    document.getElementById('userInfoSection').style.display = 'flex';
    document.getElementById('loginPromptBtn').style.display = 'none';
    document.getElementById('userName').textContent = currentUser.name;
    loadUserData();
    updateStats();
  }
}

// Continuar como invitado
document.getElementById('continueAsGuest').addEventListener('click', () => {
  isGuest = true;
  localStorage.setItem('guestMode', 'true');
  showApp();
});

// Mostrar modal de login cuando el invitado quiere registrarse
document.getElementById('loginPromptBtn').addEventListener('click', () => {
  showAuthModal();
});

// Tabs de autenticación
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tabName + 'Form').classList.add('active');
  });
});

// Login
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  const users = JSON.parse(localStorage.getItem('users') || '{}');
  const user = users[username];
  
  if (user && user.password === password) {
    currentUser = { username, name: user.name };
    isGuest = false;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.removeItem('guestMode');
    showApp();
  } else {
    alert('Usuario o contraseña incorrectos');
  }
});

// Registro
document.getElementById('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;
  
  const users = JSON.parse(localStorage.getItem('users') || '{}');
  
  if (users[username]) {
    alert('El usuario ya existe');
    return;
  }
  
  users[username] = { name, password };
  localStorage.setItem('users', JSON.stringify(users));
  
  currentUser = { username, name };
  isGuest = false;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  localStorage.removeItem('guestMode');
  showApp();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('currentUser');
    location.reload();
  }
});

// ==================== ESTADO GLOBAL ====================
let mode = 'stopwatch';
let startTime = null;
let elapsed = 0;
let timerInterval = null;
let isRunning = false;
let laps = [];
let timerDuration = 0;
let timerRemaining = 0;
let sessionStartTime = null;

// ==================== ELEMENTOS DOM ====================
const timeEl = document.getElementById("time");
const millisecondsEl = document.getElementById("milliseconds");
const startPauseBtn = document.getElementById("startPause");
const resetBtn = document.getElementById("reset");
const lapBtn = document.getElementById("lap");
const lapsSection = document.getElementById("lapsSection");
const lapsList = document.getElementById("lapsList");
const avgLapEl = document.getElementById("avgLap");
const bestLapEl = document.getElementById("bestLap");
const themeToggle = document.getElementById("themeToggle");
const modeButtons = document.querySelectorAll(".mode-btn");
const timerSetup = document.getElementById("timerSetup");
const hoursInput = document.getElementById("hoursInput");
const minutesInput = document.getElementById("minutesInput");
const secondsInput = document.getElementById("secondsInput");
const presetButtons = document.querySelectorAll(".preset-btn");
const beepSound = document.getElementById("beepSound");
const progressCircle = document.querySelector(".progress-ring-circle");
const saveSessionBtn = document.getElementById("saveSessionBtn");

// ==================== FORMATO DE TIEMPO ====================
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMilliseconds(ms) {
  const milliseconds = ms % 1000;
  return `.${String(milliseconds).padStart(3, "0")}`;
}

function formatLapTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ==================== ACTUALIZACIÓN DEL DISPLAY ====================
function updateDisplay() {
  if (mode === 'stopwatch') {
    const now = Date.now();
    const diff = elapsed + (now - startTime);
    timeEl.textContent = formatTime(diff);
    millisecondsEl.textContent = formatMilliseconds(diff);
    updateProgressRing(diff);
  } else {
    const now = Date.now();
    const diff = timerRemaining - (now - startTime);
    
    if (diff <= 0) {
      completeTimer();
      return;
    }
    
    timeEl.textContent = formatTime(diff);
    millisecondsEl.textContent = formatMilliseconds(diff);
    updateProgressRing(timerDuration - diff, timerDuration);
  }
}

function updateProgressRing(current, total = null) {
  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  
  if (total) {
    const progress = current / total;
    const offset = circumference * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;
  } else {
    const progress = (current / 60000) % 1;
    const offset = circumference * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;
  }
}

// ==================== CONTROL PRINCIPAL ====================
function start() {
  if (mode === 'timer' && timerRemaining === 0) {
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    timerDuration = (hours * 3600 + minutes * 60 + seconds) * 1000;
    timerRemaining = timerDuration;
    
    if (timerDuration === 0) {
      alert('Por favor, establece un tiempo válido');
      return;
    }
  }
  
  if (!sessionStartTime) {
    sessionStartTime = Date.now();
  }
  
  startTime = Date.now();
  timerInterval = setInterval(updateDisplay, 10);
  isRunning = true;
  
  startPauseBtn.classList.add('running');
  startPauseBtn.querySelector('i').className = 'fas fa-pause';
  startPauseBtn.querySelector('span').textContent = 'Pausar';
  lapBtn.disabled = false;
  timeEl.classList.add('running');
}

function pause() {
  clearInterval(timerInterval);
  timerInterval = null;
  
  if (mode === 'stopwatch') {
    elapsed += Date.now() - startTime;
  } else {
    timerRemaining -= Date.now() - startTime;
  }
  
  isRunning = false;
  
  startPauseBtn.classList.remove('running');
  startPauseBtn.querySelector('i').className = 'fas fa-play';
  startPauseBtn.querySelector('span').textContent = 'Continuar';
  timeEl.classList.remove('running');
  
  // Mostrar botón de guardar si hay datos
  if (mode === 'stopwatch' && elapsed > 0) {
    saveSessionBtn.style.display = 'flex';
  }
}

function reset() {
  clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
  elapsed = 0;
  isRunning = false;
  laps = [];
  timerRemaining = 0;
  sessionStartTime = null;
  
  timeEl.textContent = "00:00:00";
  millisecondsEl.textContent = ".000";
  
  startPauseBtn.classList.remove('running');
  startPauseBtn.querySelector('i').className = 'fas fa-play';
  startPauseBtn.querySelector('span').textContent = 'Iniciar';
  lapBtn.disabled = true;
  lapsSection.classList.remove('active');
  lapsList.innerHTML = '';
  timeEl.classList.remove('running');
  progressCircle.style.strokeDashoffset = 1005;
  saveSessionBtn.style.display = 'none';
}

function completeTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  timerRemaining = 0;
  
  timeEl.textContent = "00:00:00";
  millisecondsEl.textContent = ".000";
  
  beepSound.play().catch(() => {});
  
  document.body.style.animation = 'flash 0.5s ease 3';
  setTimeout(() => {
    document.body.style.animation = '';
  }, 1500);
  
  startPauseBtn.classList.remove('running');
  startPauseBtn.querySelector('i').className = 'fas fa-play';
  startPauseBtn.querySelector('span').textContent = 'Iniciar';
  
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('¡Tiempo completado!', {
      body: 'El temporizador ha finalizado',
      icon: '⏰'
    });
  }
}

// ==================== VUELTAS ====================
function recordLap() {
  if (!isRunning && elapsed === 0) return;
  
  const currentTime = isRunning ? elapsed + (Date.now() - startTime) : elapsed;
  const lapTime = laps.length > 0 ? currentTime - laps[laps.length - 1].totalTime : currentTime;
  
  laps.push({
    number: laps.length + 1,
    lapTime: lapTime,
    totalTime: currentTime
  });
  
  renderLaps();
  updateLapStats();
  lapsSection.classList.add('active');
}

function renderLaps() {
  if (laps.length === 0) {
    lapsSection.classList.remove('active');
    return;
  }
  
  const lapTimes = laps.map(l => l.lapTime);
  const fastest = Math.min(...lapTimes);
  const slowest = Math.max(...lapTimes);
  
  lapsList.innerHTML = laps
    .slice()
    .reverse()
    .map((lap) => {
      let className = 'lap-item';
      let icon = '';
      
      if (laps.length > 1) {
        if (lap.lapTime === fastest) {
          className += ' fastest';
          icon = '<i class="fas fa-crown"></i>';
        } else if (lap.lapTime === slowest) {
          className += ' slowest';
          icon = '<i class="fas fa-hourglass"></i>';
        }
      }
      
      return `
        <div class="${className}">
          <div class="lap-number">${icon} Vuelta ${lap.number}</div>
          <div class="lap-times">
            <div class="lap-time">${formatLapTime(lap.lapTime)}</div>
            <div class="lap-total">Total: ${formatLapTime(lap.totalTime)}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

function updateLapStats() {
  if (laps.length === 0) {
    avgLapEl.textContent = '00:00.000';
    bestLapEl.textContent = '00:00.000';
    return;
  }
  
  const lapTimes = laps.map(l => l.lapTime);
  const avg = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
  const best = Math.min(...lapTimes);
  
  avgLapEl.textContent = formatLapTime(Math.floor(avg));
  bestLapEl.textContent = formatLapTime(best);
}

// ==================== GUARDAR SESIONES ====================
function openSaveModal() {
  // Si es invitado, preguntar si quiere registrarse
  if (isGuest) {
    if (confirm('Para guardar tus sesiones necesitas crear una cuenta. ¿Quieres registrarte ahora?')) {
      showAuthModal();
      // Cambiar a la pestaña de registro
      document.querySelector('[data-tab="register"]').click();
    }
    return;
  }
  
  document.getElementById('saveSessionModal').classList.remove('hidden');
}

function closeSaveModal() {
  document.getElementById('saveSessionModal').classList.add('hidden');
}

saveSessionBtn.addEventListener('click', openSaveModal);

document.getElementById('saveSessionForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const activity = document.getElementById('activityName').value;
  const notes = document.getElementById('sessionNotes').value;
  
  const session = {
    id: Date.now(),
    username: currentUser.username,
    activity,
    notes,
    duration: elapsed,
    laps: [...laps],
    date: new Date().toISOString(),
    mode: mode
  };
  
  const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
  sessions.push(session);
  localStorage.setItem('sessions', JSON.stringify(sessions));
  
  closeSaveModal();
  document.getElementById('activityName').value = '';
  if (isGuest) {
    renderSessions([]);
    renderGoals([]);
    return;
  }
  
  const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
  const userSessions = sessions.filter(s => s.username === currentUser.username);
  
  renderSessions(userSessions);
  loadGoals();
}

function renderSessions(sessions) {
  const sessionsList = document.getElementById('sessionsList');
  
  if (isGuest) {
    sessionsList.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <i class="fas fa-user-lock" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px;"></i>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">Regístrate para guardar y ver tu historial</p>
        <button class="btn-primary" onclick="document.getElementById('loginPromptBtn').click()">
          Crear Cuenta
        </button>
      </div>
    `;
    return;
  }
function loadUserData() {
  const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
  const userSessions = sessions.filter(s => s.username === currentUser.username);
  
  renderSessions(userSessions);
  loadGoals();
}

function renderSessions(sessions) {
  const sessionsList = document.getElementById('sessionsList');
  
  if (sessions.length === 0) {
    sessionsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No hay sesiones guardadas</p>';
    return;
  }
  
  sessionsList.innerHTML = sessions
    .sort((a, b) => b.date - a.date)
    .map(session => {
      const date = new Date(session.date);
      return `
        <div class="session-item">
          <div class="session-header">
            <div>
              <div class="session-title">${session.activity}</div>
              <div class="session-date">${date.toLocaleDateString()} - ${date.toLocaleTimeString()}</div>
            </div>
            <button class="session-delete" onclick="deleteSession(${session.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div class="session-details">
            <span><i class="fas fa-clock"></i>${formatDuration(session.duration)}</span>
            <span><i class="fas fa-flag"></i>${session.laps.length} vueltas</span>
          </div>
          ${session.notes ? `<div class="session-notes">${session.notes}</div>` : ''}
        </div>
  if (isGuest) {
    renderGoals([]);
    return;
  }
  
  const goals = JSON.parse(localStorage.getItem('goals') || '[]');
  const userGoals = goals.filter(g => g.username === currentUser.username);
  
  renderGoals(userGoals);
}

function renderGoals(goals) {
  const goalsList = document.getElementById('goalsList');
  
  if (isGuest) {
    goalsList.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <i class="fas fa-bullseye" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px;"></i>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">Regístrate para crear y seguir tus metas</p>
        <button class="btn-primary" onclick="document.getElementById('loginPromptBtn').click()">
          Crear Cuenta
        </button>
      </div>
    `;
    return;
  }
  let sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
  sessions = sessions.filter(s => s.id !== id);
  localStorage.setItem('sessions', JSON.stringify(sessions));
  
  loadUserData();
  updateStats();
}

document.getElementById('clearHistory').addEventListener('click', () => {
  if (!confirm('¿Eliminar todo el historial? Esta acción no se puede deshacer.')) return;
  
  let sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
  sessions = sessions.filter(s => s.username !== currentUser.username);
  localStorage.setItem('sessions', JSON.stringify(sessions));
  
  loadUserData();
  updateStats();
});

// ==================== METAS ====================
function loadGoals() {
  const goals = JSON.parse(localStorage.getItem('goals') || '[]');
  const userGoals = goals.filter(g => g.username === currentUser.username);
  
  renderGoals(userGoals);
}

function renderGoals(goals) {
  const goalsList = document.getElementById('goalsList');
  
  if (goals.length === 0) {
    goalsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No hay metas creadas</p>';
    return;
  }
  
  if (isGuest) {
    if (confirm('Para crear metas necesitas crear una cuenta. ¿Quieres registrarte ahora?')) {
      showAuthModal();
      document.querySelector('[data-tab="register"]').click();
    }
    return;
  }
  
  const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
  const userSessions = sessions.filter(s => s.username === currentUser.username);
  
  goalsList.innerHTML = goals.map(goal => {
    let progress = 0;
    
    if (goal.type === 'sessions') {
      progress = (userSessions.length / goal.target) * 100;
    } else if (goal.type === 'duration') {
      const totalDuration = userSessions.reduce((sum, s) => sum + s.duration, 0);
      progress = (totalDuration / goal.target) * 100;
    }
    
    progress = Math.min(progress, 100);
    const completed = progress >= 100;
    
    return `
      <div class="goal-item ${completed ? 'goal-completed' : ''}">
        <div class="goal-header">
          <div class="goal-title">${goal.title}</div>
          <button class="session-delete" onclick="deleteGoal(${goal.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="goal-stats">
          <span>${Math.floor(progress)}% completado</span>
          <span>${goal.description}</span>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('addGoalBtn').addEventListener('click', () => {
  const title = prompt('Nombre de la meta:');
  if (!title) return;
  
  if (isGuest) {
    document.getElementById('totalSessions').textContent = '0';
    document.getElementById('totalTime').textContent = '0h';
    document.getElementById('streak').textContent = '0 días';
    document.getElementById('goalsCompleted').textContent = '0';
    return;
  }
  
  const type = confirm('¿Meta basada en sesiones? (Cancelar = basada en tiempo)') ? 'sessions' : 'duration';
  let target, description;
  
  if (type === 'sessions') {
    target = parseInt(prompt('¿Cuántas sesiones?', '10'));
    description = `${target} sesiones`;
  } else {
    const hours = parseInt(prompt('¿Cuántas horas?', '5'));
    target = hours * 3600000;
    description = `${hours} horas`;
  }
  
  if (!target) return;
  
  const goal = {
    id: Date.now(),
    username: currentUser.username,
    title,
    type,
    target,
    description,
    createdAt: new Date().toISOString()
  };
  
  const goals = JSON.parse(localStorage.getItem('goals') || '[]');
  goals.push(goal);
  localStorage.setItem('goals', JSON.stringify(goals));
  
  loadGoals();
  updateStats();
});

function deleteGoal(id) {
  if (!confirm('¿Eliminar esta meta?')) return;
  
  let goals = JSON.parse(localStorage.getItem('goals') || '[]');
  goals = goals.filter(g => g.id !== id);
  localStorage.setItem('goals', JSON.stringify(goals));
  
  loadGoals();
  updateStats();
}

// ==================== ESTADÍSTICAS ====================
function updateStats() {
  const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
  const userSessions = sessions.filter(s => s.username === currentUser.username);
  const goals = JSON.parse(localStorage.getItem('goals') || '[]');
  const userGoals = goals.filter(g => g.username === currentUser.username);
  
  // Total sesiones
  document.getElementById('totalSessions').textContent = userSessions.length;
  
  // Tiempo total
  const totalTime = userSessions.reduce((sum, s) => sum + s.duration, 0);
  const hours = Math.floor(totalTime / 3600000);
  document.getElementById('totalTime').textContent = hours > 0 ? `${hours}h` : formatDuration(totalTime);
  
  // Racha
  const streak = calculateStreak(userSessions);
  document.getElementById('streak').textContent = `${streak} días`;
  
  // Metas completadas
  let goalsCompleted = 0;
  userGoals.forEach(goal => {
    let progress = 0;
    if (goal.type === 'sessions') {
      progress = (userSessions.length / goal.target) * 100;
    } else {
      progress = (totalTime / goal.target) * 100;
    }
    if (progress >= 100) goalsCompleted++;
  });
  document.getElementById('goalsCompleted').textContent = goalsCompleted;
}

function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;
  
  const dates = sessions
    .map(s => new Date(s.date).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => new Date(b) - new Date(a));
  
  let streak = 0;
  let currentDate = new Date();
  
  for (let date of dates) {
    const sessionDate = new Date(date);
    const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === streak) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }
  
  return streak;
}

// ==================== TABS ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(tab + 'Tab').classList.add('active');
  });
});

// ==================== MODO Y TEMA ====================
function switchMode(newMode) {
  if (isRunning) {
    alert('Detén el cronómetro antes de cambiar de modo');
    return;
  }
  
  mode = newMode;
  reset();
  
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  if (mode === 'timer') {
    timerSetup.classList.add('active');
    lapBtn.style.display = 'none';
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    timerDuration = (hours * 3600 + minutes * 60 + seconds) * 1000;
    timerRemaining = timerDuration;
    
    if (timerRemaining > 0) {
      timeEl.textContent = formatTime(timerRemaining);
      millisecondsEl.textContent = formatMilliseconds(timerRemaining);
    }
  } else {
    timerSetup.classList.remove('active');
    lapBtn.style.display = 'flex';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  themeToggle.querySelector('i').className = newTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
}

// ==================== EVENT LISTENERS ====================
startPauseBtn.addEventListener("click", () => {
  if (!isRunning) {
    start();
  } else {
    pause();
  }
});

resetBtn.addEventListener("click", reset);
lapBtn.addEventListener("click", recordLap);
themeToggle.addEventListener("click", toggleTheme);

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const seconds = parseInt(btn.dataset.time);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    hoursInput.value = 0;
    minutesInput.value = minutes;
    secondsInput.value = secs;
  });
});

[hoursInput, minutesInput, secondsInput].forEach(input => {
  input.addEventListener('input', (e) => {
    const max = parseInt(e.target.max);
    if (parseInt(e.target.value) > max) {
      e.target.value = max;
    }
    if (parseInt(e.target.value) < 0) {
      e.target.value = 0;
    }
  });
  
  input.addEventListener('change', () => {
    if (mode === 'timer' && !isRunning) {
      const hours = parseInt(hoursInput.value) || 0;
      const minutes = parseInt(minutesInput.value) || 0;
      const seconds = parseInt(secondsInput.value) || 0;
      timerDuration = (hours * 3600 + minutes * 60 + seconds) * 1000;
      timerRemaining = timerDuration;
      
      if (timerRemaining > 0) {
        timeEl.textContent = formatTime(timerRemaining);
        millisecondsEl.textContent = formatMilliseconds(timerRemaining);
      }
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    startPauseBtn.click();
  } else if (e.code === 'KeyR') {
    e.preventDefault();
    resetBtn.click();
  } else if (e.code === 'KeyL' && mode === 'stopwatch') {
    e.preventDefault();
    lapBtn.click();
  }
});

const style = document.createElement('style');
style.textContent = `
  @keyframes flash {
    0%, 100% { background-color: var(--bg-primary); }
    50% { background-color: rgba(239, 68, 68, 0.2); }
  }
`;
document.head.appendChild(style);

// ==================== INICIALIZACIÓN ====================
document.documentElement.setAttribute('data-theme', 'dark');
themeToggle.querySelector('i').className = 'fas fa-moon';

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

lapBtn.disabled = true;

// Iniciar sistema de autenticación
initAuth();

console.log('🚀 ProTimer Pro cargado correctamente');
console.log('⌨️ Atajos: Espacio (Iniciar/Pausar), R (Reiniciar), L (Vuelta)');
