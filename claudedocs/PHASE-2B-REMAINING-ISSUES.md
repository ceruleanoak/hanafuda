# Phase 2B: Remaining Issues to Fix

**Date**: 2025-11-14
**Status**: In Progress - Multiple UI issues identified during implementation

---

## Critical Issues

### 1. Opponent Hand Card Animation - NOT FIXED ❌

**Problem**: When opponent plays a card from hand, the animation sequence is broken:
- Card should be SHOWN in center popup for 600ms BEFORE any match checking
- When there IS a match, the card must remain visible during the match/capture animation
- Current implementation may be clearing the display too early, preventing the user from seeing what card was played

**Expected Behavior**:
1. Opponent selects card → Set `opponentPlayedCard` and phase to `opponent_playing`
2. Show card in popup for 600ms (card3DManager shows hand→field transition)
3. THEN check for matches (after 600ms delay)
4. Keep card displayed while match animates (total ~1200ms)
5. Move to draw phase

**Current Code Issue**: The sequence of setTimeout calls may not properly wait for animation completion between state changes.

---

### 2. Score Screen Modal - COMPLETELY BROKEN ❌

**Problem**: Score screen still shows 2P layout even in 3P/4P games. Example from user:
```
Game Over - Opponent Wins!

This Round
You: 25 pts
Opponent: 45 pts

Total Score
You: 25 pts
Opponent: 45 pts
```

Should instead show:
```
Game Over - Opponent Wins!

This Round & Total Scores
You: 25 pts | Opponent 1: 45 pts | Opponent 2: 30 pts
[And other opponents...]
```

**Root Causes**:
1. Multi-player layout not being triggered despite `data.playerCount > 2` check
2. HTML structure may not be properly switching between 2P and multi-player layouts
3. Modal not expanding to fill 80%+ of screen width as required
4. Player labels still showing "Player 1", "Player 2" instead of "You", "Opponent 1", "Opponent 2"

**Requirements**:
- Modal should be WIDE (80-90% of viewport width)
- All players shown in ONE row (side-by-side cards, not stacked)
- Clear visual distinction for "You" (yellow highlight)
- Opponent labels as "Opponent 1", "Opponent 2", etc.

---

### 3. Trick Pile Display - Shows Undefined Values ⚠️

**Problem**: When hovering over trick piles to see captured cards, text shows "(undefined)" or similar for card values.

**Issue**: The trick pile text list shows card names with values in parentheses, but Sakura card.value property may be undefined.

**Example**: Instead of showing `• Pine (4 pts)`, it might show `• Pine (undefined)`

**Fix**: Need to conditionally display values only if they exist, or format differently for Sakura mode.

---

### 4. Gaji Animation Not Playing ⚠️

**Problem**: When opponent draws a Gaji card, the animation doesn't play properly.

**Status**: Uncertain if this is a display issue or a logical bug in the gaji handling.

**Related Code**: `handleOpponentGajiFromHand()` and `handleOpponentGajiDrawn()` methods.

---

## Implementation Notes

### Multi-Player Score Screen Requirements
The score screen MUST:
1. Detect `data.playerCount > 2` and show different layout
2. Create a WIDE modal (90vw recommended)
3. Display all players horizontally in card format
4. Show both Round and Total scores for each player
5. Highlight "You" (player 0) with distinct styling
6. Label as "You", "Opponent 1", "Opponent 2", etc.
7. NO scrolling needed - all players visible at once

### Opponent Card Animation Requirements
The animation sequence MUST:
1. Display card immediately when selected (opponent_playing phase)
2. Keep card displayed for entire animation duration
3. Only check matches AFTER display period begins
4. Handle Gaji cards with same timing approach
5. Ensure card3DManager can animate hand→field/capture smoothly

### Trick Pile Display
Need to:
1. Check if card has a `value` property before displaying
2. Format text appropriately for Sakura (no pts if undefined)
3. Ensure all players' trick piles work in 3-4P mode

---

## Files to Modify

- `src/main.js` - displayMultiplayerScores() needs complete rewrite + modal width handling
- `src/game/Sakura.js` - opponentTurn() animation sequence needs review
- `src/rendering/Renderer.js` - drawTrickTextList() formatting for Sakura
- `src/styles.css` - Modal width and multi-player grid layout
- `src/index.html` - Verify multi-player score layout structure

---

## Testing Checklist

When fixes are complete, verify:
- [ ] 2P game shows old score layout (unchanged)
- [ ] 3P game shows new wide modal with 3 player cards
- [ ] 4P game shows new wide modal with 4 player cards
- [ ] "You" card has yellow highlight
- [ ] Opponent labels show "Opponent 1", "Opponent 2", etc.
- [ ] Opponent plays card and animation is smooth
- [ ] Match animations work with card visible
- [ ] Trick piles show captured cards without "(undefined)"
- [ ] Gaji cards animate properly

---

## Estimated Effort

- Score screen modal fix: 1-2 hours
- Opponent card animation review: 30 minutes - 1 hour
- Trick pile formatting: 15-30 minutes
- Gaji animation debug: 30 minutes - 1 hour
- Testing all fixes: 30 minutes

**Total**: 3-5 hours for complete Phase 2B resolution
