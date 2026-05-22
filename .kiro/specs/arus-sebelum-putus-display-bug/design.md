# Arus Sebelum Putus Display Bug - Bugfix Design

## Overview

This bugfix addresses a separation of concerns violation where the display rendering function (`updateDisplay()`) incorrectly modifies simulation state (`sim.I_peak = 0`). This causes the "Arus Sebelum Putus" (Current Before Break) display item to persist incorrectly when transitioning from overload to non-overload state. The fix moves state mutation exclusively to the physics engine (`runPhysics()`), ensuring the display function remains a pure read-only operation.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `updateDisplay()` executes with `sim.bulbState !== 'overload'` and modifies `sim.I_peak = 0`, violating separation of concerns
- **Property (P)**: The desired behavior - display functions should only read state, never mutate it; state mutations belong exclusively in the physics engine
- **Preservation**: All existing display rendering, physics calculations, and UI interactions must remain unchanged
- **updateDisplay()**: The function at line 257 in `js/sirkuit.js` that renders circuit parameters to the DOM
- **runPhysics()**: The function at line 179 in `js/sirkuit.js` that calculates circuit physics and manages simulation state
- **sim.I_peak**: The property that stores peak current value before circuit break during overload
- **sim.bulbState**: The property that determines circuit state ('normal', 'dim', 'overload')

## Bug Details

### Bug Condition

The bug manifests when the `updateDisplay()` function executes during a frame where `sim.bulbState !== 'overload'`. At line 282, the function incorrectly sets `sim.I_peak = 0`, violating the principle that display functions should only read state, not mutate it. This creates a race condition where the display state becomes inconsistent with the simulation state, causing the "Arus Sebelum Putus" display item to persist with stale values.

**Formal Specification:**
```
FUNCTION isBugCondition(frameState)
  INPUT: frameState of type SimulationFrame
  OUTPUT: boolean
  
  RETURN frameState.executingFunction = 'updateDisplay'
         AND frameState.sim.bulbState !== 'overload'
         AND frameState.codeAtLine282Executes = true
         AND frameState.mutatesSimIPeak = true
END FUNCTION
```

### Examples

- **Example 1**: Circuit transitions from overload to normal state. `runPhysics()` correctly resets `sim.I_peak = 0` at line 245. Later in the same frame, `updateDisplay()` executes and redundantly sets `sim.I_peak = 0` again at line 282, violating separation of concerns.

- **Example 2**: Circuit is in normal state. `updateDisplay()` executes and sets `sim.I_peak = 0` at line 282, even though this state mutation should only occur in `runPhysics()`.

- **Example 3**: Circuit is in overload state with `sim.I_peak = 1.5`. Display correctly shows "Arus Sebelum Putus: 1.500 A (rangkaian terbuka)". When circuit transitions to normal state, the display item should hide immediately, but timing issues cause it to persist for one frame.

- **Edge Case**: Rapid toggling between overload and non-overload states causes display flickering because state mutations occur in both `runPhysics()` and `updateDisplay()`, creating inconsistent timing.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Display rendering of voltage, resistance, power, and current must continue to work exactly as before
- Physics calculations in `runPhysics()` must remain unchanged
- Overload detection and banner display must continue to function correctly
- Peak current capture during overload must continue to work
- State reset at line 245 in `runPhysics()` must continue to execute

**Scope:**
All simulation state mutations should occur exclusively in `runPhysics()`. The `updateDisplay()` function should be a pure read-only operation that renders state to the DOM without any side effects. This includes:
- No modification of `sim.I_peak` in `updateDisplay()`
- No modification of any other `sim.*` properties in `updateDisplay()`
- All display logic remains conditional on state, but never mutates state

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Separation of Concerns Violation**: The `updateDisplay()` function at line 282 incorrectly mutates simulation state (`sim.I_peak = 0`) instead of only reading it. Display functions should be pure read-only operations.

2. **Redundant State Mutation**: The state reset `sim.I_peak = 0` already occurs correctly in `runPhysics()` at line 245 when transitioning from overload to non-overload. The duplicate mutation in `updateDisplay()` creates timing inconsistencies.

3. **Race Condition**: Because state mutation occurs in two places (`runPhysics()` and `updateDisplay()`), the order of execution matters. If `updateDisplay()` executes before `runPhysics()` completes its state transition, the display can show stale values.

4. **Architectural Misplacement**: State management logic is leaking into the presentation layer. The correct architecture is: `runPhysics()` manages state, `updateDisplay()` reads state and renders it.

## Correctness Properties

Property 1: Bug Condition - Display Function Purity

_For any_ frame where `updateDisplay()` executes with `sim.bulbState !== 'overload'`, the function SHALL hide the "Arus Sebelum Putus" display item (`elItemCurrentPeak.hidden = true`) without modifying `sim.I_peak` or any other simulation state properties.

**Validates: Requirements 2.1**

