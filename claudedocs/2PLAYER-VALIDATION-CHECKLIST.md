# 2-Player Sakura Validation Checklist

**Date Started**: 2025-11-14
**Status**: In Progress
**Goal**: Fully validate 2-player Sakura before tackling multi-player scaling

---

## Testing Environment
- **Dev Server**: http://localhost:3000/hanafuda/
- **Game Mode**: Sakura
- **Test Type**: Manual browser testing
- **Expected Behavior**: All features work smoothly without crashes

---

## Phase 1: Core Game Flows

### Test 1.1: Basic 2-Player Game Start
- [ ] Click "New Game" button
- [ ] Modal appears showing game selection
- [ ] Select "Sakura" game
- [ ] Should show player count selection (2, 3, 4)
- [ ] Select "2" players
- [ ] Should show round selection (1, 3, 6, 12)
- [ ] Select any number of rounds (use 1 for quick test)
- [ ] Game starts with proper 2-player layout
- [ ] Player hand shows 10 cards
- [ ] Field shows 8 cards
- [ ] Opponent hand visible but face-down
- [ ] Deck visible in top-left corner

### Test 1.2: Hand Card Selection (Click-to-Match)
- [ ] Click a hand card
- [ ] Card highlights/indicates selection
- [ ] Console shows "selected card" without errors
- [ ] Can click different hand cards to switch selection
- [ ] Selection state persists until play

### Test 1.3: Field Card Selection (Click-to-Match)
- [ ] Select a hand card
- [ ] Phase changes to "select_field"
- [ ] Click a matching field card
- [ ] Cards animate together smoothly
- [ ] Captured cards move to trick pile
- [ ] Match completes without console errors

### Test 1.4: No Match Scenario
- [ ] Select hand card with no field matches
- [ ] Click same hand card again (click without field match)
- [ ] Card auto-places on field
- [ ] Phase transitions to "drawing"
- [ ] No crashes or error messages

### Test 1.5: Draw Phase
- [ ] Deck card revealed (brief popup showing card)
- [ ] If matches field card, allow selection
- [ ] If no match, auto-plays to field
- [ ] Turn passes to opponent
- [ ] All animations complete smoothly

### Test 1.6: Opponent AI Turn
- [ ] Opponent automatically takes a turn
- [ ] No user input required
- [ ] Turn completes within 1-3 seconds
- [ ] Game state updates properly
- [ ] Turn passes back to player

### Test 1.7: Round End
- [ ] Both players' hands empty
- [ ] Round summary appears showing:
  - [ ] Player's captured cards and points
  - [ ] Opponent's captured cards and points
  - [ ] Yaku found (if any)
  - [ ] Round winner
  - [ ] Score progression
- [ ] Continue button visible
- [ ] Clicking continue starts next round

### Test 1.8: Multiple Rounds
- [ ] Complete 3 consecutive rounds without crashes
- [ ] Dealer rotates (opponent in round 2)
- [ ] Scores accumulate correctly
- [ ] Card animations remain smooth throughout

---

## Phase 2: Click and Drag Interactions

### Test 2.1: Drag-and-Drop Hand Card to Field
- [ ] Drag hand card to field location
- [ ] Card animates to field position
- [ ] No crashes during drag
- [ ] Drag-drop works as alternative to click

### Test 2.2: Drag-Drop with Field Match
- [ ] Drag hand card toward matching field card
- [ ] Both cards animate together
- [ ] Captured to trick pile smoothly
- [ ] Animations are fluid

### Test 2.3: Hover Interactions
- [ ] Hover over deck → shows card count tooltip
- [ ] Hover over trick pile → shows list of captured cards
- [ ] Hover effects don't cause console errors

### Test 2.4: Mobile/Touch Compatibility
- [ ] Interactions work with touch events (if applicable)
- [ ] No touch-specific errors in console

---

## Phase 3: Yaku System Testing

