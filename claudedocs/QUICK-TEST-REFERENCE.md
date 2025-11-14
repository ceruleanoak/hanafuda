# Quick Test Reference Card

**Purpose**: Quick checklist for manual testing of zone naming refactoring

## Start Here

### 1. Start Dev Server (Terminal)
```bash
npm run dev
```

### 2. Load Game (Browser)
- Go to: http://localhost:3000/hanafuda/
- Select "Sakura" game mode
- Player count: "2 players" (start here)
- Click "Start New Game"

### 3. Open Console (Browser)
- Press F12 or Ctrl+Shift+I
- Click "Console" tab
- Ready to run test commands

## Essential Test Commands

### Quick Validation (copy-paste into console)
```javascript
gameTestUtils.validateGameState()
```
**Should show**: ✓ All validations passed

### Show Zone Contents
```javascript
gameTestUtils.logZoneCards()
```
**Should show**:
- deck: X cards
- player0Hand: 8 cards
- player1Hand: 8 cards
- field: 8 cards
- player0Trick: 0 cards
- player1Trick: 0 cards

### Show Player Hands
```javascript
gameTestUtils.logPlayerCounts()
```
**Should show**:
- Player 0: hand=8, trick=0
- Player 1: hand=8, trick=0
- Field: 8 cards
- Deck: XX cards

### Check Zone Structure
```javascript
gameTestUtils.validateZones()
```
**Should show**: ✓ Zone "player0Hand" exists, etc.

## 2-Player Mode Quick Test

### Phase 1: Initialization (30 seconds)
- [ ] Game loads without errors
- [ ] Canvas shows 4 rows of cards (2 player hands)
- [ ] Field shows 8 cards in grid center
- [ ] Run: `gameTestUtils.validateGameState()` → All pass ✓

### Phase 2: Selection (1 minute)
- [ ] Click card in bottom hand → highlights
- [ ] No "undefined zone" errors in console
- [ ] Click field card → cards animate away
- [ ] Trick pile grows (right corners)

### Phase 3: Multiple Actions (2 minutes)
- [ ] Make 5-10 selections
- [ ] Animations smooth (no jitter)
- [ ] No cumulative errors
- [ ] Run: `gameTestUtils.validateGameState()` → Still passes ✓

### Phase 4: Error Check (1 minute)
- [ ] Scroll through console output
- [ ] Look for: No zone-related errors
- [ ] Look for: No "undefined" errors
- [ ] Look for: No TypeErrors

**Total Time**: ~5 minutes per mode

## Test Progression

### After 2-Player Passes ✓
1. Do same test for 3-player mode (select "3 players")
2. Do same test for 4-player mode (select "4 players")
3. All should work identically

## If You Find an Error

### Capture the Error
1. Take screenshot of console
2. Note the exact error message
3. Note which action caused it
4. Try to reproduce it

### Common Errors & Quick Fixes

**"Zone config not found: playerHand"**
- Means old zone names still being used somewhere
- Check Renderer.js or main.js for zone references
- Should see "player0Hand" not "playerHand"

**"can't find variable name playerTrickConfig"**
- Variable scoping issue
- Check variable declared at function level, not in if block

**"undefined is not an object"**
- Zone lookup failing
- Run `gameTestUtils.logZoneCards()` to see what zones exist
- Compare with expected zones

## Success = All Green ✓

### Passes for 2-Player ✓
- [ ] gameTestUtils.validateGameState() shows all pass
- [ ] gameTestUtils.logZoneCards() shows expected zones
- [ ] No zone-related console errors
- [ ] Animations smooth
- [ ] Multiple rounds playable

### Passes for 3-Player ✓
- [ ] Same as 2-player
- [ ] Layout is different (fan-shaped hands)
- [ ] All interactions work

### Passes for 4-Player ✓
- [ ] Same as 2-player
- [ ] Layout is different (players around table)
- [ ] All interactions work

## Documentation Files

For detailed procedures, see:
- **TESTING-GUIDE.md** - Full testing procedures (6 phases, 20+ tests)
- **IMPLEMENTATION-SUMMARY.md** - Technical details of changes
- **SESSION-2-SUMMARY.md** - Session overview

## Timeline Estimate

- 2-Player test: 5 minutes
- 3-Player test: 5 minutes
- 4-Player test: 5 minutes
- Total: 15 minutes

If errors found, add 10-30 minutes for debugging.

## After Testing

If all tests pass:
```bash
git add .
git commit -m "Refactor: Unify zone naming - all tests passing"
git push
```

If issues found:
1. Document in TESTING-GUIDE.md
2. Debug specific failure
3. Fix code
4. Re-run tests
5. Repeat until all pass
6. Then commit

## Commands Cheat Sheet

```bash
# Terminal commands
npm run dev          # Start dev server
npm run build        # Build for production

# Browser console commands
gameTestUtils.validateGameState()   # Full validation
gameTestUtils.logZoneCards()        # Zone contents
gameTestUtils.logPlayerCounts()     # Player card counts
gameTestUtils.validateZones()       # Zone structure check
gameTestUtils.gameState()           # Get game state object
```

## Success Indicator

**You'll know it's working when**:
1. ✓ Game loads without errors
2. ✓ gameTestUtils.validateGameState() passes
3. ✓ Cards animate smoothly
4. ✓ Multiple rounds complete without errors
5. ✓ Same behavior in 2-player, 3-player, 4-player modes

---

**Status**: Ready for testing
**Dev Server**: Running at http://localhost:3000/hanafuda/
**Build**: Passing ✓
