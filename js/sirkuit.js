/**
 * ============================================================
 * Simulator Sirkuit Digital — sirkuit.js
 * Pure Vanilla JavaScript (ES6+) · No frameworks · No libraries
 *
 * Architecture:
 *   - Physics Engine  : Ohm's Law (I = V/R), Power Law (P = V²/R)
 *   - Canvas Renderer : HTML5 Canvas 2D API
 *   - Animation Loop  : window.requestAnimationFrame() @ 60 FPS
 *   - Particle System : Electron flow + Blast particles on overload
 * ============================================================
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────
  const V_BATTERY          = 1.5;   // Volts per battery unit
  const OVERLOAD_FACTOR    = 1.3;   // P_actual > P_nominal × 1.3 → overload
  const ELECTRON_COUNT     = 22;    // Normal electron particles
  const BLAST_COUNT        = 15;    // Blast particles on overload
  const BLAST_DURATION_MS  = 1800;  // How long blast animation plays (ms)
  const BASE_SPEED         = 0.004; // Base electron travel speed (fraction of path per frame)

  // ─────────────────────────────────────────────
  // SIMULATION STATE  (monomorphic — never add/remove keys at runtime)
  // ─────────────────────────────────────────────
  const sim = {
    circuitType  : 'seri',
    batteryCount : 1,
    bulbCount    : 1,
    bulbWatt     : 10,
    // Computed by physics engine
    V_total      : 0,
    R_total      : 0,
    I            : 0,
    P_actual     : 0,
    bulbState    : 'normal',   // 'dim' | 'normal' | 'overload'
    dimAlpha     : 1.0,        // 0.0–1.0 brightness for dim state
    // Overload tracking
    wasOverload  : false,
    blastTime    : 0,          // timestamp when blast started
    blastActive  : false,
  };

  // ─────────────────────────────────────────────
  // DOM REFERENCES
  // ─────────────────────────────────────────────
  const canvas          = document.getElementById('circuitCanvas');
  const ctx             = canvas.getContext('2d', { alpha: false });
  const overloadBanner  = document.getElementById('overloadBanner');

  const elVoltage    = document.getElementById('displayVoltage');
  const elResistance = document.getElementById('displayResistance');
  const elCurrent    = document.getElementById('displayCurrent');
  const elPower      = document.getElementById('displayPower');
  const elStatus     = document.getElementById('displayStatus');

  const sliderBattery      = document.getElementById('batteryCount');
  const labelBattery       = document.getElementById('batteryCountDisplay');
  const sliderBulb         = document.getElementById('bulbCount');
  const labelBulb          = document.getElementById('bulbCountDisplay');
  const radiosCircuitType  = document.querySelectorAll('input[name="circuitType"]');
  const radiosBulbWatt     = document.querySelectorAll('input[name="bulbWatt"]');
  const btnReset           = document.getElementById('btnReset');

  // ─────────────────────────────────────────────
  // CANVAS SIZING
  // ─────────────────────────────────────────────
  let cw = 0; // logical canvas width
  let ch = 0; // logical canvas height
  let dpr = 1;

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    cw = rect.width  || canvas.parentElement.clientWidth  || 400;
    ch = rect.height || canvas.parentElement.clientHeight || 300;
    canvas.width  = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ─────────────────────────────────────────────
  // CIRCUIT GEOMETRY  (computed from canvas size)
  // ─────────────────────────────────────────────
  function getGeometry() {
    const cx = cw / 2;
    const cy = ch / 2;
    const pad = Math.min(cw, ch) * 0.12;
    const left   = pad;
    const right  = cw - pad;
    const top    = pad;
    const bottom = ch - pad;

    // Rectangular wire path: top-left → top-right → bottom-right → bottom-left → top-left
    // Batteries sit on the top wire, bulbs on the bottom wire
    const wirePath = [
      { x: left,  y: top    },
      { x: right, y: top    },
      { x: right, y: bottom },
      { x: left,  y: bottom },
      { x: left,  y: top    },
    ];

    // Expand path into dense point array for smooth particle travel
    const densePath = [];
    const STEPS_PER_SEGMENT = 40;
    for (let s = 0; s < wirePath.length - 1; s++) {
      const a = wirePath[s];
      const b = wirePath[s + 1];
      for (let t = 0; t < STEPS_PER_SEGMENT; t++) {
        const frac = t / STEPS_PER_SEGMENT;
        densePath.push({
          x: a.x + (b.x - a.x) * frac,
          y: a.y + (b.y - a.y) * frac,
        });
      }
    }
    densePath.push({ x: left, y: top }); // close loop

    return {
      cx, cy,
      left, right, top, bottom,
      wirePath,
      densePath,
      batteryY : top,
      bulbY    : bottom,
    };
  }

  // ─────────────────────────────────────────────
  // PARTICLE SYSTEM
  // ─────────────────────────────────────────────

  // Electron particles — monomorphic objects
  const electrons = [];

  function createElectron(densePath) {
    return {
      progress : Math.random(),   // 0.0–1.0 position along path
      size     : 4,
      r        : 79,
      g        : 195,
      b        : 247,
    };
  }

  function initElectrons(densePath) {
    electrons.length = 0;
    for (let i = 0; i < ELECTRON_COUNT; i++) {
      electrons.push(createElectron(densePath));
    }
  }

  function updateElectrons(densePath, speedFactor) {
    const pathLen = densePath.length;
    for (let i = 0; i < electrons.length; i++) {
      electrons[i].progress += BASE_SPEED * speedFactor;
      if (electrons[i].progress >= 1) electrons[i].progress -= 1;
    }
  }

  function drawElectrons(densePath) {
    const pathLen = densePath.length;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#4fc3f7';
    for (let i = 0; i < electrons.length; i++) {
      const idx = Math.floor(electrons[i].progress * (pathLen - 1));
      const pt  = densePath[idx];
      ctx.fillStyle = `rgb(${electrons[i].r},${electrons[i].g},${electrons[i].b})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, electrons[i].size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // Blast particles — monomorphic objects
  const blasts = [];

  function spawnBlast(x, y) {
    blasts.length = 0;
    for (let i = 0; i < BLAST_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      blasts.push({
        x    : x,
        y    : y,
        vx   : Math.cos(angle) * speed,
        vy   : Math.sin(angle) * speed,
        size : 3 + Math.random() * 4,
        life : 1.0,
        decay: 0.012 + Math.random() * 0.014,
        hue  : Math.floor(Math.random() * 60),
      });
    }
  }

  function updateBlasts() {
    for (let i = 0; i < blasts.length; i++) {
      blasts[i].x  += blasts[i].vx;
      blasts[i].y  += blasts[i].vy;
      blasts[i].vy += 0.18; // gravity
      blasts[i].life -= blasts[i].decay;
    }
  }

  function drawBlasts() {
    for (let i = 0; i < blasts.length; i++) {
      if (blasts[i].life <= 0) continue;
      ctx.globalAlpha = Math.max(0, blasts[i].life);
      ctx.fillStyle = `hsl(${blasts[i].hue}, 100%, 60%)`;
      ctx.beginPath();
      ctx.arc(blasts[i].x, blasts[i].y, blasts[i].size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // ─────────────────────────────────────────────
  // PHYSICS ENGINE
  // ─────────────────────────────────────────────
  function runPhysics() {
    const { circuitType, batteryCount, bulbCount, bulbWatt } = sim;

    // R per bulb: R = V_nominal² / P_nominal
    const R_bulb = (V_BATTERY * V_BATTERY) / bulbWatt;

    let V_total = 0;
    let R_total = 0;
    let V_per_bulb = 0;

    if (circuitType === 'seri') {
      V_total    = batteryCount * V_BATTERY;
      R_total    = bulbCount * R_bulb;
      V_per_bulb = R_total > 0 ? V_total / bulbCount : 0;
    } else {
      // Parallel: each branch sees one battery's voltage
      V_total    = V_BATTERY;
      R_total    = R_bulb / bulbCount;
      V_per_bulb = V_BATTERY;
    }

    // I = V / R
    let I = R_total > 0 ? V_total / R_total : 0;

    // P_actual per bulb = V_per_bulb² / R_bulb
    const P_actual = R_bulb > 0 ? (V_per_bulb * V_per_bulb) / R_bulb : 0;

    // Determine bulb state
    let bulbState = 'normal';
    let dimAlpha  = 1.0;

    if (P_actual <= 0) {
      bulbState = 'dim';
      dimAlpha  = 0.25;
    } else if (P_actual < bulbWatt) {
      bulbState = 'dim';
      dimAlpha  = Math.max(0.25, P_actual / bulbWatt);
    } else if (P_actual <= bulbWatt * OVERLOAD_FACTOR) {
      bulbState = 'normal';
      dimAlpha  = 1.0;
    } else {
      bulbState = 'overload';
      dimAlpha  = 1.0;
      I = 0; // circuit breaks
    }

    const nowOverload = bulbState === 'overload';

    // Trigger blast only on transition into overload
    if (nowOverload && !sim.wasOverload) {
      const geo = getGeometry();
      spawnBlast(geo.cx, geo.bulbY);
      sim.blastTime   = Date.now();
      sim.blastActive = true;
      overloadBanner.hidden = false;
    } else if (!nowOverload && sim.wasOverload) {
      overloadBanner.hidden = true;
      sim.blastActive = false;
    }

    sim.V_total   = V_total;
    sim.R_total   = R_total;
    sim.I         = I;
    sim.P_actual  = P_actual;
    sim.bulbState = bulbState;
    sim.dimAlpha  = dimAlpha;
    sim.wasOverload = nowOverload;
  }

  // ─────────────────────────────────────────────
  // UI DISPLAY UPDATE
  // ─────────────────────────────────────────────
  function updateDisplay() {
    elVoltage.textContent    = `${sim.V_total.toFixed(2)} V`;
    elResistance.textContent = `${sim.R_total.toFixed(2)} Ω`;
    elCurrent.textContent    = `${sim.I.toFixed(3)} A`;
    elPower.textContent      = `${sim.P_actual.toFixed(2)} W`;

    elStatus.className = 'info-value info-value--status';
    if (sim.bulbState === 'dim') {
      elStatus.textContent = '🔅 Redup';
      elStatus.classList.add('status-dim');
    } else if (sim.bulbState === 'normal') {
      elStatus.textContent = '✅ Normal';
      elStatus.classList.add('status-normal');
    } else {
      elStatus.textContent = '💥 OVERLOAD!';
      elStatus.classList.add('status-overload');
    }
  }

  // ─────────────────────────────────────────────
  // CANVAS RENDERER
  // ─────────────────────────────────────────────

  function drawBackground() {
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, cw, ch);
  }

  function drawWires(geo) {
    const { wirePath } = geo;
    ctx.strokeStyle = '#2e4a6a';
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(wirePath[0].x, wirePath[0].y);
    for (let i = 1; i < wirePath.length; i++) {
      ctx.lineTo(wirePath[i].x, wirePath[i].y);
    }
    ctx.stroke();

    // Active wire glow when current flows
    if (sim.I > 0) {
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
      ctx.lineWidth   = 10;
      ctx.beginPath();
      ctx.moveTo(wirePath[0].x, wirePath[0].y);
      for (let i = 1; i < wirePath.length; i++) {
        ctx.lineTo(wirePath[i].x, wirePath[i].y);
      }
      ctx.stroke();
    }
  }

  function drawBatteries(geo) {
    const { left, right, batteryY, cx } = geo;
    const count  = sim.batteryCount;
    const bw     = 36; // battery width
    const bh     = 18; // battery height
    const gap    = 10;
    const totalW = count * bw + (count - 1) * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < count; i++) {
      const bx = startX + i * (bw + gap);
      const by = batteryY - bh / 2;

      // Battery body
      ctx.fillStyle   = '#69f0ae';
      ctx.strokeStyle = '#0d1b2a';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.stroke();

      // Positive terminal
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(bx + bw - 4, by + bh * 0.25, 4, bh * 0.5);

      // Label
      ctx.fillStyle    = '#0d1b2a';
      ctx.font         = 'bold 11px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', bx + bw / 2, by + bh / 2);
    }

    // Label above batteries
    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`🔋 ×${count}  (${(count * V_BATTERY).toFixed(1)} V)`, cx, batteryY - bh / 2 - 6);
  }

  function drawBulbs(geo) {
    const { bulbY, cx } = geo;
    const count  = sim.bulbCount;
    const radius = 16;
    const gap    = 50;
    const totalW = count * radius * 2 + (count - 1) * gap;
    const startX = cx - totalW / 2 + radius;

    for (let i = 0; i < count; i++) {
      const bx = startX + i * (radius * 2 + gap);
      const by = bulbY;

      if (sim.bulbState === 'overload') {
        drawBrokenBulb(bx, by, radius);
      } else {
        drawNormalBulb(bx, by, radius, sim.dimAlpha);
      }
    }

    // Label below bulbs
    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`💡 ×${count}  (${sim.bulbWatt}W nominal)`, cx, bulbY + radius + 8);
  }

  function drawNormalBulb(x, y, radius, alpha) {
    // Glow halo
    if (alpha > 0.3) {
      const glowRadius = radius * 2.5;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      grad.addColorStop(0,   `rgba(247, 201, 72, ${0.55 * alpha})`);
      grad.addColorStop(0.5, `rgba(247, 201, 72, ${0.18 * alpha})`);
      grad.addColorStop(1,   'rgba(247, 201, 72, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bulb body
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#f7c948';
    ctx.strokeStyle = '#1b2d45';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Filament lines
    ctx.strokeStyle = '#1b2d45';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 3);
    ctx.lineTo(x,     y + 3);
    ctx.lineTo(x + 6, y - 3);
    ctx.stroke();

    ctx.globalAlpha = 1.0;
  }

  function drawBrokenBulb(x, y, radius) {
    // Dark cracked bulb
    ctx.fillStyle   = '#3a1a1a';
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crack lines
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 8);
    ctx.lineTo(x + 8, y + 8);
    ctx.moveTo(x + 8, y - 8);
    ctx.lineTo(x - 8, y + 8);
    ctx.stroke();

    // Small sparks around broken bulb
    ctx.fillStyle = '#ff5252';
    const sparkPositions = [
      { dx: -radius - 4, dy: -4 },
      { dx:  radius + 4, dy: -4 },
      { dx: 0,           dy: -radius - 4 },
    ];
    for (const sp of sparkPositions) {
      ctx.beginPath();
      ctx.arc(x + sp.dx, y + sp.dy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPhysicsLabels(geo) {
    const { cx, cy } = geo;
    ctx.fillStyle    = 'rgba(144, 180, 206, 0.7)';
    ctx.font         = '11px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const label = sim.I > 0
      ? `I = ${sim.I.toFixed(3)} A`
      : 'I = 0 A (terbuka)';
    ctx.fillText(label, cx, cy);
  }

  // ─────────────────────────────────────────────
  // MAIN RENDER FUNCTION
  // ─────────────────────────────────────────────
  function render(timestamp) {
    const geo = getGeometry();

    drawBackground();
    drawWires(geo);
    drawBatteries(geo);
    drawBulbs(geo);
    drawPhysicsLabels(geo);

    // Electron particles (only when current flows)
    if (sim.I > 0) {
      const speedFactor = Math.min(sim.I * 8, 6); // cap speed
      updateElectrons(geo.densePath, speedFactor);
      drawElectrons(geo.densePath);
    }

    // Blast particles (overload animation)
    if (sim.blastActive) {
      const elapsed = Date.now() - sim.blastTime;
      if (elapsed < BLAST_DURATION_MS) {
        updateBlasts();
        drawBlasts();
      } else {
        sim.blastActive = false;
      }
    }
  }

  // ─────────────────────────────────────────────
  // ANIMATION LOOP  (requestAnimationFrame only)
  // ─────────────────────────────────────────────
  let rafId = null;

  function loop(timestamp) {
    render(timestamp);
    rafId = requestAnimationFrame(loop);
  }

  // ─────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────
  function onCircuitTypeChange(e) {
    sim.circuitType = e.target.value;
    runPhysics();
    updateDisplay();
  }

  function onBatterySlider(e) {
    const val = parseInt(e.target.value, 10);
    sim.batteryCount = val;
    labelBattery.textContent = val;
    e.target.setAttribute('aria-valuenow', val);
    runPhysics();
    updateDisplay();
  }

  function onBulbSlider(e) {
    const val = parseInt(e.target.value, 10);
    sim.bulbCount = val;
    labelBulb.textContent = val;
    e.target.setAttribute('aria-valuenow', val);
    runPhysics();
    updateDisplay();
  }

  function onBulbWattChange(e) {
    sim.bulbWatt = parseInt(e.target.value, 10);
    runPhysics();
    updateDisplay();
  }

  function onReset() {
    sim.circuitType  = 'seri';
    sim.batteryCount = 1;
    sim.bulbCount    = 1;
    sim.bulbWatt     = 10;
    sim.wasOverload  = false;
    sim.blastActive  = false;
    blasts.length    = 0;

    document.getElementById('typeSeri').checked = true;
    sliderBattery.value = 1;
    labelBattery.textContent = 1;
    sliderBattery.setAttribute('aria-valuenow', 1);
    sliderBulb.value = 1;
    labelBulb.textContent = 1;
    sliderBulb.setAttribute('aria-valuenow', 1);
    document.getElementById('watt10').checked = true;

    overloadBanner.hidden = true;

    runPhysics();
    updateDisplay();
  }

  function onResize() {
    resizeCanvas();
    initElectrons(getGeometry().densePath);
  }

  // ─────────────────────────────────────────────
  // INITIALISATION
  // ─────────────────────────────────────────────
  function init() {
    resizeCanvas();
    initElectrons(getGeometry().densePath);
    runPhysics();
    updateDisplay();

    // Bind controls
    radiosCircuitType.forEach(r => r.addEventListener('change', onCircuitTypeChange));
    radiosBulbWatt.forEach(r => r.addEventListener('change', onBulbWattChange));
    sliderBattery.addEventListener('input', onBatterySlider);
    sliderBulb.addEventListener('input', onBulbSlider);
    btnReset.addEventListener('click', onReset);
    window.addEventListener('resize', onResize);

    // Kick off animation loop
    rafId = requestAnimationFrame(loop);
  }

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
