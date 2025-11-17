# Koi-Koi "Bomb" Variation - Investigation Report

## Executive Summary

The "bomb" variation is a **custom house rule** not found in standard Koi-Koi documentation. This variation allows players to play multiple matching cards from their hand simultaneously, receiving "bomb cards" (pass cards) to maintain hand balance.

## Web Research Findings

### What We Found
- **No Standard Documentation**: Extensive web search found no references to a "bomb" variation in traditional Koi-Koi rules
- **Standard Multi-Card Rule**: When 3 cards of the same month are on the field and the 4th is played, all 4 are captured automatically
- **Variation Abundance**: Koi-Koi has "as many house rules as there are houses" - this appears to be one such custom variation

### Related Rules Found
The closest standard rule is:
- **3-on-Field Capture**: If 3 cards of same month on field + you play 4th → capture all 4 cards
- **Choice on Double Match**: If 2 cards match on field → choose which to capture
- **Special 3-Card Scenario**: Some variations say if you match a card and draw the same month, all 3 stay on field until the 4th appears (not universally used)

## Bomb Variation Mechanics (As Described)

### How It Works

**Scenario 1: 2 matching cards in hand, 2 on field**
1. Player plays both hand cards
2. Captures both field cards (2 from hand + 2 from field = 4 total)
3. Receives 1 bomb card back to hand
4. Net result: -2 hand cards, +1 bomb card = -1 effective card

**Scenario 2: 3 matching cards in hand, 1+ on field**
1. Player plays all 3 hand cards
2. Captures field card(s)
3. Receives 2 bomb cards back to hand
4. Net result: -3 hand cards, +2 bomb cards = -1 effective card

**Bomb Card Behavior**
- Appears as a special card type in hand
- When selected on your turn: discarded immediately, no field interaction
- Acts as a "free pass" - turn continues to draw phase
- Does not add cards to field
- Cannot capture anything

### Mathematical Balance

The key insight is maintaining **equal card depletion** between players:

```
Standard turn: Play 1 card from hand → hand size -1
Bomb variation: Play N cards → Receive (N-1) bomb cards → hand size -1

Examples:
- Play 2 cards, get 1 bomb: 2 - 1 = 1 net decrease ✓
- Play 3 cards, get 2 bombs: 3 - 2 = 1 net decrease ✓
- Play 4 cards, get 3 bombs: 4 - 3 = 1 net decrease ✓
```

This ensures both players always play the same number of turns (8 per round).

## Current Implementation Analysis

### Existing Multi-Card Handling

The current code at `/home/user/hanafuda/src/game/KoiKoi.js` handles one multi-card scenario:

**Four-Card Celebration** (Lines 312-332, 375-398)
```javascript
checkFourCardCapture(playedCard, player) {
  const sameMonthOnField = this.field.filter(c => c.month === playedCard.month);

  if (sameMonthOnField.length === 3) {
    // Capture all 4 cards (3 from field + 1 played)
    this.field = this.field.filter(c => c.month !== playedCard.month);
    captured.push(playedCard, ...sameMonthOnField);
    return true;
  }
  return false;
}
```

**Key Characteristics:**
- Only handles single card play
- Automatically triggers on 3-on-field + 1-played
- Shows celebration message with 3600ms pause
- Updates yaku after capture

### What Needs to Change

To implement the bomb variation, we need:

#### 1. New Card Type
```javascript
// In src/data/cards.js - add new type
export const CARD_TYPES = {
  BRIGHT: 'bright',
  ANIMAL: 'animal',
  RIBBON: 'ribbon',
  CHAFF: 'chaff',
  BOMB: 'bomb'        // NEW: Special pass card
};
```

#### 2. Bomb Card Factory
```javascript
// Create bomb cards dynamically (not in deck)
createBombCard() {
  return {
    id: `bomb_${Date.now()}_${Math.random()}`,
    month: null,
    type: CARD_TYPES.BOMB,
    name: 'Bomb Card',
    points: 0,
    isBomb: true,
    image: 'assets/cards/bomb-card.png'  // Would need new asset
  };
}
```

#### 3. Multi-Card Selection UI

Currently, only single card selection is supported (KoiKoi.js:235-246):
```javascript
if (this.phase === 'select_hand' && owner === 'player') {
  this.selectedCards = [{ id: card.id, owner }];  // Single card only
  this.phase = 'select_field';
  return true;
}
```

**Needed Changes:**
- Allow multiple card selection if they share the same month
- Visual indicator for which cards are selected
- "Play Selected" button or double-click to confirm
- Validation: all selected cards must match same month

#### 4. Multi-Card Capture Logic

New method needed:
```javascript
captureMultipleCards(handCards) {
  const month = handCards[0].month;
  const fieldMatches = this.field.filter(c => c.month === month);

  // Remove from hand
  handCards.forEach(hc => {
    const idx = this.playerHand.findIndex(c => c.id === hc.id);
    if (idx >= 0) this.playerHand.splice(idx, 1);
  });

  // Remove from field
  this.field = this.field.filter(c => c.month !== month);

  // Add to captured
  this.playerCaptured.push(...handCards, ...fieldMatches);

  // Calculate bomb cards
  const totalPlayed = handCards.length;
  const bombsNeeded = totalPlayed - 1;

  // Add bomb cards back to hand
  for (let i = 0; i < bombsNeeded; i++) {
    this.playerHand.push(this.createBombCard());
  }

  // Continue to draw phase
  this.updateYaku('player', true);
  this.drawPhase();
}
```

#### 5. Bomb Card Play Handler

```javascript
playBombCard(bombCard) {
  // Remove bomb from hand
  const idx = this.playerHand.findIndex(c => c.id === bombCard.id);
  if (idx >= 0) this.playerHand.splice(idx, 1);

  // Don't add to field, don't capture
  this.message = 'Bomb card played - discarded';

  // Go directly to draw phase
  this.drawPhase();
}
```

