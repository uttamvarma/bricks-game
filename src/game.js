// Playable demo: ball, paddle, bricks, score, lives, controls
console.log('Bricks Game started — playable demo');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// DOM HUD
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const restartBtn = document.getElementById('restart');

const CANVAS_RATIO = 16 / 10;

function resize() {
  const prevWidth = canvas.width || null;
  const prevHeight = canvas.height || null;

  const isCompact = window.innerWidth < 640;
  const horizontalMargin = isCompact ? 28 : 120;
  const verticalMargin = isCompact ? 180 : 280;
  const maxWidth = Math.max(320, Math.min(900, window.innerWidth - horizontalMargin));
  const maxHeight = Math.max(420, Math.min(720, window.innerHeight - verticalMargin));

  let width = Math.round(maxWidth);
  let height = Math.round(width / CANVAS_RATIO);

  if (height > maxHeight) {
    height = Math.round(maxHeight);
    width = Math.round(height * CANVAS_RATIO);
  }

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  layoutBricks();

  if (megaCat) {
    const scaleX = prevWidth ? width / prevWidth : 1;
    const scaleY = prevHeight ? height / prevHeight : 1;
    megaCat.x *= scaleX;
    megaCat.y *= scaleY;
    megaCat.radius = Math.max(32, Math.min(60, Math.min(canvas.width, canvas.height) * 0.08));
    megaCat.x = Math.max(megaCat.radius, Math.min(canvas.width - megaCat.radius, megaCat.x));
    const floor = canvas.height - 70;
    megaCat.y = Math.min(Math.max(megaCat.radius, megaCat.y), floor - megaCat.radius);
  }

  paddle.x = Math.min(paddle.x, canvas.width - paddle.w);
}

// Game state
let paddle = { w: 120, h: 14, x: 0, speed: 640 };
let ball = { x: 0, y: 0, r: 9, vx: 200, vy: -200 };
let bricks = [];
const brickPalette = [
  ['#38bdf8', '#0ea5e9'],
  ['#34d399', '#059669'],
  ['#fbbf24', '#f59e0b'],
  ['#fb7185', '#f43f5e'],
  ['#c084fc', '#a855f7']
];

const levels = [
  {
    id: 1,
    intro: 'Level 1 — Press Space to Start',
    build() {
      const rows = 5;
      const cols = 8;
      const bricks = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const palette = brickPalette[r % brickPalette.length];
          bricks.push({
            row: r,
            col: c,
            colors: {
              base: palette[0],
              accent: palette[1] ?? palette[0]
            },
            special: false
          });
        }
      }
      return { rows, cols, bricks };
    }
  },
  {
    id: 2,
    intro: 'Level 2 — Free the golden cats! Press Space to continue',
    build() {
      const layout = [
        { row: 0, col: 2 },
        { row: 1, col: 1 },
        { row: 1, col: 3 },
        { row: 2, col: 0 },
        { row: 2, col: 4 }
      ];
      const rows = 4;
      const cols = 5;
      const goldenColors = {
        base: '#fbbf24',
        accent: '#fde68a'
      };
      const bricks = layout.map((pos) => ({
        row: pos.row,
        col: pos.col,
        colors: goldenColors,
        special: true
      }));
      return { rows, cols, bricks };
    }
  }
];
let cols = 8;
let rows = 5;
let brick = { w: 0, h: 22, padding: 8, offsetTop: 64, offsetLeft: 20 };
let score = 0;
let lives = 3;
let level = 1;
let levelIndex = 0;
let playing = false;
let lastTs = performance.now();
let keys = { left: false, right: false };
let cats = [];
let megaCat = null;
let mergingCats = false;
let mergeTimer = 0;
let specialBricksRemaining = 0;
let celebrationActive = false;
let celebrationTimer = 0;
let celebrationOverlayShown = false;
let bricksRemaining = 0;

window.addEventListener('resize', () => {
  resize();
});
resize();

function init() {
  startLevel(0, { message: levels[0]?.intro });
}

function startLevel(index, options = {}) {
  levelIndex = Math.max(0, Math.min(index, levels.length - 1));
  level = levels[levelIndex]?.id ?? levelIndex + 1;
  paddle.x = (canvas.width - paddle.w) / 2;
  resetBall();
  cats = [];
  megaCat = null;
  mergingCats = false;
  mergeTimer = 0;
  celebrationActive = false;
  celebrationTimer = 0;
  celebrationOverlayShown = false;
  initBricks();
  updateHUD();
  playing = false;
  if (options.showOverlay !== false) {
    const message = options.message ?? levels[levelIndex]?.intro ?? `Level ${level} — Press Space to Start`;
    showOverlay(message);
  }
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 60;
  // randomized small angle
  const angle = (Math.random() * Math.PI / 3) - Math.PI / 6; // -30°..30°
  const speed = 260;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = -Math.abs(Math.sin(angle) * speed) - 80;
}