### Test 3.1: Individual Yaku Detection
For each of the 8 Sakura yaku:
1. **Drinking (Nomi)**
   - [ ] Cherry Curtain + Susuki Moon + Chrysanthemum Cup = detected
   - [ ] 50 point penalty applied correctly
   - [ ] Shown in round summary

2. **Spring (Omote Sugawara)**
   - [ ] Pine Crane + Plum Warbler + Cherry Curtain = detected
   - [ ] 50 point penalty applied correctly
   - [ ] Shown in round summary

3. **Akatan** (Red Poetry Ribbons)
   - [ ] Jan + Feb + Mar ribbons = detected
   - [ ] 50 point penalty applied correctly

4. **Aotan** (Blue Ribbons)
   - [ ] Jun + Sep + Oct ribbons = detected
   - [ ] 50 point penalty applied correctly

5. **Kusatan** (Plain Ribbons)
   - [ ] Apr + May + Jul ribbons = detected (NOT Nov)
   - [ ] 50 point penalty applied correctly

6. **Animals A**
   - [ ] Peony Butterfly + Chrysanthemum Cup + Maple Deer = detected
   - [ ] 50 point penalty applied correctly

7. **Animals B**
   - [ ] Wisteria Cuckoo + Iris Bridge + Clover Boar = detected
   - [ ] 50 point penalty applied correctly

8. **Inoshikagan**
   - [ ] Clover Boar + Susuki Geese + Maple Deer = detected
   - [ ] 50 point penalty applied correctly

### Test 3.2: Multiple Yaku in Single Round
- [ ] Player can get 2+ yaku in same round
- [ ] All penalties applied correctly
- [ ] Total penalty = yaku count × 50

### Test 3.3: Both Players with Yaku
- [ ] Both players have yaku in same round
- [ ] Both penalties apply correctly
- [ ] Scoring math verified

---

## Phase 4: Variant System Testing

### Test 4.1: Victory Scoring
- [ ] Toggle "Victory Scoring" variant in Variations modal
- [ ] Game mode resets
- [ ] Start new game
- [ ] Score display shows "wins" instead of points
- [ ] Round winner gets +1 win
- [ ] Match winner determined by most wins
- [ ] Not by highest cumulative score

### Test 4.2: Both Players Score
- [ ] Toggle "Both Players Score" variant
- [ ] Game resets
- [ ] Start new game
- [ ] When yaku obtained, player gets +50 (not opponent penalty)
- [ ] Both players can score same round
- [ ] Round summary shows both getting points

### Test 4.3: Basa & Chu Multipliers
- [ ] Requires Victory Scoring enabled
- [ ] If score margin ≥ 100: winner gets 2 wins (not 1)
- [ ] If score margin ≥ 50: winner gets 2 wins (not 1)
- [ ] Otherwise: winner gets 1 win
- [ ] Verify in round summary

### Test 4.4: Chitsiobiki (3-of-a-Kind Trade)
- [ ] Toggle variant (currently UI only, may not be functional)
- [ ] Document current state: ✅ Placeholder / ❌ Not working

### Test 4.5: Oi-bana (Auction)
- [ ] Toggle variant (currently UI only, may not be functional)
- [ ] Document current state: ✅ Placeholder / ❌ Not working

### Test 4.6: Multiple Variant Combinations
- [ ] Enable 2+ variants together
- [ ] Game behaves correctly with combo
- [ ] No conflicts between variants

---

## Phase 5: Gaji (Wild Card) System

### Test 5.1: Gaji Drawing
- [ ] Play until Gaji card (November 4th) is drawn
- [ ] Phase changes to "gaji_selection"
- [ ] UI prompts for gaji target selection
- [ ] Can click any field card
- [ ] Cannot click without selecting target

### Test 5.2: Gaji Capture Mechanics
- [ ] Gaji captures selected field card
- [ ] Adds to trick pile correctly
- [ ] Can capture any suit (not just November)
- [ ] No console errors during gaji capture

