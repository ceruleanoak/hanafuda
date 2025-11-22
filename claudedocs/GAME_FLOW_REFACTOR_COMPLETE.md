# Game Flow Refactor - Complete Sakura Pattern Implementation

## Overview
Successfully completed refactoring of Hachi-Hachi game flow to match Sakura's proven async architecture with proper phase transitions and animation timing delays.

## Key Changes Made

### 1. Removed Stub update() Method
**File:** `/src/game/HachiHachi.js` (previously lines 551-556)

The unused `update(deltaTime)` method has been removed. The new architecture uses `setTimeout()` callbacks within methods instead of a frame-based update loop.

### 2. Async Phase Architecture with setTimeout()

#### proceedToDrawPhase() - Lines 354-393
Refactored to handle both matched and unmatched draw outcomes with proper animation timing:

**Flow for unmatched draw:**
1. Transition to `drawing` phase
2. Draw card from deck
3. Check field for matches
4. If no matches: add to field
5. **300ms delay** via `setTimeout(() => this.nextPlayer())`
6. Proceed to next player

**Flow for matched draw:**
1. Transition to `drawing` phase
2. Draw card from deck
3. Transition to `playing` phase
4. **400ms delay** shows drawn card before capture
5. Auto-capture matched cards + detect dekiyaku
6. **300ms delay** before `nextPlayer()`
7. Proceed to next player

#### nextPlayer() - Lines 398-420
New phase-based routing for 3-player turns:

1. Increment player index (mod 3)
2. Check if deck exhausted → `endRound()`
3. Route based on current player:
   - **Player 0 (Human):** Set to `select_hand` phase
   - **Player 1, 2 (AI):** Set to `opponent_turn` phase
4. For AI players: **500ms delay** via `setTimeout(() => this.opponentTurn())`
   - Allows UI to update before AI move
   - Prevents instant card flickering

#### opponentTurn() - Lines 425-457
Complete AI turn handler following Sakura pattern:

1. Guard clause: Return if not in `opponent_turn` phase
2. Get AI player's hand
3. Simple AI logic: prefer matching cards
   - Find cards that match field months
   - Use first match if available, else first card
4. Call `selectCard()` to enter `select_field` phase
5. Two possible outcomes:
   - **If matches exist:**
     - **400ms delay** then call `selectFieldCard()` to capture
   - **If no matches:**
     - **400ms delay** then call `placeCardOnField()` to place on field
6. After capture/placement: `selectFieldCard()` and `placeCardOnField()` call `proceedToDrawPhase()` automatically

### 3. State Machine Clarity

```
Initial Setup
├─ Teyaku Payment (initial only)
└─ Main Play Loop:

   select_hand (Human player's turn)
   ├─ Player selects hand card
   └─ → select_field phase

   select_field (Awaiting field action)
   ├─ Click field card → selectFieldCard() → proceedToDrawPhase()
   ├─ Click same card → placeCardOnField() → proceedToDrawPhase()
   └─ Click different card → switch selection (stay in select_field)

   drawing (Card drawn from deck)
   ├─ Unmatched: field.push(card) → 300ms delay → nextPlayer()
   └─ Matched: playing phase → 400ms delay → capture → 300ms delay → nextPlayer()

   opponent_turn (AI player's turn)
   └─ 500ms delay → opponentTurn()
       ├─ selectCard() (enters select_field state)
       ├─ Check matches
       ├─ 400ms delay for animation
       └─ selectFieldCard() or placeCardOnField() → proceedToDrawPhase()

   Loop repeats until deck exhausted → endRound()
```

### 4. Animation Timing Summary

| Phase Transition | Delay | Purpose |
|------------------|-------|---------|
| unmatched draw → nextPlayer | 300ms | Allow field card placement animation |
| draw card shown (matched) | 400ms | Let user see drawn card before capture |
| capture → nextPlayer | 300ms | Show capture animation |
| nextPlayer → AI turn | 500ms | UI update, prevent card flicker |
| AI selectCard → action | 400ms | Animation consistency |

**Total round time for 3 cards played:** ~3.5-4 seconds minimum
- Human: ~0.3s (no delay if unmatched)
- AI1: ~1.2s (500ms delay + 400ms card action + 300ms next)
- Draw: ~0.7s
- AI2: ~1.2s
- Draw: ~0.7s
- (repeat)

## Build Status
✅ **npm run build** - Zero errors
- 31 modules transformed
- dist/assets/index.js: 307.49 kB (gzip: 72.00 kB)
- Build time: 514ms

## Verification Checklist

### Code Quality
- [x] Removed stub `update()` method
- [x] All phase transitions use setTimeout()
- [x] Guard clauses in AI methods
- [x] Proper error handling for deck exhaustion
- [x] Dekiyaku detection uses correct method name

### Game Flow
- [x] Human player can select cards in select_hand phase
- [x] Clicking field cards enters select_field phase
- [x] Card matching/placement calls proceedToDrawPhase()
- [x] AI players transition through opponent_turn phase
- [x] Animation delays prevent instant card flickering
- [x] Deck exhaustion triggers endRound()

### Architecture Patterns
- [x] Matches Sakura's async setTimeout pattern
- [x] Three distinct phases: select_hand → select_field → drawing
- [x] AI turns properly scheduled with delays
- [x] No synchronous AI blocking
- [x] Card3D animations have time to complete

## Next Steps

If issues arise, check:
1. **Game doesn't progress:** Verify `nextPlayer()` is called after each action
2. **Cards flash instantly:** Check setTimeout delays are in place
3. **AI moves too fast:** Verify 500ms delay before `opponentTurn()`
4. **Animations interrupted:** Ensure UI callbacks complete before next action
5. **Deck exhaustion:** Verify `deck.count` check in `nextPlayer()`

## Files Modified
- `/src/game/HachiHachi.js` - Complete game flow refactor
  - Removed: `update()` method (was lines 551-556)
  - Refactored: `proceedToDrawPhase()` (lines 354-393)
  - Refactored: `nextPlayer()` (lines 398-420)
  - Added: `opponentTurn()` (lines 425-457)

## Architecture Consistency
This implementation now exactly follows Sakura's proven patterns:
1. **Async callbacks** instead of synchronous AI moves
2. **Phase-based routing** for turn management
3. **setTimeout() delays** for animation timing
4. **Guard clauses** to prevent out-of-phase actions
5. **Simple AI logic** prioritizing matches over random plays

The only differences between Sakura and Hachi-Hachi are now purely rules-based (teyaku, dekiyaku, field multipliers), not architectural.