function layoutBricks() {
  if (!bricks.length) return;
  const margin = Math.max(12, Math.round(canvas.width * 0.05));
  const usableWidth = canvas.width - margin * 2;
  const totalPadding = (cols - 1) * brick.padding;
  brick.w = Math.max(24, Math.floor((usableWidth - totalPadding) / cols));
  const totalWidth = brick.w * cols + totalPadding;
  brick.offsetLeft = Math.max(margin, Math.floor((canvas.width - totalWidth) / 2));
  brick.offsetTop = Math.max(48, Math.round(canvas.height * 0.08));
  for (let b of bricks) {
    b.x = brick.offsetLeft + b.col * (brick.w + brick.padding);
    b.y = brick.offsetTop + b.row * (brick.h + brick.padding);
    b.w = brick.w;
    b.h = brick.h;
  }
}

function initBricks() {
  const config = levels[levelIndex];
  if (!config) {
    bricks = [];
    bricksRemaining = 0;
    return;
  }
  const { rows: levelRows, cols: levelCols, bricks: levelBricks } = config.build();
  rows = levelRows;
  cols = levelCols;
  bricks = levelBricks.map((b, idx) => ({
    row: b.row,
    col: b.col,
    x: 0,
    y: 0,
    w: 0,
    h: brick.h,
    alive: true,
    colors: b.colors,
    special: Boolean(b.special),
    id: b.id ?? `lv${level}-brick-${idx}`
  }));
  specialBricksRemaining = bricks.filter((b) => b.special).length;
  bricksRemaining = bricks.length;
  layoutBricks();
}

function updateHUD() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  levelEl.textContent = String(level);
}

function showOverlay(text, options = {}) {
  const showRestartButton = Boolean(options.showRestartButton);
  overlayText.textContent = text;
  restartBtn.classList.toggle('hidden', !showRestartButton);
  restartBtn.disabled = !showRestartButton;
  restartBtn.setAttribute('aria-hidden', String(!showRestartButton));
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function restart() {
  score = 0;
  lives = 3;
  startLevel(0, { message: levels[0]?.intro });
}

restartBtn.addEventListener('click', () => {
  restart();
  hideOverlay();
  playing = true;
});

// Input
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.code === 'Space') {
    if (celebrationActive && celebrationOverlayShown && levelIndex === levels.length - 1) {
      return;
    }
    if (!playing) {
      hideOverlay();
      playing = true;
    }
    if (overlay.classList.contains('hidden') === false) hideOverlay();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

// Mouse control — move paddle with pointer
function movePaddleToClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const clamped = Math.max(0, Math.min(canvas.width - paddle.w, mx - paddle.w / 2));
  paddle.x = clamped;
}

canvas.addEventListener('mousemove', (e) => {
  movePaddleToClientX(e.clientX);
});

function startFromUserInput() {
  if (celebrationActive && celebrationOverlayShown && levelIndex === levels.length - 1) {
    return;
  }
  if (!playing) { hideOverlay(); playing = true; }
}

canvas.addEventListener('click', () => {
  startFromUserInput();
});

function handleTouchMove(e) {
  const touch = e.touches[0] ?? e.changedTouches?.[0];
  if (!touch) return;
  movePaddleToClientX(touch.clientX);
}

canvas.addEventListener('touchstart', (e) => {
  const touch = e.touches[0] ?? e.changedTouches?.[0];
  if (!touch) return;
  e.preventDefault();
  movePaddleToClientX(touch.clientX);
  startFromUserInput();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  if (!touch) return;
  e.preventDefault();
  handleTouchMove(e);
}, { passive: false });

overlay.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startFromUserInput();
}, { passive: false });

