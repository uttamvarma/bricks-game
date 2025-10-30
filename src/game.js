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

function resize() {
  // Maintain a good size while keeping responsiveness
  canvas.width = Math.min(900, window.innerWidth - 48);
  canvas.height = Math.min(600, window.innerHeight - 200);
}

window.addEventListener('resize', resize);
resize();

// Game state
let paddle = { w: 100, h: 12, x: 0, speed: 600 };
let ball = { x: 0, y: 0, r: 8, vx: 200, vy: -200 };
let bricks = [];
let cols = 8;
let rows = 5;
let brick = { w: 0, h: 20, padding: 8, offsetTop: 60, offsetLeft: 20 };
let score = 0;
let lives = 3;
let level = 1;
let playing = false;
let lastTs = performance.now();
let keys = { left: false, right: false };

function init() {
  paddle.x = (canvas.width - paddle.w) / 2;
  resetBall();
  initBricks();
  updateHUD();
  showOverlay('Press Space to Start');
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

function initBricks() {
  bricks = [];
  brick.w = Math.floor((canvas.width - brick.offsetLeft * 2 - (cols - 1) * brick.padding) / cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = brick.offsetLeft + c * (brick.w + brick.padding);
      const y = brick.offsetTop + r * (brick.h + brick.padding);
      bricks.push({ x, y, w: brick.w, h: brick.h, alive: true });
    }
  }
}

function updateHUD() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  levelEl.textContent = String(level);
}

function showOverlay(text) {
  overlayText.textContent = text;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function restart() {
  score = 0;
  lives = 3;
  level = 1;
  rows = 5;
  init();
  playing = false;
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
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  paddle.x = mx - paddle.w / 2;
});
canvas.addEventListener('click', () => {
  if (!playing) { hideOverlay(); playing = true; }
});

// Simple collision helpers
function rectsIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function update(dt) {
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
      b.alive = false;
      score += 10;
      updateHUD();
      break; // one brick per frame
    }
  }

  // Ball fell below paddle
  if (ball.y - ball.r > canvas.height) {
    lives -= 1;
    updateHUD();
    if (lives <= 0) {
      playing = false;
      showOverlay('Game Over — Press Restart');
    } else {
      resetBall();
    }
  }

  // Check win
  const remaining = bricks.some(b => b.alive);
  if (!remaining) {
    playing = false;
    showOverlay('You Win! Press Restart');
  }
}

function render() {
  // background
  ctx.fillStyle = '#071023';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // bricks
  for (let b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }

  // paddle
  ctx.fillStyle = '#10b981';
  ctx.fillRect(paddle.x, canvas.height - 40, paddle.w, paddle.h);

  // ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();

  // small HUD hint inside canvas
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Bricks Game — Level ' + level, 12, 22);
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
