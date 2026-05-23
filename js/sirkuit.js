(function () {
  'use strict';

  const IS_DEVELOPMENT     = true;

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

    const addSegment = function(ax, ay, bx, by) {
      for (let t = 0; t < STEPS_PER_SEGMENT; t++) {
        const frac = t / STEPS_PER_SEGMENT;
        densePath.push({
          x: ax + (bx - ax) * frac,
          y: ay + (by - ay) * frac,
        });
      }
    };

    if (sim.circuitType === 'seri') {
      for (let s = 0; s < wirePath.length - 1; s++) {
        addSegment(wirePath[s].x, wirePath[s].y, wirePath[s + 1].x, wirePath[s + 1].y);
      }
      densePath.push({ x: left, y: top });
    } else {
      const count  = sim.bulbCount;
      const radius = 16;
      const gap    = 50;
      const totalH = count * radius * 2 + (count - 1) * gap;
      const startY = cy - totalH / 2 + radius;

      addSegment(left, top, left, bottom);

      addSegment(left, bottom, right, bottom);

      addSegment(right, bottom, right, top);

      addSegment(right, top, left, top);

      for (let i = 0; i < count; i++) {
        const py = startY + i * (radius * 2 + gap);
        addSegment(left, py, cx - radius - 4, py);
        addSegment(cx + radius + 4, py, right, py);
      }

      densePath.push({ x: left, y: top });
    }

    const count  = sim.bulbCount;
    const radius = 16;
    const gap    = 50;

    let bulbPositions = [];
    let batteryY;
    let bulbY;

    if (sim.circuitType === 'seri') {
      batteryY = bottom;
      bulbY    = top;
      const totalW = count * radius * 2 + (count - 1) * gap;
      const startX = cx - totalW / 2 + radius;
      for (let i = 0; i < count; i++) {
        bulbPositions.push({ x: startX + i * (radius * 2 + gap), y: bulbY });
      }
    } else {
      batteryY = bottom;
      bulbY    = cy;
      const totalH  = count * radius * 2 + (count - 1) * gap;
      const startY  = cy - totalH / 2 + radius;
      for (let i = 0; i < count; i++) {
        bulbPositions.push({ x: cx, y: startY + i * (radius * 2 + gap) });
      }
    }

    for (let i = 0; i < bulbs.length && i < bulbPositions.length; i++) {
      bulbs[i].x = bulbPositions[i].x;
      bulbs[i].y = bulbPositions[i].y;
    }

    return {
      cx, cy,
      left, right, top, bottom,
      wirePath,
      densePath,
      batteryY,
      bulbY,
      bulbPositions,
    };
  }

  const electrons = [];

  const bulbs = [];

  function rebuildBulbs(count) {
    while (bulbs.length < count) {
      bulbs.push({ isDetached: false, isBurnt: false, x: 0, y: 0 });
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

  function drawBackground() {
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, cw, ch);
  }

  function drawWires(geo) {
    const { left, right, top, bottom, bulbPositions } = geo;
    const radius = 16;

    ctx.strokeStyle = '#2e4a6a';
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    if (sim.circuitType === 'seri') {
      const { wirePath } = geo;
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
        ctx.strokeStyle = '#2e4a6a';
        ctx.lineWidth   = 6;
      }
    } else {
      const cx = geo.cx;

      ctx.beginPath();
      ctx.moveTo(left,  top);
      ctx.lineTo(left,  bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(right, top);
      ctx.lineTo(right, bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(left,  top);
      ctx.lineTo(right, top);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(left,  bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();

      for (let i = 0; i < bulbPositions.length; i++) {
        const py = bulbPositions[i].y;
        ctx.beginPath();
        ctx.moveTo(left,  py);
        ctx.lineTo(cx - radius - 4, py);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + radius + 4, py);
        ctx.lineTo(right, py);
        ctx.stroke();
      }

      if (sim.I > 0) {
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
        ctx.lineWidth   = 10;

        ctx.beginPath();
        ctx.moveTo(left,  top);
        ctx.lineTo(left,  bottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(right, top);
        ctx.lineTo(right, bottom);
        ctx.stroke();

        for (let i = 0; i < bulbPositions.length; i++) {
          const py = bulbPositions[i].y;
          ctx.beginPath();
          ctx.moveTo(left,  py);
          ctx.lineTo(cx - radius - 4, py);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + radius + 4, py);
          ctx.lineTo(right, py);
          ctx.stroke();
        }

        ctx.strokeStyle = '#2e4a6a';
        ctx.lineWidth   = 6;
      }
    }

    drawSwitch(geo);
  }

  function drawSwitch(geo) {
    const switchX    = geo.left;
    const switchMidY = (geo.top + geo.bottom) / 2;
    const halfLen    = Math.min(cw, ch) * 0.06;

    const pointA = { x: switchX, y: switchMidY - halfLen };
    const pointB = { x: switchX, y: switchMidY + halfLen };

    if (sim.isSakelarTertutup) {
      ctx.strokeStyle = '#00AA00';
      ctx.lineWidth   = 6;
      ctx.beginPath();
      ctx.moveTo(pointA.x, pointA.y);
      ctx.lineTo(pointB.x, pointB.y);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#CC0000';
      ctx.lineWidth   = 6;
      ctx.beginPath();
      ctx.moveTo(pointA.x, pointA.y);
      ctx.lineTo(pointA.x, pointA.y + halfLen - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pointB.x, pointB.y - halfLen + 4);
      ctx.lineTo(pointB.x, pointB.y);
      ctx.stroke();
    }

    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '11px sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    const labelText  = sim.isSakelarTertutup ? 'ON' : 'OFF';
    ctx.fillText(labelText, switchX - 8, switchMidY);
  }

  function drawBatteries(geo) {
    const { batteryY, cx, left, right } = geo;
    const count  = sim.batteryCount;
    const bw     = 36;
    const bh     = 18;
    const gap    = 10;

    const drawOneBattery = function(bx, by) {
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
    };

    if (sim.circuitType === 'seri') {
      const totalW = count * bw + (count - 1) * gap;
      const startX = cx - totalW / 2;
      for (let i = 0; i < count; i++) {
        drawOneBattery(startX + i * (bw + gap), batteryY - bh / 2);
      }
    } else {
      const row1Count = Math.min(count, 2);
      const row2Count = Math.max(0, count - 2);
      const rowGap    = bh + 6;

      const drawRow = function(n, byOffset) {
        const totalW = n * bw + (n - 1) * gap;
        const startX = cx - totalW / 2;
        for (let i = 0; i < n; i++) {
          drawOneBattery(startX + i * (bw + gap), batteryY - bh / 2 + byOffset);
        }
      };

      if (row2Count > 0) {
        drawRow(row1Count, -rowGap);
        drawRow(row2Count, 0);
      } else {
        drawRow(row1Count, 0);
      }
    }

    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    const labelOffset = sim.circuitType === 'paralel' && count > 2 ? bh + 6 : 0;
    ctx.fillText(`Baterai x${count}  (${sim.V_total.toFixed(1)} V)`, cx, batteryY - bh / 2 - 6 - labelOffset);
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
    const { bulbPositions, cx, bulbY } = geo;
    const count        = sim.bulbCount;
    const radius       = 16;
    const DETACH_OFFSET = 20;

    for (let i = 0; i < count; i++) {
      const pos = bulbPositions[i];
      if (!pos) continue;
      const bx = pos.x;
      const by = pos.y;

      if (bulbs[i] && bulbs[i].isDetached) {
        drawDetachedBulb(bx, by + DETACH_OFFSET, radius);
      } else if ((bulbs[i] && bulbs[i].isBurnt) || sim.bulbState === 'overload') {
        try {
          drawBrokenBulb(bx, by, radius);
        } catch (renderError) {
          ctx.fillStyle = '#ff5252';
          ctx.fillRect(bx - radius, by - radius, radius * 2, radius * 2);
        }
      } else {
        drawNormalBulb(bx, by, radius, sim.dimAlpha);
      }
    }

    const labelY = sim.circuitType === 'seri'
      ? geo.top + radius + 8
      : geo.bottom + radius + 8;

    ctx.fillStyle    = '#90b4ce';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Lampu x${count}  (${sim.bulbWatt}W nominal)`, cx, labelY);
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
    const { cx, cy, top, bottom } = geo;
    ctx.fillStyle    = 'rgba(144, 180, 206, 0.7)';
    ctx.font         = '11px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const label = sim.I > 0
      ? `I = ${sim.I.toFixed(3)} A`
      : 'I = 0 A (terbuka)';

    const labelY = sim.circuitType === 'paralel'
      ? top - 14
      : cy;

    ctx.fillText(label, cx, labelY);
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

    const geo    = getGeometry();
    const count  = sim.bulbCount;
    const radius = 16;
    const gap    = 50;
    const totalW = count * radius * 2 + (count - 1) * gap;
    const startX = geo.cx - totalW / 2 + radius;

    let overBulb = false;
    for (let i = 0; i < count; i++) {
      const bulbX = startX + i * (radius * 2 + gap);
      const bulbY = geo.bulbY;
      const dx    = mouseX - bulbX;
      const dy    = mouseY - bulbY;
      const deltaD = Math.sqrt(dx * dx + dy * dy);
      if (deltaD <= sim.hitBoxRadius) {
        overBulb = true;
        break;
      }
    }
    canvas.style.cursor = overBulb ? 'pointer' : 'default';
  }

  function onCanvasPointerDown(e) {
    e.preventDefault();

    const rect    = canvas.getBoundingClientRect();
    const cssX    = e.clientX - rect.left;
    const cssY    = e.clientY - rect.top;
    const scaledX = cssX * (canvas.width  / rect.width);
    const scaledY = cssY * (canvas.height / rect.height);

    const count = sim.bulbCount;

    for (let i = 0; i < count; i++) {
      if (!bulbs[i] || bulbs[i].isBurnt) continue;
      const bulbX  = bulbs[i].x || 0;
      const bulbY  = bulbs[i].y || 0;
      const distA  = Math.sqrt((cssX    - bulbX) * (cssX    - bulbX) + (cssY    - bulbY) * (cssY    - bulbY));
      const distB  = Math.sqrt((scaledX - bulbX) * (scaledX - bulbX) + (scaledY - bulbY) * (scaledY - bulbY));

      if (distA <= sim.hitBoxRadius || distB <= sim.hitBoxRadius) {
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
      const dimCases = [
        { circuitType: 'seri',    batteryCount: 1, bulbCount: 4 },
        { circuitType: 'paralel', batteryCount: 1, bulbCount: 1 },
      ];
      for (const c of dimCases) {
        const snap = computePhysicsSnapshot(c.circuitType, c.batteryCount, c.bulbCount, watt);
        if (snap.P_actual > 0 && snap.P_actual < watt) {
          if (snap.bulbState !== 'dim') {
            throw new Error(
              'assertBulbStateClassification: 0<P_actual<P_nominal must yield bulbState=dim, got ' +
              snap.bulbState + ' for watt=' + watt + ' type=' + c.circuitType
            );
          }
          const expectedAlpha = Math.max(0.25, snap.P_actual / watt);
          if (Math.abs(snap.dimAlpha - expectedAlpha) > 0.0001) {
            throw new Error(
              'assertBulbStateClassification: dimAlpha mismatch for dim state, expected ' +
              expectedAlpha + ' got ' + snap.dimAlpha + ' watt=' + watt
            );
          }
        }
      }

      const normalCases = [
        { circuitType: 'seri',    batteryCount: 1, bulbCount: 1 },
        { circuitType: 'paralel', batteryCount: 1, bulbCount: 1 },
        { circuitType: 'paralel', batteryCount: 4, bulbCount: 4 },
      ];
      for (const c of normalCases) {
        const snap = computePhysicsSnapshot(c.circuitType, c.batteryCount, c.bulbCount, watt);
        if (snap.P_actual >= watt && snap.P_actual <= watt * OVERLOAD_FACTOR) {
          if (snap.bulbState !== 'normal') {
            throw new Error(
              'assertBulbStateClassification: P_nominal<=P_actual<=P_nominal*1.3 must yield bulbState=normal, got ' +
              snap.bulbState + ' for watt=' + watt + ' type=' + c.circuitType
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

    const dimAlphaMin = computePhysicsSnapshot('seri', 1, 4, 10);
    if (dimAlphaMin.bulbState === 'dim' && dimAlphaMin.P_actual > 0) {
      const expectedAlpha = Math.max(0.25, dimAlphaMin.P_actual / 10);
      if (Math.abs(dimAlphaMin.dimAlpha - expectedAlpha) > 0.0001) {
        throw new Error(
          'assertBulbStateClassification: dimAlpha proportional check failed, expected ' +
          expectedAlpha + ' got ' + dimAlphaMin.dimAlpha
        );
      }
      if (dimAlphaMin.dimAlpha < 0.25 || dimAlphaMin.dimAlpha >= 1.0) {
        throw new Error(
          'assertBulbStateClassification: dimAlpha out of range [0.25, 1.0), got ' + dimAlphaMin.dimAlpha
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
      'I_peak',
      'P_actual',
      'bulbState',
      'dimAlpha',
      'wasOverload',
      'blastTime',
      'blastActive',
      'isSakelarTertutup',
      'isKabelPutus',
      'activeR_total',
      'arusPerLampu',
      'hitBoxRadius',
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

    if (typeof sim.circuitType        !== 'string')  throw new Error('assertSimMonomorphic: circuitType must be string');
    if (typeof sim.batteryCount       !== 'number')  throw new Error('assertSimMonomorphic: batteryCount must be number');
    if (typeof sim.bulbCount          !== 'number')  throw new Error('assertSimMonomorphic: bulbCount must be number');
    if (typeof sim.bulbWatt           !== 'number')  throw new Error('assertSimMonomorphic: bulbWatt must be number');
    if (typeof sim.V_total            !== 'number')  throw new Error('assertSimMonomorphic: V_total must be number');
    if (typeof sim.R_total            !== 'number')  throw new Error('assertSimMonomorphic: R_total must be number');
    if (typeof sim.I                  !== 'number')  throw new Error('assertSimMonomorphic: I must be number');
    if (typeof sim.I_peak             !== 'number')  throw new Error('assertSimMonomorphic: I_peak must be number');
    if (typeof sim.P_actual           !== 'number')  throw new Error('assertSimMonomorphic: P_actual must be number');
    if (typeof sim.bulbState          !== 'string')  throw new Error('assertSimMonomorphic: bulbState must be string');
    if (typeof sim.dimAlpha           !== 'number')  throw new Error('assertSimMonomorphic: dimAlpha must be number');
    if (typeof sim.wasOverload        !== 'boolean') throw new Error('assertSimMonomorphic: wasOverload must be boolean');
    if (typeof sim.blastTime          !== 'number')  throw new Error('assertSimMonomorphic: blastTime must be number');
    if (typeof sim.blastActive        !== 'boolean') throw new Error('assertSimMonomorphic: blastActive must be boolean');
    if (typeof sim.isSakelarTertutup  !== 'boolean') throw new Error('assertSimMonomorphic: isSakelarTertutup must be boolean');
    if (typeof sim.isKabelPutus       !== 'boolean') throw new Error('assertSimMonomorphic: isKabelPutus must be boolean');
    if (typeof sim.activeR_total      !== 'number')  throw new Error('assertSimMonomorphic: activeR_total must be number');
    if (typeof sim.arusPerLampu       !== 'number')  throw new Error('assertSimMonomorphic: arusPerLampu must be number');
    if (typeof sim.hitBoxRadius       !== 'number')  throw new Error('assertSimMonomorphic: hitBoxRadius must be number');
  }

  function assertSeriesCircuitLaw(result) {
    const EPS = 0.0001;
    const expectedVtotal = result.batteryCount * V_BATTERY;
    const expectedRtotal = result.bulbCount * result.R_bulb;
    const expectedVperBulb = result.bulbCount > 0 ? expectedVtotal / result.bulbCount : 0;

    if (Math.abs(result.V_total - expectedVtotal) > EPS) {
      throw new Error(
        'assertSeriesCircuitLaw: V_total mismatch batteries=' + result.batteryCount +
        ' expected=' + expectedVtotal + ' got=' + result.V_total
      );
    }
    if (Math.abs(result.R_total - expectedRtotal) > EPS) {
      throw new Error(
        'assertSeriesCircuitLaw: R_total mismatch bulbs=' + result.bulbCount +
        ' watt=' + result.bulbWatt +
        ' expected=' + expectedRtotal + ' got=' + result.R_total
      );
    }
    if (Math.abs(result.V_per_bulb - expectedVperBulb) > EPS) {
      throw new Error(
        'assertSeriesCircuitLaw: V_per_bulb mismatch batteries=' + result.batteryCount +
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

    spawnBlast(200, 150);
    if (blasts.length !== BLAST_COUNT) {
      throw new Error(
        'assertParticleSystemMonomorphic: spawnBlast must produce exactly ' +
        BLAST_COUNT + ' particles, got ' + blasts.length
      );
    }
    for (let i = 0; i < blasts.length; i++) {
      assertBlastParticleMonomorphic(blasts[i]);
    }
    const blastKeysFromSpawn = Object.keys(blasts[0]).join(',');
    blasts[0].x    += blasts[0].vx;
    blasts[0].y    += blasts[0].vy;
    blasts[0].vy   += 0.18;
    blasts[0].life -= blasts[0].decay;
    const blastKeysFromSpawnAfter = Object.keys(blasts[0]).join(',');
    if (blastKeysFromSpawn !== blastKeysFromSpawnAfter) {
      throw new Error('assertParticleSystemMonomorphic: spawned blast shape changed after update');
    }
    assertBlastParticleMonomorphic(blasts[0]);
    blasts.length = 0;
  }

  function assertElectronSpeedProportional(current) {
    const EPS = 0.0001;

    if (current <= 0) {
      return;
    }

    const speedFactor = Math.min(current * 8, 6);

    if (speedFactor <= 0) {
      throw new Error(
        'assertElectronSpeedProportional: speedFactor must be > 0 when I > 0, got=' +
        speedFactor + ' for I=' + current
      );
    }

    if (speedFactor > 6) {
      throw new Error(
        'assertElectronSpeedProportional: speedFactor must be <= 6 (cap), got=' +
        speedFactor + ' for I=' + current
      );
    }

    const expectedSpeedFactor = Math.min(current * 8, 6);
    if (Math.abs(speedFactor - expectedSpeedFactor) > EPS) {
      throw new Error(
        'assertElectronSpeedProportional: speedFactor mismatch for I=' + current +
        ' expected=' + expectedSpeedFactor + ' got=' + speedFactor
      );
    }

    const progressBefore = 0.5;
    const progressAfter  = progressBefore + BASE_SPEED * speedFactor;
    if (progressAfter <= progressBefore) {
      throw new Error(
        'assertElectronSpeedProportional: progress must increase when I > 0, I=' + current
      );
    }

    const testParticle = { progress: 0.5, size: 4, r: 79, g: 195, b: 247 };
    const fakeDensePath = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    const progressSnapshot = testParticle.progress;
    const savedElectrons = electrons.splice(0, electrons.length, testParticle);
    updateElectrons(fakeDensePath, speedFactor);
    const actualDelta = testParticle.progress - progressSnapshot;
    electrons.splice(0, electrons.length, ...savedElectrons);

    const expectedDelta = BASE_SPEED * speedFactor;
    if (Math.abs(actualDelta - expectedDelta) > EPS) {
      throw new Error(
        'assertElectronSpeedProportional: updateElectrons delta mismatch for I=' + current +
        ' expected delta=' + expectedDelta + ' got=' + actualDelta
      );
    }
  }

  function assertElectronStillWhenZeroCurrent() {
    const testParticle = { progress: 0.5, size: 4, r: 79, g: 195, b: 247 };
    const fakeDensePath = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    const progressSnapshot = testParticle.progress;

    const savedI = sim.I;
    sim.I = 0;

    const savedElectrons = electrons.splice(0, electrons.length, testParticle);

    if (sim.I > 0) {
      const speedFactor = Math.min(sim.I * 8, 6);
      updateElectrons(fakeDensePath, speedFactor);
    }

    const progressAfter = testParticle.progress;
    electrons.splice(0, electrons.length, ...savedElectrons);
    sim.I = savedI;

    if (progressAfter !== progressSnapshot) {
      throw new Error(
        'assertElectronStillWhenZeroCurrent: progress must not change when sim.I = 0, ' +
        'before=' + progressSnapshot + ' after=' + progressAfter
      );
    }

    const zeroSpeedFactor = 0;
    const progressBefore = 0.5;
    const progressAfterFormula = progressBefore + BASE_SPEED * zeroSpeedFactor;
    if (progressAfterFormula !== progressBefore) {
      throw new Error(
        'assertElectronStillWhenZeroCurrent: BASE_SPEED * 0 must yield no progress change'
      );
    }
  }

  function assertRbulbPositive(watt) {
    const EPS    = 0.0001;
    const R_bulb = (V_BATTERY * V_BATTERY) / watt;
    if (R_bulb <= 0) {
      throw new Error(
        'assertRbulbPositive: R_bulb must be > 0 for watt=' + watt +
        ' got=' + R_bulb
      );
    }
    const expectedRbulb = (V_BATTERY * V_BATTERY) / watt;
    if (Math.abs(R_bulb - expectedRbulb) > EPS) {
      throw new Error(
        'assertRbulbPositive: R_bulb mismatch for watt=' + watt +
        ' expected=' + expectedRbulb + ' got=' + R_bulb
      );
    }
  }

  function assertOhmLaw(result) {
    const EPS = 0.0001;
    if (result.bulbState === 'overload') {
      return;
    }
    if (result.R_total <= 0) {
      return;
    }
    const expectedI = result.V_total / result.R_total;
    if (Math.abs(result.I - expectedI) > EPS) {
      throw new Error(
        'assertOhmLaw: I mismatch type=' + result.circuitType +
        ' batteries=' + result.batteryCount +
        ' bulbs=' + result.bulbCount +
        ' watt=' + result.bulbWatt +
        ' expected=' + expectedI + ' got=' + result.I
      );
    }
  }

  function assertPowerLaw(result) {
    const EPS    = 0.0001;
    const R_bulb = (V_BATTERY * V_BATTERY) / result.bulbWatt;
    if (R_bulb <= 0) {
      return;
    }
    const expectedP = (result.V_per_bulb * result.V_per_bulb) / R_bulb;
    if (Math.abs(result.P_actual - expectedP) > EPS) {
      throw new Error(
        'assertPowerLaw: P_actual mismatch type=' + result.circuitType +
        ' batteries=' + result.batteryCount +
        ' bulbs=' + result.bulbCount +
        ' watt=' + result.bulbWatt +
        ' expected=' + expectedP + ' got=' + result.P_actual
      );
    }
  }

  function assertRenderLayerOrder() {
    const savedI           = sim.I;
    const savedBlastActive = sim.blastActive;
    const savedBlastTime   = sim.blastTime;

    function simulateRenderLogic(currentI, currentBlastActive, currentBlastTime) {
      const callLog = [];

      const fakeDrawBackground    = function() { callLog.push('drawBackground'); };
      const fakeDrawWires         = function() { callLog.push('drawWires'); };
      const fakeDrawBatteries     = function() { callLog.push('drawBatteries'); };
      const fakeDrawBulbs         = function() { callLog.push('drawBulbs'); };
      const fakeDrawPhysicsLabels = function() { callLog.push('drawPhysicsLabels'); };
      const fakeDrawElectrons     = function() { callLog.push('drawElectrons'); };
      const fakeDrawBlasts        = function() { callLog.push('drawBlasts'); };
      const fakeUpdateElectrons   = function() {};
      const fakeUpdateBlasts      = function() {};

      fakeDrawBackground();
      fakeDrawWires();
      fakeDrawBatteries();
      fakeDrawBulbs();
      fakeDrawPhysicsLabels();

      if (currentI > 0) {
        fakeUpdateElectrons();
        fakeDrawElectrons();
      }

      if (currentBlastActive) {
        const elapsed = Date.now() - currentBlastTime;
        if (elapsed < BLAST_DURATION_MS) {
          fakeUpdateBlasts();
          fakeDrawBlasts();
        }
      }

      return callLog;
    }

    function assertLayerSequence(log, expected, label) {
      if (log.length !== expected.length) {
        throw new Error(
          'assertRenderLayerOrder [' + label + ']: call count expected ' +
          expected.length + ' got ' + log.length +
          ' (' + log.join(', ') + ')'
        );
      }
      for (let i = 0; i < expected.length; i++) {
        if (log[i] !== expected[i]) {
          throw new Error(
            'assertRenderLayerOrder [' + label + ']: layer[' + i + '] expected ' +
            expected[i] + ' got ' + log[i]
          );
        }
      }
    }

    const recentBlastTime  = Date.now() - 100;
    const expiredBlastTime = Date.now() - (BLAST_DURATION_MS + 100);

    const logAllActive = simulateRenderLogic(1.5, true, recentBlastTime);
    assertLayerSequence(logAllActive, [
      'drawBackground',
      'drawWires',
      'drawBatteries',
      'drawBulbs',
      'drawPhysicsLabels',
      'drawElectrons',
      'drawBlasts',
    ], 'all-active');

    const logNoElectrons = simulateRenderLogic(0, true, recentBlastTime);
    assertLayerSequence(logNoElectrons, [
      'drawBackground',
      'drawWires',
      'drawBatteries',
      'drawBulbs',
      'drawPhysicsLabels',
      'drawBlasts',
    ], 'no-electrons');
    if (logNoElectrons.indexOf('drawElectrons') !== -1) {
      throw new Error(
        'assertRenderLayerOrder: drawElectrons must not be called when sim.I = 0'
      );
    }

    const logNoBlasts = simulateRenderLogic(1.5, false, recentBlastTime);
    assertLayerSequence(logNoBlasts, [
      'drawBackground',
      'drawWires',
      'drawBatteries',
      'drawBulbs',
      'drawPhysicsLabels',
      'drawElectrons',
    ], 'no-blasts');
    if (logNoBlasts.indexOf('drawBlasts') !== -1) {
      throw new Error(
        'assertRenderLayerOrder: drawBlasts must not be called when sim.blastActive = false'
      );
    }

    const logNeither = simulateRenderLogic(0, false, recentBlastTime);
    assertLayerSequence(logNeither, [
      'drawBackground',
      'drawWires',
      'drawBatteries',
      'drawBulbs',
      'drawPhysicsLabels',
    ], 'neither-active');
    if (logNeither.indexOf('drawElectrons') !== -1) {
      throw new Error(
        'assertRenderLayerOrder: drawElectrons must not be called when sim.I = 0 (neither case)'
      );
    }
    if (logNeither.indexOf('drawBlasts') !== -1) {
      throw new Error(
        'assertRenderLayerOrder: drawBlasts must not be called when sim.blastActive = false (neither case)'
      );
    }

    const logExpiredBlast = simulateRenderLogic(1.5, true, expiredBlastTime);
    assertLayerSequence(logExpiredBlast, [
      'drawBackground',
      'drawWires',
      'drawBatteries',
      'drawBulbs',
      'drawPhysicsLabels',
      'drawElectrons',
    ], 'expired-blast');
    if (logExpiredBlast.indexOf('drawBlasts') !== -1) {
      throw new Error(
        'assertRenderLayerOrder: drawBlasts must not be called when blast duration has expired'
      );
    }

    sim.I           = savedI;
    sim.blastActive = savedBlastActive;
    sim.blastTime   = savedBlastTime;
  }

  function assertParallelCircuitLaw(result) {
    const EPS = 0.0001;

    if (result.V_total !== V_BATTERY) {
      throw new Error(
        'assertParallelCircuitLaw: V_total must equal V_BATTERY=' + V_BATTERY +
        ' got=' + result.V_total +
        ' batteries=' + result.batteryCount +
        ' bulbs=' + result.bulbCount +
        ' watt=' + result.bulbWatt
      );
    }

    const expectedRtotal = result.R_bulb / result.bulbCount;
    if (Math.abs(result.R_total - expectedRtotal) > EPS) {
      throw new Error(
        'assertParallelCircuitLaw: R_total mismatch bulbs=' + result.bulbCount +
        ' watt=' + result.bulbWatt +
        ' expected=' + expectedRtotal + ' got=' + result.R_total
      );
    }

    if (result.V_per_bulb !== V_BATTERY) {
      throw new Error(
        'assertParallelCircuitLaw: V_per_bulb must equal V_BATTERY=' + V_BATTERY +
        ' got=' + result.V_per_bulb +
        ' bulbs=' + result.bulbCount +
        ' watt=' + result.bulbWatt
      );
    }
  }

  function assertBulbStateExclusive(result) {
    const validStates = ['dim', 'normal', 'overload'];
    if (validStates.indexOf(result.bulbState) === -1) {
      throw new Error(
        'assertBulbStateExclusive: bulbState must be dim, normal, or overload, got=' +
        result.bulbState +
        ' type=' + result.circuitType +
        ' batteries=' + result.batteryCount +
        ' bulbs=' + result.bulbCount +
        ' watt=' + result.bulbWatt
      );
    }

    if (result.P_actual <= 0) {
      if (result.bulbState !== 'dim') {
        throw new Error(
          'assertBulbStateExclusive: P_actual<=0 must yield dim, got=' + result.bulbState +
          ' type=' + result.circuitType +
          ' batteries=' + result.batteryCount +
          ' bulbs=' + result.bulbCount +
          ' watt=' + result.bulbWatt
        );
      }
    } else if (result.P_actual < result.bulbWatt) {
      if (result.bulbState !== 'dim') {
        throw new Error(
          'assertBulbStateExclusive: 0<P_actual<bulbWatt must yield dim, got=' + result.bulbState +
          ' P_actual=' + result.P_actual +
          ' bulbWatt=' + result.bulbWatt
        );
      }
    } else if (result.P_actual <= result.bulbWatt * OVERLOAD_FACTOR) {
      if (result.bulbState !== 'normal') {
        throw new Error(
          'assertBulbStateExclusive: bulbWatt<=P_actual<=bulbWatt*1.3 must yield normal, got=' + result.bulbState +
          ' P_actual=' + result.P_actual +
          ' bulbWatt=' + result.bulbWatt
        );
      }
    } else {
      if (result.bulbState !== 'overload') {
        throw new Error(
          'assertBulbStateExclusive: P_actual>bulbWatt*1.3 must yield overload, got=' + result.bulbState +
          ' P_actual=' + result.P_actual +
          ' bulbWatt=' + result.bulbWatt
        );
      }
    }
  }

  function assertOverloadBreaksCurrent(result) {
    if (result.bulbState === 'overload') {
      if (result.I !== 0) {
        throw new Error(
          'assertOverloadBreaksCurrent: I must be exactly 0 when bulbState=overload, got I=' + result.I +
          ' type=' + result.circuitType +
          ' batteries=' + result.batteryCount +
          ' bulbs=' + result.bulbCount +
          ' watt=' + result.bulbWatt
        );
      }
    }
  }

  function assertDimAlphaRange(result) {
    if (result.bulbState !== 'dim') {
      return;
    }

    if (result.P_actual > 0) {
      if (result.dimAlpha < 0.25 || result.dimAlpha >= 1.0) {
        throw new Error(
          'assertDimAlphaRange: dimAlpha must be in [0.25, 1.0) when dim and P_actual>0, got=' + result.dimAlpha +
          ' P_actual=' + result.P_actual +
          ' type=' + result.circuitType +
          ' batteries=' + result.batteryCount +
          ' bulbs=' + result.bulbCount +
          ' watt=' + result.bulbWatt
        );
      }
    } else {
      if (result.dimAlpha !== 0.25) {
        throw new Error(
          'assertDimAlphaRange: dimAlpha must be exactly 0.25 when dim and P_actual=0, got=' + result.dimAlpha +
          ' type=' + result.circuitType +
          ' batteries=' + result.batteryCount +
          ' bulbs=' + result.bulbCount +
          ' watt=' + result.bulbWatt
        );
      }
    }
  }

  function assertBlastTriggeredOncePerTransition() {
    const savedCircuitType  = sim.circuitType;
    const savedBatteryCount = sim.batteryCount;
    const savedBulbCount    = sim.bulbCount;
    const savedBulbWatt     = sim.bulbWatt;
    const savedWasOverload  = sim.wasOverload;
    const savedBlastActive  = sim.blastActive;
    const savedBlastTime    = sim.blastTime;

    const overloadSnap = computePhysicsSnapshot('seri', 4, 1, 5);
    const nonOverloadSnap = computePhysicsSnapshot('seri', 1, 1, 10);

    if (overloadSnap.bulbState !== 'overload') {
      throw new Error('assertBlastTriggeredOncePerTransition: expected overload snap to be overload');
    }
    if (nonOverloadSnap.bulbState === 'overload') {
      throw new Error('assertBlastTriggeredOncePerTransition: expected non-overload snap to not be overload');
    }

    let countA = 0;
    const nowOverloadA = overloadSnap.bulbState === 'overload';
    const wasOverloadA = false;
    if (nowOverloadA && !wasOverloadA) {
      countA += 1;
    }
    if (countA !== 1) {
      throw new Error(
        'assertBlastTriggeredOncePerTransition: scenario A must fire exactly once, got=' + countA
      );
    }

    let countB = 0;
    const nowOverloadB = overloadSnap.bulbState === 'overload';
    const wasOverloadB = true;
    if (nowOverloadB && !wasOverloadB) {
      countB += 1;
    }
    if (countB !== 0) {
      throw new Error(
        'assertBlastTriggeredOncePerTransition: scenario B must not fire, got=' + countB
      );
    }

    sim.circuitType  = savedCircuitType;
    sim.batteryCount = savedBatteryCount;
    sim.bulbCount    = savedBulbCount;
    sim.bulbWatt     = savedBulbWatt;
    sim.wasOverload  = savedWasOverload;
    sim.blastActive  = savedBlastActive;
    sim.blastTime    = savedBlastTime;
  }

  function assertCriticalScenarios() {
    const EPS = 0.001;

    const snap1 = computePhysicsSnapshot('seri', 1, 1, 10);
    if (Math.abs(snap1.V_total - 1.5) > EPS) {
      throw new Error('assertCriticalScenarios test1: V_total expected=1.5 got=' + snap1.V_total);
    }
    const expectedR1 = (V_BATTERY * V_BATTERY) / 10;
    if (Math.abs(snap1.R_total - expectedR1) > EPS) {
      throw new Error('assertCriticalScenarios test1: R_total expected=' + expectedR1 + ' got=' + snap1.R_total);
    }
    const expectedI1 = 1.5 / expectedR1;
    if (Math.abs(snap1.I - expectedI1) > EPS) {
      throw new Error('assertCriticalScenarios test1: I expected=' + expectedI1 + ' got=' + snap1.I);
    }
    if (Math.abs(snap1.P_actual - 10.0) > EPS) {
      throw new Error('assertCriticalScenarios test1: P_actual expected=10.0 got=' + snap1.P_actual);
    }
    if (snap1.bulbState !== 'normal') {
      throw new Error('assertCriticalScenarios test1: bulbState expected=normal got=' + snap1.bulbState);
    }

    const snap2 = computePhysicsSnapshot('seri', 4, 1, 5);
    if (snap2.bulbState !== 'overload') {
      throw new Error('assertCriticalScenarios test2: bulbState expected=overload got=' + snap2.bulbState);
    }
    if (snap2.I !== 0) {
      throw new Error('assertCriticalScenarios test2: I must be 0 for overload, got=' + snap2.I);
    }

    const snap3 = computePhysicsSnapshot('paralel', 4, 4, 10);
    if (Math.abs(snap3.V_total - 1.5) > EPS) {
      throw new Error('assertCriticalScenarios test3: V_total expected=1.5 got=' + snap3.V_total);
    }
    if (Math.abs(snap3.P_actual - 10.0) > EPS) {
      throw new Error('assertCriticalScenarios test3: P_actual expected=10.0 got=' + snap3.P_actual);
    }
    if (snap3.bulbState !== 'normal') {
      throw new Error('assertCriticalScenarios test3: bulbState expected=normal got=' + snap3.bulbState);
    }

    const snap4 = computePhysicsSnapshot('seri', 1, 4, 25);
    if (snap4.bulbState !== 'dim') {
      throw new Error('assertCriticalScenarios test4: bulbState expected=dim got=' + snap4.bulbState);
    }

    const snap4b = computePhysicsSnapshot('paralel', 1, 1, 10);
    if (snap4b.bulbState !== 'normal') {
      throw new Error('assertCriticalScenarios test4b: paralel 1b 1l 10W must be normal, got=' + snap4b.bulbState);
    }
    if (Math.abs(snap4b.V_total - V_BATTERY) > 0.001) {
      throw new Error('assertCriticalScenarios test4b: paralel V_total must equal V_BATTERY, got=' + snap4b.V_total);
    }

    const snap4c = computePhysicsSnapshot('seri', 2, 2, 10);
    if (snap4c.bulbState !== 'normal') {
      throw new Error('assertCriticalScenarios test4c: seri 2b 2l 10W must be normal, got=' + snap4c.bulbState);
    }
    if (Math.abs(snap4c.I - 6.667) > 0.01) {
      throw new Error('assertCriticalScenarios test4c: seri 2b 2l 10W I expected=6.667 got=' + snap4c.I);
    }

    const savedCircuitType5  = sim.circuitType;
    const savedBatteryCount5 = sim.batteryCount;
    const savedBulbCount5    = sim.bulbCount;
    const savedBulbWatt5     = sim.bulbWatt;
    const savedVtotal5       = sim.V_total;
    const savedRtotal5       = sim.R_total;
    const savedI5            = sim.I;
    const savedIPeak5        = sim.I_peak;
    const savedPactual5      = sim.P_actual;
    const savedBulbState5    = sim.bulbState;
    const savedDimAlpha5     = sim.dimAlpha;
    const savedWasOverload5  = sim.wasOverload;
    const savedBlastActive5  = sim.blastActive;
    const savedBlastTime5    = sim.blastTime;

    sim.wasOverload       = false;
    sim.circuitType       = 'seri';
    sim.batteryCount      = 4;
    sim.bulbCount         = 1;
    sim.bulbWatt          = 5;
    sim.isSakelarTertutup = true;
    sim.isKabelPutus      = false;
    resetBulbs(1);
    runPhysics();
    if (sim.wasOverload !== true) {
      throw new Error(
        'assertCriticalScenarios test5: wasOverload must be true after overload transition' +
        ' | isSakelarTertutup=' + sim.isSakelarTertutup +
        ' | isKabelPutus=' + sim.isKabelPutus +
        ' | bulbs[0].isDetached=' + (bulbs[0] ? bulbs[0].isDetached : 'undefined') +
        ' | bulbs[0].isBurnt=' + (bulbs[0] ? bulbs[0].isBurnt : 'undefined') +
        ' | bulbs.length=' + bulbs.length +
        ' | bulbState=' + sim.bulbState +
        ' | I=' + sim.I
      );
    }
    if (sim.I !== 0) {
      throw new Error('assertCriticalScenarios test5: I must be 0 during overload, got=' + sim.I);
    }
    if (sim.I_peak <= 0) {
      throw new Error('assertCriticalScenarios test5: I_peak must be > 0 during overload, got=' + sim.I_peak);
    }

    sim.circuitType  = savedCircuitType5;
    sim.batteryCount = savedBatteryCount5;
    sim.bulbCount    = savedBulbCount5;
    sim.bulbWatt     = savedBulbWatt5;
    sim.V_total      = savedVtotal5;
    sim.R_total      = savedRtotal5;
    sim.I            = savedI5;
    sim.I_peak       = savedIPeak5;
    sim.P_actual     = savedPactual5;
    sim.bulbState    = savedBulbState5;
    sim.dimAlpha     = savedDimAlpha5;
    sim.wasOverload  = savedWasOverload5;
    sim.blastActive  = savedBlastActive5;
    sim.blastTime    = savedBlastTime5;

    const savedCircuitType6  = sim.circuitType;
    const savedBatteryCount6 = sim.batteryCount;
    const savedBulbCount6    = sim.bulbCount;
    const savedBulbWatt6     = sim.bulbWatt;
    const savedVtotal6       = sim.V_total;
    const savedRtotal6       = sim.R_total;
    const savedI6            = sim.I;
    const savedIPeak6        = sim.I_peak;
    const savedPactual6      = sim.P_actual;
    const savedBulbState6    = sim.bulbState;
    const savedDimAlpha6     = sim.dimAlpha;
    const savedWasOverload6  = sim.wasOverload;
    const savedBlastActive6  = sim.blastActive;
    const savedBlastTime6    = sim.blastTime;

    sim.wasOverload       = true;
    sim.blastActive       = true;
    sim.circuitType       = 'seri';
    sim.batteryCount      = 1;
    sim.bulbCount         = 1;
    sim.bulbWatt          = 10;
    sim.isSakelarTertutup = true;
    sim.isKabelPutus      = false;
    resetBulbs(1);
    runPhysics();
    if (sim.blastActive !== false) {
      throw new Error('assertCriticalScenarios test6: blastActive must be false after exiting overload');
    }
    if (sim.wasOverload !== false) {
      throw new Error('assertCriticalScenarios test6: wasOverload must be false after exiting overload');
    }
    if (sim.I_peak !== 0) {
      throw new Error('assertCriticalScenarios test6: I_peak must be reset to 0 after exiting overload, got=' + sim.I_peak);
    }

    sim.circuitType  = savedCircuitType6;
    sim.batteryCount = savedBatteryCount6;
    sim.bulbCount    = savedBulbCount6;
    sim.bulbWatt     = savedBulbWatt6;
    sim.V_total      = savedVtotal6;
    sim.R_total      = savedRtotal6;
    sim.I            = savedI6;
    sim.I_peak       = savedIPeak6;
    sim.P_actual     = savedPactual6;
    sim.bulbState    = savedBulbState6;
    sim.dimAlpha     = savedDimAlpha6;
    sim.wasOverload  = savedWasOverload6;
    sim.blastActive  = savedBlastActive6;
    sim.blastTime    = savedBlastTime6;
  }

  function assertBatteryLifeCalc() {
    const EPS = 1;

    const snap1 = computePhysicsSnapshot('seri', 1, 1, 10);
    const totalCapacity1 = BATTERY_CAPACITY_MAH * 1;
    const totalCurrentMa1 = snap1.I * 1000;
    const expectedMinutes1 = Math.round(totalCapacity1 / totalCurrentMa1 * 60);
    if (expectedMinutes1 <= 0) {
      throw new Error('assertBatteryLifeCalc: battery life must be > 0 for normal circuit, got=' + expectedMinutes1);
    }

    const snap2 = computePhysicsSnapshot('seri', 2, 1, 10);
    const totalCapacity2 = BATTERY_CAPACITY_MAH * 2;
    const totalCurrentMa2 = snap2.I * 1000;
    const expectedMinutes2 = Math.round(totalCapacity2 / totalCurrentMa2 * 60);
    if (expectedMinutes2 <= 0) {
      throw new Error('assertBatteryLifeCalc: battery life must be > 0 for 2-battery circuit, got=' + expectedMinutes2);
    }

    const snap3 = computePhysicsSnapshot('seri', 4, 1, 5);
    if (snap3.bulbState === 'overload') {
      if (snap3.I !== 0) {
        throw new Error('assertBatteryLifeCalc: overload I must be 0, got=' + snap3.I);
      }
    }

    const snap4 = computePhysicsSnapshot('seri', 1, 4, 10);
    const totalCapacity4 = BATTERY_CAPACITY_MAH * 1;
    const totalCurrentMa4 = snap4.I * 1000;
    const expectedMinutes4 = Math.round(totalCapacity4 / totalCurrentMa4 * 60);
    const snap1minutes = Math.round((BATTERY_CAPACITY_MAH * 1) / (snap1.I * 1000) * 60);
    if (expectedMinutes4 <= snap1minutes) {
      throw new Error(
        'assertBatteryLifeCalc: more bulbs in series = lower I = longer battery life, ' +
        '4-bulb=' + expectedMinutes4 + ' 1-bulb=' + snap1minutes
      );
    }
  }

  function assertParallelIPerBulb() {
    const EPS = 0.0001;

    const bulbCounts = [1, 2, 3, 4];
    for (const bulbs of bulbCounts) {
      const snap = computePhysicsSnapshot('paralel', 1, bulbs, 10);
      const iPerBulb = bulbs > 0 ? snap.I / bulbs : 0;

      const expectedIPerBulb = V_BATTERY / ((V_BATTERY * V_BATTERY) / 10);
      if (Math.abs(iPerBulb - expectedIPerBulb) > EPS) {
        throw new Error(
          'assertParallelIPerBulb: I per bulb must equal V_BATTERY/R_bulb for all bulb counts, ' +
          'bulbs=' + bulbs + ' expected=' + expectedIPerBulb + ' got=' + iPerBulb
        );
      }

      if (Math.abs(snap.P_actual - 10.0) > 0.001) {
        throw new Error(
          'assertParallelIPerBulb: P_actual must equal P_nominal for all bulb counts in paralel, ' +
          'bulbs=' + bulbs + ' expected=10 got=' + snap.P_actual
        );
      }
    }
  }

  function assertSeriesInvariant() {
    const EPS = 0.001;

    const snap1 = computePhysicsSnapshot('seri', 1, 1, 10);
    const snap2 = computePhysicsSnapshot('seri', 2, 2, 10);
    const snap3 = computePhysicsSnapshot('seri', 3, 3, 10);
    const snap4 = computePhysicsSnapshot('seri', 4, 4, 10);

    if (snap1.bulbState !== 'normal') {
      throw new Error('assertSeriesInvariant: seri 1b1l 10W must be normal, got=' + snap1.bulbState);
    }
    if (snap2.bulbState !== 'normal') {
      throw new Error('assertSeriesInvariant: seri 2b2l 10W must be normal, got=' + snap2.bulbState);
    }
    if (snap3.bulbState !== 'normal') {
      throw new Error('assertSeriesInvariant: seri 3b3l 10W must be normal, got=' + snap3.bulbState);
    }
    if (snap4.bulbState !== 'normal') {
      throw new Error('assertSeriesInvariant: seri 4b4l 10W must be normal, got=' + snap4.bulbState);
    }

    if (Math.abs(snap1.I - snap2.I) > EPS) {
      throw new Error('assertSeriesInvariant: seri nB nL 10W must yield same I, 1b1l=' + snap1.I + ' 2b2l=' + snap2.I);
    }
    if (Math.abs(snap2.I - snap3.I) > EPS) {
      throw new Error('assertSeriesInvariant: seri nB nL 10W must yield same I, 2b2l=' + snap2.I + ' 3b3l=' + snap3.I);
    }
    if (Math.abs(snap3.I - snap4.I) > EPS) {
      throw new Error('assertSeriesInvariant: seri nB nL 10W must yield same I, 3b3l=' + snap3.I + ' 4b4l=' + snap4.I);
    }

    if (Math.abs(snap1.P_actual - snap2.P_actual) > EPS) {
      throw new Error('assertSeriesInvariant: seri nB nL 10W must yield same P_actual, 1b1l=' + snap1.P_actual + ' 2b2l=' + snap2.P_actual);
    }

    const snapMoreBulbs = computePhysicsSnapshot('seri', 1, 2, 10);
    if (snapMoreBulbs.I >= snap1.I) {
      throw new Error('assertSeriesInvariant: more bulbs in series must reduce I, 1l=' + snap1.I + ' 2l=' + snapMoreBulbs.I);
    }

    const snap1b = computePhysicsSnapshot('seri', 1, 1, 25);
    const snap2b = computePhysicsSnapshot('seri', 1, 2, 25);
    if (snap1b.bulbState === 'normal' && snap2b.bulbState !== 'overload') {
      if (snap2b.I >= snap1b.I) {
        throw new Error('assertSeriesInvariant: more bulbs in series (25W) must reduce I, 1l=' + snap1b.I + ' 2l=' + snap2b.I);
      }
    }
  }

  function snapshotSim() {
    return {
      circuitType        : sim.circuitType,
      batteryCount       : sim.batteryCount,
      bulbCount          : sim.bulbCount,
      bulbWatt           : sim.bulbWatt,
      V_total            : sim.V_total,
      R_total            : sim.R_total,
      I                  : sim.I,
      I_peak             : sim.I_peak,
      P_actual           : sim.P_actual,
      bulbState          : sim.bulbState,
      dimAlpha           : sim.dimAlpha,
      wasOverload        : sim.wasOverload,
      blastTime          : sim.blastTime,
      blastActive        : sim.blastActive,
      isSakelarTertutup  : sim.isSakelarTertutup,
      isKabelPutus       : sim.isKabelPutus,
      activeR_total      : sim.activeR_total,
      arusPerLampu       : sim.arusPerLampu,
      hitBoxRadius       : sim.hitBoxRadius,
    };
  }

  function restoreSim(snapshot) {
    sim.circuitType        = snapshot.circuitType;
    sim.batteryCount       = snapshot.batteryCount;
    sim.bulbCount          = snapshot.bulbCount;
    sim.bulbWatt           = snapshot.bulbWatt;
    sim.V_total            = snapshot.V_total;
    sim.R_total            = snapshot.R_total;
    sim.I                  = snapshot.I;
    sim.I_peak             = snapshot.I_peak;
    sim.P_actual           = snapshot.P_actual;
    sim.bulbState          = snapshot.bulbState;
    sim.dimAlpha           = snapshot.dimAlpha;
    sim.wasOverload        = snapshot.wasOverload;
    sim.blastTime          = snapshot.blastTime;
    sim.blastActive        = snapshot.blastActive;
    sim.isSakelarTertutup  = snapshot.isSakelarTertutup;
    sim.isKabelPutus       = snapshot.isKabelPutus;
    sim.activeR_total      = snapshot.activeR_total;
    sim.arusPerLampu       = snapshot.arusPerLampu;
    sim.hitBoxRadius       = snapshot.hitBoxRadius;
    if (!snapshot.blastActive) {
      blasts.length = 0;
    }
    updateDisplay();
  }

  function assertSakelarForcesZeroCurrent() {
    const circuitTypes  = ['seri', 'paralel'];
    const batteryCounts = [1, 2, 3, 4];
    const bulbCounts    = [1, 2, 3, 4];
    const wattOptions   = [5, 10, 25];

    for (const type of circuitTypes) {
      for (const batteries of batteryCounts) {
        for (const bulbs of bulbCounts) {
          for (const watt of wattOptions) {
            sim.circuitType       = type;
            sim.batteryCount      = batteries;
            sim.bulbCount         = bulbs;
            sim.bulbWatt          = watt;
            sim.isSakelarTertutup = false;
            sim.wasOverload       = false;
            sim.blastActive       = false;

            runPhysics();

            if (sim.I !== 0) {
              throw new Error(
                'assertSakelarForcesZeroCurrent: I must be 0 when sakelar OFF, got=' + sim.I +
                ' (type=' + type + ' batteries=' + batteries + ' bulbs=' + bulbs + ' watt=' + watt + ')'
              );
            }
          }
        }
      }
    }
  }

  function assertSakelarDimState() {
    const circuitTypes  = ['seri', 'paralel'];
    const batteryCounts = [1, 2, 3, 4];
    const bulbCounts    = [1, 2, 3, 4];
    const wattOptions   = [5, 10, 25];

    for (const type of circuitTypes) {
      for (const batteries of batteryCounts) {
        for (const bulbs of bulbCounts) {
          for (const watt of wattOptions) {
            sim.circuitType       = type;
            sim.batteryCount      = batteries;
            sim.bulbCount         = bulbs;
            sim.bulbWatt          = watt;
            sim.isSakelarTertutup = false;
            sim.wasOverload       = false;
            sim.blastActive       = false;

            runPhysics();

            if (sim.bulbState !== 'dim') {
              throw new Error(
                'assertSakelarDimState: bulbState must be dim when sakelar OFF, got=' + sim.bulbState +
                ' (type=' + type + ' batteries=' + batteries + ' bulbs=' + bulbs + ' watt=' + watt + ')'
              );
            }

            if (sim.dimAlpha !== 0.25) {
              throw new Error(
                'assertSakelarDimState: dimAlpha must be 0.25 when sakelar OFF, got=' + sim.dimAlpha +
                ' (type=' + type + ' batteries=' + batteries + ' bulbs=' + bulbs + ' watt=' + watt + ')'
              );
            }
          }
        }
      }
    }
  }

  function assertSeriesDetachedForcesZeroCurrent() {
    const batteryCounts = [1, 2, 3, 4];
    const bulbCounts    = [1, 2, 3, 4];
    const wattOptions   = [5, 10, 25];

    for (const batteries of batteryCounts) {
      for (const bulbCount of bulbCounts) {
        for (const watt of wattOptions) {
          sim.circuitType       = 'seri';
          sim.batteryCount      = batteries;
          sim.bulbCount         = bulbCount;
          sim.bulbWatt          = watt;
          sim.isSakelarTertutup = true;
          sim.isKabelPutus      = false;
          sim.wasOverload       = false;
          sim.blastActive       = false;
          resetBulbs(bulbCount);
          bulbs[0].isDetached = true;

          runPhysics();

          if (sim.I !== 0) {
            throw new Error(
              'assertSeriesDetachedForcesZeroCurrent: I must be 0 when bulb detached in seri, got=' + sim.I +
              ' batteries=' + batteries + ' bulbs=' + bulbCount + ' watt=' + watt
            );
          }
          resetBulbs(bulbCount);
        }
      }
    }
  }

  function assertParallelDetachedReducesR() {
    const wattOptions = [5, 10, 25];

    for (const watt of wattOptions) {
      for (let bulbCount = 2; bulbCount <= 4; bulbCount++) {
        sim.circuitType       = 'paralel';
        sim.batteryCount      = 1;
        sim.bulbCount         = bulbCount;
        sim.bulbWatt          = watt;
        sim.isSakelarTertutup = true;
        sim.isKabelPutus      = false;
        sim.wasOverload       = false;
        sim.blastActive       = false;
        resetBulbs(bulbCount);
        bulbs[0].isDetached = true;

        runPhysics();

        if (sim.I <= 0) {
          throw new Error(
            'assertParallelDetachedReducesR: I must be > 0 when one bulb detached in paralel with remaining active, got=' + sim.I +
            ' bulbs=' + bulbCount + ' watt=' + watt
          );
        }

        const R_bulb    = (V_BATTERY * V_BATTERY) / watt;
        const expectedR = R_bulb / (bulbCount - 1);
        const EPS       = 0.0001;
        if (Math.abs(sim.R_total - expectedR) > EPS) {
          throw new Error(
            'assertParallelDetachedReducesR: R_total must equal R_bulb/(bulbCount-1), expected=' + expectedR + ' got=' + sim.R_total +
            ' bulbs=' + bulbCount + ' watt=' + watt
          );
        }
        resetBulbs(bulbCount);
      }
    }
  }

  function assertKabelPutusZeroCurrent() {
    const circuitTypes  = ['seri', 'paralel'];
    const batteryCounts = [1, 2, 3, 4];
    const bulbCounts    = [1, 2, 3, 4];
    const wattOptions   = [5, 10, 25];

    for (const type of circuitTypes) {
      for (const batteries of batteryCounts) {
        for (const bulbCount of bulbCounts) {
          for (const watt of wattOptions) {
            sim.circuitType       = type;
            sim.batteryCount      = batteries;
            sim.bulbCount         = bulbCount;
            sim.bulbWatt          = watt;
            sim.isSakelarTertutup = true;
            sim.isKabelPutus      = true;
            sim.wasOverload       = false;
            sim.blastActive       = false;
            resetBulbs(bulbCount);

            runPhysics();

            if (sim.I !== 0) {
              throw new Error(
                'assertKabelPutusZeroCurrent: I must be 0 when isKabelPutus=true, got=' + sim.I +
                ' type=' + type + ' batteries=' + batteries + ' bulbs=' + bulbCount + ' watt=' + watt
              );
            }
            if (sim.blastActive !== false) {
              throw new Error(
                'assertKabelPutusZeroCurrent: blastActive must not change when isKabelPutus=true'
              );
            }
          }
        }
      }
    }
    sim.isKabelPutus = false;
  }

  function runSelfTests() {
    const savedSim = snapshotSim();

    try {
      assertCriticalScenarios();
      assertSimMonomorphic();
      assertGeometry();
      assertParticleSystemMonomorphic();
      assertBulbStateClassification();
      assertRenderLayerOrder();

      assertSakelarForcesZeroCurrent();
      assertSakelarDimState();

      assertSeriesDetachedForcesZeroCurrent();
      assertParallelDetachedReducesR();
      assertKabelPutusZeroCurrent();

      const batteryOptions = [1, 2, 3, 4];
      const bulbOptions    = [1, 2, 3, 4];
      const wattOptions    = [5, 10, 25];
      const typeOptions    = ['seri', 'paralel'];

      for (const watt of wattOptions) {
        assertRbulbPositive(watt);
      }

      for (const batteries of batteryOptions) {
        for (const bulbs of bulbOptions) {
          for (const watt of wattOptions) {
            for (const type of typeOptions) {
              const result = computePhysicsSnapshot(type, batteries, bulbs, watt);
              if (type === 'seri') {
                assertSeriesCircuitLaw(result);
              }
              if (type === 'paralel') {
                assertParallelCircuitLaw(result);
              }
              assertOhmLaw(result);
              assertPowerLaw(result);
              assertBulbStateExclusive(result);
              assertOverloadBreaksCurrent(result);
              assertDimAlphaRange(result);
              if (result.I > 0) {
                assertElectronSpeedProportional(result.I);
              }
            }
          }
        }
      }

      assertElectronStillWhenZeroCurrent();

      const currentSamples = [0.5, 1.0, 2.0, 5.0, 10.0];
      for (const current of currentSamples) {
        assertElectronSpeedProportional(current);
      }

      assertBlastTriggeredOncePerTransition();
      assertBatteryLifeCalc();
      assertParallelIPerBulb();
      assertSeriesInvariant();

      assertSimMonomorphic();
    } finally {
      restoreSim(savedSim);
    }
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

    if (IS_DEVELOPMENT) {
      try {
        runSelfTests();
      } catch (testError) {
        const errorBanner = document.createElement('div');
        errorBanner.textContent = 'Self-test gagal: ' + testError.message;
        errorBanner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#ff5252;color:#fff;padding:0.5rem 1rem;font-size:0.75rem;z-index:9999;';
        document.body.appendChild(errorBanner);
      }
    }

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

  window.__TEST_EXPORTS__ = {
    sim,
    updateDisplay,
    runPhysics,
    elVoltage,
    elResistance,
    elPower,
    elCurrent,
    elStatus,
    elLabelCurrent,
    elCurrentPerBulb,
    elItemCurrentPerBulb,
    elCurrentPeak,
    elItemCurrentPeak,
  };

})();
