# Opponent Draw Animation Fix

**Date**: 2025-11-14
**Issue**: Opponent drawn card with no match didn't animate to field until player's animation system ran
**Status**: ✅ FIXED

---

## Problem Statement

When an opponent (AI) drew a card that had no matching field cards:
- The card would stay visible in the drawnCard zone
- It would NOT animate to the field position smoothly
- Only when the next player's animation system ran would the card finally appear on the field
- This created a jarring, non-smooth animation experience

**Expected Behavior**:
Card should smoothly animate from drawnCard zone (center-top) to field zone (center-middle) when placed with no match.

---

## Root Cause

In `src/game/Sakura.js`, the `opponentDrawPhase()` method (lines 1413-1423) handled the no-match scenario by:
1. Waiting 500ms (for draw reveal animation)
2. Pushing card directly to `field` array
3. Clearing `drawnCard` zone

However, the code relied entirely on the automatic `Card3DManager.synchronize()` system to detect the zone change and trigger animations. This system runs on the next game loop frame, which could be delayed or missed if timing wasn't perfect.

**Key Difference**:
- Match case (lines 1464-1480): Manually called `card3D.tweenTo()` to animate
- No-match case (lines 1413-1423): Relied on automatic synchronization (too passive)

---

## Solution Implemented

Refactored the no-match case to explicitly trigger a tween animation, matching the pattern used in the match case:

### Changes Made

**File**: `src/game/Sakura.js`

1. **Added import** (line 20):
   ```javascript
   import { LayoutManager } from '../utils/LayoutManager.js';
   ```

2. **Refactored opponentDrawPhase no-match logic** (lines 1413-1463):
   - Check if `card3DManager` exists (required for animation)
   - Get the Card3D object for the drawn card
   - After 300ms delay (to show drawn card briefly):
     - Get field zone configuration from LayoutManager
     - Calculate target position in field zone
     - Call `drawnCard3D.tweenTo()` to animate from drawnCard to field
     - On animation complete:
       - Add card to field array
       - Clear drawnCard zone
       - Proceed to end turn
   - Includes fallback logic if card3DManager unavailable

### Animation Flow (Fixed)

```
Opponent draws card
  ↓
Card animates from deck → drawnCard zone (automatic via synchronize)
  ↓ (300ms delay to show drawn card)
Card tweens from drawnCard zone → field zone (EXPLICIT tween)
  ↓
Card enters field array
  ↓
Next frame: synchronize relayouts field zone with proper grid positions
```

### Code Structure

```javascript
if (this.card3DManager) {
  const drawnCard3D = this.card3DManager.getCard(this.drawnCard);

  if (drawnCard3D) {
    setTimeout(() => {
      // Get field zone configuration
      const fieldConfig = LayoutManager.getZoneConfig(
        'field',
        this.card3DManager.viewportWidth,
        this.card3DManager.viewportHeight,
        this.playerCount
      );

      // Tween to field zone
      drawnCard3D.tweenTo({x, y, z}, 400, 'easeInOutQuad');

      // On complete: add to field and clear drawnCard
      drawnCard3D.onAnimationComplete = () => {
        this.field.push(drawnCard3D.cardData);
        this.drawnCard = null;
        this.endTurn();
      };
    }, 300);
  } else {
    // Fallback without animation
  }
} else {
  // Fallback without card3DManager
}
```

---

## Why This Works

1. **Explicit Timing**: Card animation is triggered immediately and predictably
2. **Consistent Pattern**: Uses same approach as the match case
3. **Reliable Synchronization**: After card enters field, next frame's synchronize will relayout field with proper grid positions
4. **Fallback Support**: Handles cases where card3DManager unavailable
5. **Animation Chaining**: Draw animation (deck→drawnCard) completes before field animation (drawnCard→field) starts

---

## Testing

### What to Verify
- [ ] Opponent draws card with no match → animates smoothly to field
- [ ] Animation timing feels natural (not too slow, not too fast)
- [ ] Card appears in correct field grid position after animation
- [ ] Multiple turns in a row work smoothly
- [ ] Works for both easy and hard AI difficulty
- [ ] Build passes without errors: `npm run build` ✅

### Current Status
- ✅ Build passing
- ✅ Dev server running
- ⏳ Ready for manual testing

---

## Performance Impact

- **Minimal**: Only adds one tween animation per opponent no-match draw
- **Typical game**: 3-5 opponent draws per round, 6 rounds = 18-30 tweens
- **Hardware**: Well-optimized tween system, no performance concerns expected

---

## Related Files

- `src/game/Sakura.js` - Game logic (MODIFIED)
- `src/utils/Card3DManager.js` - Animation system (no changes)
- `src/utils/LayoutManager.js` - Zone configuration (no changes)
- `src/utils/Card3D.js` - Tween implementation (no changes)

---

## Future Improvements

1. **Generic Helper**: Could create `animateCardZoneTransition()` helper method to avoid duplication between match and no-match cases
2. **Configurable Timing**: Allow animation duration to be configured per game mode
3. **Easing Curves**: Different easing for different card movements (draw vs. field placement)

---

## Commit Information

**File Modified**: `src/game/Sakura.js`
- Added 1 import: LayoutManager
- Modified: opponentDrawPhase() method, no-match logic section
- Lines affected: 16-20 (import), 1413-1463 (opponentDrawPhase refactor)
- Build status: ✅ Passing

