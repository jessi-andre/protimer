// ==================== ESTADO GLOBAL ====================
let mode = 'stopwatch'; // 'stopwatch' o 'timer'
let startTime = null;
let elapsed = 0;
let timerInterval = null;
let isRunning = false;
let laps = [];
let timerDuration = 0;
let timerRemaining = 0;

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
    // Modo temporizador
    const progress = current / total;
    const offset = circumference * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;
  } else {
    // Modo cronómetro - animación infinita
    const progress = (current / 60000) % 1; // Ciclo cada 60 segundos
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
  
  startTime = Date.now();
  timerInterval = setInterval(updateDisplay, 10);
  isRunning = true;
  
  // UI Updates
  startPauseBtn.classList.add('running');
  startPauseBtn.querySelector('i').className = 'fas fa-pause';
  startPauseBtn.querySelector('span').textContent = 'Pausar';
  lapBtn.disabled = false;
  timeEl.classList.add('running');
  
  saveState();
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
  
  // UI Updates
  startPauseBtn.classList.remove('running');
  startPauseBtn.querySelector('i').className = 'fas fa-play';
  startPauseBtn.querySelector('span').textContent = 'Continuar';
  timeEl.classList.remove('running');
  
  saveState();
}

function reset() {
  clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
  elapsed = 0;
  isRunning = false;
  laps = [];
  timerRemaining = 0;
  
  timeEl.textContent = "00:00:00";
  millisecondsEl.textContent = ".000";
  
  // UI Updates
  startPauseBtn.classList.remove('running');
  startPauseBtn.querySelector('i').className = 'fas fa-play';
  startPauseBtn.querySelector('span').textContent = 'Iniciar';
  lapBtn.disabled = true;
  lapsSection.classList.remove('active');
  lapsList.innerHTML = '';
  timeEl.classList.remove('running');
  progressCircle.style.strokeDashoffset = 1005;
  
  saveState();
}

function completeTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  timerRemaining = 0;
  
  timeEl.textContent = "00:00:00";
  millisecondsEl.textContent = ".000";
  
  // Reproducir sonido
  beepSound.play().catch(() => {});
  
  // Notificación visual
  document.body.style.animation = 'flash 0.5s ease 3';
  setTimeout(() => {
    document.body.style.animation = '';
  }, 1500);
  
  // UI Updates
  startPauseBtn.classList.remove('running');
  startPauseBtn.querySelector('i').className = 'fas fa-play';
  startPauseBtn.querySelector('span').textContent = 'Iniciar';
  
  // Mostrar notificación
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
  
  saveState();
}

function renderLaps() {
  if (laps.length === 0) {
    lapsSection.classList.remove('active');
    return;
  }
  
  // Encontrar la vuelta más rápida y más lenta
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
    // Configurar tiempo inicial del temporizador
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
  
  saveState();
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  themeToggle.querySelector('i').className = newTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  
  // NO guardar el tema para que siempre inicie en oscuro
  // localStorage.setItem('theme', newTheme);
}

// ==================== PERSISTENCIA ====================
function saveState() {
  const state = {
    mode,
    elapsed,
    isRunning,
    laps,
    timerDuration,
    timerRemaining,
    hours: hoursInput.value,
    minutes: minutesInput.value,
    seconds: secondsInput.value
  };
  localStorage.setItem('timerState', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('timerState');
  if (!saved) return;
  
  try {
    const state = JSON.parse(saved);
    mode = state.mode || 'stopwatch';
    elapsed = state.elapsed || 0;
    laps = state.laps || [];
    timerDuration = state.timerDuration || 0;
    timerRemaining = state.timerRemaining || 0;
    
    if (state.hours) hoursInput.value = state.hours;
    if (state.minutes) minutesInput.value = state.minutes;
    if (state.seconds) secondsInput.value = state.seconds;
    
    switchMode(mode);
    
    if (elapsed > 0) {
      timeEl.textContent = formatTime(elapsed);
      millisecondsEl.textContent = formatMilliseconds(elapsed);
    }
    
    if (timerRemaining > 0 && mode === 'timer') {
      timeEl.textContent = formatTime(timerRemaining);
      millisecondsEl.textContent = formatMilliseconds(timerRemaining);
    }
    
    if (laps.length > 0) {
      renderLaps();
      updateLapStats();
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
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

// Validación de inputs
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
  
  // Actualizar el display cuando cambian los inputs
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

// Atajos de teclado
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

// Animación de flash para el temporizador
const style = document.createElement('style');
style.textContent = `
  @keyframes flash {
    0%, 100% { background-color: var(--bg-primary); }
    50% { background-color: rgba(239, 68, 68, 0.2); }
  }
`;
document.head.appendChild(style);

// ==================== REGISTRO DEL SERVICE WORKER (PWA) ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Error al registrar Service Worker:', error);
      });
  });
}

// ==================== INSTALACIÓN PWA ====================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Mostrar botón de instalación personalizado (opcional)
  console.log('📱 App lista para instalar');
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA instalada correctamente');
  deferredPrompt = null;
});

// ==================== INICIALIZACIÓN ====================
// Siempre iniciar en tema oscuro
document.documentElement.setAttribute('data-theme', 'dark');
themeToggle.querySelector('i').className = 'fas fa-moon';

// Solicitar permiso para notificaciones
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Cargar estado guardado
loadState();

// Deshabilitar botón de vuelta inicialmente
lapBtn.disabled = true;

console.log('🚀 ProTimer cargado correctamente');
console.log('⌨️ Atajos: Espacio (Iniciar/Pausar), R (Reiniciar), L (Vuelta)');
console.log('📱 Instala la app para usarla offline');

