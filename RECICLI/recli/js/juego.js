const CANVAS_W = 420;
const CANVAS_H = 600;

const RESIDUOS = [
  { emoji: "🧴", nombre: "Botella PET", color: "#42A5F5", stroke: "#1E88E5", shape: "rect", w: 20, h: 36, categoria: "plastico" },
  { emoji: "📄", nombre: "Papel", color: "#ECEFF1", stroke: "#B0BEC5", shape: "rect", w: 30, h: 24, categoria: "papel" },
  { emoji: "📦", nombre: "Cartón", color: "#8D6E63", stroke: "#5D4037", shape: "rect", w: 36, h: 28, categoria: "papel" },
  { emoji: "🥫", nombre: "Lata", color: "#90A4AE", stroke: "#546E7A", shape: "circle", r: 14, categoria: "metal" },
  { emoji: "🗑️", nombre: "Bolsa", color: "#66BB6A", stroke: "#388E3C", shape: "tri", w: 32, h: 30, categoria: "organico" }
];

const NIVELES = [
  { nivel: 1, velocidad: 2.0, frecuencia: 1800, indices: [0], meta: 20, nombre: "Básico", timer: 60 },
  { nivel: 2, velocidad: 1.8, frecuencia: 1600, indices: [0, 1], meta: 30, nombre: "Papel", timer: 65 },
  { nivel: 3, velocidad: 1.6, frecuencia: 1400, indices: [0, 1, 2], meta: 40, nombre: "Cartón", timer: 70 },
  { nivel: 4, velocidad: 1.4, frecuencia: 1200, indices: [0, 1, 2, 3], meta: 50, nombre: "Metal", timer: 75 },
  { nivel: 5, velocidad: 1.2, frecuencia: 1000, indices: [0, 1, 2, 3, 4], meta: 60, nombre: "Bolsas", timer: 80 },
  { nivel: 6, velocidad: 1.0, frecuencia: 900, indices: [0, 1, 2, 3, 4], meta: 70, nombre: "Mezcla", timer: 85 },
  { nivel: 7, velocidad: 0.85, frecuencia: 800, indices: [0, 1, 2, 3, 4], meta: 80, nombre: "Densidad", timer: 90 },
  { nivel: 8, velocidad: 0.72, frecuencia: 700, indices: [0, 1, 2, 3, 4], meta: 90, nombre: "Difícil", timer: 95 },
  { nivel: 9, velocidad: 0.6, frecuencia: 600, indices: [0, 1, 2, 3, 4], meta: 100, nombre: "Extremo", timer: 100 },
  { nivel: 10, velocidad: 0.48, frecuencia: 500, indices: [0, 1, 2, 3, 4], meta: 110, nombre: "Final", timer: 110 }
];

let ctx, canvas;
let audioCtx;
let estado = "MENU";
let nivelActual = 0;
let score = 0;
let vidas = 3;
let esquivados = 0;
let residuos = [];
let powerups = [];
let jugador;
let lastSpawn = 0;
let lastPowerupSpawn = 0;
let timerNivel = 0;
let duracionNivel = 30;
let animId = null;
let containerEl = null;
let shakeFrames = 0;
let comboCount = 0;
let comboTimer = 0;
let confetti = [];
let saveKey = "ecored_game_save";
let residuosSpawned = 0;
let totalResiduos = 0;
let residuosProcesados = 0;

let keys = { left: false, right: false };
const PLAYER_SPEED = 6;

function sonido(freq, tipo, dur = 0.12) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + dur);
}

