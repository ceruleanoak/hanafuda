# Manual Testing Guide - Sakura Multiplayer Fixes

## Overview

This guide provides step-by-step instructions for testing the Sakura multiplayer game mode to verify that the zone naming refactoring and animation fixes are working correctly.

## Key Changes Summary

The implementation unified zone naming across all player counts:
- **Before**: Dual zone names (playerHand/opponentHand for 2-player, player0Hand/player1Hand for N-player)
- **After**: Single indexed naming (player0Hand, player1Hand, etc.) for ALL player counts

This eliminates ambiguity and provides a consistent API for the animation system.

## Pre-Test Checklist

- [ ] Development server running: `npm run dev`
- [ ] Build passes: `npm run build`
- [ ] Browser console (F12) is open and ready for inspection
- [ ] Game loads without errors
- [ ] Hanafuda game is accessible at http://localhost:3000/hanafuda/

## Test Environment Setup

### Start Development Server
```bash
npm run dev
```

Expected output:
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:3000/hanafuda/
```

### Verify Build Passes
```bash
npm run build
```

Should show:
```
✓ built in XXXms
```

## Phase 1: Zone Initialization Testing

**Objective**: Verify cards are correctly placed in zones during game start.

### Test 1.1: Load Game with Sakura Mode
1. Open http://localhost:3000/hanafuda/ in browser
2. From game mode dropdown, select "Sakura"
3. Verify player count selector shows "2 players"
4. Click "Start New Game"
5. Observe: Game loads without errors

**Expected Results**:
- [ ] No console errors about zone initialization
- [ ] Game displays 4 hands (2 players × 2 hands each)
- [ ] Game displays field in center with 8 cards
- [ ] Trick piles visible on right side

### Test 1.2: Verify Console Output
1. Open browser console (F12)
2. Look for initialization messages
3. Run in console:
```javascript
gameTestUtils.logZoneCards()
```

**Expected Results**:
- [ ] Shows zones: deck, drawnCard, field, player0Hand, player1Hand, player0Trick, player1Trick
- [ ] Hand zones have 8 cards each
- [ ] Field zone has 8 cards
- [ ] Deck has remaining cards

### Test 1.3: Validate Complete Game State
1. In console, run:
```javascript
gameTestUtils.validateGameState()
```

**Expected Results**:
- [ ] All validations pass (✓)
- [ ] Card counts match between game state and Card3D zones
- [ ] Summary shows correct allocations

### Test 1.4: Check Zone Structure
1. In console, run:
```javascript
gameTestUtils.validateZones()
```

**Expected Results**:
- [ ] All zones exist
- [ ] No missing zones
- [ ] Output shows checkmarks for all zones

## Phase 2: Card Selection and Interaction

**Objective**: Verify cards can be selected and interactions trigger correctly.

### Test 2.1: Click Hand Card
1. Click any card in your hand (bottom row)
2. Observe: Card highlights or shows selection state
3. In console, check for any errors about zone names

**Expected Results**:
- [ ] Card selection feedback is visible
- [ ] No console errors about undefined zones
- [ ] No TypeErrors

### Test 2.2: Select Field Card to Match
1. Click a field card (center grid)
2. Expected: Cards disappear and move to trick pile
3. Run in console:
```javascript
gameTestUtils.logPlayerCounts()
```

**Expected Results**:
- [ ] Player 0 trick count increased by 1 or 2
- [ ] Field card count decreased
- [ ] No "undefined zone" errors

### Test 2.3: Multiple Selections
1. Repeat selection 3-4 more times
2. Watch for animation glitches
3. Monitor console for errors

**Expected Results**:
- [ ] Animations smooth (no stuttering)
- [ ] Cards consistently remove from field
- [ ] Trick piles accumulate correctly
- [ ] No cumulative errors

## Phase 3: Animation Quality

**Objective**: Verify card movements are smooth and properly positioned.

### Test 3.1: Field Grid Consistency
1. Play until several matches have occurred
2. Observe field grid after each match
3. Check: Do cards slide left to fill gaps, or remain in fixed slots?

**Expected Results**:
- [ ] Field maintains fixed 8-slot grid
- [ ] Cards do NOT slide/reposition when matches occur
- [ ] Empty slots remain empty (no squishing)

### Test 3.2: Trick Pile Layout
1. Make several matches
2. Observe trick piles in right corners
3. Check: Are cards readable or overlapping?

**Expected Results**:
- [ ] Trick piles fan out nicely
- [ ] Cards don't overlap excessively
- [ ] Layout is consistent between rounds

### Test 3.3: Animation Smoothness
1. Play through several turns
2. Watch for any:
   - Stuttering or jittery movements
   - Cards jumping positions
   - Z-order issues (cards appearing behind others unexpectedly)

**Expected Results**:
- [ ] All movements smooth (300-800ms duration)
- [ ] No jittering or jumping
- [ ] Proper depth layering

## Phase 4: Full Gameplay Loop

**Objective**: Verify complete game flow without errors.

### Test 4.1: Play Single Round
1. Play through one complete round
2. When round ends, verify score displayed correctly
3. Start new round

**Expected Results**:
- [ ] Round completes successfully
- [ ] Score updates correctly
- [ ] Game state remains stable for next round

### Test 4.2: Multiple Rounds
1. Play 3-4 complete rounds
2. Monitor for any degradation or errors
3. Check console periodically

**Expected Results**:
- [ ] Each round plays smoothly
- [ ] No errors accumulate over time
- [ ] Game performance remains consistent
- [ ] Scores update correctly

### Test 4.3: Error Monitoring
1. Open console throughout gameplay
2. Look for any of these errors:
   - "Zone XXX expected Y cards, got Z"
   - "can't find variable name"
   - "undefined is not an object"
   - Zone validation errors

**Expected Results**:
- [ ] NO errors appear during gameplay
- [ ] Console shows only informational logs
- [ ] No TypeErrors or zone-related failures

## Phase 5: Edge Cases

**Objective**: Test unusual scenarios that might reveal issues.

### Test 5.1: Watch Opponent's Turn
1. Let computer opponent take turns
2. Observe opponent hand animations (cards should be face-down)
3. Check trick pile updates

**Expected Results**:
- [ ] Opponent hand cards don't show face-down indicator issues
- [ ] Opponent trick pile updates correctly
- [ ] Player1Hand zone properly updated

### Test 5.2: Deck Exhaustion
1. Play many rounds to deplete deck
2. Verify game handles end of deck correctly
3. Check final round completion

**Expected Results**:
- [ ] Game doesn't crash when deck runs out
- [ ] Final round scores correctly
- [ ] Winner determined properly

### Test 5.3: Window Resize
1. Resize browser window while game is running
2. Verify cards reposition correctly
3. Check no errors in console

**Expected Results**:
- [ ] Cards repositioned smoothly
- [ ] Layout adapts to new viewport
- [ ] No z-order or animation issues

## Phase 6: Error Recovery

**Objective**: Verify system handles problems gracefully.

### Test 6.1: Check Validation on Start
1. Open console at game start
2. Run:
```javascript
gameTestUtils.validateGameState()
```
3. Game should show all validations passing

**Expected Results**:
- [ ] All card counts correct
- [ ] No allocation mismatches
- [ ] All zones properly initialized

### Test 6.2: Mid-Game Validation
1. Play a few turns
2. Run validation again:
```javascript
gameTestUtils.validateGameState()
```

**Expected Results**:
- [ ] Still all validations pass
- [ ] Card counts updated correctly
- [ ] No orphaned cards

## Summary Test Results Template

Document your testing results here:

### Initial Load
- [ ] Sakura mode loads
- [ ] 2-player selected
- [ ] No initialization errors
- [ ] Cards visible and positioned correctly

### Zone Initialization
- [ ] logZoneCards() shows all zones
- [ ] Hand counts correct (8 each)
- [ ] Field has 8 cards
- [ ] Deck has remaining cards
- [ ] validateGameState() passes

### Interactions
- [ ] Can click cards in hand
- [ ] Can select field cards
- [ ] Cards animate to trick pile
- [ ] Multiple selections work
- [ ] Animations are smooth

### Gameplay
- [ ] Single round completes
- [ ] Multiple rounds work
- [ ] Scores accumulate correctly
- [ ] No errors during play

### Error Handling
- [ ] No zone name errors
- [ ] No undefined variable errors
- [ ] Console shows only informational logs
- [ ] Game remains stable throughout

## If Issues Are Found

### Common Issues and Solutions

**Issue**: "Zone config not found: playerHand"
- **Cause**: Code still using old zone names
- **Solution**: Check that file was updated to use indexed names
- **File to check**: src/rendering/Renderer.js, src/main.js

**Issue**: "can't find variable name playerTrickConfig"
- **Cause**: Variable declared in conditional block, used outside
- **Solution**: Ensure variables declared at function scope, not in if blocks
- **File to check**: src/rendering/Renderer.js

**Issue**: Cards not appearing in zones
- **Cause**: Game state and Card3D zones out of sync
- **Solution**: Run validateGameState() to identify mismatch
- **Debug steps**:
  1. logPlayerCounts() to see game state
  2. logZoneCards() to see Card3D state
  3. Compare differences

**Issue**: Animations stuttering
- **Cause**: Performance or z-order issues
- **Solution**: Check browser performance, reduce animation count
- **Debug steps**: Open DevTools Performance tab, record gameplay

## Testing Commands Quick Reference

```javascript
// Validate entire game state
gameTestUtils.validateGameState()

// Check zone structure exists
gameTestUtils.validateZones()

// Show current zone card counts
gameTestUtils.logZoneCards()

// Show hand/trick counts by player
gameTestUtils.logPlayerCounts()

// Get current game state object
gameTestUtils.gameState()

// Access managers directly
gameTestUtils.game           // Game instance
gameTestUtils.card3DManager  // Card3D manager
```

## Proceeding to Next Test Phase

When 2-player testing is complete and passing:

1. ✅ All tests passed? Proceed to 3-player testing
2. ❌ Tests failed? Document exact failures, debug specific issues
3. Repeat same checklist for 3-player mode (select "3 players" in setup)
4. Repeat same checklist for 4-player mode (select "4 players" in setup)

## Success Criteria

✅ **Testing Complete When**:
- All interaction tests pass for 2-player mode
- All validation tests pass
- No zone-related errors appear
- Animations smooth and correct
- Multiple rounds complete without issues

Ready to commit when:
- [ ] 2-player mode: All tests pass
- [ ] 3-player mode: All tests pass
- [ ] 4-player mode: All tests pass
- [ ] No console errors in any mode
- [ ] All gameplay scenarios work correctly