### Test 5.3: Gaji in Opponent's Hand
- [ ] If opponent has Gaji in hand
- [ ] Opponent automatically selects best field card to capture
- [ ] AI decision appears reasonable (high-value card preferred)
- [ ] Completes without issues

### Test 5.4: Gaji End-of-Round Bonus
- [ ] If Gaji remains on field at round end
- [ ] Player capturing Gaji might get bonus (check rules)
- [ ] Bonus applied correctly to scoring

---

## Phase 6: Card Values & Deck Integrity

### Test 6.1: Card Value Display
- [ ] Hover over card in trick pile/field
- [ ] Card displays correct point value:
  - [ ] Bright cards: 20 points
  - [ ] Ribbon cards: 10 points
  - [ ] Animal cards: 5 points
  - [ ] Chaff cards: 0 points

### Test 6.2: Deck Total
- [ ] Complete full round
- [ ] Sum all captured cards by both players
- [ ] Total should equal 240 points (12 months × 20 points)
- [ ] Verify calculation in round summary

### Test 6.3: Card Integrity
- [ ] No duplicate cards appear
- [ ] All 48 cards in deck accounted for
- [ ] No cards disappear unexpectedly

---

## Phase 7: Scoring System

### Test 7.1: Base Points Calculation
- [ ] Manual card count from captured cards
- [ ] Compare to game's calculated base points
- [ ] Should match exactly

### Test 7.2: Yaku Penalties
- [ ] For each yaku: base points - 50
- [ ] Multiple yaku: base points - (yaku count × 50)
- [ ] Opponent's penalties calculated same way

### Test 7.3: Final Score Per Round
- [ ] Player score = player base - opponent yaku penalty
- [ ] Opponent score = opponent base - player yaku penalty
- [ ] (Or both scoring if variant enabled)
- [ ] Round winner = highest final score

### Test 7.4: Match Cumulative
- [ ] Scores accumulate across rounds
- [ ] Round 2 score adds to round 1
- [ ] Final match winner determined by total cumulative score

---

## Phase 8: UI/UX Polish

### Test 8.1: Visual Clarity
- [ ] Cards are clearly visible
- [ ] Text is readable
- [ ] Colors are consistent
- [ ] Layout is balanced

### Test 8.2: Button Responsiveness
- [ ] All buttons clickable
- [ ] Buttons provide visual feedback (hover, click)
- [ ] No double-click issues

### Test 8.3: Error Messages
- [ ] No console errors during normal play
- [ ] If errors occur, document them
- [ ] Error messages are clear

### Test 8.4: Animation Quality
- [ ] Card movements are smooth
- [ ] No stuttering or lag
- [ ] Flip animations work correctly
- [ ] Multiple simultaneous animations handled

---

## Phase 9: Edge Cases & Stress Testing

### Test 9.1: Rapid Interactions
- [ ] Click cards quickly in succession
- [ ] No crashes or queue issues
- [ ] Game handles input gracefully

### Test 9.2: Long Sessions
- [ ] Play 6+ rounds continuously
- [ ] Performance remains consistent
- [ ] No memory leaks or slowdowns

### Test 9.3: Browser Console
- [ ] No JavaScript errors logged
- [ ] No warnings (unless pre-existing)
- [ ] Clean console throughout session

### Test 9.4: Different Screen Sizes
- [ ] Test on different window sizes
- [ ] Layout adapts properly
- [ ] Cards remain clickable at all sizes

---

## Summary

**Total Test Cases**: ~80
**Pass/Fail**: [ ] / [ ]

### Issues Found
(Document any bugs or unexpected behavior here)

### Critical Issues
(List any blockers for 2-player gameplay)

### Minor Issues
(List cosmetic or non-critical issues)

### Recommendations
(Note any improvements needed before multi-player scaling)

---

## Sign-Off
- **Tested By**: Claude Code
- **Date Completed**: _________
- **Build Version**: Latest from main branch
- **Status**: ✅ READY FOR MULTI-PLAYER or ❌ NEEDS FIXES