const sfx = {
  esquivar() { sonido(880, "sine", 0.1); },
  chocar() {
    sonido(200, "sawtooth", 0.15);
    setTimeout(() => sonido(120, "sawtooth", 0.12), 60);
  },
  nivelCompleto() {
    sonido(523, "sine", 0.15);
    setTimeout(() => sonido(659, "sine", 0.15), 120);
    setTimeout(() => sonido(784, "sine", 0.25), 240);
  },
  gameOver() {
    sonido(400, "sine", 0.2);
    setTimeout(() => sonido(300, "sine", 0.2), 180);
    setTimeout(() => sonido(200, "sine", 0.35), 360);
  },
  click() { sonido(600, "sine", 0.06); },
  pausa() { sonido(400, "triangle", 0.08); },
  countdown(final = false) { sonido(final ? 800 : 500, "square", 0.08); },
  corazon() {
    sonido(523, "sine", 0.1);
    setTimeout(() => sonido(784, "sine", 0.15), 80);
  },
  combo() { sonido(1000 + comboCount * 100, "sine", 0.08); },
  victoria() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => sonido(f, "sine", 0.2), i * 140);
    });
  }
};

function initJuego(selector) {
  containerEl = document.querySelector(selector);
  if (!containerEl) return;
  containerEl.innerHTML = "";
  containerEl.style.display = "block";

  canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  canvas.className = "game-canvas";
  containerEl.appendChild(canvas);
  ctx = canvas.getContext("2d");

  jugador = { x: CANVAS_W / 2, y: CANVAS_H - 60, w: 48, h: 48 };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  mostrarMenu();
}

function onMouseMove(e) {
  if (estado !== "PLAYING") return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  jugador.x = (e.clientX - rect.left) * scaleX;
}

function onTouchStart(e) {
  e.preventDefault();
  if (estado !== "PLAYING") return;
  const rect = canvas.getBoundingClientRect();
  jugador.x = (e.touches[0].clientX - rect.left) * (CANVAS_W / rect.width);
}

function onTouchMove(e) {
  e.preventDefault();
  if (estado !== "PLAYING") return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  jugador.x = (e.touches[0].clientX - rect.left) * scaleX;
}

function onCanvasClick() {
  if (estado === "PLAYING") {
    sfx.pausa();
    estado = "PAUSE";
    mostrarOverlayPausa();
  }
}

function onKeyDown(e) {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
    keys.left = true;
    e.preventDefault();
  }
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    keys.right = true;
    e.preventDefault();
  }
}

function onKeyUp(e) {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
    keys.left = false;
  }
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    keys.right = false;
  }
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function getNivelSpeed() {
  const n = NIVELES[nivelActual];
  const progress = timerNivel / duracionNivel;
  const wave = Math.sin(progress * Math.PI * 4) * 0.3;
  return n.velocidad * (1 + wave);
}

function spawnResiduo() {
  if (residuosSpawned >= totalResiduos) return;
  const n = NIVELES[nivelActual];
  const tipoIdx = n.indices[Math.floor(Math.random() * n.indices.length)];
  const tipo = RESIDUOS[tipoIdx];
  const w = 40 + Math.random() * 16;
  const vel = getNivelSpeed() * (0.85 + Math.random() * 0.3);
  residuos.push({
    x: 30 + Math.random() * (CANVAS_W - 60),
    y: -50,
    w,
    h: w,
    tipo,
    vel,
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 0.04
  });
  residuosSpawned++;
}

function spawnPowerup() {
  const tipos = [
    { tipo: "corazon", emoji: "❤️", color: "#f44336" },
    { tipo: "escudo", emoji: "🛡️", color: "#2196F3" },
    { tipo: "tiempo", emoji: "⏰", color: "#FF9800" }
  ];
  const t = tipos[Math.floor(Math.random() * tipos.length)];
  powerups.push({
    x: 30 + Math.random() * (CANVAS_W - 60),
    y: -30,
    w: 30,
    h: 30,
    tipo: t,
    vel: 1.5 + Math.random() * 1,
    rot: 0
  });
}

function loop() {
  if (estado !== "PLAYING") return;
  update();
  render();
  animId = requestAnimationFrame(loop);
}