// Simple collision helpers
function rectsIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function update(dt) {
  updateCats(dt);

  if (!playing) return;

  // Paddle movement
  if (keys.left) paddle.x -= paddle.speed * dt;
  if (keys.right) paddle.x += paddle.speed * dt;
  // Clamp
  paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, paddle.x));

  // Ball movement
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Wall collisions
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; }
  if (ball.x + ball.r > canvas.width) { ball.x = canvas.width - ball.r; ball.vx *= -1; }
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }

  // Paddle collision
  const paddleRect = { x: paddle.x, y: canvas.height - 40, w: paddle.w, h: paddle.h };
  if (rectsIntersect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2, paddleRect.x, paddleRect.y, paddleRect.w, paddleRect.h) && ball.vy > 0) {
    ball.y = paddleRect.y - ball.r;
    // reflect depending on hit point
    const hitPos = (ball.x - (paddleRect.x + paddleRect.w / 2)) / (paddleRect.w / 2);
    const maxBounce = Math.PI / 3; // 60°
    const angle = hitPos * maxBounce;
    const speed = Math.hypot(ball.vx, ball.vy) * 1.02; // slight speed up
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
  }

  // Bricks collisions (simple O(n))
  for (let b of bricks) {
    if (!b.alive) continue;
    if (rectsIntersect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2, b.x, b.y, b.w, b.h)) {
      // simple reflection: determine side
      // find overlap amounts
      const overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
      const overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
      if (overlapX < overlapY) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }
      handleBrickHit(b);
      break; // one brick per frame
    }
  }

  // Ball fell below paddle
  if (ball.y - ball.r > canvas.height) {
    lives -= 1;
    updateHUD();
    if (lives <= 0) {
      playing = false;
      showOverlay('Game Over — Press Restart', { showRestartButton: true });
    } else {
      resetBall();
    }
  }

}

function handleBrickHit(brick) {
  if (!brick.alive) return;
  brick.alive = false;
  bricksRemaining = Math.max(0, bricksRemaining - 1);
  score += brick.special ? 20 : 10;
  if (brick.special) {
    specialBricksRemaining = Math.max(0, specialBricksRemaining - 1);
    releaseCat(brick);
    if (specialBricksRemaining === 0) {
      beginCatMerge();
    }
  }
  updateHUD();

  if (bricksRemaining <= 0) {
    handleLevelClear();
  }
}

function releaseCat(brick) {
  const centerX = brick.x + brick.w / 2;
  const centerY = brick.y + brick.h / 2;
  const anchorX = canvas.width ? centerX / canvas.width : 0.5;
  const anchorY = canvas.height ? centerY / canvas.height : 0.3;
  const size = Math.max(22, Math.min(42, brick.w * 0.8));
  cats.push({
    id: brick.id,
    anchorX,
    anchorY,
    targetAnchorX: anchorX,
    targetAnchorY: anchorY,
    offsetX: 0,
    offsetY: 0,
    timer: 0,
    size,
    swaySeed: Math.random() * Math.PI * 2,
    alpha: 1,
    state: 'dancing'
  });
}

function beginCatMerge() {
  if (!cats.length) return;
  mergingCats = true;
  mergeTimer = 0;
  celebrationActive = true;
  celebrationTimer = 0;
  for (let cat of cats) {
    cat.state = 'merging';
    cat.targetAnchorX = 0.5;
    cat.targetAnchorY = 0.38;
  }
}

function updateCats(dt) {
  if (!cats.length && !megaCat) return;

  if (celebrationActive) {
    celebrationTimer += dt;
  }

  if (mergingCats) {
    mergeTimer += dt;
  }

  for (let cat of cats) {
    cat.timer += dt;
    if (cat.state === 'dancing') {
      cat.offsetY = Math.sin(cat.timer * 6) * (cat.size * 0.25);
      cat.offsetX = Math.sin(cat.timer * 2 + cat.swaySeed) * (cat.size * 0.15);
    } else if (cat.state === 'merging') {
      const lerpRate = Math.min(1, dt * 2.4);
      cat.anchorX += (cat.targetAnchorX - cat.anchorX) * lerpRate;
      cat.anchorY += (cat.targetAnchorY - cat.anchorY) * Math.min(1, dt * 2);
      cat.offsetX *= Math.max(0, 1 - dt * 5);
      cat.offsetY *= Math.max(0, 1 - dt * 5);
      if (mergeTimer > 1) {
        cat.alpha = Math.max(0, 1 - (mergeTimer - 1) * 1.2);
      }
    }
  }

  if (mergingCats && mergeTimer > 1.5 && !megaCat) {
    spawnMegaCat();
  }

  if (megaCat) {
    updateMegaCat(dt);
  }

  if (
    celebrationActive &&
    levelIndex === levels.length - 1 &&
    !celebrationOverlayShown &&
    celebrationTimer > (megaCat ? 4 : 2.5)
  ) {
    showOverlay('All cats reunited! Press Restart', { showRestartButton: true });
    celebrationOverlayShown = true;
  }
}

