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

const defaultTheme = {
  background: { top: '#020b1d', bottom: '#0f172a' },
  paddle: { top: '#2dd4bf', bottom: '#0f766e' },
  ball: {
    inner: '#facc15',
    outer: '#f97316',
    glow: 'rgba(250, 204, 21, 0.45)',
    stroke: 'rgba(250, 204, 21, 0.35)'
  }
};

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
  },
  {
    id: 3,
    intro: 'Level 3 — Halloween Catwalk! Press Space to continue',
    theme: {
      background: { top: '#060313', bottom: '#1a1033' },
      paddle: { top: '#a855f7', bottom: '#581c87' },
      ball: {
        inner: '#f0abfc',
        outer: '#7c3aed',
        glow: 'rgba(192, 132, 252, 0.45)',
        stroke: 'rgba(192, 132, 252, 0.35)'
      }
    },
    build() {
      const rows = 7;
      const cols = 11;
      const bricks = [];

      const addBrick = (row, col, colors, extra = {}) => {
        bricks.push({ row, col, colors, ...extra });
      };

      const iconSpecs = [
        { icon: 'ghost', color: '#f8fafc', accent: '#cbd5f5', creatureType: 'ghost' },
        { icon: 'skull', color: '#fef3c7', accent: '#fde68a', creatureType: 'skeleton' },
        { icon: 'pumpkin', color: '#fed7aa', accent: '#fb923c', creatureType: 'jack' },
        { icon: 'bat', color: '#f8fafc', accent: '#e2e8f0', creatureType: 'bat' },
        { icon: 'moon', color: '#e2e8f0', accent: '#cbd5f5', creatureType: 'ghost' }
      ];
      const topRowColors = [
        { base: '#5b21b6', accent: '#7c3aed' },
        { base: '#c2410c', accent: '#fb923c' }
      ];

      // Decorative Halloween icons on the top beam
      let iconIndex = 0;
      for (let col = 1; col <= 9; col++) {
        const palette = topRowColors[(col + 1) % 2];
        const spec = iconSpecs[iconIndex % iconSpecs.length];
        addBrick(0, col, palette, {
          icon: spec.icon,
          iconColor: spec.color,
          iconAccent: spec.accent,
          special: true,
          creatureType: spec.creatureType ?? null
        });
        iconIndex += 1;
      }

      const bridgePattern = {
        pattern: 'plaid',
        patternColors: {
          stripes: 'rgba(236, 72, 153, 0.35)',
          accent: 'rgba(59, 7, 100, 0.28)',
          highlight: 'rgba(255, 255, 255, 0.16)'
        }
      };

      const bridgeColors = { base: '#ea580c', accent: '#fb923c' };
      const supportColors = { base: '#c2410c', accent: '#ea580c' };
      const stageColors = { base: '#3b0764', accent: '#5b21b6' };

      // Hanging walkway supports under the icon beam
      [4, 5, 6].forEach((col) => {
        addBrick(1, col, supportColors, bridgePattern);
      });

      // Main horizontal catwalk
      for (let col = 2; col <= 8; col++) {
        addBrick(2, col, bridgeColors, bridgePattern);
      }

      // Cross-section of the catwalk
      for (let col = 3; col <= 7; col++) {
        addBrick(3, col, bridgeColors, bridgePattern);
      }

      // Central pumpkin lantern and supports
      addBrick(4, 4, supportColors, bridgePattern);
      addBrick(4, 5, { base: '#b45309', accent: '#f59e0b' }, {
        icon: 'pumpkin',
        iconColor: '#fed7aa',
        iconAccent: '#fb923c',
        special: true,
        creatureType: 'jack'
      });
      addBrick(4, 6, supportColors, bridgePattern);

      // Hanging chain leading to the lower stage
      addBrick(5, 5, supportColors, bridgePattern);

      // Lower stage platform
      [4, 5, 6].forEach((col) => {
        addBrick(6, col, stageColors, {
          pattern: 'plaid',
          patternColors: {
            stripes: 'rgba(30, 64, 175, 0.35)',
            accent: 'rgba(124, 58, 237, 0.35)',
            highlight: 'rgba(248, 250, 252, 0.12)'
          }
        });
      });

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
let creatures = [];
let bricksRemaining = 0;
let finaleDanceActive = false;
let finaleDanceTimer = 0;
let finaleDanceComplete = false;
let finaleOverlayShown = false;
const FINALE_DANCE_DURATION = 15;
const FINALE_CREATURE_TYPES = ['ghost', 'jack', 'skeleton', 'bat'];

function getCurrentTheme() {
  const levelTheme = levels[levelIndex]?.theme ?? {};
  return {
    background: { ...defaultTheme.background, ...(levelTheme.background ?? {}) },
    paddle: { ...defaultTheme.paddle, ...(levelTheme.paddle ?? {}) },
    ball: { ...defaultTheme.ball, ...(levelTheme.ball ?? {}) }
  };
}

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
  creatures = [];
  finaleDanceActive = false;
  finaleDanceTimer = 0;
  finaleDanceComplete = false;
  finaleOverlayShown = false;
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
    pattern: b.pattern ?? null,
    patternColors: b.patternColors ?? null,
    icon: b.icon ?? null,
    iconColor: b.iconColor ?? null,
    iconAccent: b.iconAccent ?? null,
    creatureType: b.creatureType ?? null,
    id: b.id ?? `lv${level}-brick-${idx}`
  }));
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
  if (finaleDanceActive) {
    interruptFinaleDance();
    return;
  }
  if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.code === 'Space') {
    if (isFinalLevel() && finaleDanceComplete) {
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
  if (finaleDanceActive) {
    interruptFinaleDance();
    return;
  }
  movePaddleToClientX(e.clientX);
});