function update() {
  const now = performance.now();
  const n = NIVELES[nivelActual];

  timerNivel -= 1 / 60;

  if (now - lastSpawn >= n.frecuencia) {
    spawnResiduo();
    lastSpawn = now;
  }

  if (now - lastPowerupSpawn >= 8000 + Math.random() * 4000) {
    if (powerups.length < 2) {
      spawnPowerup();
      lastPowerupSpawn = now;
    }
  }

  comboTimer -= 1 / 60;
  if (comboTimer <= 0) {
    comboCount = 0;
  }

  if (shakeFrames > 0) shakeFrames--;

  for (let i = residuos.length - 1; i >= 0; i--) {
    const r = residuos[i];
    r.y += r.vel;
    r.rot += r.rotSpeed;

    const dx = Math.abs(jugador.x - r.x);
    const dy = Math.abs(jugador.y - r.y);
    const overlapX = (jugador.w + r.w) / 2 - dx;
    const overlapY = (jugador.h + r.h) / 2 - dy;

    if (overlapX > 0 && overlapY > 0) {
      sfx.chocar();
      shakeFrames = 12;
      residuos.splice(i, 1);
      residuosProcesados++;
      vidas--;
      comboCount = 0;
      score = Math.max(0, score - 50);
      if (vidas <= 0) {
        estado = "GAME_OVER";
        sfx.gameOver();
        saveProgress();
        mostrarGameOver();
        return;
      }
      continue;
    }

    if (r.y > CANVAS_H + 60) {
      residuos.splice(i, 1);
      residuosProcesados++;
      esquivados++;
      score += 10;
      comboCount++;
      comboTimer = 2;
      if (comboCount >= 3) {
        score += comboCount * 5;
        sfx.combo();
      } else {
        sfx.esquivar();
      }
    }
  }

  if (residuosSpawned >= totalResiduos && residuos.length === 0) {
    estado = "LEVEL_COMPLETE";
    sfx.nivelCompleto();
    score += 50 + Math.floor(timerNivel) * 2;
    saveProgress();
    mostrarNivelCompleto();
    return;
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += p.vel;
    p.rot += 0.02;

    const dx = Math.abs(jugador.x - p.x);
    const dy = Math.abs(jugador.y - p.y);
    const overlapX = (jugador.w + p.w) / 2 - dx;
    const overlapY = (jugador.h + p.h) / 2 - dy;

    if (overlapX > 0 && overlapY > 0) {
      sfx.corazon();
      powerups.splice(i, 1);
      if (p.tipo.tipo === "corazon" && vidas < 5) {
        vidas++;
        score += 25;
      } else if (p.tipo.tipo === "escudo") {
        score += 50;
      } else if (p.tipo.tipo === "tiempo") {
        timerNivel += 5;
        score += 25;
      }
      continue;
    }

    if (p.y > CANVAS_H + 40) {
      powerups.splice(i, 1);
    }
  }

  if (keys.left) jugador.x -= PLAYER_SPEED;
  if (keys.right) jugador.x += PLAYER_SPEED;

  jugador.x = clamp(jugador.x, jugador.w / 2, CANVAS_W - jugador.w / 2);
}

