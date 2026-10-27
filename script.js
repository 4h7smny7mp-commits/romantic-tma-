(() => {
  const dpr = window.devicePixelRatio || 1;

  // ---------- Звёзды ----------
  const starsCanvas = document.getElementById('stars');
  const sctx = starsCanvas.getContext('2d');
  let stars = [];
  let shootingStar = null;

  function resizeStars() {
    starsCanvas.width = window.innerWidth * dpr;
    starsCanvas.height = window.innerHeight * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.3 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.03
    }));
  }

  function drawStars(t) {
    sctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const s of stars) {
      sctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      sctx.fillStyle = '#fff';
      sctx.beginPath();
      sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      sctx.fill();
    }
    if (!shootingStar && Math.random() < 0.002) {
      shootingStar = {
        x: Math.random() * window.innerWidth * 0.8,
        y: Math.random() * window.innerHeight * 0.4,
        vx: 6, vy: 3, life: 60
      };
    }
    if (shootingStar) {
      sctx.globalAlpha = shootingStar.life / 60;
      sctx.strokeStyle = '#fff';
      sctx.lineWidth = 1.5;
      sctx.beginPath();
      sctx.moveTo(shootingStar.x, shootingStar.y);
      sctx.lineTo(shootingStar.x - shootingStar.vx * 6, shootingStar.y - shootingStar.vy * 6);
      sctx.stroke();
      shootingStar.x += shootingStar.vx;
      shootingStar.y += shootingStar.vy;
      shootingStar.life -= 1;
      if (shootingStar.life <= 0) shootingStar = null;
    }
    sctx.globalAlpha = 1;
  }

  // ---------- Сердечки ----------
  const heartsCanvas = document.getElementById('hearts');
  const hctx = heartsCanvas.getContext('2d');
  let hearts = [];
  let heartsActive = false;
  const HEART_COLORS = ['#ff6b9a', '#ff3b5c', '#ffc94a'];

  function resizeHearts() {
    heartsCanvas.width = window.innerWidth * dpr;
    heartsCanvas.height = window.innerHeight * dpr;
    hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnHeart() {
    const size = 14 + Math.random() * 20;
    hearts.push({
      x: Math.random() * window.innerWidth,
      y: -size,
      size,
      speed: 1 + Math.random() * 2,
      swing: 10 + Math.random() * 20,
      phase: Math.random() * Math.PI * 2,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)]
    });
  }

  function drawHeart(x, y, size, color) {
    hctx.beginPath();
    hctx.moveTo(x, y + size / 4);
    hctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
    hctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.7, x, y + size);
    hctx.bezierCurveTo(x, y + size * 0.7, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
    hctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
    hctx.fillStyle = color;
    hctx.fill();
  }

  function drawHearts(t) {
    hctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const h = window.innerHeight;
    if (heartsActive && Math.random() < 40 / 60) spawnHeart(); // ~40 в секунду при 60 FPS
    hearts = hearts.filter(p => p.y < h + p.size);
    for (const p of hearts) {
      p.y += p.speed;
      const x = p.x + Math.sin(t * 0.002 + p.phase) * p.swing;
      hctx.globalAlpha = Math.max(0, Math.min(1, (h - p.y) / (h * 0.25)));
      drawHeart(x, p.y, p.size, p.color);
    }
    hctx.globalAlpha = 1;
  }

  function loop(t) {
    drawStars(t);
    drawHearts(t);
    requestAnimationFrame(loop);
  }

  // ---------- Музыка ----------
  const audio = document.getElementById('bg-music');
  const soundBtn = document.getElementById('sound-toggle');
  const TARGET_VOLUME = 0.3;
  let fadeTimer = null;
  let musicOn = false;

  function fadeIn() {
    clearInterval(fadeTimer);
    audio.volume = 0;
    fadeTimer = setInterval(() => {
      if (audio.volume < TARGET_VOLUME - 0.02) {
        audio.volume = Math.min(TARGET_VOLUME, audio.volume + 0.02);
      } else {
        audio.volume = TARGET_VOLUME;
        clearInterval(fadeTimer);
      }
    }, 100);
  }

  function startMusic() {
    return audio.play().then(() => {
      musicOn = true;
      soundBtn.textContent = '🔊';
      return true;
    }).catch(() => {
      soundBtn.textContent = '🔇';
      return false;
    });
  }

  soundBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (musicOn) {
      audio.pause();
      musicOn = false;
      soundBtn.textContent = '🔇';
    } else {
      startMusic();
    }
  });

  // ---------- Сценарий ----------
  const envelope = document.getElementById('envelope');
  const sun = document.getElementById('sun');
  const neon = document.getElementById('neon');
  const hint = document.getElementById('hint');
  let step = 0;
  let locked = false;

  function lockFor(ms) {
    locked = true;
    setTimeout(() => { locked = false; }, ms);
  }

  function onTap() {
    if (locked || step >= 2) return;
    lockFor(900);

    if (step === 0) {
      // Тап 1: конверт открывается, письмо выезжает вверх
      envelope.classList.add('opened');
      hint.textContent = 'Нажми ещё раз';
      startMusic().then(ok => { if (ok) fadeIn(); });
      step = 1;
    } else if (step === 1) {
      // Тап 2: конверт и письмо улетают вверх, затем появляется солнце и надпись
      envelope.classList.add('fly');
      hint.classList.add('hidden');
      setTimeout(() => envelope.classList.add('gone'), 1500);
      setTimeout(() => {
        sun.classList.add('sun-visible');
        neon.classList.add('visible');
      }, 1600);
      setTimeout(() => { heartsActive = true; }, 1600 + 2500);
      step = 2;
    }
  }

  document.querySelector('.scene').addEventListener('click', onTap);

  // ---------- Запуск ----------
  resizeStars();
  resizeHearts();
  window.addEventListener('resize', () => {
    resizeStars();
    resizeHearts();
  });
  requestAnimationFrame(loop);
})();
