# Phase 1.2 Drag-and-Drop Regression Fix

**Date:** November 26, 2024
**Issue:** Phase 1.2 AnimationPipeline changes broke drag-and-drop in Sakura and KoiKoi modes
**Status:** FIXED

## Problem Summary

After Phase 1.2 AnimationPipeline integration, drag-and-drop functionality broke in Sakura and KoiKoi modes with the following errors:

### Sakura Error
```
TypeError: this.game.placeCardOnField is not a function
  handleMouseUp (main.js:1458)
```

### KoiKoi Errors
```
TypeError: null is not an object (evaluating 'this.draggedCard3D.isDragging = false')
  handleMouseUp (main.js:1469)

TypeError: undefined is not an object (evaluating 'this.selectedCards[0].id')
  placeCardOnField (KoiKoi.js:726)
```

### HachiHachi
No issues - drag-and-drop worked correctly (not modified in Phase 1.2)

## Root Cause Analysis

The issue had three distinct problems:

### 1. Sakura.js Missing Method
- **Problem:** Sakura.js didn't have a `placeCardOnField()` method at all
- **Impact:** main.js line 1458 called a non-existent method, causing immediate failure

### 2. KoiKoi.js Method Signature Mismatch
- **Problem:** KoiKoi.js `placeCardOnField()` expected `this.selectedCards[0]` to exist
- **Impact:** The drag-and-drop code path in main.js passed `cardData` but the method didn't use it, causing null reference error

### 3. Inconsistent Method Signatures Across Modes
- **HachiHachi:** `placeCardOnField(card)` - accepts card parameter, calls `selectCard()` first
- **KoiKoi:** `placeCardOnField()` - no parameter, uses `this.selectedCards[0]`
- **Sakura:** Method didn't exist
- **Root Issue:** main.js tried to call a unified interface that didn't exist

## Why HachiHachi Worked

HachiHachi's drag-and-drop implementation follows a **two-step pattern** that was correct:

```javascript
// main.js line 1435-1439 (HachiHachi path)
let success = this.game.selectCard(this.draggedCardData, 'player');

if (success) {
  success = this.game.placeCardOnField(this.draggedCardData);
  // ...
}
```

This pattern:
1. First selects the card via `selectCard(card, 'player')` - sets up `this.selectedCards`
2. Then places it via `placeCardOnField(card)` - completes the action

The KoiKoi/Sakura path was trying to skip step 1, causing the failure.

## Solution Implementation

### Fix 1: Update main.js KoiKoi/Sakura Drag Logic
**File:** `/src/main.js` (lines 1453-1482)

**Before:**
```javascript
// For Koi-Koi/Sakura, drag-to-empty-field attempts placement directly
let success = this.game.placeCardOnField(this.draggedCardData);
```

**After:**
```javascript
// For Koi-Koi/Sakura, drag-to-empty-field requires two steps:
// 1. Select the hand card first
let success = this.game.selectCard(this.draggedCardData, 'player');

if (success) {
  // 2. Place the card on field
  success = this.game.placeCardOnField(this.draggedCardData);
  debugLogger.log('gameState', success ? `✅ Card placed on field` : `❌ Failed to place card`, null);
  this.updateUI();
} else {
  this.cancelDrag();
}
```

**Also added null check:**
```javascript
// Reset drag state
if (this.draggedCard3D) {
  this.draggedCard3D.isDragging = false;
}
```

### Fix 2: Update KoiKoi.js placeCardOnField()
**File:** `/src/game/KoiKoi.js` (lines 722-755)

**Before:**
```javascript
placeCardOnField() {
  const cardIndex = this.playerHand.findIndex(c => c.id === this.selectedCards[0].id);
  // ... (no parameter, assumed selectedCards[0] always exists)
}
```