function startFromUserInput() {
  if (finaleDanceActive) {
    interruptFinaleDance();
    return;
  }
  if (isFinalLevel() && finaleDanceComplete) {
    return;
  }
  if (!playing) { hideOverlay(); playing = true; }
}

canvas.addEventListener('click', () => {
  startFromUserInput();
});

function handleTouchMove(e) {
  if (finaleDanceActive) {
    interruptFinaleDance();
    return;
  }
  const touch = e.touches[0] ?? e.changedTouches?.[0];
  if (!touch) return;
  movePaddleToClientX(touch.clientX);
}

canvas.addEventListener('touchstart', (e) => {
  if (finaleDanceActive) {
    interruptFinaleDance();
    return;
  }
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function update(dt) {
  updateCreatures(dt);

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
  const creatureType = getCreatureTypeForBrick(brick);
  if (creatureType) {
    releaseCreature(brick, creatureType);
  }
  updateHUD();

  if (bricksRemaining <= 0) {
    handleLevelClear();
  }
}

function handleLevelClear() {
  const clearedLevel = level;
  const nextIndex = levelIndex + 1;
  if (!isFinalLevel()) {
    if (nextIndex < levels.length) {
      const nextIntro = levels[nextIndex]?.intro ?? `Level ${nextIndex + 1} — Press Space to start`;
      startLevel(nextIndex, { message: `Level ${clearedLevel} complete! ${nextIntro}` });
    }
    return;
  }

  playing = false;
  if (!finaleDanceActive && !finaleDanceComplete) {
    startFinaleDance();
  } else if (finaleDanceComplete && !finaleOverlayShown) {
    showFinaleOverlay();
  }
}

function render() {
  const theme = getCurrentTheme();

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, theme.background.top);
  bg.addColorStop(1, theme.background.bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const time = performance.now() * 0.001;

  // bricks
  for (let b of bricks) {
    if (!b.alive) continue;
    const gradient = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    gradient.addColorStop(0, b.colors.accent);
    gradient.addColorStop(1, b.colors.base);
    let specialGlowRgb = null;
    if (b.special) {
      specialGlowRgb = [252, 211, 77];
      if (b.icon) {
        switch (b.icon) {
          case 'pumpkin':
            specialGlowRgb = [249, 115, 22];
            break;
          case 'ghost':
            specialGlowRgb = [190, 227, 248];
            break;
          case 'skull':
            specialGlowRgb = [250, 250, 249];
            break;
          case 'bat':
            specialGlowRgb = [148, 163, 184];
            break;
          default:
            specialGlowRgb = [192, 132, 252];
            break;
        }
      }
      const glow = (Math.sin(time * 4 + b.col) + 1) * 0.5;
      const glowAlpha = 0.38 + glow * 0.4;
      ctx.shadowColor = `rgba(${specialGlowRgb[0]}, ${specialGlowRgb[1]}, ${specialGlowRgb[2]}, ${glowAlpha})`;
      ctx.shadowBlur = 16 + glow * 18;
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    if (b.pattern) {
      drawBrickPattern(b);
    }

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(b.x, b.y, b.w, 4);

    if (b.special) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      const glow = (Math.sin(time * 4 + b.col * 1.4) + 1) * 0.5;
      const glowRgb = specialGlowRgb ?? [252, 211, 77];
      const alpha = 0.22 + glow * 0.28;
      ctx.fillStyle = `rgba(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.42, b.h * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (b.icon) {
      drawBrickIcon(b);
    }
  }

  renderCreatures();

  // paddle
  const paddleGradient = ctx.createLinearGradient(paddle.x, canvas.height - 40, paddle.x, canvas.height - 40 + paddle.h);
  paddleGradient.addColorStop(0, theme.paddle.top);
  paddleGradient.addColorStop(1, theme.paddle.bottom);
  ctx.fillStyle = paddleGradient;
  ctx.fillRect(paddle.x, canvas.height - 40, paddle.w, paddle.h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(paddle.x, canvas.height - 40, paddle.w, 2);

  // ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 2, ball.x, ball.y, ball.r + 4);
  ballGradient.addColorStop(0, theme.ball.inner);
  ballGradient.addColorStop(1, theme.ball.outer);
  ctx.fillStyle = ballGradient;
  ctx.fill();
  ctx.shadowColor = theme.ball.glow;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.strokeStyle = theme.ball.stroke;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // small HUD hint inside canvas
  ctx.fillStyle = 'rgba(226,232,240,0.28)';
  ctx.font = '600 12px "Inter", system-ui, sans-serif';
  ctx.fillText('Level ' + level, 14, 22);
}

function drawBrickPattern(brick) {
  if (!brick.pattern) return;
  const colors = brick.patternColors ?? {};
  ctx.save();
  ctx.beginPath();
  ctx.rect(brick.x, brick.y, brick.w, brick.h);
  ctx.clip();

  if (brick.pattern === 'plaid') {
    const stripeWidth = Math.max(2, Math.round(brick.w / 6));
    const stripeColor = colors.stripes ?? 'rgba(255, 255, 255, 0.15)';
    for (let x = brick.x; x < brick.x + brick.w; x += stripeWidth * 2) {
      ctx.fillStyle = stripeColor;
      ctx.fillRect(x, brick.y, stripeWidth, brick.h);
    }

    const accentColor = colors.accent ?? 'rgba(15, 23, 42, 0.22)';
    const stripeHeight = Math.max(2, Math.round(brick.h / 3));
    for (let y = brick.y; y < brick.y + brick.h; y += stripeHeight * 2) {
      ctx.fillStyle = accentColor;
      ctx.fillRect(brick.x, y, brick.w, stripeHeight);
    }

    if (colors.highlight) {
      ctx.fillStyle = colors.highlight;
      ctx.fillRect(brick.x, brick.y + brick.h * 0.18, brick.w, Math.max(2, Math.round(brick.h * 0.16)));
    }
  }

  ctx.restore();
}

function drawBrickIcon(brick) {
  if (!brick.icon) return;
  const size = Math.min(brick.w, brick.h) * 0.78;
  const primary = brick.iconColor ?? '#f8fafc';
  const accent = brick.iconAccent ?? 'rgba(15, 23, 42, 0.85)';
  const centerX = brick.x + brick.w / 2;
  const centerY = brick.y + brick.h / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.fillStyle = primary;
  ctx.strokeStyle = 'transparent';

  switch (brick.icon) {
    case 'moon': {
      const r = size * 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65, false);
      ctx.arc(r * 0.9, 0, r * 0.8, Math.PI * 1.65, Math.PI * 0.35, true);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.2, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cat': {
      const r = size * 0.42;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, -r * 0.1);
      ctx.lineTo(-r * 1.15, -r * 0.85);
      ctx.lineTo(-r * 0.4, -r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.95, -r * 0.1);
      ctx.lineTo(r * 1.15, -r * 0.85);
      ctx.lineTo(r * 0.4, -r * 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.05, r * 0.2, 0, Math.PI * 2);
      ctx.arc(r * 0.35, -r * 0.05, r * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, r * 0.22, r * 0.12, 0, Math.PI, false);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-r * 0.1, r * 0.05);
      ctx.lineTo(0, r * 0.15);
      ctx.lineTo(r * 0.1, r * 0.05);
      ctx.fill();
      break;
    }
    case 'ghost': {
      const w = size * 0.72;
      const h = size * 0.82;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h * 0.25);
      ctx.quadraticCurveTo(-w * 0.55, -h * 0.55, 0, -h * 0.6);
      ctx.quadraticCurveTo(w * 0.55, -h * 0.55, w / 2, h * 0.25);
      ctx.lineTo(w / 2, h * 0.35);
      ctx.quadraticCurveTo(w * 0.3, h * 0.7, w * 0.15, h * 0.38);
      ctx.quadraticCurveTo(0, h * 0.72, -w * 0.15, h * 0.38);
      ctx.quadraticCurveTo(-w * 0.3, h * 0.7, -w / 2, h * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(-w * 0.2, -h * 0.05, w * 0.12, 0, Math.PI * 2);
      ctx.arc(w * 0.2, -h * 0.05, w * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, h * 0.25, w * 0.14, 0, Math.PI);
      ctx.fill();
      break;
    }
    case 'skull': {
      const r = size * 0.42;
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r, Math.PI * 0.2, Math.PI * 0.8, false);
      ctx.quadraticCurveTo(r * 0.95, r * 0.3, r * 0.5, r * 0.76);
      ctx.lineTo(-r * 0.5, r * 0.76);
      ctx.quadraticCurveTo(-r * 0.95, r * 0.3, -r, -r * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(-r * 0.45, -r * 0.02, r * 0.25, 0, Math.PI * 2);
      ctx.arc(r * 0.45, -r * 0.02, r * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-r * 0.1, r * 0.22);
      ctx.lineTo(0, r * 0.38);
      ctx.lineTo(r * 0.1, r * 0.22);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.lineJoin = 'round';
      const teethY = r * 0.52;
      ctx.moveTo(-r * 0.42, teethY);
      ctx.lineTo(-r * 0.27, teethY + r * 0.12);
      ctx.lineTo(-r * 0.12, teethY);
      ctx.lineTo(0, teethY + r * 0.12);
      ctx.lineTo(r * 0.12, teethY);
      ctx.lineTo(r * 0.27, teethY + r * 0.12);
      ctx.lineTo(r * 0.42, teethY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(-r * 0.55, -r * 0.28, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'hat': {
      const base = size * 0.82;
      const height = size * 0.86;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.55);
      ctx.lineTo(base / 2, height * 0.35);
      ctx.lineTo(-base / 2, height * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.fillRect(-base * 0.6, height * 0.25, base * 1.2, height * 0.14);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(-base * 0.18, 0, base * 0.36, height * 0.35);
      break;
    }
    case 'pumpkin': {
      const rX = size * 0.46;
      const rY = size * 0.42;
      ctx.beginPath();
      ctx.ellipse(0, 0, rX, rY, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = brick.iconAccent ?? '#fb923c';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(-rX * 0.45, 0, rX * 0.28, rY * 0.9, 0, 0, Math.PI * 2);
      ctx.ellipse(rX * 0.45, 0, rX * 0.28, rY * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(67, 20, 7, 0.9)';
      ctx.fillRect(-rX * 0.1, -rY * 0.9, rX * 0.2, rY * 0.45);

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-rX * 0.32, -rY * 0.1);
      ctx.lineTo(-rX * 0.12, -rY * 0.34);
      ctx.lineTo(-rX * 0.06, -rY * 0.05);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(rX * 0.32, -rY * 0.1);
      ctx.lineTo(rX * 0.12, -rY * 0.34);
      ctx.lineTo(rX * 0.06, -rY * 0.05);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-rX * 0.1, 0);
      ctx.lineTo(0, rY * 0.16);
      ctx.lineTo(rX * 0.1, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(67, 20, 7, 0.82)';
      ctx.beginPath();
      ctx.moveTo(-rX * 0.28, rY * 0.2);
      ctx.quadraticCurveTo(0, rY * 0.45, rX * 0.28, rY * 0.2);
      ctx.quadraticCurveTo(0, rY * 0.6, -rX * 0.28, rY * 0.2);
      ctx.fill();
      break;
    }
    case 'bat': {
      const wingSpan = size * 0.9;
      const bodyWidth = size * 0.22;
      const bodyHeight = size * 0.32;
      ctx.beginPath();
      ctx.moveTo(-wingSpan / 2, 0);
      ctx.quadraticCurveTo(-wingSpan * 0.32, -bodyHeight * 1.6, 0, -bodyHeight * 0.6);
      ctx.quadraticCurveTo(wingSpan * 0.32, -bodyHeight * 1.6, wingSpan / 2, 0);
      ctx.quadraticCurveTo(wingSpan * 0.3, bodyHeight * 1.1, bodyWidth * 0.4, bodyHeight * 0.65);
      ctx.lineTo(-bodyWidth * 0.4, bodyHeight * 0.65);
      ctx.quadraticCurveTo(-wingSpan * 0.3, bodyHeight * 1.1, -wingSpan / 2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(-bodyWidth * 0.45, -bodyHeight * 0.1, bodyWidth * 0.3, 0, Math.PI * 2);
      ctx.arc(bodyWidth * 0.45, -bodyHeight * 0.1, bodyWidth * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fefce8';
      ctx.beginPath();
      ctx.arc(-bodyWidth * 0.2, -bodyHeight * 0.15, bodyWidth * 0.18, 0, Math.PI * 2);
      ctx.arc(bodyWidth * 0.2, -bodyHeight * 0.15, bodyWidth * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

function getCreatureTypeForBrick(brick) {
  if (brick.creatureType) return brick.creatureType;
  if (levelIndex === 1 && brick.special) {
    return 'cat';
  }
  if (isFinalLevel() && brick.special) {
    return FINALE_CREATURE_TYPES[Math.floor(Math.random() * FINALE_CREATURE_TYPES.length)];
  }
  return null;
}

const CREATURE_STYLES = {
  cat: {
    body: '#facc15',
    accent: '#f97316',
    detail: '#1f2937',
    highlight: '#fde68a',
    glow: 'rgba(250, 204, 21, 0.32)'
  },
  ghost: {
    body: '#f8fafc',
    accent: '#cbd5f5',
    detail: '#0f172a',
    highlight: '#e2e8f0',
    glow: 'rgba(148, 163, 184, 0.38)'
  },
  jack: {
    body: '#fb923c',
    accent: '#ea580c',
    detail: '#1f1305',
    highlight: '#fed7aa',
    glow: 'rgba(249, 115, 22, 0.42)'
  },
  skeleton: {
    body: '#f1f5f9',
    accent: '#cbd5e1',
    detail: '#0f172a',
    highlight: '#e2e8f0',
    glow: 'rgba(191, 219, 254, 0.32)'
  },
  bat: {
    body: '#1f2937',
    accent: '#475569',
    detail: '#f8fafc',
    highlight: '#e0f2fe',
    glow: 'rgba(96, 165, 250, 0.28)'
  }
};

function getCreaturePalette(type) {
  return CREATURE_STYLES[type] ?? CREATURE_STYLES.cat;
}

function releaseCreature(brick, type) {
  const centerX = brick.x + brick.w / 2;
  const centerY = brick.y + brick.h / 2;
  const anchorX = canvas.width ? clamp(centerX / canvas.width, 0.08, 0.92) : 0.5;
  const anchorY = canvas.height ? clamp(centerY / canvas.height, 0.1, 0.78) : 0.35;
  const baseSize = Math.max(22, Math.min(56, Math.min(brick.w, brick.h) * 0.95));
  const palette = getCreaturePalette(type);
  creatures.push({
    id: brick.id,
    type,
    anchorX,
    anchorY,
    homeAnchorX: anchorX,
    homeAnchorY: anchorY,
    offsetX: 0,
    offsetY: 0,
    timer: 0,
    rotation: 0,
    size: baseSize,
    alpha: 1,
    wiggleSeed: Math.random() * Math.PI * 2,
    state: finaleDanceActive ? 'spookyDance' : 'free',
    palette,
    danceAngle: Math.random() * Math.PI * 2,
    danceRadius: 0.16 + Math.random() * 0.08,
    pulse: Math.random() * Math.PI * 2
  });
}

function ensureFinaleCreatures() {
  if (creatures.length) return;
  const positions = [
    { type: 'ghost', x: 0.32, y: 0.46 },
    { type: 'jack', x: 0.5, y: 0.42 },
    { type: 'skeleton', x: 0.68, y: 0.48 },
    { type: 'bat', x: 0.5, y: 0.28 }
  ];
  const baseW = Math.max(40, canvas.width * 0.08);
  const baseH = Math.max(26, canvas.height * 0.08);
  positions.forEach((pos, index) => {
    const mockBrick = {
      x: canvas.width * pos.x - baseW / 2,
      y: canvas.height * pos.y - baseH / 2,
      w: baseW,
      h: baseH,
      id: `finale-${pos.type}-${index}`
    };
    releaseCreature(mockBrick, pos.type);
    const creature = creatures[creatures.length - 1];
    creature.anchorX = pos.x;
    creature.anchorY = pos.y;
    creature.homeAnchorX = pos.x;
    creature.homeAnchorY = pos.y;
  });
}

function startFinaleDance() {
  finaleDanceActive = true;
  finaleDanceTimer = 0;
  hideOverlay();
  ensureFinaleCreatures();
  const total = Math.max(1, creatures.length);
  for (let i = 0; i < creatures.length; i++) {
    const creature = creatures[i];
    creature.state = 'spookyDance';
    const angleBase = (i / total) * Math.PI * 2;
    creature.danceAngle = angleBase;
    creature.danceRadius = 0.18 + (i % 2 === 0 ? 0.04 : -0.02);
    creature.offsetX = 0;
    creature.offsetY = 0;
  }
}

function interruptFinaleDance() {
  if (!finaleDanceActive) return;
  completeFinaleDance();
}

function completeFinaleDance() {
  if (!finaleDanceActive) return;
  finaleDanceActive = false;
  finaleDanceTimer = Math.min(finaleDanceTimer, FINALE_DANCE_DURATION);
  creatures.forEach((creature) => {
    if (creature.state === 'spookyDance') {
      creature.state = 'celebrate';
    }
  });
  finaleDanceComplete = true;
  if (!finaleOverlayShown) {
    showFinaleOverlay();
  }
}

function showFinaleOverlay() {
  showOverlay('Spooky dance complete! Press Restart', { showRestartButton: true });
  finaleOverlayShown = true;
}

function isFinalLevel() {
  return levelIndex === levels.length - 1;
}

function updateCreatures(dt) {
  if (!creatures.length) {
    if (finaleDanceActive) {
      finaleDanceTimer += dt;
      if (finaleDanceTimer >= FINALE_DANCE_DURATION) {
        completeFinaleDance();
      }
    }
    return;
  }

  if (finaleDanceActive) {
    finaleDanceTimer += dt;
    if (finaleDanceTimer >= FINALE_DANCE_DURATION) {
      completeFinaleDance();
    }
  }

  for (let creature of creatures) {
    creature.timer += dt;
    switch (creature.state) {
      case 'free': {
        const bob = Math.sin(creature.timer * 4.6 + creature.wiggleSeed) * (creature.size * 0.22);
        const sway = Math.sin(creature.timer * 1.8 + creature.wiggleSeed * 0.6) * (creature.size * 0.14);
        creature.offsetY = bob;
        creature.offsetX = sway;
        creature.rotation = Math.sin(creature.timer * 1.2 + creature.wiggleSeed) * 0.12;
        creature.anchorX += (creature.homeAnchorX - creature.anchorX) * Math.min(1, dt * 0.9);
        creature.anchorY += (creature.homeAnchorY - creature.anchorY) * Math.min(1, dt * 0.9);
        break;
      }
      case 'spookyDance': {
        creature.danceAngle += dt * (1.2 + Math.sin(creature.timer * 3 + creature.wiggleSeed) * 0.45);
        const radiusX = creature.danceRadius ?? 0.18;
        const radiusY = radiusX * 0.72;
        creature.anchorX = clamp(0.5 + Math.cos(creature.danceAngle) * radiusX, 0.18, 0.82);
        creature.anchorY = clamp(0.46 + Math.sin(creature.danceAngle * 1.08) * radiusY, 0.24, 0.7);
        const intensity = 0.24 + Math.sin(creature.timer * 6 + creature.wiggleSeed) * 0.12;
        creature.offsetX = Math.sin(creature.timer * 8 + creature.wiggleSeed) * (creature.size * (0.25 + intensity));
        creature.offsetY = Math.cos(creature.timer * 9 + creature.wiggleSeed * 1.1) * (creature.size * (0.32 + intensity));
        creature.rotation = Math.sin(creature.timer * 6 + creature.wiggleSeed * 0.8) * 0.38;
        break;
      }
      case 'celebrate': {
        creature.offsetY = Math.sin(creature.timer * 4 + creature.wiggleSeed) * (creature.size * 0.18);
        creature.offsetX = Math.sin(creature.timer * 2.2 + creature.wiggleSeed * 0.7) * (creature.size * 0.12);
        creature.rotation = Math.sin(creature.timer * 2.4 + creature.wiggleSeed) * 0.18;
        break;
      }
      default:
        break;
    }
  }
}

function renderCreatures() {
  if (!creatures.length) return;
  for (let creature of creatures) {
    if (creature.alpha <= 0) continue;
    const x = creature.anchorX * canvas.width + creature.offsetX;
    const y = creature.anchorY * canvas.height + creature.offsetY;
    drawCreature(creature, x, y);
  }
}

function drawCreature(creature, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = creature.alpha;
  ctx.rotate(creature.rotation ?? 0);

  const palette = creature.palette ?? getCreaturePalette(creature.type);
  const size = creature.size;
  const timer = creature.timer ?? 0;
  const glowPulse = Math.sin((timer + finaleDanceTimer) * 4 + (creature.pulse ?? 0)) * 0.5 + 0.5;
  const glowStrength = finaleDanceActive || creature.state === 'celebrate' ? 18 + glowPulse * 14 : 8 + glowPulse * 6;
  ctx.shadowColor = palette.glow ?? 'rgba(255,255,255,0.2)';
  ctx.shadowBlur = glowStrength;

  switch (creature.type) {
    case 'ghost':
      drawGhostSprite(size, palette, timer);
      break;
    case 'jack':
      drawJackSprite(size, palette, timer);
      break;
    case 'skeleton':
      drawSkeletonSprite(size, palette, timer);
      break;
    case 'bat':
      drawBatSprite(size, palette, timer);
      break;
    case 'cat':
    default:
      drawCatSprite(size, palette, timer);
      break;
  }

  ctx.restore();
}

function drawCatSprite(size, palette, timer = 0) {
  const bodyWidth = size;
  const bodyHeight = size * 0.9;
  const headRadius = size * 0.6;
  const tailWave = Math.sin(timer * 5.2) * bodyHeight * 0.2;

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bodyWidth * 0.5, bodyHeight * 0.15);
  ctx.quadraticCurveTo(bodyWidth * 0.85, bodyHeight * 0.24 + tailWave, bodyWidth * 0.45, -bodyHeight * 0.2);
  ctx.stroke();

  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight * 0.12, bodyWidth * 0.54, bodyHeight * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.highlight ?? 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, bodyHeight * 0.22, bodyWidth * 0.28, bodyHeight * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(0, -bodyHeight * 0.18, headRadius, headRadius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.7, -headRadius * 0.95);
  ctx.lineTo(-headRadius * 1.05, -headRadius * 0.2);
  ctx.lineTo(-headRadius * 0.35, -headRadius * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headRadius * 0.7, -headRadius * 0.95);
  ctx.lineTo(headRadius * 1.05, -headRadius * 0.2);
  ctx.lineTo(headRadius * 0.35, -headRadius * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.highlight ?? '#fde68a';
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.62, -headRadius * 0.82);
  ctx.lineTo(-headRadius * 0.92, -headRadius * 0.35);
  ctx.lineTo(-headRadius * 0.4, -headRadius * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headRadius * 0.62, -headRadius * 0.82);
  ctx.lineTo(headRadius * 0.92, -headRadius * 0.35);
  ctx.lineTo(headRadius * 0.4, -headRadius * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.detail;
  ctx.beginPath();
  ctx.arc(-headRadius * 0.35, -bodyHeight * 0.12, headRadius * 0.12, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.35, -bodyHeight * 0.12, headRadius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef9c3';
  ctx.beginPath();
  ctx.arc(-headRadius * 0.32, -bodyHeight * 0.17, headRadius * 0.05, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.32, -bodyHeight * 0.17, headRadius * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.detail;
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.12, -bodyHeight * 0.02);
  ctx.lineTo(0, headRadius * 0.05);
  ctx.lineTo(headRadius * 0.12, -bodyHeight * 0.02);
  ctx.fill();

  ctx.strokeStyle = palette.detail;
  ctx.lineWidth = Math.max(1.2, size * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.25, headRadius * 0.08);
  ctx.quadraticCurveTo(0, headRadius * 0.35, headRadius * 0.25, headRadius * 0.08);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.55, -bodyHeight * 0.04);
  ctx.lineTo(-headRadius * 0.95, -bodyHeight * 0.04);
  ctx.moveTo(-headRadius * 0.55, headRadius * 0.06);
  ctx.lineTo(-headRadius * 0.95, headRadius * 0.06);
  ctx.moveTo(headRadius * 0.55, -bodyHeight * 0.04);
  ctx.lineTo(headRadius * 0.95, -bodyHeight * 0.04);
  ctx.moveTo(headRadius * 0.55, headRadius * 0.06);
  ctx.lineTo(headRadius * 0.95, headRadius * 0.06);
  ctx.stroke();
}

function drawGhostSprite(size, palette, timer = 0) {
  const width = size * 0.9;
  const height = size * 1.1;
  const wave = Math.sin(timer * 6.2) * (height * 0.06);

  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.moveTo(-width / 2, height * 0.1);
  ctx.quadraticCurveTo(-width * 0.6, -height * 0.55, 0, -height * 0.6);
  ctx.quadraticCurveTo(width * 0.6, -height * 0.55, width / 2, height * 0.1);
  ctx.lineTo(width / 2, height * 0.4);
  ctx.quadraticCurveTo(width * 0.35, height * 0.6 + wave, width * 0.15, height * 0.38);
  ctx.quadraticCurveTo(0, height * 0.68 + wave, -width * 0.15, height * 0.38);
  ctx.quadraticCurveTo(-width * 0.35, height * 0.6 + wave, -width / 2, height * 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.detail;
  ctx.beginPath();
  ctx.arc(-width * 0.2, -height * 0.05, width * 0.12, 0, Math.PI * 2);
  ctx.arc(width * 0.2, -height * 0.05, width * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, height * 0.22, width * 0.14, 0, Math.PI);
  ctx.fill();

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(-width * 0.1, -height * 0.32, width * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawJackSprite(size, palette, timer = 0) {
  const radiusX = size * 0.56;
  const radiusY = size * 0.48;

  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(-radiusX * 0.45, 0, radiusX * 0.28, radiusY * 0.95, 0, 0, Math.PI * 2);
  ctx.ellipse(radiusX * 0.45, 0, radiusX * 0.28, radiusY * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = palette.detail;
  ctx.fillRect(-radiusX * 0.12, -radiusY * 1.12, radiusX * 0.24, radiusY * 0.4);

  ctx.beginPath();
  ctx.moveTo(-radiusX * 0.55, -radiusY * 0.2);
  ctx.lineTo(-radiusX * 0.2, -radiusY * 0.5);
  ctx.lineTo(-radiusX * 0.12, -radiusY * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(radiusX * 0.55, -radiusY * 0.2);
  ctx.lineTo(radiusX * 0.2, -radiusY * 0.5);
  ctx.lineTo(radiusX * 0.12, -radiusY * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-radiusX * 0.12, -radiusY * 0.05);
  ctx.lineTo(0, radiusY * 0.12);
  ctx.lineTo(radiusX * 0.12, -radiusY * 0.05);
  ctx.closePath();
  ctx.fill();

  const flicker = Math.sin(timer * 8.2) * 0.05;
  ctx.beginPath();
  ctx.moveTo(-radiusX * 0.6, radiusY * 0.35);
  ctx.lineTo(-radiusX * 0.3, radiusY * (0.55 + flicker));
  ctx.lineTo(-radiusX * 0.1, radiusY * 0.3);
  ctx.lineTo(radiusX * 0.1, radiusY * (0.55 - flicker));
  ctx.lineTo(radiusX * 0.3, radiusY * 0.3);
  ctx.lineTo(radiusX * 0.6, radiusY * 0.4);
  ctx.lineTo(radiusX * 0.45, radiusY * 0.65);
  ctx.lineTo(0, radiusY * 0.5);
  ctx.lineTo(-radiusX * 0.45, radiusY * 0.65);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = palette.highlight ?? 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(-radiusX * 0.05, -radiusY * 0.35, radiusX * 0.18, radiusY * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSkeletonSprite(size, palette, timer = 0) {
  const headRadius = size * 0.4;

  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.28, headRadius, headRadius * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.detail;
  ctx.beginPath();
  ctx.arc(-headRadius * 0.5, -size * 0.32, headRadius * 0.26, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.5, -size * 0.32, headRadius * 0.26, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.4, -size * 0.12);
  ctx.lineTo(headRadius * 0.4, -size * 0.12);
  ctx.strokeStyle = palette.detail;
  ctx.stroke();

  ctx.lineWidth = Math.max(1.4, size * 0.035);
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.24, -size * 0.12);
  ctx.lineTo(-headRadius * 0.24, -size * 0.02);
  ctx.moveTo(0, -size * 0.12);
  ctx.lineTo(0, -size * 0.02);
  ctx.moveTo(headRadius * 0.24, -size * 0.12);
  ctx.lineTo(headRadius * 0.24, -size * 0.02);
  ctx.stroke();

  const spineHeight = size * 0.58;
  ctx.fillStyle = palette.body;
  ctx.fillRect(-headRadius * 0.18, -size * 0.02, headRadius * 0.36, spineHeight);

  const ribSpacing = spineHeight / 5;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = Math.max(1.2, size * 0.03);
  for (let i = 1; i <= 4; i++) {
    const y = -size * 0.02 + ribSpacing * i;
    const wave = Math.sin(timer * 4 + i) * headRadius * 0.2;
    ctx.beginPath();
    ctx.moveTo(-headRadius * (0.6 + 0.05 * i) - wave, y);
    ctx.quadraticCurveTo(0, y - ribSpacing * 0.2, headRadius * (0.6 + 0.05 * i) + wave, y);
    ctx.stroke();
  }

  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(0, spineHeight * 0.78, headRadius * 0.45, spineHeight * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.body;
  ctx.lineWidth = Math.max(2, size * 0.06);
  const armSwing = Math.sin(timer * 5.2) * size * 0.08;
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.2, ribSpacing * 0.9);
  ctx.lineTo(-headRadius * 0.65, ribSpacing * 0.9 + armSwing);
  ctx.moveTo(headRadius * 0.2, ribSpacing * 0.9);
  ctx.lineTo(headRadius * 0.65, ribSpacing * 0.9 - armSwing);
  ctx.stroke();

  ctx.beginPath();
  const legSwing = Math.sin(timer * 4.2 + 1) * size * 0.08;
  ctx.moveTo(-headRadius * 0.12, spineHeight * 1.02);
  ctx.lineTo(-headRadius * 0.32, spineHeight * 1.52 + legSwing);
  ctx.moveTo(headRadius * 0.12, spineHeight * 1.02);
  ctx.lineTo(headRadius * 0.32, spineHeight * 1.52 - legSwing);
  ctx.stroke();
}

function drawBatSprite(size, palette, timer = 0) {
  const wingSpan = size * 1.4;
  const bodyWidth = size * 0.36;
  const bodyHeight = size * 0.5;
  const flap = Math.sin(timer * 7.6) * (size * 0.16);

  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.moveTo(-wingSpan / 2, 0);
  ctx.quadraticCurveTo(-wingSpan * 0.35, -bodyHeight - flap, -bodyWidth * 0.4, -bodyHeight * 0.2);
  ctx.lineTo(-bodyWidth * 0.32, bodyHeight * 0.6);
  ctx.lineTo(-wingSpan * 0.28, bodyHeight * 0.2);
  ctx.lineTo(-wingSpan / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(wingSpan / 2, 0);
  ctx.quadraticCurveTo(wingSpan * 0.35, -bodyHeight - flap, bodyWidth * 0.4, -bodyHeight * 0.2);
  ctx.lineTo(bodyWidth * 0.32, bodyHeight * 0.6);
  ctx.lineTo(wingSpan * 0.28, bodyHeight * 0.2);
  ctx.lineTo(wingSpan / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(-bodyWidth * 0.3, -bodyHeight * 0.6);
  ctx.lineTo(-bodyWidth * 0.12, -bodyHeight * 1.1);
  ctx.lineTo(-bodyWidth * 0.02, -bodyHeight * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bodyWidth * 0.3, -bodyHeight * 0.6);
  ctx.lineTo(bodyWidth * 0.12, -bodyHeight * 1.1);
  ctx.lineTo(bodyWidth * 0.02, -bodyHeight * 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.detail;
  ctx.beginPath();
  ctx.arc(-bodyWidth * 0.22, -bodyHeight * 0.1, bodyWidth * 0.12, 0, Math.PI * 2);
  ctx.arc(bodyWidth * 0.22, -bodyHeight * 0.1, bodyWidth * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.highlight ?? '#f8fafc';
  ctx.beginPath();
  ctx.arc(-bodyWidth * 0.2, -bodyHeight * 0.14, bodyWidth * 0.05, 0, Math.PI * 2);
  ctx.arc(bodyWidth * 0.2, -bodyHeight * 0.14, bodyWidth * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-bodyWidth * 0.12, bodyHeight * 0.05);
  ctx.lineTo(-bodyWidth * 0.04, bodyHeight * 0.22);
  ctx.lineTo(0, bodyHeight * 0.05);
  ctx.lineTo(bodyWidth * 0.04, bodyHeight * 0.22);
  ctx.lineTo(bodyWidth * 0.12, bodyHeight * 0.05);
  ctx.closePath();
  ctx.fill();
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
