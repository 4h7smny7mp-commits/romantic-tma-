(() => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // ---------- Звёзды на фоне (2D) ----------
  const starsCanvas = document.getElementById('stars');
  const sctx = starsCanvas.getContext('2d');
  let bgStars = [];

  function resizeBgStars() {
    starsCanvas.width = window.innerWidth * dpr;
    starsCanvas.height = window.innerHeight * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgStars = Array.from({ length: 150 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.3 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.03
    }));
  }

  function drawBgStars(t) {
    sctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    sctx.fillStyle = '#fff';
    for (const s of bgStars) {
      sctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      sctx.beginPath();
      sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      sctx.fill();
    }
    sctx.globalAlpha = 1;
  }

  // ---------- Сердечки ----------
  const heartsCanvas = document.getElementById('hearts');
  const hctx = heartsCanvas.getContext('2d');
  let hearts = [];
  let heartsActive = false;
  const HEART_COLORS = ['#ff2e9a', '#ff5ccf', '#ff8ae0'];

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
    // Неон: яркая заливка, розовое свечение и светлый контур
    hctx.save();
    hctx.shadowColor = color;
    hctx.shadowBlur = size * 0.9;
    hctx.fillStyle = color;
    hctx.fill();
    hctx.shadowBlur = 0;
    hctx.lineWidth = Math.max(1, size * 0.08);
    hctx.strokeStyle = 'rgba(255, 220, 245, 0.9)';
    hctx.stroke();
    hctx.restore();
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

  // ---------- 3D: полёт к галактике и солнцу (three.js) ----------
  let HAS_THREE = typeof THREE !== 'undefined';
  const spaceCanvas = document.getElementById('space');
  const FLIGHT_MS = 7500;
  const SUN_Z = -900;      // положение солнца и центра галактики
  const SUN_R = 70;        // радиус солнца
  const END_Z = SUN_Z + 170; // где остановится камера
  const STAR_COUNT = 1800;
  const STAR_RANGE = 1400;

  let renderer, scene, camera, starsGroup, starsGeom, starsLines, starData, starArr;
  let galaxy, sun, sunMat, corona1, corona2;
  let threeActive = false;
  let flightStart = 0;
  let lastNow = 0;

  const SUN_VERT = `
    varying vec3 vNormal;
    varying vec3 vPos;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  const SUN_FRAG = `
    uniform float uTime;
    uniform float uBright;
    varying vec3 vNormal;
    varying vec3 vPos;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                     mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                     mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // Земля: океаны, материки и облака из шума, освещение с одной стороны
      vec3 p = normalize(vPos) * 2.2;
      float h = fbm(p * 1.3);
      float land = smoothstep(0.5, 0.56, h);
      float cloud = smoothstep(0.56, 0.82, fbm(p * 2.4 + vec3(uTime * 0.02, 0.0, 0.0)));

      vec3 ocean = mix(vec3(0.03, 0.16, 0.42), vec3(0.06, 0.38, 0.70), fbm(p * 4.0));
      vec3 grass = mix(vec3(0.15, 0.40, 0.14), vec3(0.45, 0.37, 0.20), smoothstep(0.55, 0.7, h));
      vec3 surf = mix(ocean, grass, land);
      surf = mix(surf, vec3(0.95, 0.97, 1.0), cloud * 0.8);

      vec3 N = normalize(vNormal);
      vec3 L = normalize(vec3(-0.6, 0.35, 0.75));
      float ndl = max(dot(N, L), 0.0);
      vec3 color = surf * (0.07 + 0.93 * ndl);

      // Голубой ободок атмосферы по краю диска
      float ndv = clamp(dot(N, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
      float fres = pow(1.0 - ndv, 3.0);
      color += vec3(0.25, 0.6, 1.0) * fres * (0.3 + ndl) * 0.7;

      gl_FragColor = vec4(color * uBright, 1.0);
    }`;

  function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.2, 'rgba(255,240,200,0.8)');
    grd.addColorStop(0.5, 'rgba(255,180,90,0.25)');
    grd.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  function initThree() {
    if (!HAS_THREE) return;
    try {
      buildSpace();
    } catch (err) {
      // Если WebGL недоступен (например, в старом Safari), сайт работает без полёта
      console.warn('3D недоступен:', err);
      HAS_THREE = false;
      spaceCanvas.classList.remove('show');
    }
  }

  function buildSpace() {
    renderer = new THREE.WebGLRenderer({ canvas: spaceCanvas, alpha: true, antialias: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 0, 0);

    // Звёздный туннель (линии-«штрихи» при полёте)
    starData = [];
    starArr = new Float32Array(STAR_COUNT * 6);
    for (let i = 0; i < STAR_COUNT; i++) {
      starData.push({
        x: (Math.random() - 0.5) * 520,
        y: (Math.random() - 0.5) * 340,
        z: -Math.random() * STAR_RANGE
      });
    }
    starsGeom = new THREE.BufferGeometry();
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starArr, 3));
    starsLines = new THREE.LineSegments(starsGeom, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.85
    }));
    starsGroup = new THREE.Group();
    starsGroup.add(starsLines);
    scene.add(starsGroup);

    // Спиральная галактика вокруг солнца
    const GN = 7000;
    const gPos = new Float32Array(GN * 3);
    const gCol = new Float32Array(GN * 3);
    const cCore = new THREE.Color(0xcfe3ff);
    const cEdge = new THREE.Color(0xff9cd2);
    const tmp = new THREE.Color();
    for (let i = 0; i < GN; i++) {
      const arm = i % 2;
      const r = Math.pow(Math.random(), 0.7) * 380;
      const theta = arm * Math.PI + r * 0.028 + (Math.random() - 0.5) * 0.6;
      gPos[i * 3] = r * Math.cos(theta);
      gPos[i * 3 + 1] = r * Math.sin(theta);
      gPos[i * 3 + 2] = (Math.random() - 0.5) * 18 * (1 - r / 420);
      tmp.copy(cCore).lerp(cEdge, r / 380);
      const b = 0.6 + Math.random() * 0.4;
      gCol[i * 3] = tmp.r * b;
      gCol[i * 3 + 1] = tmp.g * b;
      gCol[i * 3 + 2] = tmp.b * b;
    }
    const gGeom = new THREE.BufferGeometry();
    gGeom.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    gGeom.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
    galaxy = new THREE.Points(gGeom, new THREE.PointsMaterial({
      size: 2.4, vertexColors: true, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    galaxy.position.set(0, 0, SUN_Z);
    galaxy.rotation.x = -1.05;
    scene.add(galaxy);

    // 3D-солнце
    sunMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uBright: { value: 1 } },
      vertexShader: SUN_VERT,
      fragmentShader: SUN_FRAG
    });
    sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 64), sunMat);
    sun.position.set(0, 0, SUN_Z);
    scene.add(sun);

    // Корона: два спрайта разного размера
    const tex = makeGlowTexture();
    corona1 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0x5ab4ff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    corona1.scale.set(SUN_R * 6, SUN_R * 6, 1);
    corona1.position.copy(sun.position);
    corona2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0x2a7bff, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    corona2.scale.set(SUN_R * 12, SUN_R * 12, 1);
    corona2.position.copy(sun.position);
    scene.add(corona1, corona2);
  }

  function updateStars(speed, dt) {
    const streak = Math.max(2, Math.min(speed * 0.06, 120));
    for (let i = 0; i < STAR_COUNT; i++) {
      const s = starData[i];
      s.z += speed * dt;
      if (s.z > 5) {
        s.z -= STAR_RANGE;
        s.x = (Math.random() - 0.5) * 520;
        s.y = (Math.random() - 0.5) * 340;
      }
      const k = i * 6;
      starArr[k] = s.x;
      starArr[k + 1] = s.y;
      starArr[k + 2] = s.z;
      starArr[k + 3] = s.x;
      starArr[k + 4] = s.y;
      starArr[k + 5] = s.z - streak;
    }
    starsGeom.attributes.position.needsUpdate = true;
  }

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function updateSpace(now) {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const elapsed = now - flightStart;
    const t = Math.min(1, elapsed / FLIGHT_MS);
    const p = easeInOutCubic(t);
    const warp = Math.sin(Math.PI * t);      // 0 → 1 → 0 за время полёта

    // Камера летит к солнцу
    camera.position.z = END_Z * p;
    camera.position.x = Math.sin(now * 0.0013) * 4 * warp;
    camera.position.y = Math.sin(now * 0.0017) * 3 * warp;
    camera.rotation.z = Math.sin(now * 0.001) * 0.015 * warp;
    camera.lookAt(0, 0, -1e9); // смотрим вперёд по -Z

    // Звёзды едут вместе с камерой; скорость — только во время полёта
    starsGroup.position.copy(camera.position);
    updateStars(t < 1 ? 60 + warp * 900 : 0, dt);

    // Галактика проявляется и медленно вращается; солнце «дышит»
    galaxy.material.opacity = Math.min(1, elapsed / 2000) * 0.9;
    galaxy.rotation.z += dt * 0.08;
    sunMat.uniforms.uTime.value = now * 0.001;
    sun.rotation.y = now * 0.0004; // Земля медленно вращается

    // После появления надписи солнце чуть тускнеет (примерно на треть)
    const dimT = Math.max(0, Math.min(1, (now - (flightStart + FLIGHT_MS + 400)) / 3000));
    const bright = 1 - 0.3 * (dimT * dimT * (3 - 2 * dimT));
    sunMat.uniforms.uBright.value = bright;
    corona1.material.opacity = 0.9 * bright;
    corona2.material.opacity = 0.35 * bright;

    renderer.render(scene, camera);
  }

  function resizeThree() {
    if (!HAS_THREE || !renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
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
      // Тап 2: конверт улетает вверх, камера летит к галактике и солнцу
      envelope.classList.add('fly');
      hint.classList.add('hidden');
      setTimeout(() => envelope.classList.add('gone'), 1500);

      if (HAS_THREE) {
        flightStart = performance.now();
        threeActive = true;
        spaceCanvas.classList.add('show');
        setTimeout(() => neon.classList.add('visible'), FLIGHT_MS + 400);
      } else {
        // Без three.js полёта не будет: сразу показываем надпись
        setTimeout(() => neon.classList.add('visible'), 1600);
      }
      setTimeout(() => { heartsActive = true; }, (HAS_THREE ? FLIGHT_MS : 1600) + 2900);
      step = 2;
    }
  }

  document.querySelector('.scene').addEventListener('click', onTap);

  // ---------- Главный цикл ----------
  function loop(now) {
    drawBgStars(now);
    drawHearts(now);
    if (threeActive) updateSpace(now);
    requestAnimationFrame(loop);
  }

  // ---------- Запуск ----------
  resizeBgStars();
  resizeHearts();
  initThree();
  window.addEventListener('resize', () => {
    resizeBgStars();
    resizeHearts();
    resizeThree();
  });
  lastNow = performance.now();
  requestAnimationFrame(loop);
})();