**After:**
```javascript
/**
 * Place card on field without capturing
 * @param {Object} card - The card to place (optional, uses selectedCards[0] if not provided)
 * @returns {boolean} - True if card was placed successfully
 */
placeCardOnField(card = null) {
  // If card not provided, use selectedCards (for backward compatibility)
  const cardToPlace = card || (this.selectedCards.length > 0 ? this.selectedCards[0] : null);

  if (!cardToPlace) {
    debugLogger.log('gameState', `❌ placeCardOnField: No card to place`, null);
    return false;
  }

  const cardIndex = this.playerHand.findIndex(c => c.id === cardToPlace.id);
  if (cardIndex >= 0) {
    const handCard = this.playerHand.splice(cardIndex, 1)[0];

    // Check for 4-card same-month capture
    if (this.checkFourCardCapture(handCard, 'player')) {
      this.selectedCards = [];
      this.drawPhase();
      return true;
    }

    this.field.push(handCard);
    this.assignFieldGridSlots();
    this.selectedCards = [];
    this.drawPhase();
    return true;
  }

  return false;
}
```

**Key changes:**
- Added optional `card` parameter
- Backward compatible: uses `selectedCards[0]` if no card provided
- Returns boolean for success/failure
- Null checks and error logging
- Works for both drag-and-drop AND click-to-place workflows

### Fix 3: Add placeCardOnField() to Sakura.js
**File:** `/src/game/Sakura.js` (lines 920-959)

**Added new method:**
```javascript
/**
 * Place card on field without capturing (for drag-and-drop support)
 * @param {Object} card - The card to place (optional, uses selectedCards[0] if not provided)
 * @returns {boolean} - True if card was placed successfully
 */
placeCardOnField(card = null) {
  // If card not provided, use selectedCards (for backward compatibility)
  const cardToPlace = card || (this.selectedCards.length > 0 ? this.selectedCards[0] : null);

  if (!cardToPlace) {
    debugLogger.log('sakura', `❌ placeCardOnField: No card to place`, null);
    return false;
  }

  // Verify we're in the right phase
  if (this.phase !== 'select_field') {
    debugLogger.log('sakura', `❌ placeCardOnField: Wrong phase (${this.phase})`, null);
    return false;
  }

  // Find and remove card from player's hand
  const cardIndex = this.playerHand.findIndex(c => c.id === cardToPlace.id);
  if (cardIndex < 0) {
    debugLogger.log('sakura', `❌ placeCardOnField: Card not in hand`, { cardId: cardToPlace.id });
    return false;
  }

  const handCard = this.playerHand.splice(cardIndex, 1)[0];

  // Add to field
  this.field.push(handCard);
  this.message = 'Card placed on field.';
  this.selectedCards = [];
  this.drawnCardMatches = [];

  debugLogger.log('sakura', `➕ Card placed on field: ${handCard.name}`, null);

  this.proceedToDrawPhase();
  return true;
}
```

**Key features:**
- Same signature as KoiKoi and HachiHachi
- Phase validation (must be in 'select_field')
- Proper error handling and logging
- Calls `proceedToDrawPhase()` to advance game state

## Unified Pattern Across All Modes

After the fix, all three game modes now follow the same pattern:

### Method Signature (All Modes)
```javascript
placeCardOnField(card = null)
```

### Drag-and-Drop Flow (All Modes)
```javascript
// 1. Select the card
let success = this.game.selectCard(this.draggedCardData, 'player');

if (success) {
  // 2. Place the card on field
  success = this.game.placeCardOnField(this.draggedCardData);
  this.updateUI();
}
```

### Click-to-Place Flow (All Modes)
```javascript
// Clicking same hand card twice when no matches
this.game.placeCardOnField(); // Uses selectedCards[0] implicitly
```

## Testing Checklist

### Build Validation
- [x] `npm run build` succeeds with no errors
- [x] No TypeScript/syntax errors
- [x] No import/export issues

