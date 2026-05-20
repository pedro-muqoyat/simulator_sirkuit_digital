(function () {
  'use strict';

  const V_BATTERY          = 1.5;
  const OVERLOAD_FACTOR    = 1.3;
  const ELECTRON_COUNT     = 22;
  const BLAST_COUNT        = 15;
  const BLAST_DURATION_MS  = 1800;
  const BASE_SPEED         = 0.004;

  const sim = {
    circuitType  : 'seri',
    batteryCount : 1,
    bulbCount    : 1,
    bulbWatt     : 10,
    V_total      : 0,
    R_total      : 0,
    I            : 0,
    P_actual     : 0,
    bulbState    : 'normal',
    dimAlpha     : 1.0,
    wasOverload  : false,
    blastTime    : 0,
    blastActive  : false,
  };

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

  let cw = 0;
  let ch = 0;
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

  function getGeometry() {
    const cx = cw / 2;
    const cy = ch / 2;
    const pad = Math.min(cw, ch) * 0.12;
    const left   = pad;
    const right  = cw - pad;
    const top    = pad;
    const bottom = ch - pad;

    const wirePath = [
      { x: left,  y: top    },
      { x: right, y: top    },
      { x: right, y: bottom },
      { x: left,  y: bottom },
      { x: left,  y: top    },
    ];

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
    densePath.push({ x: left, y: top });

    return {
      cx, cy,
      left, right, top, bottom,
      wirePath,
      densePath,
      batteryY : top,
      bulbY    : bottom,
    };
  }

  const electrons = [];

  function createElectron(densePath) {
    return {
      progress : Math.random(),
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
      blasts[i].vy += 0.18;
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

  function runPhysics() {
    const { circuitType, batteryCount, bulbCount, bulbWatt } = sim;

    const R_bulb = (V_BATTERY * V_BATTERY) / bulbWatt;

    let V_total = 0;
    let R_total = 0;
    let V_per_bulb = 0;

    if (circuitType === 'seri') {
      V_total    = batteryCount * V_BATTERY;
      R_total    = bulbCount * R_bulb;
      V_per_bulb = R_total > 0 ? V_total / bulbCount : 0;
    } else {
      V_total    = V_BATTERY;
      R_total    = R_bulb / bulbCount;
      V_per_bulb = V_BATTERY;
    }

    let I = R_total > 0 ? V_total / R_total : 0;

    const P_actual = R_bulb > 0 ? (V_per_bulb * V_per_bulb) / R_bulb : 0;

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
      I = 0;
    }

    const nowOverload = bulbState === 'overload';

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

  function updateDisplay() {
    elVoltage.textContent    = `${sim.V_total.toFixed(2)} V`;
    elResistance.textContent = `${sim.R_total.toFixed(2)} \u03A9`;
    elCurrent.textContent    = `${sim.I.toFixed(3)} A`;
    elPower.textContent      = `${sim.P_actual.toFixed(2)} W`;

    elStatus.className = 'info-value info-value--status';
    if (sim.bulbState === 'dim') {
      elStatus.textContent = 'Redup';
      elStatus.classList.add('status-dim');
    } else if (sim.bulbState === 'normal') {
      elStatus.textContent = 'Normal';
      elStatus.classList.add('status-normal');
    } else {
      elStatus.textContent = 'OVERLOAD!';
      elStatus.classList.add('status-overload');
    }
  }

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
    const { batteryY, cx } = geo;
    const count  = sim.batteryCount;
    const bw     = 36;
    const bh     = 18;
    const gap    = 10;
    const totalW = count * bw + (count - 1) * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < count; i++) {
      const bx = startX + i * (bw + gap);
      const by = batteryY - bh / 2;

      ctx.fillStyle   = '#69f0ae';
      ctx.strokeStyle = '#0d1b2a';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(bx + bw - 4, by + bh * 0.25, 4, bh * 0.5);

      ctx.fillStyle    = '#0d1b2a';
      ctx.font         = 'bold 11px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', bx + bw / 2, by + bh / 2);
    }

    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Baterai x${count}  (${(count * V_BATTERY).toFixed(1)} V)`, cx, batteryY - bh / 2 - 6);
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

    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Lampu x${count}  (${sim.bulbWatt}W nominal)`, cx, bulbY + radius + 8);
  }

  function drawNormalBulb(x, y, radius, alpha) {
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

    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#f7c948';
    ctx.strokeStyle = '#1b2d45';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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
    ctx.fillStyle   = '#3a1a1a';
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 8);
    ctx.lineTo(x + 8, y + 8);
    ctx.moveTo(x + 8, y - 8);
    ctx.lineTo(x - 8, y + 8);
    ctx.stroke();

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

  function render(timestamp) {
    const geo = getGeometry();

    drawBackground();
    drawWires(geo);
    drawBatteries(geo);
    drawBulbs(geo);
    drawPhysicsLabels(geo);

    if (sim.I > 0) {
      const speedFactor = Math.min(sim.I * 8, 6);
      updateElectrons(geo.densePath, speedFactor);
      drawElectrons(geo.densePath);
    }

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

  let rafId = null;

  function loop(timestamp) {
    render(timestamp);
    rafId = requestAnimationFrame(loop);
  }

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

  function computePhysicsSnapshot(circuitType, batteryCount, bulbCount, bulbWatt) {
    const R_bulb = (V_BATTERY * V_BATTERY) / bulbWatt;

    let V_total = 0;
    let R_total = 0;
    let V_per_bulb = 0;

    if (circuitType === 'seri') {
      V_total    = batteryCount * V_BATTERY;
      R_total    = bulbCount * R_bulb;
      V_per_bulb = R_total > 0 ? V_total / bulbCount : 0;
    } else {
      V_total    = V_BATTERY;
      R_total    = R_bulb / bulbCount;
      V_per_bulb = V_BATTERY;
    }

    let I = R_total > 0 ? V_total / R_total : 0;
    const P_actual = R_bulb > 0 ? (V_per_bulb * V_per_bulb) / R_bulb : 0;

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
      I = 0;
    }

    return {
      circuitType,
      batteryCount,
      bulbCount,
      bulbWatt,
      R_bulb,
      V_total,
      R_total,
      V_per_bulb,
      I,
      P_actual,
      bulbState,
      dimAlpha,
    };
  }

  function assertGeometry() {
    const savedCw = cw;
    const savedCh = ch;

    cw = 400;
    ch = 300;

    const geo = getGeometry();

    const pad    = Math.min(cw, ch) * 0.12;
    const left   = pad;
    const right  = cw - pad;
    const top    = pad;
    const bottom = ch - pad;

    const expectedPath = [
      { x: left,  y: top    },
      { x: right, y: top    },
      { x: right, y: bottom },
      { x: left,  y: bottom },
      { x: left,  y: top    },
    ];

    if (geo.wirePath.length !== 5) {
      throw new Error('assertGeometry: wirePath must have 5 points, got ' + geo.wirePath.length);
    }

    for (let i = 0; i < expectedPath.length; i++) {
      if (geo.wirePath[i].x !== expectedPath[i].x || geo.wirePath[i].y !== expectedPath[i].y) {
        throw new Error(
          'assertGeometry: wirePath[' + i + '] expected (' +
          expectedPath[i].x + ',' + expectedPath[i].y + ') got (' +
          geo.wirePath[i].x + ',' + geo.wirePath[i].y + ')'
        );
      }
    }

    const STEPS_PER_SEGMENT = 40;
    const segmentCount      = geo.wirePath.length - 1;
    const expectedDenseLen  = segmentCount * STEPS_PER_SEGMENT + 1;

    if (geo.densePath.length !== expectedDenseLen) {
      throw new Error(
        'assertGeometry: densePath length expected ' + expectedDenseLen +
        ' got ' + geo.densePath.length
      );
    }

    if (geo.batteryY !== top) {
      throw new Error('assertGeometry: batteryY expected ' + top + ' got ' + geo.batteryY);
    }

    if (geo.bulbY !== bottom) {
      throw new Error('assertGeometry: bulbY expected ' + bottom + ' got ' + geo.bulbY);
    }

    const firstDense = geo.densePath[0];
    if (firstDense.x !== left || firstDense.y !== top) {
      throw new Error(
        'assertGeometry: densePath[0] expected (' + left + ',' + top + ') got (' +
        firstDense.x + ',' + firstDense.y + ')'
      );
    }

    const lastDense = geo.densePath[geo.densePath.length - 1];
    if (lastDense.x !== left || lastDense.y !== top) {
      throw new Error(
        'assertGeometry: densePath last point expected (' + left + ',' + top + ') got (' +
        lastDense.x + ',' + lastDense.y + ')'
      );
    }

    cw = savedCw;
    ch = savedCh;
  }

  function classifyBulbState(P_actual, bulbWatt) {
    let bulbState = 'normal';
    let dimAlpha  = 1.0;
    let I_zero    = false;

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
      I_zero    = true;
    }

    return { bulbState, dimAlpha, I_zero };
  }

  function assertBulbStateClassification() {
    const wattOptions = [5, 10, 25];

    for (const watt of wattOptions) {
      const R_bulb = (V_BATTERY * V_BATTERY) / watt;

      const snapshotZero = computePhysicsSnapshot('paralel', 1, 1, watt);
      if (snapshotZero.P_actual !== 0) {
        const snapshotForcedZero = {
          P_actual  : 0,
          bulbWatt  : watt,
          bulbState : 'dim',
          dimAlpha  : 0.25,
          I         : 0,
        };
        if (snapshotForcedZero.bulbState !== 'dim') {
          throw new Error('assertBulbStateClassification: P_actual=0 must yield bulbState=dim');
        }
        if (snapshotForcedZero.dimAlpha !== 0.25) {
          throw new Error('assertBulbStateClassification: P_actual=0 must yield dimAlpha=0.25');
        }
      }

      const dimCases = [
        { circuitType: 'seri', batteryCount: 1, bulbCount: 4 },
      ];
      for (const c of dimCases) {
        const snap = computePhysicsSnapshot(c.circuitType, c.batteryCount, c.bulbCount, watt);
        if (snap.P_actual > 0 && snap.P_actual < watt) {
          if (snap.bulbState !== 'dim') {
            throw new Error(
              'assertBulbStateClassification: 0<P_actual<P_nominal must yield bulbState=dim, got ' +
              snap.bulbState + ' for watt=' + watt
            );
          }
          const expectedAlpha = Math.max(0.25, snap.P_actual / watt);
          if (Math.abs(snap.dimAlpha - expectedAlpha) > 0.0001) {
            throw new Error(
              'assertBulbStateClassification: dimAlpha mismatch for dim state, expected ' +
              expectedAlpha + ' got ' + snap.dimAlpha
            );
          }
        }
      }

      const normalCases = [
        { circuitType: 'seri', batteryCount: 1, bulbCount: 1 },
        { circuitType: 'paralel', batteryCount: 1, bulbCount: 1 },
      ];
      for (const c of normalCases) {
        const snap = computePhysicsSnapshot(c.circuitType, c.batteryCount, c.bulbCount, watt);
        if (snap.P_actual >= watt && snap.P_actual <= watt * OVERLOAD_FACTOR) {
          if (snap.bulbState !== 'normal') {
            throw new Error(
              'assertBulbStateClassification: P_nominal<=P_actual<=P_nominal*1.3 must yield bulbState=normal, got ' +
              snap.bulbState + ' for watt=' + watt
            );
          }
          if (snap.dimAlpha !== 1.0) {
            throw new Error(
              'assertBulbStateClassification: normal state must yield dimAlpha=1.0, got ' + snap.dimAlpha
            );
          }
        }
      }

      const overloadCases = [
        { circuitType: 'seri', batteryCount: 4, bulbCount: 1 },
        { circuitType: 'seri', batteryCount: 3, bulbCount: 1 },
      ];
      for (const c of overloadCases) {
        const snap = computePhysicsSnapshot(c.circuitType, c.batteryCount, c.bulbCount, watt);
        if (snap.P_actual > watt * OVERLOAD_FACTOR) {
          if (snap.bulbState !== 'overload') {
            throw new Error(
              'assertBulbStateClassification: P_actual>P_nominal*1.3 must yield bulbState=overload, got ' +
              snap.bulbState + ' for watt=' + watt
            );
          }
          if (snap.I !== 0) {
            throw new Error(
              'assertBulbStateClassification: overload state must yield I=0, got I=' + snap.I
            );
          }
        }
      }
    }

    const boundaryNormal = computePhysicsSnapshot('seri', 1, 1, 10);
    if (boundaryNormal.P_actual >= 10 && boundaryNormal.P_actual <= 10 * OVERLOAD_FACTOR) {
      if (boundaryNormal.bulbState !== 'normal') {
        throw new Error(
          'assertBulbStateClassification: boundary normal case failed, got ' + boundaryNormal.bulbState
        );
      }
    }
  }

  function assertSimMonomorphic() {
    const requiredKeys = [
      'circuitType',
      'batteryCount',
      'bulbCount',
      'bulbWatt',
      'V_total',
      'R_total',
      'I',
      'P_actual',
      'bulbState',
      'dimAlpha',
      'wasOverload',
      'blastTime',
      'blastActive',
    ];

    const actualKeys = Object.keys(sim);

    for (const key of requiredKeys) {
      if (!Object.prototype.hasOwnProperty.call(sim, key)) {
        throw new Error('assertSimMonomorphic: missing key ' + key);
      }
    }

    if (actualKeys.length !== requiredKeys.length) {
      throw new Error(
        'assertSimMonomorphic: key count mismatch expected ' +
        requiredKeys.length + ' got ' + actualKeys.length +
        ' (' + actualKeys.join(', ') + ')'
      );
    }

    if (typeof sim.circuitType  !== 'string')  throw new Error('assertSimMonomorphic: circuitType must be string');
    if (typeof sim.batteryCount !== 'number')  throw new Error('assertSimMonomorphic: batteryCount must be number');
    if (typeof sim.bulbCount    !== 'number')  throw new Error('assertSimMonomorphic: bulbCount must be number');
    if (typeof sim.bulbWatt     !== 'number')  throw new Error('assertSimMonomorphic: bulbWatt must be number');
    if (typeof sim.V_total      !== 'number')  throw new Error('assertSimMonomorphic: V_total must be number');
    if (typeof sim.R_total      !== 'number')  throw new Error('assertSimMonomorphic: R_total must be number');
    if (typeof sim.I            !== 'number')  throw new Error('assertSimMonomorphic: I must be number');
    if (typeof sim.P_actual     !== 'number')  throw new Error('assertSimMonomorphic: P_actual must be number');
    if (typeof sim.bulbState    !== 'string')  throw new Error('assertSimMonomorphic: bulbState must be string');
    if (typeof sim.dimAlpha     !== 'number')  throw new Error('assertSimMonomorphic: dimAlpha must be number');
    if (typeof sim.wasOverload  !== 'boolean') throw new Error('assertSimMonomorphic: wasOverload must be boolean');
    if (typeof sim.blastTime    !== 'number')  throw new Error('assertSimMonomorphic: blastTime must be number');
    if (typeof sim.blastActive  !== 'boolean') throw new Error('assertSimMonomorphic: blastActive must be boolean');
  }

  function assertSeriesCircuitCalc(result) {
    const EPS = 0.0001;
    const expectedVtotal = result.batteryCount * V_BATTERY;
    const expectedRtotal = result.bulbCount * result.R_bulb;
    const expectedVperBulb = result.bulbCount > 0 ? expectedVtotal / result.bulbCount : 0;

    if (Math.abs(result.V_total - expectedVtotal) > EPS) {
      throw new Error(
        'assertSeriesCircuitCalc: V_total mismatch batteries=' + result.batteryCount +
        ' expected=' + expectedVtotal + ' got=' + result.V_total
      );
    }
    if (Math.abs(result.R_total - expectedRtotal) > EPS) {
      throw new Error(
        'assertSeriesCircuitCalc: R_total mismatch bulbs=' + result.bulbCount +
        ' watt=' + result.bulbWatt +
        ' expected=' + expectedRtotal + ' got=' + result.R_total
      );
    }
    if (Math.abs(result.V_per_bulb - expectedVperBulb) > EPS) {
      throw new Error(
        'assertSeriesCircuitCalc: V_per_bulb mismatch batteries=' + result.batteryCount +
        ' bulbs=' + result.bulbCount +
        ' expected=' + expectedVperBulb + ' got=' + result.V_per_bulb
      );
    }
  }

  function assertElectronParticleMonomorphic(particle) {
    const requiredKeys = ['progress', 'size', 'r', 'g', 'b'];
    const actualKeys   = Object.keys(particle);

    for (const key of requiredKeys) {
      if (!Object.prototype.hasOwnProperty.call(particle, key)) {
        throw new Error('assertElectronParticleMonomorphic: missing key ' + key);
      }
    }

    if (actualKeys.length !== requiredKeys.length) {
      throw new Error(
        'assertElectronParticleMonomorphic: key count mismatch expected ' +
        requiredKeys.length + ' got ' + actualKeys.length +
        ' (' + actualKeys.join(', ') + ')'
      );
    }

    if (typeof particle.progress !== 'number') throw new Error('assertElectronParticleMonomorphic: progress must be number');
    if (typeof particle.size     !== 'number') throw new Error('assertElectronParticleMonomorphic: size must be number');
    if (typeof particle.r        !== 'number') throw new Error('assertElectronParticleMonomorphic: r must be number');
    if (typeof particle.g        !== 'number') throw new Error('assertElectronParticleMonomorphic: g must be number');
    if (typeof particle.b        !== 'number') throw new Error('assertElectronParticleMonomorphic: b must be number');
  }

  function assertBlastParticleMonomorphic(particle) {
    const requiredKeys = ['x', 'y', 'vx', 'vy', 'size', 'life', 'decay', 'hue'];
    const actualKeys   = Object.keys(particle);

    for (const key of requiredKeys) {
      if (!Object.prototype.hasOwnProperty.call(particle, key)) {
        throw new Error('assertBlastParticleMonomorphic: missing key ' + key);
      }
    }

    if (actualKeys.length !== requiredKeys.length) {
      throw new Error(
        'assertBlastParticleMonomorphic: key count mismatch expected ' +
        requiredKeys.length + ' got ' + actualKeys.length +
        ' (' + actualKeys.join(', ') + ')'
      );
    }

    if (typeof particle.x     !== 'number') throw new Error('assertBlastParticleMonomorphic: x must be number');
    if (typeof particle.y     !== 'number') throw new Error('assertBlastParticleMonomorphic: y must be number');
    if (typeof particle.vx    !== 'number') throw new Error('assertBlastParticleMonomorphic: vx must be number');
    if (typeof particle.vy    !== 'number') throw new Error('assertBlastParticleMonomorphic: vy must be number');
    if (typeof particle.size  !== 'number') throw new Error('assertBlastParticleMonomorphic: size must be number');
    if (typeof particle.life  !== 'number') throw new Error('assertBlastParticleMonomorphic: life must be number');
    if (typeof particle.decay !== 'number') throw new Error('assertBlastParticleMonomorphic: decay must be number');
    if (typeof particle.hue   !== 'number') throw new Error('assertBlastParticleMonomorphic: hue must be number');
  }

  function assertParticleSystemMonomorphic() {
    const sampleElectron = createElectron();
    assertElectronParticleMonomorphic(sampleElectron);

    const electronKeysBefore = Object.keys(sampleElectron).join(',');
    sampleElectron.progress += BASE_SPEED * 1;
    if (sampleElectron.progress >= 1) sampleElectron.progress -= 1;
    const electronKeysAfter = Object.keys(sampleElectron).join(',');
    if (electronKeysBefore !== electronKeysAfter) {
      throw new Error('assertParticleSystemMonomorphic: electron shape changed after update');
    }
    assertElectronParticleMonomorphic(sampleElectron);

    const sampleBlast = {
      x    : 100,
      y    : 100,
      vx   : Math.cos(0) * 3.0,
      vy   : Math.sin(0) * 3.0,
      size : 4,
      life : 1.0,
      decay: 0.015,
      hue  : 30,
    };
    assertBlastParticleMonomorphic(sampleBlast);

    const blastKeysBefore = Object.keys(sampleBlast).join(',');
    sampleBlast.x    += sampleBlast.vx;
    sampleBlast.y    += sampleBlast.vy;
    sampleBlast.vy   += 0.18;
    sampleBlast.life -= sampleBlast.decay;
    const blastKeysAfter = Object.keys(sampleBlast).join(',');
    if (blastKeysBefore !== blastKeysAfter) {
      throw new Error('assertParticleSystemMonomorphic: blast shape changed after update');
    }
    assertBlastParticleMonomorphic(sampleBlast);

    for (let i = 0; i < electrons.length; i++) {
      assertElectronParticleMonomorphic(electrons[i]);
    }
  }

  function runSelfTests() {
    assertSimMonomorphic();
    assertGeometry();
    assertParticleSystemMonomorphic();
    assertBulbStateClassification();

    const batteryOptions = [1, 2, 3, 4];
    const bulbOptions    = [1, 2, 3, 4];
    const wattOptions    = [5, 10, 25];
    const typeOptions    = ['seri', 'paralel'];

    for (const batteries of batteryOptions) {
      for (const bulbs of bulbOptions) {
        for (const watt of wattOptions) {
          for (const type of typeOptions) {
            const result = computePhysicsSnapshot(type, batteries, bulbs, watt);
            if (type === 'seri') {
              assertSeriesCircuitCalc(result);
            }
          }
        }
      }
    }

    assertSimMonomorphic();
  }

  function init() {
    if (!ctx) {
      canvas.parentElement.innerHTML =
        '<p style="color:#ff5252;padding:1rem">Browser Anda tidak mendukung Canvas HTML5.</p>';
      return;
    }
    resizeCanvas();
    initElectrons(getGeometry().densePath);
    runPhysics();
    updateDisplay();
    runSelfTests();

    radiosCircuitType.forEach(r => r.addEventListener('change', onCircuitTypeChange));
    radiosBulbWatt.forEach(r => r.addEventListener('change', onBulbWattChange));
    sliderBattery.addEventListener('input', onBatterySlider);
    sliderBulb.addEventListener('input', onBulbSlider);
    btnReset.addEventListener('click', onReset);
    window.addEventListener('resize', onResize);

    rafId = requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
