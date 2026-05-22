# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Display Function Purity Violation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the separation of concerns violation
  - **Scoped PBT Approach**: Scope the property to frames where `updateDisplay()` executes with `sim.bulbState !== 'overload'`
  - Test that `updateDisplay()` does NOT mutate `sim.I_peak` when `sim.bulbState !== 'overload'` (from Bug Condition in design)
  - Monitor `sim.I_peak` value before and after `updateDisplay()` execution
  - The test assertions should verify: `sim.I_peak` remains unchanged after `updateDisplay()` executes
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists: line 282 mutates state)
  - Document counterexamples found: "updateDisplay() sets sim.I_peak = 0 at line 282, violating separation of concerns"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - State Mutation Exclusivity and Display Rendering
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for various circuit states (normal, dim, overload, series, parallel)
  - Write property-based tests capturing observed display rendering patterns from Preservation Requirements
  - Test 1: Verify "Arus Sebelum Putus" displays correctly when `sim.bulbState === 'overload'` and `sim.I_peak > 0`
  - Test 2: Verify voltage, resistance, power, current display correctly in all states
  - Test 3: Verify "Arus per Lampu" displays correctly in parallel mode
  - Test 4: Verify status text and styling update correctly
  - Test 5: Verify `runPhysics()` at line 245 resets `sim.I_peak = 0` on overload-to-normal transition
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for Display Function State Mutation

  - [x] 3.1 Implement the fix
    - Remove line 282 in `updateDisplay()` that sets `sim.I_peak = 0`
    - Simplify the conditional block starting at line 277 to only handle display visibility
    - Keep condition `if (sim.bulbState === 'overload')` with nested `if (sim.I_peak > 0)` to show display item
    - Keep `else` branch to hide display item when not in overload or when `sim.I_peak === 0`
    - Remove outer `else` branch that mutates state
    - Ensure `updateDisplay()` only reads `sim.*` properties, never assigns to them
    - Verify `runPhysics()` at line 245 continues to handle state reset exclusively
    - _Bug_Condition: isBugCondition(frameState) where updateDisplay() executes with sim.bulbState !== 'overload' and mutates sim.I_peak_
    - _Expected_Behavior: updateDisplay() SHALL hide display item without mutating sim.I_peak (Property 1 from design)_
    - _Preservation: State reset occurs exclusively in runPhysics() at line 245; all display rendering remains unchanged (Property 2 from design)_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Display Function Purity
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms `updateDisplay()` no longer mutates `sim.I_peak`)
    - _Requirements: Expected Behavior Properties from design_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - State Mutation Exclusivity and Display Rendering
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in display rendering or physics)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
