const fs = require('fs');
const path = require('path');

console.log('=== TASK 4: CHECKPOINT - ENSURE ALL TESTS PASS ===\n');
console.log('Running comprehensive test suite...\n');

const sirkuitPath = path.join(__dirname, 'js', 'sirkuit.js');
const sirkuitCode = fs.readFileSync(sirkuitPath, 'utf8');

function createMockDOM() {
  const elements = {};
  const createElement = (tag) => ({
    tagName: tag,
    textContent: '',
    hidden: false,
    classList: {
      classes: [],
      add(cls) { this.classes.push(cls); },
      contains(cls) { return this.classes.includes(cls); }
    },
    className: '',
    appendChild() {},
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    removeEventListener() {},
    value: '',
    checked: false
  });

  const elementIds = [
    'circuitCanvas', 'overloadBanner', 'displayVoltage', 'displayResistance',
    'displayCurrent', 'displayPower', 'displayStatus', 'labelCurrent',
    'displayCurrentPerBulb', 'itemCurrentPerBulb', 'displayBatteryLife',
    'displayCurrentPeak', 'itemCurrentPeak', 'batteryCount', 'batteryCountDisplay',
    'bulbCount', 'bulbCountDisplay', 'typeSeri', 'btnReset'
  ];

  elementIds.forEach(id => {
    elements[id] = createElement('div');
  });

  elements.circuitCanvas.getContext = () => ({
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    fillText() {},
    measureText() { return { width: 0 }; },
    setTransform() {},
    resetTransform() {},
    drawImage() {},
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over'
  });
  
  elements.circuitCanvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0
  });
  
  elements.circuitCanvas.width = 800;
  elements.circuitCanvas.height = 600;

  return {
    getElementById(id) { return elements[id]; },
    querySelector(sel) { return elements[Object.keys(elements)[0]]; },
    querySelectorAll() { return []; },
    createElement,
    body: createElement('body'),
    addEventListener() {}
  };
}

function createMockWindow() {
  const doc = createMockDOM();
  return {
    document: doc,
    requestAnimationFrame(cb) { return setTimeout(cb, 16); },
    cancelAnimationFrame(id) { clearTimeout(id); },
    addEventListener() {},
    innerWidth: 1024,
    innerHeight: 768
  };
}

const mockWindow = createMockWindow();
const mockDocument = mockWindow.document;

const wrappedCode = `
(function(window, document) {
  const requestAnimationFrame = window.requestAnimationFrame;
  const cancelAnimationFrame = window.cancelAnimationFrame;
  
  ${sirkuitCode}
  
  if (typeof window.__TEST_EXPORTS__ === 'undefined') {
    window.__TEST_EXPORTS__ = {
      sim: typeof sim !== 'undefined' ? sim : {},
      updateDisplay: typeof updateDisplay !== 'undefined' ? updateDisplay : function() {},
      runPhysics: typeof runPhysics !== 'undefined' ? runPhysics : function() {},
      elItemCurrentPeak: document.getElementById('itemCurrentPeak'),
      elCurrentPeak: document.getElementById('displayCurrentPeak'),
      elVoltage: document.getElementById('displayVoltage'),
      elResistance: document.getElementById('displayResistance'),
      elPower: document.getElementById('displayPower'),
      elCurrent: document.getElementById('displayCurrent'),
      elStatus: document.getElementById('displayStatus'),
      elItemCurrentPerBulb: document.getElementById('itemCurrentPerBulb'),
      elCurrentPerBulb: document.getElementById('displayCurrentPerBulb'),
      elLabelCurrent: document.getElementById('labelCurrent')
    };
  }
  
  return window.__TEST_EXPORTS__;
})(mockWindow, mockDocument);
`;

let testExports;
try {
  testExports = eval(wrappedCode);
} catch (e) {
  console.log('ERROR: Failed to load sirkuit.js');
  console.log(e.message);
  process.exit(1);
}

console.log('✓ sirkuit.js loaded successfully\n');

function testBugCondition() {
  console.log('=== TEST 1: Bug Condition - Display Function Purity ===\n');
  console.log('Testing that updateDisplay() does NOT mutate sim.I_peak when sim.bulbState !== "overload"\n');

  const { sim, updateDisplay } = testExports;
  const numTests = 100;
  let passCount = 0;

  for (let i = 0; i < numTests; i++) {
    const bulbStates = ['normal', 'dim'];
    sim.bulbState = bulbStates[Math.floor(Math.random() * bulbStates.length)];
    sim.I_peak = Math.random() * 2 + 0.5;
    
    const I_peak_before = sim.I_peak;
    
    try {
      updateDisplay();
    } catch (e) {
      continue;
    }
    
    const I_peak_after = sim.I_peak;
    
    if (I_peak_before === I_peak_after) {
      passCount++;
    }
  }

  const passed = passCount === numTests;
  console.log(`Result: ${passCount}/${numTests} tests passed`);
  
  if (passed) {
    console.log('✓ PASS: updateDisplay() does not mutate sim.I_peak\n');
  } else {
    console.log('✗ FAIL: updateDisplay() mutates sim.I_peak\n');
  }
  
  return passed;
}

