# Hachi-Hachi Card Selection Fix

## Problem Statement
Card selection and deselection was broken:
1. Clicking a card from hand would always enter `select_field` phase
2. Could not unselect/change selection by clicking a different card
3. No way to place unmatched cards on the field
4. Clicking non-matching cards would incorrectly accept them

## Root Cause
The original `selectCard()` method lacked the full state machine logic needed to handle:
- Switching between different hand card selections
- Placing cards on field when no matches exist
- Proper deselection and re-selection workflows

## Solution
Implemented the complete card selection state machine following Sakura's proven pattern.

## Changes Made

### 1. Enhanced selectCard() Method
**File:** `/src/game/HachiHachi.js` (lines 235-289)

The new implementation handles all four scenarios:

#### Scenario 1: Hand card selection in `select_hand` phase
- Click hand card → store it, find matches, move to `select_field` phase
- Message shows whether matches exist and what action to take next

#### Scenario 2: Field card click in `select_field` phase
- Click field card → call `selectFieldCard()` to match and capture
- Only works if card's month matches selected hand card

#### Scenario 3: Click same hand card again in `select_field` phase
- Click the already-selected hand card → place it on field
- Calls new `placeCardOnField()` method
- Works even if there were matching cards (gives player choice)

#### Scenario 4: Click different hand card in `select_field` phase
- Click a different hand card → switch selection to new card
- Finds matches for new card, updates messages
- Player can now change their mind without starting over

### 2. New placeCardOnField() Method
**File:** `/src/game/HachiHachi.js` (lines 294-313)

```javascript
placeCardOnField(card) {
  // Verify we're placing the same card that was selected
  if (this.selectedCards.length === 0 || this.selectedCards[0].id !== card.id) {
    return false;
  }

  const currentPlayer = this.players[this.currentPlayerIndex];

  // Remove from hand and add to field
  currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== card.id);
  this.field.push(card);

  // Clear selection and proceed to draw phase
  this.selectedCards = [];
  this.drawnCardMatches = [];
  this.proceedToDrawPhase();

  return true;
}
```

**Purpose:** Allows unmatched cards to be placed on the field. Called when:
- Player clicks the same card twice, OR
- Main.js calls it for double-click action on unmatched cards

## UX Flow

### Example 1: Card with matches
```
Player hand: January (Bright), February (Animal), March (Animal)
Field: January (Bright), May (Ribbon)

1. Click January from hand
   → Message: "Click matching January card to capture, or click the card again to place on field"
   → Phase: select_field
   → drawnCardMatches: [January Bright]

2. Click January on field
   → January and January Bright captured
   → Proceed to draw phase

OR

2. Click the January in hand again
   → January placed on field instead
   → Proceed to draw phase

OR

2. Click February in hand (different card)
   → Selection switches to February
   → drawnCardMatches: [] (no February on field)
   → Message: "Click the card again to place on field, or click a different card"
```

### Example 2: Card without matches
```
Player hand: January (Bright), February (Animal)
Field: May (Ribbon), November (Bright)

1. Click January from hand
   → Message: "Click the card again to place on field, or click a different card"
   → drawnCardMatches: [] (no January on field)

2. Click January in hand again
   → January placed on field
   → Proceed to draw phase

OR

2. Click February in hand
   → Selection switches to February
   → drawnCardMatches: [] (no February on field)
```

## Files Modified
- `/src/game/HachiHachi.js`
  - Enhanced `selectCard()` method (lines 235-289)
  - New `placeCardOnField()` method (lines 294-313)

## Build Status
✅ `npm run build` - Zero errors
- 31 modules transformed
- dist/assets/index.js: 307.10 kB (gzip: 71.97 kB)
- Build time: 471ms

## Testing Checklist
- [ ] Click a hand card - should enter `select_field` phase
- [ ] Click a matching field card - should capture both
- [ ] Click the same hand card again - should place on field
- [ ] Click a different hand card - should switch selection
- [ ] Click unmatched card, then click it again - should place on field
- [ ] Card deselection works correctly (no unwanted "sticky" selections)
- [ ] Message updates match the current game state
- [ ] Play through full round with multiple card placements

## Architecture Notes

### State Machine
```
select_hand (initial player turn state)
  ↓ click hand card
select_field (card selected, awaiting field action)
  ├→ click field card → selectFieldCard() → capture or draw
  ├→ click same card → placeCardOnField() → place on field or draw
  └→ click different card → switch selection (stay in select_field)
```

### Consistency with Sakura
This implementation follows the exact state machine pattern from Sakura.js, ensuring:
- Player behavior is predictable and consistent across game modes
- Code is maintainable and follows established patterns
- Future enhancements (like Gaji wild cards) can be added following the same pattern
