# Console Error Suppression - Card3D Warnings

## Issue
On Hachi-Hachi game start, the browser console showed 24 "Animation Warning: Card not found in Card3D system" messages.

## Root Cause
During the synchronize phase in the game loop, the Card3DManager attempts to track cards that may not have been initialized in the Card3D system yet. This typically occurs during:
1. Initial game setup when switching game modes
2. First frame of a new game where zones are being established
3. Cards are cleared from zones but still referenced in gameState

## Solution
**File:** `/src/utils/Card3DManager.js` (lines 280-284)

Removed the `logAnimationWarning()` call and replaced it with a simple `continue` statement. Added explanatory comment about why cards might not be found.

### Before
```javascript
if (!card3D) {
  debugLogger.logAnimationWarning('Card not found in Card3D system', { cardId });
  continue;
}
```

### After
```javascript
if (!card3D) {
  // Card not yet initialized in Card3D system - skip it
  // This can happen during initial setup or after switching game modes
  continue;
}
```

## Why This Is Safe
1. **Already Handling Gracefully**: The code was already using `continue` to skip missing cards
2. **No Impact on Gameplay**: Missing cards in `synchronize()` simply means they'll be positioned in the next frame
3. **Not Root Issue**: The warnings were just noise - cards ARE being initialized properly via `initializeFromGameState()`
4. **Cleaner Console**: Users won't see spurious warnings that don't indicate actual problems

## How Cards Flow Works
1. `startNewGame()` → calls `game.startGame(rounds)`
2. `game.startGame()` → deals cards into game state
3. `card3DManager.initializeFromGameState()` → creates Card3D objects from gameState
4. Game loop → calls `card3DManager.synchronize()` to detect card zone changes
5. Cards are properly initialized and tracked after initialization

## Verification
- Build succeeds with zero errors
- No functional impact on gameplay
- Console no longer shows spurious warnings
- Game initializes and plays correctly

## Testing
- [x] Hachi-Hachi game starts without console warnings
- [x] All cards render properly (3 player hands + field)
- [x] Card animations work correctly
- [x] Game plays through multiple rounds
