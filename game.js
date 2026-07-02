(() => {
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const highScoreEl = document.getElementById('high-score');
  const overlay = document.getElementById('overlay');
  const overlayMessage = document.getElementById('overlay-message');
  const startBtn = document.getElementById('start-btn');
  const touchControls = document.getElementById('touch-controls');
  const qbPauseBtn = document.getElementById('qb-pause');
  const loadFillEl = document.getElementById('load-fill');
  const loadLabelEl = document.getElementById('cognitive-label');
  const levelLabelEl = document.getElementById('level-label');
  const levelFillEl = document.getElementById('level-fill');
  const comboEl = document.getElementById('combo');
  const toastEl = document.getElementById('toast');

  const summaryEl = document.getElementById('summary');
  const summaryBehaviorEl = document.getElementById('summary-behavior');
  const sumScoreEl = document.getElementById('sum-score');
  const sumLevelEl = document.getElementById('sum-level');
  const sumHighEl = document.getElementById('sum-high');
  const sumTotalEl = document.getElementById('sum-total');
  const sumRedEl = document.getElementById('sum-red');
  const sumGoldEl = document.getElementById('sum-gold');
  const sumRatioEl = document.getElementById('sum-ratio');
  const sumStreakEl = document.getElementById('sum-streak');
  const sumFogEl = document.getElementById('sum-fog');
  const sumSlowEl = document.getElementById('sum-slow');
  const sumCompassEl = document.getElementById('sum-compass');

  const GRID_SIZE = 20;
  const TILE_COUNT = canvas.width / GRID_SIZE;
  const BASE_SPEED_MS = 140;
  const MAX_SPEEDUP_MS = 95;
  const HIGH_SCORE_KEY = 'snake-high-score';

  // Mekanik 1: Kısıtlı Görüş (Fog of War). Başlangıç yarıçapı sabittir ama
  // "Sis Dağıtıcı" eşyasıyla kalıcı olarak genişleyip tam bilgiye yaklaşır.
  const BASE_VISIBILITY_TILES = 3.5;
  const FOG_UPGRADE_STEP_TILES = 1.8;
  const MAX_FOG_UPGRADES = 6;
  let fogUpgradesBought = 0;
  let visibilityRadiusTiles = BASE_VISIBILITY_TILES;

  // Sis katmanı ayrı bir offscreen canvas'ta hazırlanır ve asıl sahnenin
  // üzerine bindirilir; aksi halde tek katmanlı canvas'a opak siyah çizmek
  // altındaki yılan/yem piksellerini kalıcı olarak siler.
  const fogCanvas = document.createElement('canvas');
  fogCanvas.width = canvas.width;
  fogCanvas.height = canvas.height;
  const fogCtx = fogCanvas.getContext('2d');

  // Mekanik 2: Çoklu Yem Karar Matrisi.
  const RED_FOOD_POINTS = 1;
  const RED_COIN_BASE = 2;
  const GOLD_FOOD_POINTS = 5;
  const GOLD_MIN_DISTANCE_TILES = TILE_COUNT * 0.55;

  // Mekanik 3: Zaman Yavaşlatıcı (zaman kısıtının geçici olarak kalkması).
  const SLOW_DURATION_MS = 5000;
  const SLOW_FACTOR = 1.8;
  let slowActiveUntil = 0;

  // Mekanik 3b: Algoritmik Pusula (altın yemi sisin içinden geçici olarak açığa çıkarır).
  const COMPASS_DURATION_MS = 10000;
  let compassActiveUntil = 0;
  let compassUsedCount = 0;

  // Mekanik 3c: Güç yemleri — eski mağaza eşyaları artık haritada sürpriz
  // noktalarda kısa süreliğine belirir; yenmezse kaybolur, bir süre sonra
  // rastgele bir tür yeniden çıkar. Sisin içinden de görünürler: uzaktaki
  // fırsata gitmek/gitmemek kararı (temptation) oyuncuya bırakılır.
  const POWERUP_VISIBLE_MS = 6000;
  const POWERUP_SPAWN_MIN_MS = 8000;
  const POWERUP_SPAWN_MAX_MS = 16000;
  const POWERUP_MIN_DISTANCE_TILES = 4;
  const POWERUP_INFO = {
    fog: { color: '#38bdf8', label: 'Sis Dağıtıcı' },
    slow: { color: '#a78bfa', label: 'Zaman Yavaşlatıcı' },
    compass: { color: '#fb923c', label: 'Algoritmik Pusula' },
  };
  let powerup = null;
  let powerupExpiresAt = 0;
  let powerupNextSpawnAt = 0;

  // Mekanik 4: Beklenti eşiği / combo çarpanı — sadece güvenli (kırmızı)
  // yemle "yetinmeye" devam edildikçe altın kazancı azalır.
  let consecutiveRed = 0;
  let comboMultiplier = 1;
  let maxRedStreak = 0;

  // Seviyeler: skor eşikleri, 10. seviyeye kadar.
  const LEVEL_THRESHOLDS = [15, 35, 60, 90, 130, 175, 225, 285, 350];
  let level = 1;
  let reachedMaxLevel = false;

  // Oyun sonu "Karar Analizi" için davranış istatistikleri.
  let redEatenCount = 0;
  let goldEatenCount = 0;
  let slowUsedCount = 0;

  /** @type {{x:number, y:number}[]} */
  let snake;
  let direction;
  let pendingDirection;
  let redFood;
  let goldFood;
  let score;
  let coins;
  let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  let loopId = null;
  let rafId = null;
  let toastTimeoutId = null;
  let running = false;
  let paused = false;

  highScoreEl.textContent = highScore;

  function resetState() {
    snake = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    direction = { x: 1, y: 0 };
    pendingDirection = direction;
    score = 0;
    coins = 0;
    level = 1;
    reachedMaxLevel = false;
    consecutiveRed = 0;
    comboMultiplier = 1;
    fogUpgradesBought = 0;
    visibilityRadiusTiles = BASE_VISIBILITY_TILES;
    slowActiveUntil = 0;
    compassActiveUntil = 0;
    compassUsedCount = 0;
    powerup = null;
    powerupExpiresAt = 0;
    scheduleNextPowerupSpawn();
    maxRedStreak = 0;
    redEatenCount = 0;
    goldEatenCount = 0;
    slowUsedCount = 0;
    redFood = null;
    goldFood = null;
    spawnRedFood();
    spawnGoldFood();
    summaryEl.classList.add('hidden');
    updateHud();
  }

  function tileDist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function emptyCells(extraExcluded = []) {
    const cells = [];
    for (let x = 0; x < TILE_COUNT; x += 1) {
      for (let y = 0; y < TILE_COUNT; y += 1) {
        const blocked =
          snake.some((seg) => seg.x === x && seg.y === y) ||
          extraExcluded.some((c) => c && c.x === x && c.y === y);
        if (!blocked) cells.push({ x, y });
      }
    }
    return cells;
  }

  function spawnRedFood() {
    const head = snake[0];
    const cells = emptyCells([goldFood, powerup]);
    let pool = cells.filter((c) => tileDist(c, head) <= visibilityRadiusTiles);
    if (pool.length === 0) {
      pool = [...cells].sort((a, b) => tileDist(a, head) - tileDist(b, head)).slice(0, 5);
    }
    redFood = pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnGoldFood() {
    const head = snake[0];
    const cells = emptyCells([redFood, powerup]);
    let pool = cells.filter((c) => tileDist(c, head) >= GOLD_MIN_DISTANCE_TILES);
    if (pool.length === 0) {
      const sorted = [...cells].sort((a, b) => tileDist(b, head) - tileDist(a, head));
      pool = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.25)));
    }
    goldFood = pool[Math.floor(Math.random() * pool.length)];
  }

  const LEVEL_SPEED_FACTOR = 1.05;

  function currentSpeedUp() {
    return Math.min(BASE_SPEED_MS - BASE_SPEED_MS / (LEVEL_SPEED_FACTOR ** (level - 1)), MAX_SPEEDUP_MS);
  }

  function currentSpeed() {
    let speed = BASE_SPEED_MS - currentSpeedUp();
    if (Date.now() < slowActiveUntil) speed *= SLOW_FACTOR;
    return speed;
  }

  function levelForScore(s) {
    let lvl = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
      if (s >= LEVEL_THRESHOLDS[i]) lvl = i + 2;
    }
    return Math.min(lvl, 10);
  }

  function showToast(text, ms = 2200) {
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => toastEl.classList.add('hidden'), ms);
  }

  function hideToast() {
    clearTimeout(toastTimeoutId);
    toastEl.classList.add('hidden');
  }

  function checkLevelUp() {
    const newLevel = levelForScore(score);
    if (newLevel > level) {
      level = newLevel;
      if (level >= 10 && !reachedMaxLevel) {
        reachedMaxLevel = true;
        showToast('Seviye 10: Sınırlı Rasyonellik Ustası!', 3000);
      } else {
        showToast(`Seviye ${level}!`);
      }
    }
  }

  // Mekanik 3: bilişsel yük göstergesi — hız arttıkça System 2'den
  // System 1'e geçişi görselleştirir.
  function updateCognitiveLoad() {
    const pct = Math.round((currentSpeedUp() / MAX_SPEEDUP_MS) * 100);
    loadFillEl.style.width = `${pct}%`;
    if (pct < 35) {
      loadLabelEl.textContent = 'Sistem 2: Analitik Düşünme';
      loadFillEl.style.background = 'var(--accent)';
    } else if (pct < 70) {
      loadLabelEl.textContent = 'Geçiş Aşaması';
      loadFillEl.style.background = '#facc15';
    } else {
      loadLabelEl.textContent = 'Sistem 1: Sezgisel/Refleks';
      loadFillEl.style.background = 'var(--danger)';
    }
  }

  function updateLevelUi() {
    const prev = level > 1 ? LEVEL_THRESHOLDS[level - 2] : 0;
    const next = level < 10 ? LEVEL_THRESHOLDS[level - 1] : prev;
    const pct = level >= 10 ? 100 : Math.min(100, Math.round(((score - prev) / (next - prev)) * 100));
    levelFillEl.style.width = `${pct}%`;
    levelLabelEl.textContent = level >= 10 ? 'Seviye 10 / 10 (Maksimum)' : `Seviye ${level} / 10`;
  }

  function updateQuickBarUi() {
    qbPauseBtn.disabled = !running;
    qbPauseBtn.textContent = paused ? '▶ Devam' : '⏸ Duraklat';
  }

  function updateComboUi() {
    comboEl.textContent = `x${comboMultiplier.toFixed(2)}`;
    comboEl.style.color = comboMultiplier < 0.99 ? 'var(--danger)' : 'var(--accent)';
  }

  function updateHud() {
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    updateLevelUi();
    updateCognitiveLoad();
    updateComboUi();
    updateQuickBarUi();
  }

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function scheduleNextPowerupSpawn() {
    powerupNextSpawnAt = Date.now() + randBetween(POWERUP_SPAWN_MIN_MS, POWERUP_SPAWN_MAX_MS);
  }

  function spawnPowerup() {
    // Sis Dağıtıcı görüş tavana ulaştıysa artık çıkmaz.
    const types = Object.keys(POWERUP_INFO).filter(
      (t) => t !== 'fog' || fogUpgradesBought < MAX_FOG_UPGRADES,
    );
    const type = types[Math.floor(Math.random() * types.length)];
    const head = snake[0];
    const cells = emptyCells([redFood, goldFood]);
    let pool = cells.filter((c) => tileDist(c, head) >= POWERUP_MIN_DISTANCE_TILES);
    if (pool.length === 0) pool = cells;
    if (pool.length === 0) {
      scheduleNextPowerupSpawn();
      return;
    }
    const cell = pool[Math.floor(Math.random() * pool.length)];
    powerup = { type, x: cell.x, y: cell.y };
    powerupExpiresAt = Date.now() + POWERUP_VISIBLE_MS;
    showToast(`${POWERUP_INFO[type].label} belirdi!`, 1800);
  }

  function applyPowerup(type) {
    if (type === 'fog') {
      fogUpgradesBought += 1;
      visibilityRadiusTiles += FOG_UPGRADE_STEP_TILES;
      showToast('Görüş alanı kalıcı olarak genişledi!');
    } else if (type === 'slow') {
      slowActiveUntil = Date.now() + SLOW_DURATION_MS;
      slowUsedCount += 1;
      showToast('Zaman yavaşladı! (5 sn)');
    } else {
      compassActiveUntil = Date.now() + COMPASS_DURATION_MS;
      compassUsedCount += 1;
      showToast('Pusula aktif: altın görünür! (10 sn)');
    }
  }

  function tick() {
    direction = pendingDirection;
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };

    if (
      head.x < 0 || head.x >= TILE_COUNT ||
      head.y < 0 || head.y >= TILE_COUNT ||
      snake.some((seg) => seg.x === head.x && seg.y === head.y)
    ) {
      return gameOver();
    }

    snake.unshift(head);

    const now = Date.now();
    if (!powerup && now >= powerupNextSpawnAt) {
      spawnPowerup();
    } else if (powerup && now >= powerupExpiresAt) {
      powerup = null;
      scheduleNextPowerupSpawn();
    }

    if (powerup && head.x === powerup.x && head.y === powerup.y) {
      applyPowerup(powerup.type);
      powerup = null;
      scheduleNextPowerupSpawn();
      updateHud();
    }

    // Kırmızı yem "her zaman" görüş alanının içinde kalmalıdır (tatmin
    // edici/kolay ulaşılır hedef); yılan uzaklaşıp onu görüş dışına
    // bırakırsa görüş alanı içinde yeniden konumlandırılır.
    if (tileDist(redFood, head) > visibilityRadiusTiles) {
      spawnRedFood();
    }

    if (head.x === redFood.x && head.y === redFood.y) {
      consecutiveRed += 1;
      maxRedStreak = Math.max(maxRedStreak, consecutiveRed);
      redEatenCount += 1;
      comboMultiplier = Math.max(0.4, 1 - Math.max(0, consecutiveRed - 2) * 0.15);
      score += RED_FOOD_POINTS;
      coins += Math.max(0, Math.round(RED_COIN_BASE * comboMultiplier));
      spawnRedFood();
      checkLevelUp();
      updateHud();
    } else if (head.x === goldFood.x && head.y === goldFood.y) {
      consecutiveRed = 0;
      comboMultiplier = 1;
      goldEatenCount += 1;
      score += GOLD_FOOD_POINTS;
      coins += GOLD_FOOD_POINTS;
      spawnGoldFood();
      checkLevelUp();
      updateHud();
    } else {
      snake.pop();
    }

    scheduleNext();
  }

  function scheduleNext() {
    clearTimeout(loopId);
    loopId = setTimeout(tick, currentSpeed());
  }

  function drawFoodShape(cell, color, glow) {
    const cx = cell.x * GRID_SIZE + GRID_SIZE / 2;
    const cy = cell.y * GRID_SIZE + GRID_SIZE / 2;
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, GRID_SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function applyFogOfWar() {
    const head = snake[0];
    const headPx = {
      x: head.x * GRID_SIZE + GRID_SIZE / 2,
      y: head.y * GRID_SIZE + GRID_SIZE / 2,
    };
    const visibilityRadiusPx = visibilityRadiusTiles * GRID_SIZE;

    fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    fogCtx.fillStyle = '#000';
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

    fogCtx.globalCompositeOperation = 'destination-out';
    const gradient = fogCtx.createRadialGradient(
      headPx.x, headPx.y, 0,
      headPx.x, headPx.y, visibilityRadiusPx,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    fogCtx.fillStyle = gradient;
    fogCtx.beginPath();
    fogCtx.arc(headPx.x, headPx.y, visibilityRadiusPx, 0, Math.PI * 2);
    fogCtx.fill();
    fogCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(fogCanvas, 0, 0);

    return { headPx, visibilityRadiusPx };
  }

  function drawGoldHint(headPx, visibilityRadiusPx) {
    const goldPx = {
      x: goldFood.x * GRID_SIZE + GRID_SIZE / 2,
      y: goldFood.y * GRID_SIZE + GRID_SIZE / 2,
    };
    const dx = goldPx.x - headPx.x;
    const dy = goldPx.y - headPx.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= visibilityRadiusPx) return;

    const angle = Math.atan2(dy, dx);
    const hintDist = visibilityRadiusPx - 10;
    const hx = headPx.x + Math.cos(angle) * hintDist;
    const hy = headPx.y + Math.sin(angle) * hintDist;
    const pulse = 0.35 + 0.55 * Math.abs(Math.sin(performance.now() / 400));

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#23262b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawFoodShape(goldFood, '#facc15', true);
    drawFoodShape(redFood, '#f87171', false);

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
      ctx.fillRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    const { headPx, visibilityRadiusPx } = applyFogOfWar();

    // Algoritmik Pusula aktifken altın yem, sisi delip 10 sn boyunca
    // doğrudan (rota çizmeden) görünür kalır.
    if (Date.now() < compassActiveUntil) {
      drawFoodShape(goldFood, '#facc15', true);
    } else {
      drawGoldHint(headPx, visibilityRadiusPx);
    }

    // Güç yemleri sisin üstüne çizilir: uzaktaki fırsat her zaman görünür.
    if (powerup) drawPowerup();
  }

  function drawPowerup() {
    const { color } = POWERUP_INFO[powerup.type];
    const remaining = powerupExpiresAt - Date.now();
    // Son 2 saniyede yanıp sönerek kaybolmak üzere olduğunu belli eder.
    if (remaining < 2000 && Math.floor(remaining / 200) % 2 === 0) return;
    const cx = powerup.x * GRID_SIZE + GRID_SIZE / 2;
    const cy = powerup.y * GRID_SIZE + GRID_SIZE / 2;
    const pulse = 1 + 0.15 * Math.sin(performance.now() / 180);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, (GRID_SIZE / 2 - 4) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, (GRID_SIZE / 2 - 1) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function renderLoop() {
    draw();
    updateQuickBarUi();
    rafId = requestAnimationFrame(renderLoop);
  }

  function startRender() {
    cancelAnimationFrame(rafId);
    renderLoop();
  }

  function stopRender() {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function behaviorProfile() {
    const total = redEatenCount + goldEatenCount;
    if (total === 0) {
      return {
        label: 'Veri Yetersiz',
        desc: 'Hiç yem yemeden oyunu bitirdin, bir davranış profili çıkarılamıyor.',
      };
    }
    const goldRatio = goldEatenCount / total;
    if (goldRatio >= 0.5) {
      return {
        label: 'Rasyonel Maksimize Edici',
        desc: 'Yemlerin yarısından fazlasında riskli ama yüksek getirili altını hedefledin — optimal karar arayışı baskındı.',
      };
    }
    if (goldRatio >= 0.25) {
      return {
        label: 'Dengeli Karar Verici',
        desc: 'Güvenli ve riskli seçenekler arasında makul bir denge kurdun.',
      };
    }
    return {
      label: 'Yetinmeci (Satisficing) Karar Verici',
      desc: 'Yemlerin büyük çoğunluğunda önündeki güvenli/düşük getiriyle yetindin — klasik sınırlı rasyonellik davranışı.',
    };
  }

  function showSummary() {
    const total = redEatenCount + goldEatenCount;
    const ratio = total === 0 ? 0 : Math.round((goldEatenCount / total) * 100);
    const profile = behaviorProfile();

    summaryBehaviorEl.textContent = `${profile.label}: ${profile.desc}`;
    sumScoreEl.textContent = score;
    sumLevelEl.textContent = level;
    sumHighEl.textContent = highScore;
    sumTotalEl.textContent = total;
    sumRedEl.textContent = redEatenCount;
    sumGoldEl.textContent = goldEatenCount;
    sumRatioEl.textContent = `%${ratio}`;
    sumStreakEl.textContent = maxRedStreak;
    sumFogEl.textContent = fogUpgradesBought;
    sumSlowEl.textContent = slowUsedCount;
    sumCompassEl.textContent = compassUsedCount;
    summaryEl.classList.remove('hidden');
  }

  function gameOver() {
    running = false;
    clearTimeout(loopId);
    stopRender();
    draw();
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
      highScoreEl.textContent = highScore;
    }
    hideToast();
    overlayMessage.textContent = '';
    startBtn.textContent = 'Yeniden Başlat';
    overlay.classList.remove('hidden');
    showSummary();
    updateQuickBarUi();
  }

  function startGame() {
    resetState();
    running = true;
    paused = false;
    overlay.classList.add('hidden');
    startRender();
    scheduleNext();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      clearTimeout(loopId);
      stopRender();
      hideToast();
      overlayMessage.textContent = '';
      startBtn.textContent = 'Devam Et';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
      startRender();
      scheduleNext();
    }
    // render döngüsü duraklamada durduğu için buton durumları elle tazelenir
    updateQuickBarUi();
  }

  function setDirection(x, y) {
    // prevent reversing directly into the snake's own body
    if (direction.x === -x && direction.y === -y) return;
    pendingDirection = { x, y };
  }

  const KEY_MAP = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!running) {
        startGame();
      } else {
        togglePause();
      }
      return;
    }

    const dir = KEY_MAP[e.key];
    if (dir && running && !paused) {
      e.preventDefault();
      setDirection(dir[0], dir[1]);
    }
  });

  startBtn.addEventListener('click', () => {
    if (paused) {
      togglePause();
    } else {
      startGame();
    }
  });

  // pointerdown, click'e göre dokunuşta ~1 kare erken tetiklenir; hızlı bir
  // oyunda bu gecikme ölüm/kaçış farkı yaratır.
  touchControls.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('button[data-dir]');
    if (!btn || !running || paused) return;
    e.preventDefault();
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [x, y] = map[btn.dataset.dir];
    setDirection(x, y);
  });

  // Mobil ana kontrol: tahta üzerinde kaydırarak yön verme. Parmak
  // kaldırılmadan da sürüklemeye devam ederek art arda yön değiştirilebilir;
  // her eşik aşımında referans noktası güncellenir.
  const SWIPE_MIN_PX = 24;
  let swipeRef = null;

  canvas.addEventListener('touchstart', (e) => {
    if (!running || paused) return;
    e.preventDefault();
    const t = e.touches[0];
    swipeRef = { x: t.clientX, y: t.clientY };
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!swipeRef) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - swipeRef.x;
    const dy = t.clientY - swipeRef.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(Math.sign(dx), 0);
    } else {
      setDirection(0, Math.sign(dy));
    }
    swipeRef = { x: t.clientX, y: t.clientY };
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    swipeRef = null;
  });

  qbPauseBtn.addEventListener('click', togglePause);

  // initial paint so the board isn't blank behind the overlay
  resetState();
  draw();
})();
