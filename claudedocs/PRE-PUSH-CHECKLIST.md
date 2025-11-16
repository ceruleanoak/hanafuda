# Pre-Push Checklist - Multi-Player Score Display & Sakura Status

**Date**: 2025-11-15
**Last Commits**:
- `21e3930` - Implement multi-player score display and remove showcase button
- `7331249` - Fix 2P Sakura score label

## Part 1: Recent Changes Testing (Multi-Player Score Display)

### HTML/DOM Structure
- [ ] Score display container exists with correct data attributes
- [ ] Score labels render correctly for each game mode:
  - [ ] 2P Sakura: "Player" and "Opponent" (no number)
  - [ ] 3P Sakura: "Player", "Opponent 1", "Opponent 2"
  - [ ] 4P Sakura Competitive: "Player", "Opponent 1", "Opponent 2", "Opponent 3"
  - [ ] 4P Sakura Teams: "Team 1" and "Team 2"
  - [ ] 2P Koi-Koi: "Player" and "Opponent"
- [ ] Test-3D-btn button is completely removed from UI
- [ ] No button appears in header

### CSS Responsive Layout
- [ ] 2P mode: Scores display side-by-side with 2rem gap
- [ ] 3P mode: Scores display in row with 1.2rem gap, 0.9rem font
- [ ] 4P Competitive: Scores display in 2×2 grid with 1rem gap, 0.85rem font
- [ ] 4P Teams: Team scores display with 3rem gap between teams
- [ ] All layouts remain readable and not overcrowded
- [ ] Round text appears only on first score: "(Round 1/3)"

### Score Display Logic
- [ ] Scores update in real-time during gameplay
- [ ] Sakura: Uses `basePoints + matchScore` calculation
- [ ] Sakura Teams: Team scores aggregate correctly (P0+P2 vs P1+P3)
- [ ] Koi-Koi: Uses legacy `playerScore/opponentScore` fields
- [ ] Scores persist through game phases

### Game Mode Switching
- [ ] Switching between game modes does NOT cause JavaScript errors
- [ ] Switching between game modes does NOT break 3D card rendering
- [ ] Cards are visible after switching modes
- [ ] Score display updates correctly for each mode

### 3D Card Rendering (Post-Button Removal)
- [ ] 3D cards render on game start
- [ ] 3D cards animate correctly during play
- [ ] 3D cards animate when matched and captured
- [ ] Trick piles show correctly
- [ ] No null reference errors in console
- [ ] Animation tester still works (button exists)

---

## Part 2: Sakura Implementation Plan Verification

### Phase 1: Critical Rules Fixes ✅ COMPLETE
- [x] Card values corrected (BRIGHT=20, RIBBON=10, ANIMAL=5, CHAFF=0)
- [x] All 8 Hawaiian Sakura yaku defined correctly
- [x] Yaku combinations verified

**Test Items**:
- [ ] Deal 10 cards to player, 8 to opponent in 2P mode
- [ ] Hiki rule works: capturing all 4 cards of same suit
- [ ] Gaji system works: November card acts as wild
- [ ] Cards show correct point values in UI
- [ ] Yaku detection works for all 8 combinations:
  - [ ] Drinking (Nomi)
  - [ ] Spring (Omote Sugawara)
  - [ ] Akatan (Red Ribbons)
  - [ ] Aotan (Blue Ribbons)
  - [ ] Kusatan (Plain Ribbons)
  - [ ] Animals A
  - [ ] Animals B
  - [ ] Inoshikagan

### Phase 2: Dynamic Variants System ✅ COMPLETE
- [x] 5 variant checkboxes implemented in modal

**Test Items**:
- [ ] Chitsiobiki checkbox visible and toggleable
- [ ] Victory Scoring checkbox visible and toggleable
- [ ] Basa & Chu Multipliers checkbox visible and toggleable
- [ ] Both Players Score checkbox visible and toggleable
- [ ] Oi-bana checkbox visible and toggleable

**Variant Functionality**:
- [ ] Both Players Score: Yaku awards 50 pts instead of subtracting
- [ ] Victory Scoring: Counts wins instead of cumulative points
- [ ] Basa & Chu: Applies margin bonuses correctly (50+/100+)
- [ ] Chitsiobiki: Placeholder UI only (not functional)
- [ ] Oi-bana: Placeholder UI only (not functional)

### Phase 3: Game Setup Flow ✅ COMPLETE
- [x] Player count selection modal implemented
- [x] Round selection modal implemented
- [x] Team info display for 4P mode

**Test Items**:
- [ ] Player count modal appears when starting Sakura
- [ ] Can select 2, 3, or 4 players
- [ ] Round selection works (1, 3, 6, 12 rounds)
- [ ] Game starts with correct player count
- [ ] Team display visible for 4P Sakura

### Phase 4: Scoring System Updates ✅ COMPLETE
- [x] Both Players Score variant implemented
- [x] Victory Scoring variant functional
- [x] Basa & Chu multipliers working
- [x] Standard scoring with yaku penalties

**Test Items**:
- [ ] Standard 2P game: Scoring calculates correctly
- [ ] Both Players Score variant: Yaku awards instead of penalizing
- [ ] Victory Scoring: Game counts wins instead of points
- [ ] Basa & Chu: Multipliers apply correctly to score differences

