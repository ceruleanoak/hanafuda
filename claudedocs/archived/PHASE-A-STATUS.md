# Phase A: 2-Player Validation - Status & Plan

**Date Started**: 2025-11-14
**Current Status**: Planning & Setup
**Build Status**: ✅ Passing

---

## Objective
Fully validate 2-player Sakura gameplay before scaling to 3-4 players. This ensures a solid foundation before tackling the complex visual layout challenges of multi-player mode.

---

## Setup Completed ✅
- [x] Dev server running at http://localhost:3000/hanafuda/
- [x] Build verified (npm run build passes)
- [x] Comprehensive test checklist created (2PLAYER-VALIDATION-CHECKLIST.md)
- [x] 80+ manual test cases documented

---

## Test Approach

### Testing Method
- **Manual Browser Testing**: Open dev server and play through game scenarios
- **Console Monitoring**: Check for JavaScript errors during play
- **Expected Outcomes**: Compare against Sakura rules documentation
- **Documentation**: Record results in checklist

### Test Execution Plan
1. **Phase 1: Core Game Flows** (30 mins)
   - Test game start, card selection, drawing, opponent AI
   - Verify round/match completion without crashes

2. **Phase 2: Interactions** (20 mins)
   - Test click-to-match and drag-and-drop interactions
   - Verify hover tooltips work

3. **Phase 3: Yaku System** (30 mins)
   - Manually trigger each of 8 yaku combinations
   - Verify scoring penalties apply correctly

4. **Phase 4: Variants** (30 mins)
   - Test each of 5 game variants
   - Test variant combinations

5. **Phase 5: Gaji System** (20 mins)
   - Play until Gaji card is drawn
   - Test target selection and capture

6. **Phase 6-9: Polish & Edge Cases** (30 mins)
   - Verify card values display correctly
   - Test scoring calculations
   - Check UI responsiveness
   - Monitor console for errors

**Total Estimated Time**: 2.5-3 hours

---

## Key Areas to Validate

### Critical Path (Must Work)
✅ 2-player game starts correctly
⚠️ Hand card selection (click or drag)
⚠️ Field card matching
⚠️ Draw phase
⚠️ Opponent AI takes turns
⚠️ Round/match completion
⚠️ Score calculation

### Important Features (Should Work)
⚠️ All 8 Yaku detected and scored
⚠️ Gaji (wild card) mechanics
⚠️ Game variants (at least 1-2)
⚠️ Card animations smooth
⚠️ No console errors

### Nice-to-Have (Should Test)
⚠️ Drag-and-drop interactions
⚠️ All variant combinations
⚠️ Browser console clean
⚠️ Long play sessions stable

---

## Known Issues to Watch For

From Session 3 summary, these were fixed:
- ✅ Click-to-match broken (FIXED in Session 3)
- ✅ Sakura two-click flow (FIXED in Session 3)
- ✅ Null reference errors (FIXED in Session 3)
- ✅ Field card selection guards (FIXED in Session 3)

**Watch for regressions** of these fixes during testing.

---

## Success Criteria

**Phase A Complete When**:
- [x] Test checklist created
- [ ] Core game flows verified (1.1-1.8)
- [ ] Interaction patterns tested (2.1-2.4)
- [ ] Yaku system validated (3.1-3.3)
- [ ] Variants tested (4.1-4.6)
- [ ] Gaji mechanics verified (5.1-5.4)
- [ ] Scoring calculations correct (7.1-7.4)
- [ ] No critical bugs found
- [ ] Console clean (no JavaScript errors)
- [ ] Results documented in checklist

**Issues Found**:
- If < 3 issues → Proceed to Phase B (revert Phase 2B)
- If 3-5 issues → Fix before Phase B
- If > 5 issues → Deep investigation needed

---

## Next Steps

### Immediate (This Session)
1. ✅ Create test checklist (DONE)
2. [ ] Execute manual tests (Core flows)
3. [ ] Document findings
4. [ ] Determine if Phase B is safe

### If Issues Found
- Fix critical bugs
- Re-test affected areas
- Update documentation

### Phase B (After validation passes)
- Revert commit 72db0ae to restore Phase 2A state
- Verify 2-player still works
- Prepare for Phase C (cleaner Phase 2B implementation)

---

## Testing Environment Notes

**Dev Server**: http://localhost:3000/hanafuda/
- Vite hot reload enabled
- Console accessible via DevTools (F12)
- CSS/JS bundled from src/

**Game Selection**:
1. Open http://localhost:3000/hanafuda/
2. Click "New Game"
3. Select "Sakura"
4. Select "2" players
5. Select "1" round (faster testing)
6. Game loads

---

## Related Documentation
- SAKURA_IMPLEMENTATION_PLAN.md - Detailed feature description
- SESSION-3-SUMMARY.md - Recent fixes and current state
- sakura-multiplayer-progress.md - Multi-player architecture status

