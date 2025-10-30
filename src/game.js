// src/game.js — minimal HTML5 Canvas setup and game loop
console.log('Bricks Game started');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  // Keep a comfortable max size but allow responsiveness
  canvas.width = Math.min(800, window.innerWidth - 40);
  canvas.height = Math.min(600, window.innerHeight - 120);
}

window.addEventListener('resize', resize);
resize();

let lastTs = performance.now();

function update(dt) {
  // placeholder for game state updates (dt in seconds)
}

function render() {
  // clear
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // simple UI text
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Bricks Game — Starter', 16, 32);

  // placeholder paddle
  ctx.fillStyle = '#4caf50';
  const paddleW = 100;
  const paddleH = 12;
  ctx.fillRect((canvas.width - paddleW) / 2, canvas.height - 40, paddleW, paddleH);
}

function loop(ts) {
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