function render() {
  ctx.save();

  if (shakeFrames > 0) {
    const intensity = shakeFrames * 0.8;
    ctx.translate(
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity
    );
  }

  ctx.clearRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = "rgba(139,195,74,0.06)";
    ctx.fillRect(0, (i * 80 + performance.now() * 0.02) % CANVAS_H - 40, CANVAS_W, 2);
  }

  ctx.save();
  ctx.shadowColor = "#8BC34A";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "rgba(139,195,74,0.35)";
  ctx.beginPath();
  ctx.arc(jugador.x, jugador.y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 15;
  ctx.font = `${jugador.w}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🧑‍🌾", jugador.x, jugador.y);
  ctx.restore();

  residuos.forEach(r => {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    const t = r.tipo;

    ctx.fillStyle = t.color;
    ctx.strokeStyle = t.stroke;
    ctx.lineWidth = 2;

    if (t.shape === "rect") {
      const hw = t.w / 2;
      const hh = t.h / 2;
      ctx.fillRect(-hw, -hh, t.w, t.h);
      ctx.strokeRect(-hw, -hh, t.w, t.h);
    } else if (t.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (t.shape === "tri") {
      const hw = t.w / 2;
      ctx.beginPath();
      ctx.moveTo(0, -t.h / 2);
      ctx.lineTo(hw, t.h / 2);
      ctx.lineTo(-hw, t.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.emoji, 0, 0);

    ctx.restore();
  });

  powerups.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    ctx.fillStyle = p.tipo.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.font = "18px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.tipo.emoji, 0, 0);

    ctx.restore();
  });

  const n = NIVELES[nivelActual];
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, CANVAS_W, 44);

  ctx.font = "bold 13px Montserrat, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#F2C94C";
  ctx.fillText(`Nivel ${nivelActual + 1}`, 14, 16);

  ctx.fillStyle = "#8BC34A";
  ctx.fillText(`${score} pts`, 14, 34);

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText(`${residuosProcesados}/${totalResiduos} residuos`, CANVAS_W / 2, 16);

  const pct = totalResiduos > 0 ? Math.max(0, residuosProcesados / totalResiduos) : 0;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(CANVAS_W / 2 - 80, 28, 160, 6);
  ctx.fillStyle = pct > 0.3 ? "#8BC34A" : "#f44336";
  ctx.fillRect(CANVAS_W / 2 - 80, 28, 160 * pct, 6);

  ctx.textAlign = "right";
  ctx.fillStyle = "#fff";
  ctx.fillText(`⏱ ${Math.ceil(timerNivel)}s`, CANVAS_W - 14, 16);

  ctx.fillStyle = "#f44336";
  ctx.fillText("♥".repeat(vidas), CANVAS_W - 14, 34);

  if (comboCount >= 3) {
    ctx.font = "bold 16px Montserrat, sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.fillText(`COMBO x${comboCount}!`, CANVAS_W / 2, CANVAS_H - 20);
  }

  if (confetti.length > 0) {
    confetti.forEach(c => {
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, c.size, c.size);
    });
  }

  ctx.restore();
}

function crearConfetti(cantidad = 100) {
  const colores = ["#f44336", "#FFD700", "#4CAF50", "#2196F3", "#FF9800", "#9C27B0"];
  confetti = [];
  for (let i = 0; i < cantidad; i++) {
    confetti.push({
      x: Math.random() * CANVAS_W,
      y: -10 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 3,
      size: 4 + Math.random() * 6,
      color: colores[Math.floor(Math.random() * colores.length)],
      life: 1
    });
  }
}

function updateConfetti() {
  confetti.forEach(c => {
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.05;
    c.life -= 0.005;
  });
  confetti = confetti.filter(c => c.life > 0 && c.y < CANVAS_H + 20);
}

function animarConfetti(callback) {
  crearConfetti(150);
  let frames = 0;
  function frame() {
    updateConfetti();
    if (frames % 3 === 0) {
      render();
    }
    frames++;
    if (frames < 180) {
      requestAnimationFrame(frame);
    } else {
      confetti = [];
      callback();
    }
  }
  frame();
}

function mostrarMenu() {
  estado = "MENU";
  const save = loadProgress();
  const best = save?.bestScore || 0;
  const unlockedLevel = save?.unlockedLevel || 1;

  containerEl.innerHTML = `
    <div class="game-wrapper">
      <canvas class="game-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
      <div class="game-overlay">
        <div class="victory-emoji">♻️</div>
        <h2>Esquiva los Residuos</h2>
        <p class="subtitle">Aprende a clasificar mientras esquivas</p>
        <p style="font-size:0.85em; opacity:0.7;">Mejor puntuación: ${best}</p>
        <p style="font-size:0.8em; opacity:0.6;">Nivel desbloqueado: ${unlockedLevel}/10</p>
        <button class="game-btn play" id="btnPlay">🎮 Jugar</button>
        <button class="game-btn menu" id="btnRanking">🏆 Ranking</button>
        <div class="instructions">
          Mueve el mouse, flechas ←→ o desliza para esquivar<br>
          Recoge ❤️ para recuperar vida
        </div>
      </div>
    </div>`;
  canvas = containerEl.querySelector("canvas");
  ctx = canvas.getContext("2d");
  containerEl.querySelector("#btnPlay").addEventListener("click", () => {
    sfx.click();
    iniciarJuego();
  });
  containerEl.querySelector("#btnRanking").addEventListener("click", () => {
    sfx.click();
    mostrarRanking();
  });
}

function iniciarJuego() {
  nivelActual = 0;
  score = 0;
  vidas = 3;
  esquivados = 0;
  residuos = [];
  powerups = [];
  comboCount = 0;
  comboTimer = 0;
  shakeFrames = 0;
  confetti = [];
  residuosSpawned = 0;
  residuosProcesados = 0;
  jugador.x = CANVAS_W / 2;
  lastPowerupSpawn = performance.now();
  cargarNivel(0);
}

function cargarNivel(idx) {
  nivelActual = idx;
  esquivados = 0;
  residuos = [];
  powerups = [];
  residuosSpawned = 0;
  residuosProcesados = 0;
  lastPowerupSpawn = performance.now();
  const n = NIVELES[idx];
  totalResiduos = n.meta;
  duracionNivel = n.timer;
  timerNivel = duracionNivel;
  lastSpawn = 0;
  estado = "READY";
  mostrarCountdown(3);
}

function mostrarCountdown(num) {
  const n = NIVELES[nivelActual];
  containerEl.innerHTML = `
    <div class="game-wrapper">
      <canvas class="game-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
      <div class="game-overlay">
        <div class="countdown-text">${num}</div>
        <p>Nivel ${nivelActual + 1} - ${n.nombre}</p>
        <p class="subtitle">${n.meta} residuos caerán</p>
      </div>
    </div>`;
  canvas = containerEl.querySelector("canvas");
  ctx = canvas.getContext("2d");
  sfx.countdown(num === 1);
  if (num > 1) {
    setTimeout(() => mostrarCountdown(num - 1), 800);
  } else {
    setTimeout(() => {
      const overlay = containerEl.querySelector(".game-overlay");
      if (overlay) overlay.classList.add("hidden");
      estado = "PLAYING";
      lastSpawn = performance.now();
      loop();
    }, 700);
  }
}

async function saveProgress() {
  const save = loadProgress();
  const data = {
    bestScore: Math.max(save?.bestScore || 0, score),
    unlockedLevel: Math.max(save?.unlockedLevel || 1, nivelActual + 2),
    lastScore: score,
    lastLevel: nivelActual + 1,
    timestamp: Date.now()
  };
  localStorage.setItem(saveKey, JSON.stringify(data));

  try {
    const user = await getSupabaseUser();
    if (user) {
      await saveSupabaseScore(user.id, score, nivelActual + 1);
    }
  } catch (e) {
    console.warn("No se pudo guardar en Supabase", e.message);
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(saveKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function getSupabaseUser() {
  try {
    const { getSupabaseUser: getSbUser } = await import("./supabaseClient.js");
    const user = await getSbUser();
    return user || null;
  } catch {
    return null;
  }
}

async function saveSupabaseScore(userId, scoreValue, level) {
  try {
    const { supabase } = await import("./supabaseClient.js");
    const { data, error } = await supabase
      .from("game_scores")
      .insert({
        user_id: userId,
        score: scoreValue,
        level_reached: level
      })
      .select();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Error guardando score:", e.message);
    return null;
  }
}

async function fetchTopScores() {
  try {
    const { supabase } = await import("./supabaseClient.js");
    const { data, error } = await supabase
      .from("game_scores")
      .select("score, level_reached, user_id, profiles(nombre, apellido)")
      .order("score", { ascending: false });
    if (error) throw error;
    const byUser = {};
    for (const row of (data || [])) {
      const uid = row.user_id;
      if (!byUser[uid] || row.score > byUser[uid].score) {
        byUser[uid] = row;
      }
    }
    return Object.values(byUser)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch {
    return getLocalRanking();
  }
}

function getLocalRanking() {
  try {
    const raw = localStorage.getItem("ecored_game_ranking");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRanking(name, scoreValue) {
  try {
    const ranking = getLocalRanking();
    ranking.push({ name, score: scoreValue });
    ranking.sort((a, b) => b.score - a.score);
    localStorage.setItem("ecored_game_ranking", JSON.stringify(ranking.slice(0, 20)));
  } catch {}
}

async function mostrarGameOver() {
  cancelAnimationFrame(animId);
  saveProgress();

  const userName = localStorage.getItem("ecored_user") || "Jugador";
  saveLocalRanking(userName, score);

  let rankingHTML = "<p style='opacity:0.5;font-size:0.8em;'>Cargando ranking...</p>";
  try {
    const scores = await fetchTopScores();
    if (scores.length) {
      rankingHTML = scores.map((s, i) => {
        const name = s.profiles
          ? `${s.profiles.nombre || "Jugador"} ${s.profiles.apellido || ""}`.trim()
          : (s.name || "Jugador");
        return `
          <div class="game-ranking-item${s.score === score ? ' current' : ''}">
            <span class="rank">#${i + 1}</span>
            <span class="name">${name}</span>
            <span class="pts">${s.score} pts (Nv ${s.level_reached})</span>
          </div>`;
      }).join("");
    } else {
      const local = getLocalRanking();
      rankingHTML = local.length ? local.map((r, i) =>
        `<div class="game-ranking-item${r.score === score ? ' current' : ''}">
          <span class="rank">#${i + 1}</span>
          <span class="name">${r.name}</span>
          <span class="pts">${r.score}</span>
        </div>`
      ).join("") : "<p style='opacity:0.5;font-size:0.8em;'>Sé el primero en jugar</p>";
    }
  } catch {
    const local = getLocalRanking();
    rankingHTML = local.length ? local.map((r, i) =>
      `<div class="game-ranking-item${r.score === score ? ' current' : ''}">
        <span class="rank">#${i + 1}</span>
        <span class="name">${r.name}</span>
        <span class="pts">${r.score}</span>
      </div>`
    ).join("") : "<p style='opacity:0.5;font-size:0.8em;'>Sé el primero en jugar</p>";
  }

  containerEl.innerHTML = `
    <div class="game-wrapper">
      <canvas class="game-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
      <div class="game-overlay">
        <div class="victory-emoji">💀</div>
        <h2>Game Over</h2>
        <p>Nivel ${nivelActual + 1} - ${NIVELES[nivelActual].nombre}</p>
        <div class="score-display">${score}</div>
        <p>puntos</p>
        <div class="game-ranking">${rankingHTML}</div>
        <button class="game-btn retry" id="btnRetry">🔄 Reintentar</button>
        <button class="game-btn menu" id="btnMenu">📋 Menú</button>
      </div>
    </div>`;

  containerEl.querySelector("#btnRetry").addEventListener("click", () => {
    sfx.click();
    iniciarJuego();
  });
  containerEl.querySelector("#btnMenu").addEventListener("click", () => {
    sfx.click();
    mostrarMenu();
  });
}

function mostrarNivelCompleto() {
  cancelAnimationFrame(animId);
  saveProgress();
  const esUltimo = nivelActual >= NIVELES.length - 1;

  if (esUltimo) {
    sfx.victoria();
    saveProgress();

    containerEl.innerHTML = `
      <div class="game-wrapper">
        <canvas class="game-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
        <div class="game-overlay">
          <div class="victory-emoji">🏆</div>
          <h2>¡Victoria!</h2>
          <p>Has completado los 10 niveles</p>
          <div class="stars">⭐⭐⭐</div>
          <div class="score-display">${score}</div>
          <p>puntos totales</p>
          <button class="game-btn play" id="btnPlayAgain">🎮 Jugar de nuevo</button>
          <button class="game-btn menu" id="btnMenu">📋 Menú</button>
        </div>
      </div>`;

    animarConfetti(() => {});

    containerEl.querySelector("#btnPlayAgain").addEventListener("click", () => {
      sfx.click();
      iniciarJuego();
    });
    containerEl.querySelector("#btnMenu").addEventListener("click", () => {
      sfx.click();
      mostrarMenu();
    });
  } else {
    containerEl.innerHTML = `
      <div class="game-wrapper">
        <canvas class="game-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
        <div class="game-overlay">
          <div class="victory-emoji">✅</div>
          <h2>¡Nivel Completado!</h2>
          <p>Nivel ${nivelActual + 1} - ${NIVELES[nivelActual].nombre}</p>
          <div class="score-display">${score}</div>
          <p>+${50 + Math.floor(timerNivel) * 2} bonus</p>
          <button class="game-btn play" id="btnNext">➡️ Siguiente Nivel</button>
        </div>
      </div>`;

    containerEl.querySelector("#btnNext").addEventListener("click", () => {
      sfx.click();
      cargarNivel(nivelActual + 1);
    });
  }
}

function mostrarOverlayPausa() {
  cancelAnimationFrame(animId);
  containerEl.innerHTML = `
    <div class="game-wrapper">
      <canvas class="game-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
      <div class="game-overlay">
        <div class="victory-emoji">⏸️</div>
        <h2>Pausa</h2>
        <p>Nivel ${nivelActual + 1} - ${NIVELES[nivelActual].nombre}</p>
        <div class="score-display">${score} pts</div>
        <button class="game-btn play" id="btnResume">▶️ Continuar</button>
        <button class="game-btn retry" id="btnRestart">🔄 Reiniciar</button>
        <button class="game-btn menu" id="btnMenuPause">📋 Menú</button>
      </div>
    </div>`;

  containerEl.querySelector("#btnResume").addEventListener("click", () => {
    sfx.click();
    estado = "PLAYING";
    containerEl.innerHTML = "";
    containerEl.appendChild(canvas);
    lastSpawn = performance.now();
    loop();
  });
  containerEl.querySelector("#btnRestart").addEventListener("click", () => {
    sfx.click();
    iniciarJuego();
  });
  containerEl.querySelector("#btnMenuPause").addEventListener("click", () => {
    sfx.click();
    mostrarMenu();
  });
}

async function mostrarRanking() {
  const scores = await fetchTopScores();
  const local = getLocalRanking();

  let rankingHTML = "";

  if (scores.length) {
    rankingHTML = scores.map((s, i) => {
      const name = s.profiles
        ? `${s.profiles.nombre || "Jugador"} ${s.profiles.apellido || ""}`.trim()
        : "Jugador";
      return `
        <div class="game-ranking-item">
          <span class="rank">#${i + 1}</span>
          <span class="name">${name}</span>
          <span class="pts">${s.score} pts (Nv ${s.level_reached})</span>
        </div>`;
    }).join("");
  } else if (local.length) {
    rankingHTML = local.map((r, i) =>
      `<div class="game-ranking-item">
        <span class="rank">#${i + 1}</span>
        <span class="name">${r.name}</span>
        <span class="pts">${r.score}</span>
      </div>`
    ).join("");
  } else {
    rankingHTML = "<p style='opacity:0.5;font-size:0.85em;'>Aún no hay puntuaciones</p>";
  }

  containerEl.innerHTML = `
    <div class="game-wrapper">
      <canvas class="game-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
      <div class="game-overlay">
        <div class="victory-emoji">🏆</div>
        <h2>Ranking</h2>
        <div class="game-ranking">${rankingHTML}</div>
        <button class="game-btn menu" id="btnBack">← Volver</button>
      </div>
    </div>`;

  canvas = containerEl.querySelector("canvas");
  ctx = canvas.getContext("2d");

  containerEl.querySelector("#btnBack").addEventListener("click", () => {
    sfx.click();
    mostrarMenu();
  });
}

export { initJuego };