function spawnMegaCat() {
  const radius = Math.min(canvas.width, canvas.height) * 0.08;
  megaCat = {
    x: canvas.width / 2,
    y: canvas.height * 0.35,
    vx: 140,
    vy: -260,
    radius: Math.max(32, Math.min(60, radius)),
    timer: 0
  };
  cats = [];
  mergingCats = false;
}

function updateMegaCat(dt) {
  megaCat.timer += dt;
  megaCat.vy += 540 * dt;
  megaCat.x += megaCat.vx * dt;
  megaCat.y += megaCat.vy * dt;

  const floor = canvas.height - 70;
  if (megaCat.y + megaCat.radius > floor) {
    megaCat.y = floor - megaCat.radius;
    megaCat.vy *= -0.82;
    if (Math.abs(megaCat.vy) < 60) {
      megaCat.vy = -320;
    }
  }

  if (megaCat.x - megaCat.radius < 0) {
    megaCat.x = megaCat.radius;
    megaCat.vx *= -1;
  } else if (megaCat.x + megaCat.radius > canvas.width) {
    megaCat.x = canvas.width - megaCat.radius;
    megaCat.vx *= -1;
  }
}

function handleLevelClear() {
  const clearedLevel = level;
  const nextIndex = levelIndex + 1;
  if (nextIndex < levels.length) {
    const nextIntro = levels[nextIndex]?.intro ?? `Level ${nextIndex + 1} — Press Space to start`;
    startLevel(nextIndex, { message: `Level ${clearedLevel} complete! ${nextIntro}` });
    return;
  }

  playing = false;
  if (!celebrationActive) {
    celebrationActive = true;
    celebrationTimer = 0;
  }
}

function render() {
  // background
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#020b1d');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const time = performance.now() * 0.001;

  // bricks
  for (let b of bricks) {
    if (!b.alive) continue;
    const gradient = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    gradient.addColorStop(0, b.colors.accent);
    gradient.addColorStop(1, b.colors.base);
    if (b.special) {
      const glow = (Math.sin(time * 4 + b.col) + 1) * 0.5;
      ctx.shadowColor = `rgba(252, 211, 77, ${0.38 + glow * 0.4})`;
      ctx.shadowBlur = 16 + glow * 18;
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(b.x, b.y, b.w, 4);
    if (b.special) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      const glow = (Math.sin(time * 4 + b.col * 1.4) + 1) * 0.5;
      ctx.fillStyle = `rgba(252, 211, 77, ${0.25 + glow * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.4, b.h * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderCats();
  renderMegaCat();

  // paddle
  const paddleGradient = ctx.createLinearGradient(paddle.x, canvas.height - 40, paddle.x, canvas.height - 40 + paddle.h);
  paddleGradient.addColorStop(0, '#2dd4bf');
  paddleGradient.addColorStop(1, '#0f766e');
  ctx.fillStyle = paddleGradient;
  ctx.fillRect(paddle.x, canvas.height - 40, paddle.w, paddle.h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(paddle.x, canvas.height - 40, paddle.w, 2);

  // ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 2, ball.x, ball.y, ball.r + 4);
  ballGradient.addColorStop(0, '#facc15');
  ballGradient.addColorStop(1, '#f97316');
  ctx.fillStyle = ballGradient;
  ctx.fill();
  ctx.shadowColor = 'rgba(250, 204, 21, 0.45)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // small HUD hint inside canvas
  ctx.fillStyle = 'rgba(226,232,240,0.28)';
  ctx.font = '600 12px "Inter", system-ui, sans-serif';
  ctx.fillText('Level ' + level, 14, 22);
}

function renderCats() {
  if (!cats.length) return;
  for (let cat of cats) {
    if (cat.alpha <= 0) continue;
    const x = cat.anchorX * canvas.width + cat.offsetX;
    const y = cat.anchorY * canvas.height + cat.offsetY;
    drawCat(x, y, cat.size, cat.alpha, false);
  }
}

function renderMegaCat() {
  if (!megaCat) return;

  // simple drop shadow
  const shadowY = canvas.height - 70;
  const bounce = Math.max(0, shadowY - (megaCat.y + megaCat.radius));
  const shadowScale = 1 + Math.min(0.6, bounce / 120);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(megaCat.x, shadowY + 12, megaCat.radius * shadowScale, megaCat.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawCat(megaCat.x, megaCat.y, megaCat.radius * 1.4, 1, true);
}

function drawCat(x, y, size, alpha = 1, isMega = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;

  const bodyWidth = size;
  const bodyHeight = size * 0.9;
  const headRadius = size * 0.6;

  // Tail
  ctx.strokeStyle = isMega ? 'rgba(249, 115, 22, 0.8)' : 'rgba(251, 191, 36, 0.9)';
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bodyWidth * 0.5, bodyHeight * 0.1);
  ctx.quadraticCurveTo(bodyWidth * 0.85, bodyHeight * 0.2, bodyWidth * 0.45, -bodyHeight * 0.15);
  ctx.stroke();

  // Body
  ctx.fillStyle = isMega ? '#fde047' : '#facc15';
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight * 0.15, bodyWidth * 0.56, bodyHeight * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight * 0.25, bodyWidth * 0.28, bodyHeight * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = isMega ? '#fcd34d' : '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(0, -bodyHeight * 0.15, headRadius, headRadius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  const earBase = headRadius * 0.65;
  const earHeight = headRadius * 0.85;
  ctx.fillStyle = isMega ? '#f59e0b' : '#f97316';
  ctx.beginPath();
  ctx.moveTo(-earBase, -headRadius * 1.1);
  ctx.lineTo(-earBase - earHeight * 0.25, -headRadius * 0.4);
  ctx.lineTo(-earBase * 0.4, -headRadius * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(earBase, -headRadius * 1.1);
  ctx.lineTo(earBase + earHeight * 0.25, -headRadius * 0.4);
  ctx.lineTo(earBase * 0.4, -headRadius * 0.55);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isMega ? '#fde68a' : '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(-earBase * 0.85, -headRadius * 0.95);
  ctx.lineTo(-earBase - earHeight * 0.08, -headRadius * 0.5);
  ctx.lineTo(-earBase * 0.45, -headRadius * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(earBase * 0.85, -headRadius * 0.95);
  ctx.lineTo(earBase + earHeight * 0.08, -headRadius * 0.5);
  ctx.lineTo(earBase * 0.45, -headRadius * 0.6);
  ctx.closePath();
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1f2933';
  const eyeRadius = headRadius * 0.12;
  ctx.beginPath();
  ctx.arc(-headRadius * 0.35, -bodyHeight * 0.12, eyeRadius, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.35, -bodyHeight * 0.12, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Eye sparkle
  ctx.fillStyle = '#fef9c3';
  ctx.beginPath();
  ctx.arc(-headRadius * 0.32, -bodyHeight * 0.17, eyeRadius * 0.45, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.38, -bodyHeight * 0.17, eyeRadius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Cheeks
  ctx.fillStyle = 'rgba(248, 113, 113, 0.55)';
  ctx.beginPath();
  ctx.arc(-headRadius * 0.5, -bodyHeight * 0.02, eyeRadius * 1.2, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.5, -bodyHeight * 0.02, eyeRadius * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = Math.max(1.2, size * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.2, headRadius * 0.05);
  ctx.quadraticCurveTo(0, headRadius * 0.25, headRadius * 0.2, headRadius * 0.05);
  ctx.stroke();

  // Whiskers
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.65, -bodyHeight * 0.02);
  ctx.lineTo(-headRadius * 1.05, -bodyHeight * 0.02);
  ctx.moveTo(-headRadius * 0.65, eyeRadius * 0.6);
  ctx.lineTo(-headRadius * 1.05, eyeRadius * 0.6);
  ctx.moveTo(headRadius * 0.65, -bodyHeight * 0.02);
  ctx.lineTo(headRadius * 1.05, -bodyHeight * 0.02);
  ctx.moveTo(headRadius * 0.65, eyeRadius * 0.6);
  ctx.lineTo(headRadius * 1.05, eyeRadius * 0.6);
  ctx.stroke();

  // Paws
  ctx.fillStyle = isMega ? '#fcd34d' : '#fde68a';
  const pawOffsetY = bodyHeight * 0.42;
  ctx.beginPath();
  ctx.ellipse(-bodyWidth * 0.25, pawOffsetY, bodyWidth * 0.18, bodyWidth * 0.12, 0, 0, Math.PI * 2);
  ctx.ellipse(bodyWidth * 0.25, pawOffsetY, bodyWidth * 0.18, bodyWidth * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.globalAlpha = 1;
}
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// Start
init();
requestAnimationFrame(loop);