function testPreservation() {
  console.log('=== TEST 2: Preservation - Display Rendering ===\n');
  console.log('Testing that display functions work correctly across all states\n');

  const { sim, updateDisplay, elVoltage, elResistance, elPower, elCurrent } = testExports;
  const numTests = 50;
  let passCount = 0;

  for (let i = 0; i < numTests; i++) {
    sim.V_total = Math.random() * 12 + 1.5;
    sim.R_total = Math.random() * 5 + 0.1;
    sim.I = sim.V_total / sim.R_total;
    sim.P_actual = Math.random() * 25 + 5;
    sim.bulbState = ['normal', 'dim', 'overload'][Math.floor(Math.random() * 3)];
    
    try {
      updateDisplay();
      
      const voltageOk = elVoltage.textContent.includes(sim.V_total.toFixed(2));
      const resistanceOk = elResistance.textContent.includes(sim.R_total.toFixed(2));
      const powerOk = elPower.textContent.includes(sim.P_actual.toFixed(2));
      const currentOk = elCurrent.textContent.includes(sim.I.toFixed(3));
      
      if (voltageOk && resistanceOk && powerOk && currentOk) {
        passCount++;
      }
    } catch (e) {
      continue;
    }
  }

  const passed = passCount === numTests;
  console.log(`Result: ${passCount}/${numTests} tests passed`);
  
  if (passed) {
    console.log('✓ PASS: Display rendering works correctly\n');
  } else {
    console.log('✗ FAIL: Display rendering has issues\n');
  }
  
  return passed;
}

function testOverloadDisplay() {
  console.log('=== TEST 3: Overload Display ===\n');
  console.log('Testing that "Arus Sebelum Putus" displays correctly during overload\n');

  const { sim, updateDisplay, elItemCurrentPeak, elCurrentPeak } = testExports;
  const numTests = 30;
  let passCount = 0;

  for (let i = 0; i < numTests; i++) {
    sim.bulbState = 'overload';
    sim.I_peak = Math.random() * 2 + 0.5;
    
    try {
      updateDisplay();
      
      const isVisible = !elItemCurrentPeak.hidden;
      const hasCorrectText = elCurrentPeak.textContent.includes(sim.I_peak.toFixed(3));
      
      if (isVisible && hasCorrectText) {
        passCount++;
      }
    } catch (e) {
      continue;
    }
  }

  const passed = passCount === numTests;
  console.log(`Result: ${passCount}/${numTests} tests passed`);
  
  if (passed) {
    console.log('✓ PASS: Overload display works correctly\n');
  } else {
    console.log('✗ FAIL: Overload display has issues\n');
  }
  
  return passed;
}

function testStateReset() {
  console.log('=== TEST 4: State Reset in runPhysics() ===\n');
  console.log('Testing that runPhysics() resets sim.I_peak on overload-to-normal transition\n');

  const { sim, runPhysics } = testExports;
  const numTests = 30;
  let passCount = 0;

  for (let i = 0; i < numTests; i++) {
    sim.wasOverload = true;
    sim.I_peak = Math.random() * 2 + 0.5;
    sim.batteryCount = 1;
    sim.bulbCount = 1;
    sim.bulbWatt = 10;
    sim.circuitType = 'seri';
    
    try {
      runPhysics();
      
      if (sim.bulbState !== 'overload' && sim.I_peak === 0) {
        passCount++;
      }
    } catch (e) {
      continue;
    }
  }

  const passed = passCount === numTests;
  console.log(`Result: ${passCount}/${numTests} tests passed`);
  
  if (passed) {
    console.log('✓ PASS: runPhysics() correctly resets sim.I_peak\n');
  } else {
    console.log('✗ FAIL: runPhysics() does not reset sim.I_peak correctly\n');
  }
  
  return passed;
}

const results = [];
results.push(testBugCondition());
results.push(testPreservation());
results.push(testOverloadDisplay());
results.push(testStateReset());

console.log('=== FINAL SUMMARY ===\n');

const allPassed = results.every(r => r === true);
const passedCount = results.filter(r => r === true).length;
const totalCount = results.length;

console.log(`Tests Passed: ${passedCount}/${totalCount}`);
console.log('');

if (allPassed) {
  console.log('✓✓✓ ALL TESTS PASSED ✓✓✓');
  console.log('');
  console.log('The bugfix has been successfully implemented:');
  console.log('1. Bug condition test passes - updateDisplay() no longer mutates state');
  console.log('2. Preservation tests pass - all existing functionality preserved');
  console.log('3. Overload display works correctly');
  console.log('4. State reset in runPhysics() works correctly');
  console.log('');
  console.log('Task 4 CHECKPOINT: SUCCESS');
  process.exit(0);
} else {
  console.log('✗✗✗ SOME TESTS FAILED ✗✗✗');
  console.log('');
  console.log('Please review the failed tests above.');
  console.log('');
  console.log('Task 4 CHECKPOINT: FAILED');
  process.exit(1);
}