### Phase 5: Multi-Player Architecture ⏳ PARTIAL
**Status**: Architecture refactored, 2P backward compatible, 3P/4P not functional

**Test Items**:
- [ ] 2P Sakura: Game plays normally (backward compatibility)
- [ ] 3P Sakura: Game starts but may have logic gaps
- [ ] 4P Sakura: Game starts but may have logic gaps
- [ ] 4P Teams: Game starts but may have logic gaps
- [ ] Turn rotation works correctly (if 3P/4P playable)
- [ ] Dealing distributes cards correctly by player count

**Known Limitations** (Do NOT test - expected to fail):
- [ ] 3P/4P AI logic incomplete
- [ ] Winner determination incomplete for 3+ players
- [ ] Team play not fully implemented

### Phase 6: Chitsiobiki Variant ⏳ NOT IMPLEMENTED
- [ ] Currently: Checkbox only, no functionality
- [ ] Expected: 3-of-a-kind detection and trade UI (not for this push)

### Phase 7: Oi-bana Auction Variant ⏳ NOT IMPLEMENTED
- [ ] Currently: Placeholder only
- [ ] Expected: Bidding phase and player elimination (not for this push)

### Phase 8: Multi-Player AI Balancing ⏳ NOT TESTED
- [ ] Skip for this push (3P/4P not fully functional)

---

## Part 3: General Code Quality

### Build & Compilation
- [ ] `npm run build` completes without errors
- [ ] No TypeScript/JavaScript syntax errors
- [ ] Bundle size reasonable (current: ~262KB JS)

### Console Errors
- [ ] No JavaScript errors in browser console
- [ ] No warnings related to removed button
- [ ] No null reference errors during gameplay
- [ ] No DOM manipulation errors

### Git & Commits
- [ ] Latest commits are clean and descriptive
- [ ] No temporary files or debug code in commits
- [ ] Commit messages follow project style

### Code Organization
- [ ] No TODO comments for incomplete features
- [ ] No console.log statements left in production code
- [ ] No commented-out code blocks

---

## Part 4: User Experience

### Game Flow (2P Sakura - Main Use Case)
- [ ] Start new game → select players (2) → select rounds
- [ ] Game displays correctly with updated score UI
- [ ] Player can select hand card
- [ ] Player can select field card to match
- [ ] Drawn card displays and player can match
- [ ] Trick progression text visibility toggles with Help button
- [ ] Round completes and scores update
- [ ] Multiple rounds progress correctly

### Game Flow (3P Sakura - Partially Supported)
- [ ] Start new game → select players (3) → see score display
- [ ] Note: Full gameplay may have gaps (expected for this phase)

### Game Flow (4P Sakura Competitive - Partially Supported)
- [ ] Start new game → select players (4, competitive) → see score display
- [ ] Note: Full gameplay may have gaps (expected for this phase)

### Game Flow (4P Sakura Teams - Partially Supported)
- [ ] Start new game → select players (4, teams) → see team score display
- [ ] Team 1 and Team 2 scores visible
- [ ] Note: Full gameplay may have gaps (expected for this phase)

### Game Flow (Other Modes)
- [ ] 2P Koi-Koi still works normally
- [ ] Match Game still works normally
- [ ] Shop Game still works normally

---

## Part 5: Deployment Readiness

### Before Pushing to main:
- [ ] All Part 1 tests pass (multi-player score display)
- [ ] All Part 2 Phase 1-4 tests pass (critical rules, variants, setup, scoring)
- [ ] All Part 3 quality checks pass
- [ ] All Part 4 user experience tests pass for 2P mode
- [ ] 3P/4P known limitations acknowledged and expected

### Acceptable to Push:
- [ ] Part 2 Phase 5 incomplete (expected - partial implementation)
- [ ] Part 2 Phase 6-7 not implemented (expected - placeholders only)
- [ ] 3P/4P gameplay gaps (expected - Phase 5 work needed)

### Should NOT Push If:
- [ ] JavaScript errors in console
- [ ] Button removal caused 3D rendering failures
- [ ] 2P Sakura/Koi-Koi broken
- [ ] Score display incorrect for 2P modes
- [ ] Build fails

---

## Testing Instructions

### Quick Test (5 minutes)
```bash
npm run dev
# In browser:
# 1. Start 2P Sakura → check score display shows "Player" and "Opponent"
# 2. Play 1 round → verify scores update
# 3. Switch to Koi-Koi → check 3D cards render
# 4. Play 1 hand → verify no console errors
```

### Full Test (20 minutes)
```bash
npm run build  # Verify compilation
npm run dev    # Run all test scenarios from Part 4
```

### Specific Issue Testing
- **Button removal issue**: Check game mode switch in console (no errors)
- **Score display**: Verify all player count variants show correct labels
- **3D cards**: Start game, observe card rendering and animations

---

## Sign-Off

- [ ] All critical tests passing
- [ ] Ready for push to main branch
- [ ] Documentation updated (this file)

**Tester**: _______________
**Date**: _______________
**Notes**:

