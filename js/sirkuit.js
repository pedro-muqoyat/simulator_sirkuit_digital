(function () {
  'use strict';

  const V_BATTERY          = 1.5;
  const OVERLOAD_FACTOR    = 1.3;
  const ELECTRON_COUNT     = 22;
  const BLAST_COUNT        = 15;
  const BLAST_DURATION_MS  = 1800;
  const BASE_SPEED         = 0.004;
  const BATTERY_CAPACITY_MAH = 2500;

  const sim = {
    circuitType  : 'seri',
    batteryCount : 1,
    bulbCount    : 1,
    bulbWatt     : 5,
    V_total      : 0,
    R_total      : 0,
    I            : 0,
    I_peak       : 0,
    P_actual     : 0,
    bulbState    : 'normal',
    dimAlpha     : 1.0,
    wasOverload  : false,
    blastTime          : 0,
    blastActive        : false,
    isSakelarTertutup  : false,
    isKabelPutus       : false,
    activeR_total      : 0,
    arusPerLampu       : 0,
    hitBoxRadius       : 30,
  };

  const canvas          = document.getElementById('circuitCanvas');
  const ctx             = canvas.getContext('2d', { alpha: false });
  const overloadBanner  = document.getElementById('overloadBanner');

  const elVoltage    = document.getElementById('displayVoltage');
  const elResistance = document.getElementById('displayResistance');
  const elCurrent    = document.getElementById('displayCurrent');
  const elPower      = document.getElementById('displayPower');
  const elStatus     = document.getElementById('displayStatus');
  const elLabelCurrent       = document.getElementById('labelCurrent');
  const elCurrentPerBulb     = document.getElementById('displayCurrentPerBulb');
  const elItemCurrentPerBulb = document.getElementById('itemCurrentPerBulb');
  const elBatteryLife        = document.getElementById('displayBatteryLife');
  const elCurrentPeak        = document.getElementById('displayCurrentPeak');
  const elItemCurrentPeak    = document.getElementById('itemCurrentPeak');
  const elEduText            = document.getElementById('displayEduText');

  const sliderBattery      = document.getElementById('batteryCount');
  const labelBattery       = document.getElementById('batteryCountDisplay');
  const sliderBulb         = document.getElementById('bulbCount');
  const labelBulb          = document.getElementById('bulbCountDisplay');
  const radiosCircuitType  = document.querySelectorAll('input[name="circuitType"]');
  const radiosBulbWatt     = document.querySelectorAll('input[name="bulbWatt"]');
  const btnReset           = document.getElementById('btnReset');
  const btnSakelar         = document.getElementById('btnSakelar');

  let cw = 0;
  let ch = 0;
  let dpr = 1;

  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },
    playClick() {
      if (!this.ctx) return;
      const oscillator = this.ctx.createOscillator();
      const gainNode   = this.ctx.createGain();
      oscillator.type  = 'sine';
      oscillator.frequency.setValueAtTime(1200, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(0.6, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      oscillator.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      oscillator.start(this.ctx.currentTime);
      oscillator.stop(this.ctx.currentTime + 0.05);
    },
    playOverload() {
      if (!this.ctx) return;
      const oscillator = this.ctx.createOscillator();
      const gainNode   = this.ctx.createGain();
      oscillator.type  = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(0.8, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      oscillator.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      oscillator.start(this.ctx.currentTime);
      oscillator.stop(this.ctx.currentTime + 0.5);
    },
  };

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
    const cx  = cw / 2;
    const cy  = ch / 2;

    const rawPad = Math.min(cw, ch) * 0.05;
    const pad    = Math.max(15, rawPad);
    const left   = pad + 10;
    const right  = cw - pad - 10;
    const top    = pad + 35;
    const bottom = ch - pad - 35;

    const rawScale     = cw / 600;
    const heightScale  = Math.max(Math.min(rawScale, 1.0), 0.85);
    const scaledRadius = Math.round(16 * heightScale);

    let wirePath = [];
    let visualSegments = null;

    const densePath = [];
    const STEPS_PER_SEGMENT = 40;

    const addSegment = function(ax, ay, bx, by) {
      for (let t = 0; t < STEPS_PER_SEGMENT; t++) {
        const frac = t / STEPS_PER_SEGMENT;
        densePath.push({
          x: ax + (bx - ax) * frac,
          y: ay + (by - ay) * frac,
        });
      }
    };

    const bulbCount  = sim.bulbCount;
    const bulbRadius = scaledRadius;
    const bulbGap    = Math.round(50 * heightScale);

    let bulbPositions = [];
    let batteryY;
    let bulbY;
    let parallelSlot4Y = bottom;

    if (sim.circuitType === 'seri') {
      batteryY = bottom;
      bulbY    = top;
      const totalW = bulbCount * scaledRadius * 2 + (bulbCount - 1) * bulbGap;
      const startX = cx - totalW / 2 + scaledRadius;
      for (let i = 0; i < bulbCount; i++) {
        bulbPositions.push({ x: startX + i * (scaledRadius * 2 + bulbGap), y: bulbY });
      }

      wirePath = [
        { x: cx,    y: bottom },
        { x: left,  y: bottom },
        { x: left,  y: top    },
        { x: right, y: top    },
        { x: right, y: bottom },
        { x: cx,    y: bottom },
      ];

      densePath.length = 0;
      for (let s = 0; s < wirePath.length - 1; s++) {
        addSegment(wirePath[s].x, wirePath[s].y, wirePath[s + 1].x, wirePath[s + 1].y);
      }
      densePath.push({ x: wirePath[0].x, y: wirePath[0].y });

      if (bulbCount > 0) {
        const gap = 6;
        visualSegments = [
          [
            { x: cx,   y: bottom },
            { x: left, y: bottom },
            { x: left, y: top    },
            { x: bulbPositions[0].x - scaledRadius - gap, y: top },
          ],
        ];
        for (let i = 0; i < bulbCount - 1; i++) {
          visualSegments.push([
            { x: bulbPositions[i].x + scaledRadius + gap,     y: top },
            { x: bulbPositions[i + 1].x - scaledRadius - gap, y: top },
          ]);
        }
        visualSegments.push([
          { x: bulbPositions[bulbCount - 1].x + scaledRadius + gap, y: top    },
          { x: right, y: top    },
          { x: right, y: bottom },
          { x: cx,    y: bottom },
        ]);
      }
    } else {
      const maxStepY        = ((bottom - 70) - top) / 3;
      const stepY           = Math.min(65, maxStepY);
      const totalBulbsHeight = 3 * stepY;
      const centerZone      = top + ((bottom - 70) - top) / 2;
      const firstY          = centerZone - totalBulbsHeight / 2;
      parallelSlot4Y        = firstY + 3 * stepY;

      batteryY = bottom;
      bulbY    = firstY;
      for (let i = 0; i < bulbCount; i++) {
        bulbPositions.push({ x: cx, y: firstY + i * stepY });
      }
    }

    const parallelLoops = [];

    if (sim.circuitType === 'paralel') {
      const batY     = bottom;
      const stepSize = 6;

      const buildLoop = function(py) {
        const loop = [];
        const addLoopSeg = function(ax, ay, bx, by) {
          const dist  = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
          const steps = Math.max(2, Math.ceil(dist / stepSize));
          for (let t = 0; t < steps; t++) {
            const frac = t / steps;
            loop.push({
              x: ax + (bx - ax) * frac,
              y: ay + (by - ay) * frac,
            });
          }
        };
        addLoopSeg(left,                batY,  left,                py);
        addLoopSeg(left,                py,    cx - bulbRadius - 6, py);
        addLoopSeg(cx + bulbRadius + 6, py,    right,               py);
        addLoopSeg(right,               py,    right,               batY);
        addLoopSeg(right,               batY,  left,                batY);
        return loop;
      };

      for (let i = 0; i < bulbCount; i++) {
        if (bulbs[i] && bulbs[i].isDetached) continue;
        parallelLoops.push(buildLoop(bulbPositions[i].y));
      }
    }

    const scaledHitBox = Math.max(30, 40 * heightScale);

    for (let i = 0; i < bulbs.length && i < bulbPositions.length; i++) {
      bulbs[i].x = bulbPositions[i].x;
      bulbs[i].y = bulbPositions[i].y;
    }

    return {
      cx, cy,
      left, right, top, bottom,
      wirePath,
      densePath,
      parallelLoops,
      batteryY,
      bulbY,
      bulbPositions,
      scaledRadius,
      scaledHitBox,
      parallelSlot4Y,
      visualSegments,
    };
  }

  const electrons = [];

  const bulbs = [];

  function rebuildBulbs(count) {
    while (bulbs.length < count) {
      let filledSlot = false;
      for (let i = 0; i < bulbs.length; i++) {
        if (bulbs[i].isDetached) {
          bulbs[i].isDetached = false;
          filledSlot = true;
          break;
        }
      }
      if (!filledSlot) {
        bulbs.push({ isDetached: false, isBurnt: false, x: 0, y: 0 });
      }
    }
    while (bulbs.length > count) {
      bulbs.pop();
    }
  }

  function resetBulbs(count) {
    bulbs.length = 0;
    for (let i = 0; i < count; i++) {
      bulbs.push({ isDetached: false, isBurnt: false, x: 0, y: 0 });
    }
  }

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

  function updateElectrons(densePath, parallelLoops, speedMultiplier) {
    if (speedMultiplier === 0) return;
    if (sim.circuitType === 'paralel') {
      const loopCount = parallelLoops.length;
      if (loopCount === 0) return;
      const perLoop = Math.floor(electrons.length / loopCount);
      for (let b = 0; b < loopCount; b++) {
        const start = b * perLoop;
        const end   = b === loopCount - 1 ? electrons.length : start + perLoop;
        for (let i = start; i < end; i++) {
          electrons[i].progress += speedMultiplier;
          if (electrons[i].progress >= 1) electrons[i].progress -= 1;
        }
      }
      return;
    }
    for (let i = 0; i < electrons.length; i++) {
      electrons[i].progress += speedMultiplier;
      if (electrons[i].progress >= 1) electrons[i].progress -= 1;
    }
  }

  function drawElectrons(densePath, parallelLoops, geo) {
    if (sim.I === 0) return;
    if (!sim.isSakelarTertutup) return;

    const resolvedGeo     = geo || getGeometry();
    const bulbPositions   = resolvedGeo.bulbPositions;
    const maskRadius      = resolvedGeo.scaledRadius || 16;

    const isInsideBulb = function(px, py) {
      for (let b = 0; b < bulbPositions.length; b++) {
        const dx = px - bulbPositions[b].x;
        const dy = py - bulbPositions[b].y;
        if (Math.sqrt(dx * dx + dy * dy) < maskRadius) return true;
      }
      return false;
    };

    const isInsideBattery = function(pt) {
      if (!resolvedGeo) return false;
      const count  = sim.batteryCount;
      const bw     = 45;
      const bh     = 24;
      const bgap   = 10;
      const totalW = count * bw + (count - 1) * bgap;
      const startX = resolvedGeo.cx - totalW / 2;
      const batY   = resolvedGeo.batteryY - bh / 2;
      for (let i = 0; i < count; i++) {
        const bx = startX + i * (bw + bgap);
        if (pt.x >= bx && pt.x <= bx + bw && pt.y >= batY && pt.y <= batY + bh) return true;
      }
      return false;
    };

    if (sim.circuitType === 'paralel') {
      const loopCount = parallelLoops.length;
      if (loopCount === 0) return;
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur  = Math.max(3, 8 - (loopCount * 1.2));
      const perLoop = Math.floor(electrons.length / loopCount);
      for (let b = 0; b < loopCount; b++) {
        const loop    = parallelLoops[b];
        const pathLen = loop.length;
        const start   = b * perLoop;
        const end     = b === loopCount - 1 ? electrons.length : start + perLoop;
        for (let i = start; i < end; i++) {
          const idx = Math.floor(electrons[i].progress * (pathLen - 1));
          const pt  = loop[Math.min(idx, pathLen - 1)];
          if (isInsideBulb(pt.x, pt.y)) continue;
          if (isInsideBattery(pt)) continue;
          ctx.fillStyle = `rgb(${electrons[i].r},${electrons[i].g},${electrons[i].b})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, electrons[i].size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      return;
    }

    if (densePath.length === 0) return;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#4fc3f7';
    const pathLen = densePath.length;
    for (let i = 0; i < electrons.length; i++) {
      const idx = Math.floor(electrons[i].progress * (pathLen - 1));
      const pt  = densePath[Math.min(idx, pathLen - 1)];
      if (isInsideBulb(pt.x, pt.y)) continue;
      if (isInsideBattery(pt)) continue;
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

    if (bulbs.length > 0 && bulbs.every(b => b.isDetached)) {
      const V_calc = circuitType === 'seri' ? batteryCount * V_BATTERY : V_BATTERY;
      const R_calc = circuitType === 'seri' ? bulbCount * R_bulb : R_bulb / bulbCount;
      sim.V_total      = V_calc;
      sim.R_total      = R_calc;
      sim.I            = 0;
      sim.P_actual     = 0;
      sim.bulbState    = 'dim';
      sim.dimAlpha     = 0.25;
      sim.arusPerLampu = 0;
      return;
    }

    let V_total = 0;
    let R_total = 0;
    let V_per_bulb = 0;

    if (circuitType === 'seri') {
      V_total    = batteryCount * V_BATTERY;
      R_total    = bulbCount * R_bulb;
      V_per_bulb = R_total > 0 ? V_total / bulbCount : 0;
    } else {
      const activeBulbs = bulbs.filter(b => !b.isDetached && !b.isBurnt);
      V_total    = V_BATTERY;
      R_total    = activeBulbs.length > 0 ? R_bulb / activeBulbs.length : R_bulb / bulbCount;
      V_per_bulb = V_BATTERY;
      sim.activeR_total = R_total;
      if (activeBulbs.length === 0) {
        sim.V_total      = V_total;
        sim.R_total      = R_total;
        sim.I            = 0;
        sim.P_actual     = 0;
        sim.bulbState    = 'dim';
        sim.dimAlpha     = 0.25;
        sim.arusPerLampu = 0;
        return;
      }
    }

    if (!sim.isSakelarTertutup) {
      sim.V_total      = V_total;
      sim.R_total      = R_total;
      sim.I            = 0;
      sim.P_actual     = 0;
      sim.bulbState    = 'dim';
      sim.dimAlpha     = 0.25;
      sim.arusPerLampu = 0;
      return;
    }

    if (sim.isKabelPutus) {
      sim.V_total      = V_total;
      sim.R_total      = R_total;
      sim.I            = 0;
      sim.P_actual     = 0;
      sim.bulbState    = 'dim';
      sim.dimAlpha     = 0.25;
      sim.arusPerLampu = 0;
      return;
    }

    if (circuitType === 'seri' && bulbs.some(b => b.isDetached || b.isBurnt)) {
      sim.V_total      = V_total;
      sim.R_total      = R_total;
      sim.I            = 0;
      sim.P_actual     = 0;
      sim.bulbState    = 'dim';
      sim.dimAlpha     = 0.25;
      sim.arusPerLampu = 0;
      return;
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
      sim.I_peak = I;
      I = 0;
    }

    const nowOverload = bulbState === 'overload';

    if (nowOverload && !sim.wasOverload) {
      const geo = getGeometry();
      spawnBlast(geo.cx, geo.bulbY);
      AudioEngine.playOverload();
      sim.blastTime   = Date.now();
      sim.blastActive = true;
      overloadBanner.hidden = false;
    } else if (!nowOverload && sim.wasOverload) {
      overloadBanner.hidden = true;
      sim.blastActive = false;
      sim.I_peak      = 0;
    }

    sim.V_total      = V_total;
    sim.R_total      = R_total;
    sim.I            = I;
    sim.P_actual     = P_actual;
    sim.bulbState    = bulbState;
    sim.dimAlpha     = dimAlpha;
    sim.wasOverload  = nowOverload;

    const R_bulb_final = (V_BATTERY * V_BATTERY) / bulbWatt;
    if (circuitType === 'paralel' && R_bulb_final > 0) {
      sim.arusPerLampu = V_BATTERY / R_bulb_final;
    } else {
      sim.arusPerLampu = 0;
    }
  }

  function updateDisplay() {
    elVoltage.textContent    = `${sim.V_total.toFixed(2)} V`;
    elResistance.textContent = `${sim.R_total.toFixed(2)} \u03A9`;
    elPower.textContent      = `${sim.P_actual.toFixed(2)} W`;

    if (!sim.isSakelarTertutup) {
      elLabelCurrent.textContent       = 'Arus (I)';
      elCurrent.textContent            = '0.000 A';
      elItemCurrentPerBulb.hidden      = false;
      elCurrentPerBulb.textContent     = '0.00 A';
      elItemCurrentPeak.hidden         = true;
      elStatus.className               = 'info-value info-value--status status-open';
      elStatus.textContent             = 'Sirkuit Terbuka';
      elBatteryLife.textContent        = '-';
      elEduText.className              = 'info-edu-text edu-open';
      elEduText.textContent            = 'Rangkaian Terbuka: Sakelar terbuka atau kabel terputus membuat aliran listrik terhenti sepenuhnya, sehingga lampu mati.';
      return;
    }

    if (sim.isKabelPutus) {
      elLabelCurrent.textContent       = 'Arus (I)';
      elCurrent.textContent            = '0.000 A';
      elItemCurrentPerBulb.hidden      = false;
      elCurrentPerBulb.textContent     = '0.00 A';
      elItemCurrentPeak.hidden         = true;
      elStatus.className               = 'info-value info-value--status status-open';
      elStatus.textContent             = 'Sirkuit Terbuka';
      elBatteryLife.textContent        = '-';
      elEduText.className              = 'info-edu-text edu-open';
      elEduText.textContent            = 'Rangkaian Terbuka: Sakelar terbuka atau kabel terputus membuat aliran listrik terhenti sepenuhnya, sehingga lampu mati.';
      return;
    }

    if (sim.circuitType === 'paralel' && sim.bulbCount > 1 && sim.bulbState !== 'overload') {
      elLabelCurrent.textContent   = 'Kuat Arus (I)';
      elCurrent.textContent        = `${sim.I.toFixed(3)} A`;
    } else {
      elLabelCurrent.textContent   = 'Kuat Arus (I)';
      elCurrent.textContent        = `${sim.I.toFixed(3)} A`;
    }

    elItemCurrentPerBulb.hidden  = false;
    elCurrentPerBulb.textContent = `${sim.arusPerLampu.toFixed(2)} A`;

    if (sim.bulbState === 'overload') {
      if (sim.I_peak > 0) {
        elCurrentPeak.textContent  = `${sim.I_peak.toFixed(3)} A (rangkaian terbuka)`;
        elItemCurrentPeak.hidden   = false;
      } else {
        elItemCurrentPeak.hidden = true;
      }
    } else {
      elItemCurrentPeak.hidden = true;
    }

    const seriesDisconnected = sim.circuitType === 'seri' && sim.I === 0 && bulbs.some(b => b.isDetached);
    const allDetached        = bulbs.length > 0 && bulbs.every(b => b.isDetached);
    const showDisconnected   = seriesDisconnected || allDetached;

    elStatus.className = 'info-value info-value--status';
    if (showDisconnected) {
      elStatus.textContent = 'Lampu Mati';
      elStatus.classList.add('status--disconnected');
    } else if (sim.bulbState === 'dim') {
      elStatus.textContent = 'Redup';
      elStatus.classList.add('status-dim');
    } else if (sim.bulbState === 'normal') {
      elStatus.textContent = 'Menyala Normal';
      elStatus.classList.add('status-normal');
    } else {
      elStatus.textContent = 'Lampu Putus';
      elStatus.classList.add('status-overload');
    }

    if (sim.bulbState === 'overload' || sim.I <= 0) {
      elBatteryLife.textContent = '-';
    } else {
      const totalCapacityMah = BATTERY_CAPACITY_MAH * sim.batteryCount;
      const totalCurrentMa   = sim.I * 1000;
      const totalMinutes     = Math.round(totalCapacityMah / totalCurrentMa * 60);
      const hours            = Math.floor(totalMinutes / 60);
      const minutes          = totalMinutes % 60;
      elBatteryLife.textContent = hours > 0
        ? `${hours} jam ${minutes} menit`
        : `${minutes} menit`;
    }

    elEduText.className = 'info-edu-text';
    if (showDisconnected) {
      elEduText.textContent = 'Rangkaian Terputus! Arus pada lampu tidak mengalir membuat aliran listrik terhenti sepenuhnya, sehingga lampu mati.';
      elEduText.classList.add('status--disconnected');
    } else if (sim.bulbState === 'overload') {
      elEduText.textContent = 'Bahaya! Tegangan baterai terlalu besar melebihi kemampuan lampu, kawat lampu kepanasan dan meledak!';
      elEduText.classList.add('edu-overload');
    } else if (sim.bulbState === 'normal') {
      elEduText.textContent = 'Listrik pas! Lampu menyala terang benderang dan aman.';
      elEduText.classList.add('edu-normal');
    } else {
      elEduText.textContent = 'Listriknya kurang bertenaga karena baterainya sedikit atau Watt lampunya terlalu besar.';
      elEduText.classList.add('edu-dim');
    }
  }

  function drawBackground(geo) {
    const bgGradient = ctx.createRadialGradient(geo.cx, geo.cy, 50, geo.cx, geo.cy, Math.max(cw, ch));
    bgGradient.addColorStop(0, '#111625');
    bgGradient.addColorStop(1, '#070a10');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.05)';
    ctx.lineWidth   = 1;
    const gridSize  = 50;
    for (let x = 0; x <= cw; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    for (let y = 0; y <= ch; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
  }

  function drawWires(geo) {
    const { left, right, top, bottom, bulbPositions } = geo;
    const radius = 16;

    ctx.save();

    if (sim.circuitType === 'seri') {
      ctx.save();
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';

      const drawSeriPath = function() {
        if (!geo.visualSegments) return;
        for (let i = 0; i < geo.visualSegments.length; i++) {
          const seg = geo.visualSegments[i];
          ctx.beginPath();
          ctx.moveTo(seg[0].x, seg[0].y);
          for (let j = 1; j < seg.length; j++) {
            ctx.lineTo(seg[j].x, seg[j].y);
          }
          ctx.stroke();
        }
      };

      ctx.strokeStyle = '#2e4a6a';
      ctx.lineWidth   = 6;
      drawSeriPath();

      if (sim.I > 0) {
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
        ctx.lineWidth   = 10;
        drawSeriPath();
      }

      ctx.restore();
    } else {
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';

      const rx      = Math.round;
      const rleft   = rx(left);
      const rright  = rx(right);
      const rbatY   = rx(bottom);
      const rfirstY = rx(bulbPositions[0].y);
      const rcx     = rx(geo.cx);

      const buildParallelPath = function(isGlow) {
        ctx.beginPath();
        ctx.moveTo(rleft,  rfirstY);
        ctx.lineTo(rleft,  rbatY);
        ctx.lineTo(rright, rbatY);
        ctx.lineTo(rright, rfirstY);
        for (let i = 0; i < bulbPositions.length; i++) {
          if (isGlow && bulbs[i] && bulbs[i].isDetached) continue;
          const py = rx(bulbPositions[i].y);
          ctx.moveTo(rleft,            py);
          ctx.lineTo(rcx - radius - 4, py);
          ctx.moveTo(rcx + radius + 4, py);
          ctx.lineTo(rright,           py);
        }
      };

      ctx.strokeStyle = '#2e4a6a';
      ctx.lineWidth   = 6;
      buildParallelPath(false);
      ctx.stroke();

      if (sim.I > 0) {
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
        ctx.lineWidth   = 10;
        buildParallelPath(true);
        ctx.stroke();
      }
    }

    ctx.restore();
    drawSwitch(geo);
  }

  function drawSwitch(geo) {
    const switchX    = geo.left;
    let   switchMidY = (geo.top + geo.bottom) / 2;

    if (sim.circuitType === 'paralel') {
      switchMidY = (geo.parallelSlot4Y + geo.bottom) / 2;
    }

    const termRadius = 4;
    const armLen     = Math.min(cw, ch) * 0.055;

    const termA = { x: switchX, y: switchMidY - armLen };
    const termB = { x: switchX, y: switchMidY + armLen };

    ctx.save();
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.arc(termA.x, termA.y, termRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(termB.x, termB.y, termRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.lineCap   = 'round';

    if (sim.isSakelarTertutup) {
      ctx.strokeStyle = '#69f0ae';
      ctx.beginPath();
      ctx.moveTo(termA.x, termA.y);
      ctx.lineTo(termB.x, termB.y);
      ctx.stroke();
    } else {
      const angle = -Math.PI / 6;
      const tipX  = termA.x + Math.sin(angle) * armLen * 1.4;
      const tipY  = termA.y - Math.cos(angle) * armLen * 1.4;
      ctx.strokeStyle = '#ff758c';
      ctx.beginPath();
      ctx.moveTo(termA.x, termA.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    }

    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '11px sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(sim.isSakelarTertutup ? 'ON' : 'OFF', switchX - 8, switchMidY);

    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
    cachedSwitchX   = switchX;
    cachedSwitchY   = switchMidY;
    ctx.restore();
  }

  function drawBatteries(geo) {
    const { batteryY, cx } = geo;
    const count  = sim.batteryCount;
    const bw     = 45;
    const bh     = 24;
    const gap    = 10;

    const drawOneBattery = function(bx, by) {
      ctx.shadowBlur  = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle   = '#26a69a';
      ctx.strokeStyle = 'transparent';
      ctx.lineWidth   = 0;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.fillStyle    = '#ffffff';
      ctx.font         = 'bold 13px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', bx + bw - 9, by + bh / 2);
    };

    const totalW = count * bw + (count - 1) * gap;
    const startX = cx - totalW / 2;
    for (let i = 0; i < count; i++) {
      drawOneBattery(startX + i * (bw + gap), batteryY - bh / 2);
    }
    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Baterai x${count}  (${sim.V_total.toFixed(1)} V)`, cx, batteryY - bh / 2 - 12);
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
  }

  function drawDetachedBulb(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle   = '#333333';
    ctx.fill();
    ctx.strokeStyle = '#555555';
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.strokeStyle = '#555555';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - radius - 2);
    ctx.lineTo(x - 4, y - radius - 8);
    ctx.moveTo(x + 4, y - radius - 2);
    ctx.lineTo(x + 4, y - radius - 8);
    ctx.stroke();
  }

  function drawBulbs(geo) {
    const { bulbPositions, cx, bulbY, scaledRadius } = geo;
    const count         = sim.bulbCount;
    const radius        = scaledRadius || 16;
    const heightScale   = Math.min(ch / 600, 1.0);
    const DETACH_OFFSET = Math.round(20 * heightScale);
    const baseW         = 10;
    const baseH         = 6;

    for (let i = 0; i < count; i++) {
      const pos = bulbPositions[i];
      if (!pos) continue;
      const bx        = pos.x;
      const by        = pos.y;
      const detachedY = Math.min(by + DETACH_OFFSET, geo.bottom - 45);

      if (bulbs[i] && bulbs[i].isDetached) {
        ctx.save();
        ctx.shadowBlur  = 0;
        ctx.shadowColor = 'transparent';
        ctx.fillStyle   = 'rgba(207,216,220,0.2)';
        ctx.beginPath();
        ctx.arc(bx, detachedY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath();
        ctx.roundRect(bx - baseW / 2, detachedY + radius - 2, baseW, baseH, 2);
        ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.shadowColor = 'transparent';
        ctx.restore();
      } else if ((bulbs[i] && bulbs[i].isBurnt) || sim.bulbState === 'overload') {
        try {
          drawBrokenBulb(bx, by, radius);
        } catch (renderError) {
          ctx.fillStyle = '#ff5252';
          ctx.fillRect(bx - radius, by - radius, radius * 2, radius * 2);
        }
      } else {
        ctx.save();
        const glowSize = sim.I * 5;
        if (sim.I > 0 && sim.dimAlpha > 0.3) {
          ctx.shadowColor = '#fff59d';
          ctx.shadowBlur  = glowSize;
        } else {
          ctx.shadowBlur  = 0;
          ctx.shadowColor = 'transparent';
        }
        ctx.fillStyle   = sim.I > 0 ? '#fff59d' : 'rgba(207,216,220,0.2)';
        ctx.strokeStyle = sim.I > 0 ? '#f9a825' : '#546e7a';
        ctx.lineWidth   = 2;
        ctx.globalAlpha = sim.dimAlpha;
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur  = 0;
        ctx.shadowColor = 'transparent';
        ctx.fillStyle   = '#90a4ae';
        ctx.beginPath();
        ctx.roundRect(bx - baseW / 2, by + radius - 2, baseW, baseH, 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const labelY = sim.circuitType === 'seri'
      ? geo.bulbY + radius + 35
      : 15;

    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Lampu x${count}  (${sim.bulbWatt}W nominal)`, cx, labelY);
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
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
    const { cx, top, bottom } = geo;

    const label = sim.I > 0
      ? `I = ${sim.I.toFixed(3)} A`
      : 'I = 0 A (terbuka)';

    ctx.save();
    ctx.fillStyle    = 'rgba(144, 180, 206, 0.7)';
    ctx.font         = 'bold 13px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (sim.circuitType === 'paralel') {
      ctx.fillText(label, cx, bottom + 25);
    } else {
      ctx.fillText(label, cx, top - 25);
    }

    ctx.restore();
  }

  function render(timestamp) {
    const geo = getGeometry();

    drawBackground(geo);
    drawWires(geo);
    drawBatteries(geo);
    drawPhysicsLabels(geo);

    let speedMultiplier;
    if (sim.I === 0) {
      speedMultiplier = 0;
    } else if (sim.bulbState === 'dim') {
      speedMultiplier = BASE_SPEED * 0.3;
    } else if (sim.bulbState === 'overload') {
      speedMultiplier = BASE_SPEED * 18;
    } else {
      speedMultiplier = BASE_SPEED * 1;
    }

    updateElectrons(geo.densePath, geo.parallelLoops, speedMultiplier);
    if (sim.I > 0) {
      drawElectrons(geo.densePath, geo.parallelLoops, geo);
    }

    drawBulbs(geo);

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
  let cachedSwitchX = 0;
  let cachedSwitchY = 0;

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
    resetBulbs(val);
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

  function onSakelarToggle() {
    AudioEngine.init();
    AudioEngine.playClick();
    sim.isSakelarTertutup = !sim.isSakelarTertutup;
    btnSakelar.textContent = sim.isSakelarTertutup ? 'ON' : 'OFF';
    btnSakelar.setAttribute('aria-pressed', sim.isSakelarTertutup ? 'true' : 'false');
    if (sim.isSakelarTertutup) {
      btnSakelar.classList.remove('btn-sakelar--off');
      btnSakelar.classList.add('btn-sakelar--on');
    } else {
      btnSakelar.classList.remove('btn-sakelar--on');
      btnSakelar.classList.add('btn-sakelar--off');
    }
    runPhysics();
    updateDisplay();
  }

  function onCanvasMouseMove(e) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top)  * scaleY;
    const cssX   = e.clientX - rect.left;
    const cssY   = e.clientY - rect.top;

    let overBulb = false;
    const swDx = cssX - cachedSwitchX;
    const swDy = cssY - cachedSwitchY;
    if (swDx * swDx + swDy * swDy <= 1225) {
      overBulb = true;
    }
    if (!overBulb) {
      for (let i = 0; i < bulbs.length; i++) {
        if (!bulbs[i]) continue;
        const dx = mouseX - bulbs[i].x;
        const dy = mouseY - bulbs[i].y;
        if (Math.sqrt(dx * dx + dy * dy) <= sim.hitBoxRadius) {
          overBulb = true;
          break;
        }
      }
    }
    canvas.style.cursor = overBulb ? 'pointer' : 'default';
  }

  function onCanvasPointerDown(e) {
    AudioEngine.init();
    const rect    = canvas.getBoundingClientRect();
    const cssX    = e.clientX - rect.left;
    const cssY    = e.clientY - rect.top;
    const scaledX = cssX * (canvas.width  / rect.width);
    const scaledY = cssY * (canvas.height / rect.height);

    const swDx = cssX - cachedSwitchX;
    const swDy = cssY - cachedSwitchY;
    if (swDx * swDx + swDy * swDy <= 1225) {
      e.preventDefault();
      onSakelarToggle();
      return;
    }

    const geo   = getGeometry();
    const count = sim.bulbCount;

    for (let i = 0; i < count; i++) {
      if (!bulbs[i] || bulbs[i].isBurnt) continue;
      const bulbX = bulbs[i].x || 0;
      const bulbY = bulbs[i].y || 0;
      const distA = Math.sqrt((cssX    - bulbX) * (cssX    - bulbX) + (cssY    - bulbY) * (cssY    - bulbY));
      const distB = Math.sqrt((scaledX - bulbX) * (scaledX - bulbX) + (scaledY - bulbY) * (scaledY - bulbY));

      if (distA <= geo.scaledHitBox || distB <= geo.scaledHitBox) {
        e.preventDefault();
        bulbs[i].isDetached = !bulbs[i].isDetached;
        runPhysics();
        updateDisplay();
        break;
      }
    }
  }

  function prosesInteraksiLampu(clientX, clientY) {
    const rect    = canvas.getBoundingClientRect();
    const x       = (clientX - rect.left) * (canvas.width  / rect.width);
    const y       = (clientY - rect.top)  * (canvas.height / rect.height);
    const geo     = getGeometry();
    const count   = sim.bulbCount;
    const radius  = 16;
    const gap     = 50;
    const totalW  = count * radius * 2 + (count - 1) * gap;
    const startX  = geo.cx - totalW / 2 + radius;

    for (let i = 0; i < count; i++) {
      const bulbX  = startX + i * (radius * 2 + gap);
      const bulbY  = geo.bulbY;
      const dx     = x - bulbX;
      const dy     = y - bulbY;
      const deltaD = Math.sqrt(dx * dx + dy * dy);

      if (deltaD <= sim.hitBoxRadius && !bulbs[i].isBurnt) {
        bulbs[i].isDetached = !bulbs[i].isDetached;
        runPhysics();
        updateDisplay();
        return;
      }
    }
  }

  function onReset() {
    sim.circuitType  = 'seri';
    sim.batteryCount = 1;
    sim.bulbCount    = 1;
    sim.bulbWatt     = 5;
    sim.wasOverload       = false;
    sim.blastActive       = false;
    sim.I_peak            = 0;
    sim.isSakelarTertutup = false;
    sim.isKabelPutus      = false;
    sim.activeR_total     = 0;
    sim.arusPerLampu      = 0;
    sim.hitBoxRadius      = 30;
    blasts.length         = 0;
    cachedSwitchX         = 0;
    cachedSwitchY         = 0;
    resetBulbs(1);

    btnSakelar.textContent = 'OFF';
    btnSakelar.classList.remove('btn-sakelar--on');
    btnSakelar.classList.add('btn-sakelar--off');
    btnSakelar.setAttribute('aria-pressed', 'false');

    document.getElementById('typeSeri').checked = true;
    sliderBattery.value = 1;
    labelBattery.textContent = 1;
    sliderBattery.setAttribute('aria-valuenow', 1);
    sliderBulb.value = 1;
    labelBulb.textContent = 1;
    sliderBulb.setAttribute('aria-valuenow', 1);
    document.getElementById('watt5').checked = true;

    overloadBanner.hidden       = true;
    elItemCurrentPeak.hidden    = false;
    elCurrentPeak.textContent   = '0.000 A';
    elItemCurrentPerBulb.hidden = true;

    runPhysics();
    updateDisplay();
  }

  function onResize() {
    resizeCanvas();
    getGeometry();
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

  function init() {
    if (!ctx) {
      canvas.parentElement.innerHTML =
        '<p style="color:#ff5252;padding:1rem">Browser Anda tidak mendukung Canvas HTML5.</p>';
      return;
    }
    resizeCanvas();
    initElectrons(getGeometry().densePath);
    rebuildBulbs(sim.bulbCount);

    btnSakelar.textContent = 'OFF';
    btnSakelar.classList.remove('btn-sakelar--on');
    btnSakelar.classList.add('btn-sakelar--off');
    btnSakelar.setAttribute('aria-pressed', 'false');

    runPhysics();
    updateDisplay();

    radiosCircuitType.forEach(r => r.addEventListener('change', onCircuitTypeChange));
    radiosBulbWatt.forEach(r => r.addEventListener('change', onBulbWattChange));
    sliderBattery.addEventListener('input', onBatterySlider);
    sliderBulb.addEventListener('input', onBulbSlider);
    btnReset.addEventListener('click', onReset);
    if (!btnSakelar) throw new Error('btnSakelar element not found');
    btnSakelar.addEventListener('click', onSakelarToggle);
    canvas.addEventListener('pointerdown', onCanvasPointerDown, { passive: false });
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('resize', onResize);

    rafId = requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