Property 2: Preservation - State Mutation Exclusivity

_For any_ frame where the circuit transitions from overload to non-overload state, the state reset `sim.I_peak = 0` SHALL occur exclusively in `runPhysics()` at line 245, and all other display rendering, physics calculations, and UI interactions SHALL produce exactly the same behavior as the original code.

**Validates: Requirements 2.2, 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `js/sirkuit.js`

**Function**: `updateDisplay()`

**Specific Changes**:
1. **Remove State Mutation**: Delete line 282 that sets `sim.I_peak = 0`
   - This line violates separation of concerns
   - State reset already occurs correctly in `runPhysics()` at line 245

2. **Simplify Display Logic**: Modify the conditional block starting at line 277
   - Keep the condition `if (sim.bulbState === 'overload')`
   - Keep the nested check `if (sim.I_peak > 0)` to show the display item
   - Keep the `else` branch to hide the display item
   - Remove the outer `else` branch that mutates state

3. **Preserve Read-Only Nature**: Ensure `updateDisplay()` only reads `sim.*` properties
   - No assignments to `sim.I_peak`
   - No assignments to any other `sim.*` properties
   - Only DOM updates (`textContent`, `hidden`, `className`)

4. **Verify State Management**: Confirm `runPhysics()` handles all state transitions
   - Line 245 correctly resets `sim.I_peak = 0` on overload-to-normal transition
   - No additional state management needed

5. **Test Display Hiding**: Verify display item hides correctly
   - When `sim.bulbState !== 'overload'`, `elItemCurrentPeak.hidden = true`
   - When `sim.bulbState === 'overload'` but `sim.I_peak === 0`, `elItemCurrentPeak.hidden = true`
   - When `sim.bulbState === 'overload'` and `sim.I_peak > 0`, `elItemCurrentPeak.hidden = false`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate circuit state transitions and verify that `updateDisplay()` does not mutate `sim.I_peak`. Run these tests on the UNFIXED code to observe the separation of concerns violation.

**Test Cases**:
1. **State Mutation Detection Test**: Monitor `sim.I_peak` before and after `updateDisplay()` executes with `sim.bulbState !== 'overload'` (will fail on unfixed code - detects mutation)
2. **Display Persistence Test**: Transition from overload to normal state and verify display item hides immediately (may fail on unfixed code - detects timing issue)
3. **Redundant Mutation Test**: Verify `sim.I_peak = 0` occurs only once per frame in `runPhysics()`, not twice (will fail on unfixed code - detects redundancy)
4. **Rapid Toggle Test**: Rapidly toggle between overload and normal states and verify display updates consistently (may fail on unfixed code - detects race condition)

**Expected Counterexamples**:
- `sim.I_peak` changes from non-zero to zero inside `updateDisplay()` when `sim.bulbState !== 'overload'`
- Possible causes: line 282 executes `sim.I_peak = 0`, violating separation of concerns

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL frameState WHERE isBugCondition(frameState) DO
  sim_before := COPY(sim)
  result := updateDisplay_fixed()
  ASSERT sim.I_peak = sim_before.I_peak
  ASSERT elItemCurrentPeak.hidden = true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL frameState WHERE NOT isBugCondition(frameState) DO
  display_before := CAPTURE_DOM_STATE()
  updateDisplay_fixed()
  display_after := CAPTURE_DOM_STATE()
  ASSERT display_after MATCHES display_before FOR ALL ELEMENTS
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for various circuit states (normal, dim, overload, series, parallel), then write property-based tests capturing that display rendering behavior.

**Test Cases**:
1. **Overload Display Preservation**: Observe that "Arus Sebelum Putus" displays correctly during overload on unfixed code, then verify this continues after fix
2. **Normal Display Preservation**: Observe that voltage, resistance, power, current display correctly in normal state on unfixed code, then verify this continues after fix
3. **Parallel Current Display Preservation**: Observe that "Arus per Lampu" displays correctly in parallel mode on unfixed code, then verify this continues after fix
4. **Status Display Preservation**: Observe that status text and styling update correctly on unfixed code, then verify this continues after fix

### Unit Tests

- Test that `updateDisplay()` does not mutate `sim.I_peak` when `sim.bulbState !== 'overload'`
- Test that display item hides when `sim.bulbState !== 'overload'`
- Test that display item shows when `sim.bulbState === 'overload'` and `sim.I_peak > 0`
- Test that display item hides when `sim.bulbState === 'overload'` but `sim.I_peak === 0`

### Property-Based Tests

- Generate random circuit states and verify `updateDisplay()` never mutates simulation state
- Generate random state transitions and verify display updates consistently
- Test that all display elements render correctly across many circuit configurations

### Integration Tests

- Test full circuit flow from normal to overload to normal state
- Test rapid toggling between states and verify display consistency
- Test that physics calculations remain unaffected by display rendering
