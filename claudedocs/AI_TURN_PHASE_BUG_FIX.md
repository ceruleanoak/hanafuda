# Critical Bug Fix: AI Turn Phase Handling

## Problem
Game never progressed to opponent's turn. After human player selected and matched cards, the game would get stuck in `opponent_turn` phase and not proceed.

## Root Cause
The `selectCard()` method had a phase check that only allowed hand card selection in `select_hand` phase:

```javascript
// BEFORE (BUG)
if (this.phase === 'select_hand' && owner === 'player') {
  // Handle hand card selection
}
```

However, when `opponentTurn()` tried to select an AI card, the phase was `opponent_turn` (not `select_hand`), so this condition failed:

```javascript
// In opponentTurn() - line 443
this.selectCard(cardToPlay, 'player');  // Phase is 'opponent_turn', not 'select_hand'!
```

This caused the AI card selection to return `false`, and subsequent calls to `selectFieldCard()` or `placeCardOnField()` would fail because `selectedCards` was never populated.

## Solution
Modified the phase check at line 242 to accept both `select_hand` AND `opponent_turn` phases:

```javascript
// AFTER (FIX)
if ((this.phase === 'select_hand' || this.phase === 'opponent_turn') && owner === 'player') {
  // Handle hand card selection for both human and AI
}
```

## Files Modified
- `/src/game/HachiHachi.js` - Line 242

## State Flow With Fix
```
select_hand (human player)
  ↓ [player clicks hand card]
select_field (human selects match or places card)
  ↓ [after capture or placement]
drawing (auto-draw for human)
  ↓ [300-400ms animation delay]
nextPlayer() → currentPlayerIndex++
  ↓ [if AI player]
opponent_turn
  ↓ [500ms delay via setTimeout]
opponentTurn()
  → selectCard(card, 'player')  ✅ NOW WORKS (phase check accepts opponent_turn)
  → phase becomes select_field
  ↓ [400ms delay for animation]
  → selectFieldCard() or placeCardOnField()
  ↓
proceedToDrawPhase()
  ↓ [300-400ms animation delay]
nextPlayer() → currentPlayerIndex++
  ↓ [cycle continues]
```

## Why This Fix Is Correct

1. **Both phases handle the same logic**: In `select_hand`, a human selects a hand card. In `opponent_turn`, an AI selects a hand card. The logic is identical - find matches and enter `select_field` phase.

2. **No conflicts with existing logic**: The fix doesn't change behavior for human players - it only extends the existing logic to also work when phase is `opponent_turn`.

3. **Maintains phase progression**: After `selectCard()` completes, phase becomes `select_field` regardless of whether the caller was human or AI. Subsequent game logic is identical.

4. **Guard clause still works**: The `opponentTurn()` method checks `if (this.phase !== 'opponent_turn')` before proceeding, preventing race conditions if called out-of-phase.

## Build Status
✅ **npm run build** - Zero errors
- 31 modules transformed
- dist/assets/index.js: 307.52 kB (gzip: 72.01 kB)
- Build time: 608ms

## Expected Behavior Now
1. Human player selects cards and matches/places them
2. Game draws a card for human
3. Game transitions to opponent_turn phase
4. 500ms delay for UI update
5. AI player automatically selects a card (using simple matching logic)
6. AI card enters select_field phase
7. 400ms animation delay
8. AI either matches or places the card
9. Game draws card for AI
10. Game transitions to next opponent
11. Loop continues until deck exhausted

The fix enables the critical `opponent_turn` → `opponentTurn()` → `selectCard()` flow that was completely broken before.