### Manual Testing Required
- [ ] **Sakura**: Drag card from hand to empty field - should place on field
- [ ] **Sakura**: Click card from hand, click again when no matches - should place on field
- [ ] **Sakura**: Gaji wild card selection - should work correctly
- [ ] **KoiKoi**: Drag card from hand to empty field - should place on field
- [ ] **KoiKoi**: Click card from hand, click again when no matches - should place on field
- [ ] **KoiKoi**: Drag field card to match - should capture correctly
- [ ] **HachiHachi**: Drag/drop still works (unchanged) - verify no regression
- [ ] **All Modes**: Card animations smooth during drag-and-drop
- [ ] **All Modes**: No console errors during drag operations

### Edge Cases to Test
- [ ] Dragging card and releasing over invalid area - should cancel and return to hand
- [ ] Dragging card to matching field card - should capture both
- [ ] Dragging card when matches exist but placing anyway (click same card twice)
- [ ] Drag operations during different game phases (should only work in select_hand/select_field)

## Impact Analysis

### Files Modified
1. `/src/main.js` - Updated KoiKoi/Sakura drag-to-field logic (lines 1453-1482)
2. `/src/game/KoiKoi.js` - Updated placeCardOnField() signature (lines 722-755)
3. `/src/game/Sakura.js` - Added placeCardOnField() method (lines 920-959)

### Backward Compatibility
- **Maintained:** All existing click-to-place workflows still work
- **Reason:** Optional `card` parameter defaults to `selectedCards[0]`
- **Risk:** Low - existing code paths unchanged

### Code Quality Improvements
- **Unified Interface:** All modes now have consistent `placeCardOnField(card)` signature
- **Better Error Handling:** Added null checks and validation
- **Debugging:** Added debugLogger calls for troubleshooting
- **Documentation:** Added JSDoc comments explaining parameters and return values

## Lessons Learned

### What Went Wrong
1. **Inconsistent API design:** Each mode had different method signatures
2. **Implicit assumptions:** KoiKoi assumed `selectedCards[0]` always exists
3. **Missing methods:** Sakura never had `placeCardOnField()` implemented
4. **Inadequate testing:** Drag-and-drop wasn't tested after Phase 1.2 changes

### Best Practices for Future
1. **Define unified interfaces early:** All game modes should share common method signatures
2. **Test all modes after changes:** Even if changes target specific modes
3. **Defensive programming:** Always check for null/undefined before accessing properties
4. **Follow existing patterns:** HachiHachi had the correct pattern - should have been applied to all modes
5. **Document assumptions:** If a method expects certain state (like selectedCards), document it

## Relationship to Architecture Refactoring

This fix aligns with **Recommendation R1: GameMode Base Class** from TECHNICAL_ANALYSIS.md:

### Future Refactoring
Once R1 is implemented, `placeCardOnField(card)` should be:
- Defined in the `GameMode` base class abstract interface
- Implemented by all game mode subclasses with consistent signature
- Documented as required for drag-and-drop support

### Pattern Established
This fix establishes the correct pattern for:
- Two-step card placement: `selectCard()` → `placeCardOnField()`
- Optional parameter with backward compatibility
- Boolean return for success/failure
- Proper error handling and logging

## Next Steps

1. **Test all modes thoroughly** (see Testing Checklist above)
2. **Proceed to Phase 1.3** (only after confirming drag-and-drop works)
3. **Consider adding automated tests** for drag-and-drop workflows
4. **Document this pattern** in CLAUDE.md for future game mode development

## Conclusion

The Phase 1.2 drag-and-drop regression was caused by inconsistent method signatures across game modes. The fix:
- Unified all modes to use `placeCardOnField(card)` with optional parameter
- Added missing method to Sakura.js
- Updated main.js to follow the correct two-step pattern (select → place)
- Maintained backward compatibility with existing click-to-place workflows

**Status:** Ready for testing. DO NOT proceed to Phase 1.3 until all drag-and-drop functionality is verified.
