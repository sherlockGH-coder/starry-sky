/* 星空程序（恢复版，不含连想图轮廓） */
(() => {
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');

  const overlay = document.getElementById('overlay');
  const enterBtn = document.getElementById('enterBtn');
  const musicToggleBtn = document.getElementById('musicToggle');
  const zodiacSelect = document.getElementById('zodiac');
  const moodButtons = Array.from(document.querySelectorAll('.moods .btn-pill'));
  const trackSelect = document.getElementById('trackSelect');
  const tooltipEl = document.getElementById('tooltip');
  const toastEl = document.getElementById('toast');
  const typewriterEl = document.getElementById('typewriter');

  // 移动端性能优化：限制DPR和分辨率
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  let dpr = isMobile ? Math.max(1, Math.min(1.5, window.devicePixelRatio || 1)) : Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  
  function resize() {
    dpr = isMobile ? Math.max(1, Math.min(1.5, window.devicePixelRatio || 1)) : Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    // 移动端进一步限制分辨率
    const maxWidth = isMobile ? Math.min(innerWidth, 1200) : innerWidth;
    const maxHeight = isMobile ? Math.min(innerHeight, 800) : innerHeight;
    canvas.width = Math.floor(maxWidth * dpr);
    canvas.height = Math.floor(maxHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  const WORLD = { width: 4800, height: 3200 };
  const camera = { x: WORLD.width * 0.25, y: WORLD.height * 0.25 };
  const camDrift = { x: 0, y: 0 };

  const stars = [];
  const userStars = [];
  const lanterns = [];
  const rings = [];
  function random(min, max) { return Math.random() * (max - min) + min; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // 移动端减少星星数量
  const STAR_COUNT = isMobile ?
    Math.min(800, Math.floor((WORLD.width * WORLD.height) / 20000)) :
    Math.min(1400, Math.floor((WORLD.width * WORLD.height) / 14000));
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * WORLD.width,
      y: Math.random() * WORLD.height,
      r: random(0.5, 1.8),
      baseAlpha: random(0.35, 0.95),
      twinkleSpeed: random(0.4, 1.2),
      twinklePhase: random(0, Math.PI * 2),
      hue: random(200, 260),
    });
  }

  const meteors = [];
  let nextMeteorAt = 0;
  function spawnMeteor() {
    const startX = -random(100, 500);
    const startY = random(-200, innerHeight * dpr * 0.4);
    const speed = random(1200, 2200);
    const angle = random(Math.PI * 0.1, Math.PI * 0.35);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const life = random(0.8, 1.6);
    meteors.push({ x: camera.x + startX, y: camera.y + startY, vx, vy, life, age: 0, width: random(1.5, 2.5) });
  }

  // 平行满屏流星雨
  function spawnShowerMeteor() {
    const vw = innerWidth * dpr, vh = innerHeight * dpr, diag = Math.hypot(vw, vh);
    const margin = 300 * dpr;
    const cx = camera.x + vw / 2, cy = camera.y + vh / 2;
    const offset = random(-diag * 0.6, diag * 0.6);
    const spawnDist = diag * 0.6 + margin;
    const sx = cx + shower.nx * offset - shower.dx * spawnDist;
    const sy = cy + shower.ny * offset - shower.dy * spawnDist;
    const speed = random(1700, 2600);
    const vx = shower.dx * speed, vy = shower.dy * speed;
    const life = (diag + margin * 1.2) / speed;
    const width = random(2.2, 4.4);
    const tailPx = Math.max(100 * dpr, Math.min(0.18 * diag, 220 * dpr));
    const tail = tailPx / speed;
    meteors.push({ x: sx, y: sy, vx, vy, life, age: 0, width, tail });
  }

  const CONSTELLATIONS = {
    Aries: { name: '白羊座 Aries', desc: '热烈与勇气，像黎明第一束光。', points: [ [-0.9, -0.1], [-0.4, 0.15], [0.1, 0.05], [0.7, -0.2] ] },
    Taurus: { name: '金牛座 Taurus', desc: '温柔而坚定，向着喜欢的星光前行。', points: [ [-0.8, 0.3], [-0.2, 0.0], [0.4, -0.2], [0.8, 0.2], [0.3, 0.4] ] },
    Gemini: { name: '双子座 Gemini', desc: '灵动与好奇，双眸里藏着宇宙。', points: [ [-0.7, -0.6], [-0.7, 0.6], [-0.2, 0.2], [0.3, 0.6], [0.3, -0.6] ] },
    Cancer: { name: '巨蟹座 Cancer', desc: '柔软外壳里，是炽热的温柔与守护。', points: [ [-0.8, 0.1], [-0.2, -0.2], [0.2, 0.2], [0.7, -0.1] ] },
    Leo: { name: '狮子座 Leo', desc: '耀眼与真诚，像金色火焰般闪耀。', points: [ [-0.6, -0.4], [-0.2, -0.1], [0.2, 0.1], [0.4, 0.4], [0.7, 0.0] ] },
    Virgo: { name: '处女座 Virgo', desc: '细腻耐心，心有繁星，眼里有光。', points: [ [-0.8, -0.2], [-0.3, 0.0], [0.2, -0.4], [0.5, 0.1], [0.8, 0.3] ] },
    Libra: { name: '天秤座 Libra', desc: '平衡与优雅，把世界放在心上。', points: [ [-0.8, 0.0], [-0.3, 0.0], [0.3, 0.0], [0.8, 0.0], [0.3, -0.3] ] },
    Scorpio: { name: '天蝎座 Scorpio', desc: '深邃坚定，爱与热望都全力以赴。', points: [ [-0.7, -0.5], [-0.2, -0.2], [0.2, 0.1], [0.4, 0.4], [0.6, 0.2], [0.7, -0.3] ] },
    Sagittarius: { name: '射手座 Sagittarius', desc: '自由与远方，奔跑向辽阔的夜空。', points: [ [-0.8, 0.3], [-0.2, -0.1], [0.3, -0.4], [0.6, 0.0], [0.8, 0.4] ] },
    Capricorn: { name: '摩羯座 Capricorn', desc: '沉稳踏实，把梦想一步一步照亮。', points: [ [-0.7, 0.5], [-0.2, 0.0], [0.3, -0.2], [0.7, 0.3] ] },
    Aquarius: { name: '水瓶座 Aquarius', desc: '独立且温柔，像星河中独有的波光。', points: [ [-0.8, -0.2], [-0.4, 0.2], [0.0, -0.1], [0.4, 0.3], [0.8, 0.0] ] },
    Pisces: { name: '双鱼座 Pisces', desc: '浪漫与想象，在梦里拥抱宇宙。', points: [ [-0.7, 0.2], [-0.2, -0.1], [0.2, 0.1], [0.6, -0.2], [0.2, 0.5] ] },
  };
  let currentZodiac = (zodiacSelect && zodiacSelect.value) || 'Leo';

  function worldCenter() { return { x: WORLD.width / 2, y: WORLD.height / 2 }; }
  function drawConstellation(cons, highlight = false) {
    if (!cons) return;
    const center = worldCenter();
    const scale = Math.min(innerWidth, innerHeight) * dpr * 0.35;
    const points = cons.points.map(([nx, ny]) => ({ x: center.x + nx * scale, y: center.y + ny * scale }));
    ctx.save();
    ctx.lineWidth = highlight ? 2.4 * dpr : 1.4 * dpr;
    const grad = ctx.createLinearGradient(points[0].x, points[0].y, points.at(-1).x, points.at(-1).y);
    grad.addColorStop(0, highlight ? 'rgba(180, 200, 255, 0.95)' : 'rgba(160, 190, 255, 0.6)');
    grad.addColorStop(1, highlight ? 'rgba(150, 170, 255, 0.8)' : 'rgba(120, 160, 255, 0.35)');
    ctx.strokeStyle = grad;
    ctx.shadowColor = highlight ? 'rgba(170,190,255,0.8)' : 'rgba(130,160,255,0.35)';
    ctx.shadowBlur = highlight ? 18 * dpr : 8 * dpr;
    ctx.beginPath();
    ctx.moveTo(points[0].x - camera.x, points[0].y - camera.y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x - camera.x, points[i].y - camera.y);
    ctx.stroke();
    for (const p of points) {
      ctx.beginPath(); ctx.fillStyle = highlight ? 'rgba(255,255,255,0.95)' : 'rgba(240,245,255,0.9)';
      ctx.shadowColor = highlight ? 'rgba(170,190,255,1)' : 'rgba(130,160,255,0.9)';
      ctx.shadowBlur = highlight ? 22 * dpr : 12 * dpr;
      ctx.arc(p.x - camera.x, p.y - camera.y, highlight ? 2.2 * dpr : 1.6 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function pointLineDistance(p, a, b) {
    const x = p.x, y = p.y; const x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    const A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
    const dot = A * C + B * D; const lenSq = C * C + D * D;
    let t = lenSq !== 0 ? dot / lenSq : -1; t = clamp(t, 0, 1);
    const nx = x1 + C * t, ny = y1 + D * t; const dx = x - nx, dy = y - ny;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function isPointerNearConstellation(cons, pointerWorld, threshold) {
    if (!cons) return false; const center = worldCenter();
    const scale = Math.min(innerWidth, innerHeight) * dpr * 0.35;
    const pts = cons.points.map(([nx, ny]) => ({ x: center.x + nx * scale, y: center.y + ny * scale }));
    let min = Infinity; for (let i = 0; i < pts.length - 1; i++) { const d = pointLineDistance(pointerWorld, pts[i], pts[i + 1]); if (d < min) min = d; }
    return min <= threshold;
  }

  const message = { text: '生日快乐', points: [], worldPos: { x: WORLD.width * 0.5, y: WORLD.height * 0.45 } };
  function getMessageBounds() {
    if (message.points.length === 0) return { minX:0,minY:0,maxX:0,maxY:0,cx:message.worldPos.x,cy:message.worldPos.y, w:0,h:0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of message.points) {
      const x = message.worldPos.x + (p.x - 450) * dpr;
      const y = message.worldPos.y + (p.y - 110) * dpr;
      if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
    return { minX, minY, maxX, maxY, cx, cy, w: maxX - minX, h: maxY - minY };
  }
  function generateMessagePoints() {
    const off = document.createElement('canvas'); const w = 900, h = 220; off.width = w; off.height = h; const c = off.getContext('2d');
    c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 150px "Noto Serif SC", "STKaiti", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(message.text, w / 2, h / 2 + 10);
    const img = c.getImageData(0, 0, w, h); const data = img.data; const step = 7; const pts = [];
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) { const idx = (y * w + x) * 4 + 3; if (data[idx] > 80 && Math.random() < 0.65) pts.push({ x, y, rev: false }); }
    message.points = pts;
  }
  generateMessagePoints();
  function drawMessagePoints(showAll = false) {
    if (message.points.length === 0) return; ctx.save(); ctx.translate(message.worldPos.x - camera.x, message.worldPos.y - camera.y);
    for (const p of message.points) { if (!showAll && !p.rev) continue; const x = (p.x - 450) * dpr, y = (p.y - 110) * dpr; ctx.beginPath(); ctx.fillStyle = showAll ? 'rgba(250,252,255,0.98)' : 'rgba(240,245,255,0.92)'; ctx.shadowColor = showAll ? 'rgba(210,220,255,0.95)' : 'rgba(190,200,255,0.8)'; ctx.shadowBlur = showAll ? 16 * dpr : 10 * dpr; ctx.arc(x, y, (showAll ? 1.8 : 1.4) * dpr, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  let showPhase = 'idle'; let shower = { active: false, until: 0, rate: 36, angle: Math.PI * 0.26, dx: 0, dy: 0, nx: 0, ny: 0, pulse: 0 };
  let showerAcc = 0; let writers = []; let convergers = []; let messageVisible = false; let mood = 'gentle';

  let camTween = null;
  function startCameraTweenToWorldCenterOf(txWorld, tyWorld, durationMs) {
    const tx = clamp(txWorld - (innerWidth * dpr) / 2, 0, WORLD.width - innerWidth * dpr);
    const ty = clamp(tyWorld - (innerHeight * dpr) / 2, 0, WORLD.height - innerHeight * dpr);
    camTween = { sx: camera.x, sy: camera.y, tx, ty, t0: performance.now(), dur: durationMs };
  }
  function updateCameraTween(now) {
    if (!camTween) return; const t = clamp((now - camTween.t0) / camTween.dur, 0, 1); const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; camera.x = camTween.sx + (camTween.tx - camTween.sx) * ease; camera.y = camTween.sy + (camTween.ty - camTween.sy) * ease; if (t >= 1) camTween = null;
  }

  // 极光与散景 - 移动端减少数量
  const bokehCount = isMobile ? 12 : 28;
  const bokehs = Array.from({ length: bokehCount }, () => ({ x: Math.random() * WORLD.width, y: Math.random() * WORLD.height, r: random(30, 90) * dpr, a: random(0.05, 0.12) }));
  // 极光效果 - 移动端简化
  let auroraT = 0;
  function drawAurora() {
    if (isMobile && Math.random() > 0.3) return; // 移动端降低极光渲染频率
    auroraT += 0.0025;
    const cols = isMobile ? 3 : 5; // 移动端减少极光列数
    for (let i = 0; i < cols; i++) {
      const cx = (innerWidth * (0.2 + 0.6 * (i / (cols - 1)))) * dpr - camera.x;
      const cy = (innerHeight * (0.05 + 0.25 * Math.sin(auroraT + i))) * dpr - camera.y;
      const rx = innerWidth * 0.6 * dpr;
      const ry = innerHeight * (0.18 + 0.06 * Math.cos(auroraT * 0.7 + i)) * dpr;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      g.addColorStop(0, isMobile ? 'rgba(120, 90, 220, 0.06)' : 'rgba(120, 90, 220, 0.10)');
      g.addColorStop(0.4, isMobile ? 'rgba(90, 160, 240, 0.04)' : 'rgba(90, 160, 240, 0.08)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // 愿望灯与爱心环
  let longPressTimer = null; canvas.addEventListener('pointerdown', () => { longPressTimer = setTimeout(() => { const p = screenToWorld(innerWidth * 0.5, innerHeight * 0.82); const lantern = { x: p.x, y: p.y, vy: -random(16, 28) * dpr, swayA: random(10, 22) * dpr, swayF: random(0.18, 0.34), phase: random(0, Math.PI * 2), tilt: random(-0.08, 0.08), scale: random(0.95, 1.25), age: 0, life: random(7, 11), flame: random(0, Math.PI * 2) }; lanterns.push(lantern); showToast('愿望灯已点亮 ✦'); }, 650); });
  window.addEventListener('pointerup', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
  const lanternDust = [];
  function drawLanterns(dt) {
    for (let i = lanterns.length - 1; i >= 0; i--) {
      const l = lanterns[i]; l.age += dt; l.y += l.vy * dt; l.vy -= 1.2 * dpr * dt;
      const sway = Math.sin(l.phase + l.age * l.swayF * Math.PI * 2) * l.swayA * (1 - Math.min(1, l.age / l.life) * 0.6);
      const tx = l.x + sway, ty = l.y; if (l.age > l.life) { lanterns.splice(i, 1); continue; } const t = 1 - l.age / l.life; const s = l.scale;
      if (Math.random() < 0.35) lanternDust.push({ x: tx + random(-6, 6) * dpr, y: ty + random(-2, 4) * dpr, vy: -random(10, 24) * dpr, age: 0, life: random(0.6, 1.2) });
      const w = 18 * s * dpr, h = 26 * s * dpr, r = 6 * s * dpr; ctx.save(); ctx.translate(tx - camera.x, ty - camera.y); ctx.rotate(l.tilt + Math.sin(l.phase + l.age * 1.2) * 0.02);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 1.2); glow.addColorStop(0, 'rgba(255,200,150,0.12)'); glow.addColorStop(1, 'rgba(255,200,150,0.0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, h * 1.2, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(0, -h/2, 0, h/2); g.addColorStop(0, 'rgba(255, 210, 170, 0.22)'); g.addColorStop(1, 'rgba(255, 160, 100, 0.18)'); ctx.fillStyle = g; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w/2 + r, -h/2); ctx.lineTo(w/2 - r, -h/2); ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r); ctx.lineTo(w/2, h/2 - r); ctx.quadraticCurveTo(w/2, h/2, w/2 - r, h/2); ctx.lineTo(-w/2 + r, h/2); ctx.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r); ctx.lineTo(-w/2, -h/2 + r); ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2); ctx.closePath(); ctx.fill(); ctx.stroke();
      l.flame += dt * random(2.6, 3.6); const flick = 0.75 + 0.25 * Math.sin(l.flame); ctx.globalCompositeOperation = 'screen'; const fg = ctx.createRadialGradient(0, h * 0.15, 0, 0, h * 0.15, r * 1.6); fg.addColorStop(0, `rgba(255,230,180,${0.55 * t * flick})`); fg.addColorStop(1, 'rgba(255,230,180,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, h * 0.15, r * 1.8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (let i = lanternDust.length - 1; i >= 0; i--) { const d = lanternDust[i]; d.age += dt; d.y += d.vy * dt; d.vy -= 6 * dpr * dt; if (d.age > d.life) { lanternDust.splice(i, 1); continue; } const t = 1 - d.age / d.life; ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,220,180,${0.35 * t})`; ctx.beginPath(); ctx.arc(d.x - camera.x, d.y - camera.y, 1.2 * dpr * t, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  function spawnRing(x, y) { rings.push({ x, y, r: 0, age: 0, life: 1.2 }); }
  function drawRings(dt) { for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.age += dt; r.r += 60 * dpr * dt; if (r.age > r.life) { rings.splice(i, 1); continue; } const t = 1 - r.age / r.life; ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${0.6 * t})`; ctx.lineWidth = 2 * dpr * t; ctx.beginPath(); ctx.arc(r.x - camera.x, r.y - camera.y, r.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }

  // 交互
  let isPanning = false, panStart = { x: 0, y: 0 }, cameraStart = { x: 0, y: 0 }, lastPointerPos = { x: 0, y: 0 }, pointerWorld = { x: 0, y: 0 }, lastDownAt = 0;
  function screenToWorld(sx, sy) { return { x: sx * dpr + camera.x, y: sy * dpr + camera.y }; }
  canvas.addEventListener('pointerdown', (e) => { isPanning = true; panStart = { x: e.clientX, y: e.clientY }; cameraStart = { x: camera.x, y: camera.y }; lastDownAt = performance.now(); });
  window.addEventListener('pointermove', (e) => { lastPointerPos = { x: e.clientX, y: e.clientY }; pointerWorld = screenToWorld(e.clientX, e.clientY); if (isPanning) { const dx = (e.clientX - panStart.x) * dpr, dy = (e.clientY - panStart.y) * dpr; camera.x = clamp(cameraStart.x - dx, 0, WORLD.width - innerWidth * dpr); camera.y = clamp(cameraStart.y - dy, 0, WORLD.height - innerHeight * dpr); } });
  window.addEventListener('pointerup', (e) => { isPanning = false; const upAt = performance.now(); const dt = upAt - lastDownAt; const moved = Math.hypot(e.clientX - panStart.x, e.clientY - panStart.y); if (dt < 250 && moved < 6) { const p = screenToWorld(e.clientX, e.clientY); let hitIndex = -1; const hit = meteors.some((m, idx) => { const a = { x: m.x - camera.x, y: m.y - camera.y }, b = { x: m.x + m.vx * 0.05 - camera.x, y: m.y + m.vy * 0.05 - camera.y }; const d = pointLineDistance({ x: p.x - camera.x, y: p.y - camera.y }, a, b); if (d < 18 * dpr) { hitIndex = idx; return true; } return false; }); if (hit) { const m = meteors[hitIndex]; spawnRing(m.x, m.y); showToast('收集到一枚爱心环 ❤'); } } });
  canvas.addEventListener('dblclick', (e) => { const p = screenToWorld(e.clientX, e.clientY); userStars.push({ x: p.x, y: p.y, r: random(1.2, 2.4), baseAlpha: 1, twinkleSpeed: random(0.3, 0.9), twinklePhase: random(0, Math.PI * 2), hue: random(190, 260) }); showToast('点亮了一颗新星 ✧'); });

  function showToast(text) { toastEl.textContent = text; toastEl.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(() => toastEl.classList.remove('show'), 1800); }

  function moonIlluminationFraction(date) { const y = date.getUTCFullYear(); const m = date.getUTCMonth() + 1; const d = date.getUTCDate(); let r = y % 100; r %= 19; if (r > 9) r -= 19; r = ((r * 11) % 30) + m + d; if (m < 3) r += 2; const phase = (r < 0) ? r + 30 : r; return clamp(phase / 29.53, 0, 1); }
  function isWaxing(date) { return moonIlluminationFraction(date) < 0.5; }
  function drawMoon(x, y, r) { const frac = moonIlluminationFraction(new Date()); const waxing = isWaxing(new Date()); ctx.save(); ctx.translate(x - camera.x, y - camera.y); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.shadowColor = 'rgba(230,240,255,0.5)'; ctx.shadowBlur = 14 * dpr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; const offset = (1 - Math.abs(2 * frac - 1)) * r; ctx.beginPath(); ctx.ellipse(waxing ? -offset : offset, 0, r, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

  const romanticLines = [ '愿这片星空替我，把所有温柔都照进你的眼睛。', '也愿今夜划过的每一道流光，都为你点亮希望与好运。', '生日快乐，去迎接你最闪耀的时刻吧！', '祝你考试超常发挥，心之所向，皆能如愿。' ];
  let typing = { idx: 0, char: 0, showing: false, t0: 0 };
  function startTypewriter() { typing = { idx: 0, char: 0, showing: true, t0: performance.now() }; typewriterEl.classList.remove('hidden'); typewriterEl.style.opacity = '0'; }
  function updateTypewriter(dt) { if (!typing.showing) return; const isMobile = matchMedia('(pointer: coarse)').matches; const speed = isMobile ? 14 : 20; typing.char += speed * dt; const line = romanticLines[typing.idx]; const shown = Math.floor(typing.char); typewriterEl.textContent = line.slice(0, shown); const targetOpacity = 0.96; const current = parseFloat(typewriterEl.style.opacity || '0'); typewriterEl.style.opacity = Math.min(targetOpacity, current + dt * 1.2).toString(); if (typing.char >= line.length + (isMobile ? 18 : 12)) { typing.idx++; typing.char = 0; if (typing.idx >= romanticLines.length) { typing.showing = false; setTimeout(() => typewriterEl.classList.add('hidden'), isMobile ? 4200 : 2800); } } }

  function startMeteorShower(durationMs = 7000) {
    showPhase = 'shower'; shower.active = true; shower.until = performance.now() + durationMs;
    const areaScale = (innerWidth * innerHeight) / (1280 * 720);
    // 移动端降低流星雨密度
    const mobileScale = isMobile ? 0.6 : 1.0;
    const base = (mood === 'grand' ? 110 : mood === 'aurora' ? 90 : 70) * mobileScale;
    const cap = (mood === 'grand' ? 180 : mood === 'aurora' ? 130 : 140) * mobileScale;
    shower.rate = Math.max(base, Math.min(cap, Math.round(base * areaScale)));
    showerAcc = 0; shower.angle = random(Math.PI * 0.16, Math.PI * 0.38);
    shower.dx = Math.cos(shower.angle); shower.dy = Math.sin(shower.angle);
    shower.nx = -shower.dy; shower.ny = shower.dx; shower.pulse = 0;
    startTypewriter();
  }

  // 在流星雨结束后，触发“汇聚成字”：从屏幕四周飞向文字像素点
  function startConvergeToMessage() {
    showPhase = 'converge';
    convergers = [];
    const bounds = getMessageBounds();
    // 从围绕文字的圆环上均匀发射，形成向内的“流光回拢”
    const radius = Math.max(bounds.w, bounds.h) * 0.9 + 280 * dpr;
    const centerX = bounds.cx, centerY = bounds.cy;
    const count = isMobile ? 80 : 160; // 移动端减少收束流星数
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + random(-0.05, 0.05);
      const sx = centerX + Math.cos(theta) * radius;
      const sy = centerY + Math.sin(theta) * radius;
      const p = message.points[Math.floor(Math.random() * message.points.length)];
      const tx = message.worldPos.x + (p.x - 450) * dpr + random(-3,3) * dpr;
      const ty = message.worldPos.y + (p.y - 110) * dpr + random(-3,3) * dpr;
      const life = random(1.2, 2.0);
      convergers.push({
        sx, sy, tx, ty, x: sx, y: sy, prevX: sx, prevY: sy,
        life, age: 0, width: random(2.0, 3.0), tailPx: random(90, 140) * dpr,
        curve: random(-0.12, 0.12), // 轻微弧度
        eased: 0
      });
    }
    startCameraTweenToWorldCenterOf(centerX, centerY, 1400);
  }

  function startWritingSequence() {
    showPhase = 'writing';
    messageVisible = false;
    // 将文字点按行分桶，抽取若干行做横扫
    const rowsMap = new Map();
    const bucket = 10; // px bucket in offscreen text space
    for (const p of message.points) {
      const key = Math.round(p.y / bucket) * bucket;
      let arr = rowsMap.get(key);
      if (!arr) { arr = []; rowsMap.set(key, arr); }
      arr.push(p.x);
    }
    const rowKeys = Array.from(rowsMap.keys()).sort((a,b)=>a-b);
    const TAKE = 8;
    writers = [];
    for (let i = 0; i < TAKE; i++) {
      if (rowKeys.length === 0) break;
      const idx = Math.round((i + 0.5) * (rowKeys.length / TAKE) - 1);
      const key = clamp(idx, 0, rowKeys.length - 1);
      const y0 = rowKeys[key];
      const xs = rowsMap.get(y0).sort((a,b)=>a-b);
      const minX = xs[0];
      const maxX = xs[xs.length - 1];
      const dir = Math.random() < 0.5 ? 1 : -1;
      const startX = dir === 1 ? minX - 40 : maxX + 40;
      const endX = dir === 1 ? maxX + 20 : minX - 20;
      const speed = random(800, 1200);
      const worldY = message.worldPos.y + (y0 - 110) * dpr;
      const worldStartX = message.worldPos.x + (startX - 450) * dpr;
      const worldEndX = message.worldPos.x + (endX - 450) * dpr;
      const vx = dir * speed * dpr;
      const vy = random(-20, 20) * dpr;
      writers.push({ x: worldStartX, y: worldY, endX: worldEndX, vx, vy, width: random(2.2, 3.6), hue: 220, done: false, tail: 0.15 });
    }
    // 镜头确保聚焦文字
    const bounds = getMessageBounds();
    startCameraTweenToWorldCenterOf(bounds.cx, bounds.cy, 1000);
  }

  let lastTs = 0;
  function tick(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016); lastTs = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCameraTween(performance.now());
    if (showPhase === 'shower' && camTween == null) { camDrift.x += (shower.dx * 4 * dpr - camDrift.x) * 0.02; camDrift.y += (shower.dy * 2 * dpr - camDrift.y) * 0.02; camera.x = clamp(camera.x + camDrift.x * dt, 0, WORLD.width - innerWidth * dpr); camera.y = clamp(camera.y + camDrift.y * dt, 0, WORLD.height - innerHeight * dpr); }
    const g = ctx.createRadialGradient((innerWidth * 0.7) * dpr - camera.x, (innerHeight * 0.2) * dpr - camera.y, 0, (innerWidth * 0.7) * dpr - camera.x, (innerHeight * 0.2) * dpr - camera.y, Math.max(canvas.width, canvas.height) * 0.8); g.addColorStop(0, 'rgba(60,60,120,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); drawAurora();
    for (const s of stars) { const alpha = s.baseAlpha * 0.8 + Math.sin(ts * 0.001 * s.twinkleSpeed + s.twinklePhase) * 0.2; ctx.beginPath(); ctx.fillStyle = `hsla(${s.hue}, 80%, 85%, ${clamp(alpha, 0.25, 1)})`; ctx.shadowColor = `hsla(${s.hue}, 95%, 80%, ${clamp(alpha, 0.35, 0.8)})`; ctx.shadowBlur = 6 * dpr; ctx.arc(s.x - camera.x, s.y - camera.y, s.r * dpr, 0, Math.PI * 2); ctx.fill(); }
    for (const s of userStars) { const alpha = s.baseAlpha * 0.85 + Math.sin(ts * 0.001 * s.twinkleSpeed + s.twinklePhase) * 0.15; ctx.beginPath(); ctx.fillStyle = `hsla(${s.hue}, 90%, 92%, ${clamp(alpha, 0.4, 1)})`; ctx.shadowColor = `hsla(${s.hue}, 95%, 85%, ${clamp(alpha, 0.6, 1)})`; ctx.shadowBlur = 10 * dpr; ctx.arc(s.x - camera.x, s.y - camera.y, s.r * dpr, 0, Math.PI * 2); ctx.fill(); }
    // bokeh
    ctx.save(); for (const b of bokehs) { const x = b.x - camera.x, y = b.y - camera.y; const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r); grad.addColorStop(0, `rgba(255,255,255,${b.a})`); grad.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = grad; ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2); } ctx.restore();
    const cons = CONSTELLATIONS[currentZodiac]; const threshold = 16 * dpr; const near = isPointerNearConstellation(cons, pointerWorld, threshold); drawConstellation(cons, near);
    drawMoon(WORLD.width * 0.78, WORLD.height * 0.2, 14 * dpr);
    if (messageVisible && message.points.length > 0) drawMessagePoints(true);
    if ((showPhase === 'idle' || showPhase === 'done') && ts > nextMeteorAt) { spawnMeteor(); nextMeteorAt = ts + random(2400, 5200); }
    if (showPhase === 'shower' && shower.active) { shower.pulse += dt; const cycle = 1.8; const t = (shower.pulse % cycle) / cycle; const ease = t < 0.5 ? (t*2)*(t*2) : 1 - Math.pow(1-(t-0.5)*2, 2); const mult = mood === 'grand' ? 1.6 : mood === 'aurora' ? 1.25 : 1.0; const rateNow = shower.rate * (0.6 + 0.8 * ease) * mult; showerAcc += dt * rateNow; const count = Math.floor(showerAcc); if (count > 0) { for (let i = 0; i < count; i++) spawnShowerMeteor(); showerAcc -= count; } if (performance.now() > shower.until) { shower.active = false; startConvergeToMessage(); } }
    for (let i = meteors.length - 1; i >= 0; i--) { const m = meteors[i]; m.age += dt; if (m.age > m.life) { meteors.splice(i, 1); continue; } m.x += m.vx * dt; m.y += m.vy * dt; const tail = m.tail ?? 0.06; const x1 = m.x - camera.x, y1 = m.y - camera.y, x2 = x1 - m.vx * tail, y2 = y1 - m.vy * tail; const grad = ctx.createLinearGradient(x1, y1, x2, y2); grad.addColorStop(0, 'rgba(255,255,255,0.92)'); grad.addColorStop(1, 'rgba(255,255,255,0.0)'); ctx.save(); const lw = m.width * dpr; ctx.strokeStyle = grad; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(200,210,255,0.7)'; ctx.shadowBlur = 10 * dpr; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 0.3; ctx.lineWidth = lw * 1.8; ctx.stroke(); ctx.globalAlpha = 1; ctx.restore(); }

    // 汇聚流星绘制/推进（环形收束，轻微弧线），逐点点亮文字
    if (showPhase === 'converge' && convergers.length > 0) {
      let allHit = true;
      for (let i = convergers.length - 1; i >= 0; i--) {
        const m = convergers[i];
        m.age += dt;
        const t = Math.min(1, m.age / m.life);
        // ease-in-out 并加一点曲率
        const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
        const nx = m.sx + (m.tx - m.sx) * ease;
        const ny = m.sy + (m.ty - m.sy) * ease + Math.sin(ease * Math.PI) * m.curve * Math.hypot(m.tx - m.sx, m.ty - m.sy);
        m.prevX = m.x; m.prevY = m.y; m.x = nx; m.y = ny;
        const x1 = m.x - camera.x, y1 = m.y - camera.y;
        const vx = m.x - m.prevX, vy = m.y - m.prevY;
        const len = Math.hypot(vx, vy) || 1;
        const tail = (m.tailPx || 120*dpr) / (len / dt + 1e-6);
        const x2 = x1 - (vx) * (tail / dt);
        const y2 = y1 - (vy) * (tail / dt);
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255,255,255,0.95)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save(); ctx.strokeStyle = grad; ctx.lineWidth = m.width * dpr; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(200,210,255,0.85)'; ctx.shadowBlur = 16 * dpr; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();

        const dist = Math.hypot(m.tx - m.x, m.ty - m.y);
        if (dist < 8 * dpr || t >= 1) {
          convergers.splice(i, 1);
          for (const p of message.points) {
            const px = message.worldPos.x + (p.x - 450) * dpr;
            const py = message.worldPos.y + (p.y - 110) * dpr;
            if (Math.hypot(px - m.tx, py - m.ty) < 10 * dpr) p.rev = true;
          }
        } else {
          allHit = false;
        }
      }
      if (allHit) {
        // 若点亮不足阈值，则强制显露全部，再进入写字扫光
        const revealed = message.points.filter(p => p.rev).length;
        const need = Math.ceil(message.points.length * 0.35);
        if (revealed < need) {
          // 先点亮一层描边，保证能看到“生日快乐”轮廓
          for (const p of message.points) {
            if (!p.rev) {
              const px = message.worldPos.x + (p.x - 450) * dpr;
              const py = message.worldPos.y + (p.y - 110) * dpr;
              // 文字外边缘近似：离中心外扩一定阈值的点优先点亮
              const b = getMessageBounds();
              if (px < b.minX + 10*dpr || px > b.maxX - 10*dpr || py < b.minY + 10*dpr || py > b.maxY - 10*dpr) {
                p.rev = true;
              }
            }
          }
        }
        startWritingSequence();
      }
    }
    // 写字阶段
    if (showPhase === 'writing' && writers.length > 0) {
      drawMessagePoints(false); let allDone = true; for (const w of writers) { if (w.done) continue; w.x += w.vx * dt; w.y += w.vy * dt * 0.02; const reached = (w.vx > 0 && w.x >= w.endX) || (w.vx < 0 && w.x <= w.endX); const tail = w.tail; const x1 = w.x - camera.x, y1 = w.y - camera.y, x2 = x1 - w.vx * tail, y2 = y1 - w.vy * tail; const grad = ctx.createLinearGradient(x1, y1, x2, y2); grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(255,255,255,0.0)'); ctx.save(); ctx.strokeStyle = grad; ctx.lineWidth = Math.max(1.6, w.width * 0.8) * dpr; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(200,210,255,0.7)'; ctx.shadowBlur = 12 * dpr; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 0.35; ctx.lineWidth *= 1.8; ctx.stroke(); ctx.globalAlpha = 1; ctx.restore(); if (reached) w.done = true; else allDone = false; const revealBand = 10 * dpr; for (const p of message.points) { if (p.rev) continue; const px = message.worldPos.x + (p.x - 450) * dpr, py = message.worldPos.y + (p.y - 110) * dpr; if (Math.abs(py - w.y) < revealBand) { if ((w.vx > 0 && px <= w.x && px >= w.x - w.vx * w.tail) || (w.vx < 0 && px >= w.x && px <= w.x - w.vx * w.tail)) p.rev = true; } } } if (allDone) { showPhase = 'done'; messageVisible = true; showToast('生日快乐 ✨'); } }
      drawLanterns(dt); drawRings(dt); updateTypewriter(dt); updateTooltip(); requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function updateTooltip() { const cons = CONSTELLATIONS[currentZodiac]; const threshold = 16 * dpr; const near = isPointerNearConstellation(cons, pointerWorld, threshold); if (near) { tooltipEl.classList.remove('hidden'); tooltipEl.innerHTML = `<div class="name">${cons.name}</div><div>${cons.desc}</div>`; const x = clamp(lastPointerPos.x + 12, 6, innerWidth - 6 - 260); const y = clamp(lastPointerPos.y + 12, 6, innerHeight - 6 - 120); tooltipEl.style.left = x + 'px'; tooltipEl.style.top = y + 'px'; } else { tooltipEl.classList.add('hidden'); } }

  enterBtn.addEventListener('click', async () => {
    let playing = false;
    try {
      // 确保音频管理器已初始化
      await window.AudioManager.init();
      // 强制开始播放音乐
      playing = await window.AudioManager.toggle();
      // 如果第一次toggle没有播放，再试一次
      if (!playing) {
        playing = await window.AudioManager.toggle();
      }
    } catch (e) {
      console.warn('音频播放失败:', e);
    }
    overlay.classList.add('hidden');
    musicToggleBtn.textContent = playing ? '⏸︎ 静音' : '♪ 音乐';
    showToast('愿我们把夜空都点亮 ✧');
    startMeteorShower(7000);
  });
  musicToggleBtn.addEventListener('click', async () => { const playing = await window.AudioManager.toggle(); musicToggleBtn.textContent = playing ? '⏸︎ 静音' : '♪ 音乐'; });
  if (trackSelect) { trackSelect.addEventListener('change', (e) => { const val = e.target.value; if (val === 'yiruma') window.AudioManager.setTrack('yiruma'); else window.AudioManager.setTrack('ambient'); showToast(`已切换曲目：${trackSelect.options[trackSelect.selectedIndex].text}`); if (window.AudioManager.isPlaying()) { window.AudioManager.toggle().then(() => window.AudioManager.toggle()); } }); }
  if (window.AudioManager) { window.AudioManager.onError = (msg) => showToast(msg); }
  zodiacSelect.addEventListener('change', (e) => { currentZodiac = e.target.value; showToast(`已切换到：${CONSTELLATIONS[currentZodiac].name}`); });
})();