#### 6. Game Options Integration

Add to `src/game/GameOptions.js`:
```javascript
this.defaults = {
  // ... existing options
  bombVariationEnabled: false,  // NEW: Toggle bomb variation
  // ...
};
```

#### 7. UI Changes Needed

**Hand Display:**
- Multi-select capability for cards of same month
- Visual feedback for selected cards (border, highlight)
- "Play Selected" button when 2+ cards selected
- Bomb card distinct visual (different back design)

**Field Interaction:**
- When playing multiple cards, show all matches
- Animation for multiple captures
- Bomb card return animation

**Opponent AI:**
- Logic to detect when to use multi-card play
- Strategic evaluation: is it worth using multiple cards?
- Bomb card management in AI hand

## Strategic Implications

### When to Use Multi-Card Play

**Advantages:**
✓ Capture multiple cards in one turn
✓ Potentially complete yaku faster
✓ Deny opponent field opportunities
✓ Clear hand of duplicate months

**Disadvantages:**
✗ Bomb cards are "dead" cards - no capture value
✗ Reduces future play options
✗ May reveal hand composition to opponent
✗ Risk leaving fewer real cards for later turns

### Example Scenario

**Situation:**
- Hand: [January-1, January-2, January-3, February-1, March-1, April-1, May-1, June-1]
- Field: [January-4, July-1, August-1, September-1, October-1]

**Option A: Standard Play**
- Play January-1, capture January-4
- 7 cards left in hand for 7 more turns

**Option B: Bomb Variation**
- Play all 3 January cards, capture January-4
- Get 2 bomb cards back
- 7 cards left (5 real + 2 bombs) for 7 more turns
- But 2 of those turns will be "wasted" on bombs

**Analysis:**
- Option B captures more January cards (good for chaff yaku)
- Option B reduces tactical flexibility
- Choice depends on yaku strategy and field state

## Implementation Complexity

### Difficulty Level: **Medium-High**

**Easier Parts:**
- Creating bomb card objects (trivial)
- Detecting multiple cards of same month (easy)
- Math for bomb card calculation (simple)

**Harder Parts:**
- UI for multi-card selection (requires significant refactoring)
- Animation coordination for multiple simultaneous plays
- Opponent AI strategy for multi-card decisions
- Edge case handling (what if all cards are bombs?)
- Testing all scenarios

**Estimated Work:**
- Core logic: 3-4 hours
- UI changes: 4-6 hours
- AI integration: 2-3 hours
- Testing & polish: 3-4 hours
- **Total: ~12-17 hours**

## Edge Cases to Consider

### 1. All Bombs Scenario
What if player's hand becomes all bomb cards?
- **Solution**: Still allow bomb play (free pass until draw phase)

### 2. Draw Phase After Multi-Play
If drawn card matches the month just cleared:
- **Solution**: Normal behavior - place on field (no matches exist)

### 3. Four-Card Celebration vs Multi-Play
If 3 on field, player has 2 in hand:
- **Current**: Play 1 card → automatic 4-card capture
- **With Bombs**: Play 2 cards → capture all, get 1 bomb back
- **Solution**: Allow both; multi-play requires explicit selection

### 4. Koi-Koi Decision Timing
Multi-capture might trigger yaku:
- **Solution**: Use existing deferred decision logic (already in place)

### 5. Opponent Visibility
Should opponent see bomb cards in your hand?
- **Solution A**: Show as "?" (mystery card)
- **Solution B**: Show distinct bomb back
- **Recommendation**: Mystery card maintains strategy

### 6. Last Turn with Bombs
Player's last card is a bomb:
- **Solution**: Play bomb, draw, end turn normally

## Recommendation

This variation is **implementable but non-standard**. Before proceeding with implementation, consider:

### Questions to Answer:
1. **Is this a known variant?**
   - Ask the user where they encountered this rule
   - Is it from a video game, regional variant, or custom creation?

2. **Game Balance**
   - Has this been playtested for balance?
   - Does it favor aggressive or defensive play?

3. **User Demand**
   - Is this for personal use or public release?
   - Should it be opt-in via game options?

4. **Asset Requirements**
   - Need to create bomb card graphics
   - Need multi-select UI elements

### Suggested Approach:
1. **Phase 1**: Implement as optional game mode (add to GameOptions)
2. **Phase 2**: Create minimal viable version (simple UI)
3. **Phase 3**: Test with human players
4. **Phase 4**: Refine AI strategy
5. **Phase 5**: Polish animations and UX

## Files That Would Need Modification

| File | Changes Required | Complexity |
|------|-----------------|------------|
| `src/data/cards.js` | Add BOMB card type | Low |
| `src/game/KoiKoi.js` | Multi-select logic, bomb handling, capture logic | High |
| `src/game/GameOptions.js` | Add `bombVariationEnabled` option | Low |
| `src/rendering/Renderer.js` | Multi-select UI, bomb card rendering | Medium-High |
| `src/rendering/CardRenderer.js` | Bomb card visual design | Medium |
| `src/main.js` | UI controls for multi-select | Medium |
| `assets/cards/` | New bomb card image | N/A (asset creation) |

## Next Steps

If you'd like to proceed with implementation, I can:

1. **Create a detailed implementation plan** with step-by-step code changes
2. **Implement a basic version** with minimal UI for testing
3. **Create a prototype** that demonstrates the core mechanic
4. **Add comprehensive testing** for edge cases

Would you like me to proceed with implementation, or do you have questions about this analysis?

---

**Investigation Date**: 2025-11-03
**Status**: Analysis Complete - Awaiting Decision on Implementation
