# Bugfix Requirements Document

## Introduction

The "Arus Sebelum Putus" (Current Before Break) display item incorrectly persists when the circuit transitions from overload state to non-overload state. This display should only be visible during overload conditions when peak current has been captured. The root cause is a violation of separation of concerns: the `updateDisplay()` function at line 282 in `js/sirkuit.js` is modifying simulation state (`sim.I_peak = 0`) instead of only reading it. This causes timing issues where the display state becomes inconsistent with the actual simulation state.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the circuit transitions from overload state to non-overload state THEN the "Arus Sebelum Putus" display item sometimes remains visible with stale peak current value

1.2 WHEN `sim.bulbState !== 'overload'` THEN the system sets `sim.I_peak = 0` inside the display function, violating separation of concerns

1.3 WHEN the display function modifies simulation state THEN timing inconsistencies occur between state updates and display rendering

### Expected Behavior (Correct)

2.1 WHEN `sim.bulbState !== 'overload'` THEN the system SHALL hide the "Arus Sebelum Putus" display item (`elItemCurrentPeak.hidden = true`) without modifying simulation state

2.2 WHEN the circuit transitions from overload to non-overload state THEN the system SHALL reset `sim.I_peak = 0` exclusively within the `runPhysics()` function at line 245

2.3 WHEN `sim.bulbState === 'overload'` AND `sim.I_peak > 0` THEN the system SHALL display "Arus Sebelum Putus" with the correct peak current value

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the circuit is in overload state with valid peak current THEN the system SHALL CONTINUE TO display "Arus Sebelum Putus" with the correct value

3.2 WHEN `runPhysics()` detects transition from overload to non-overload THEN the system SHALL CONTINUE TO reset `sim.I_peak = 0` at line 245

3.3 WHEN the display function renders other circuit parameters (voltage, resistance, power, current) THEN the system SHALL CONTINUE TO display them correctly without modification

3.4 WHEN mouse clicks, keyboard inputs, and UI interactions occur THEN the system SHALL CONTINUE TO function exactly as before
