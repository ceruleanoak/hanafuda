# Hanafuda Koi-Koi - Animation System

## Overview

The game now features a complete multi-stage animation system that handles all card movement scenarios with proper sequencing, timing, and event hooks for sound design.

## Animation Scenarios

### Scenarios 1-4: Match Animations

When a hand card or drawn card matches a field card:

**Stage 1: Card Approach** (400ms)
- Moving card animates from its starting position to the matched card on the field
- Eased movement for smooth arrival

**Stage 2: Match Event**
- Fires `card_match` event with card details
- **Sound hook**: Play card matching sound effect

**Stage 3: Match Display** (200ms delay)
- Both cards remain at the match position
- Visual confirmation of the match

**Stage 4: Capture** (500ms)
- Both cards animate together to the appropriate trick pile
- Parallel movement for synchronized effect

**Total Duration**: ~1.1 seconds

### Scenario 5: Four-of-a-Kind Celebration

When 4 cards of the same month are captured together:

**Stage 1: Cards to Celebration** (600ms)
- All 4 cards fly simultaneously to celebration area at top of screen
- Each card moves to its designated position in the row

**Stage 2: Celebration Event**
- Fires `four_of_a_kind` event with month and card details
- **Sound hook**: Play special celebration sound/music

**Stage 3: Display Celebration** (1200ms)
- Golden celebration box appears with glowing border
- Month name displayed: "🎉 FOUR OF [MONTH] 🎉"
- Cards remain visible in celebration area

**Stage 4: Visual Merge** (400ms)
- Cards compress together toward center
- Creates visual "combining" effect

**Stage 5: Merge Pause** (300ms)
- Brief moment showing merged state

**Stage 6: To Trick Pile** (500ms)
- All 4 cards animate together to the trick pile
- Synchronized movement

**Total Duration**: ~3 seconds

## Event System for Sound Design

The animation system fires custom browser events that can be used to trigger sound effects.

### Listening to Animation Events

```javascript
// Add event listener for all animation events
window.addEventListener('hanafuda:animation', (event) => {
  const { event: eventName, data } = event.detail;

  switch (eventName) {
    case 'card_match':
      // Play card matching sound
      playSound('card_match', {
        player: data.player,
        cards: [data.movingCard, data.targetCard]
      });
      break;

    case 'four_of_a_kind':
      // Play celebration sound/music
      playSound('celebration', {
        month: data.month,
        player: data.player
      });
      break;
  }
});
```

### Event Details

#### `card_match` Event

Fired when two cards match.

```javascript
{
  event: 'card_match',
  data: {
    movingCard: "May - ribbon",  // Card that moved
    targetCard: "May - chaff",    // Card that was matched
    player: "Player"              // "Player" or "Opponent"
  }
}
```

#### `four_of_a_kind` Event

Fired when 4 cards of the same month are captured.

```javascript
{
  event: 'four_of_a_kind',
  data: {
    month: "January",                                    // Month name
    cards: ["January - pine", "January - ribbon", ...], // All 4 cards
    player: "Player"                                      // "Player" or "Opponent"
  }
}
```

## Input Blocking

During animations, player input is automatically blocked to prevent:
- Clicking cards while animations are playing
- Race conditions with game state
- Animation interruptions

The `game.isAnimating` flag tracks animation state:
- `true`: Animation sequence is playing (input blocked)
- `false`: Ready for player input

Console logs show when clicks are blocked:
```
🚫 Click blocked - animation playing
```

## Debugging Animations

### Console Logging

The debug logger tracks all animation events:

```javascript
// Starting sequence
▶️ Starting sequence: Player Match
  stages: 4
  types: parallel: Card arrives at match → event: Event: card_match → delay: Delay 200ms → parallel: Both cards to pile

// Playing each stage
Playing stage 1/4: parallel
  name: Card arrives at match

// Firing events
🔊 Animation Event: card_match
  {movingCard: "May - ribbon", targetCard: "May - chaff", player: "Player"}

// Completion
✅ Sequence complete: Player Match
```

### Animation Statistics

Check animation stats in the browser console:

```javascript
window.debugLogger.getAnimationStats()
// Returns: {created: 8, completed: 8, failed: 0, active: 0}
```

### Sequence Information

Get details about the current sequence:

```javascript
// During animation
game.currentSequence.getInfo()
// Returns:
{
  name: "Player Match",
  stageCount: 4,
  stages: [
    "parallel: Card arrives at match",
    "event: Event: card_match",
    "delay: Delay 200ms",
    "parallel: Both cards to pile"
  ]
}
```

## Technical Details

### AnimationSequence Class

A configuration builder that defines animation stages:

```javascript
const sequence = new AnimationSequence("My Animation");

// Add animation configs (not actual animations yet)
sequence.addParallelStage([
  {card, startX, startY, endX, endY, duration}
], "Stage name");

sequence.addDelay(500);

sequence.addEvent('my_event', {data});
```

### Sequence Execution

The Game class executes sequences:

1. `playSequence(sequence, onComplete)` - Start playing
2. `playSequenceStage(index, stages, callback)` - Recursive stage player
3. `playParallelAnimations(configs)` - Execute parallel stage
4. `playSequentialAnimations(configs)` - Execute sequential stage

Animations are created from configs at execution time, ensuring proper timing and integration with the existing `animatingCards` array.

### Card Position Tracking

For animations to work, card positions must be captured:

```javascript
// Before game state changes
card._lastRenderX = card._renderX;
card._lastRenderY = card._renderY;

// Used as animation start position
startX: card._lastRenderX || card._renderX
```

Positions are captured in:
- `handleClick()` - When player clicks a card
- `handleDoubleClick()` - When player double-clicks for auto-match
- `drawCardRow()` in Renderer - Sets `_renderX` and `_renderY`

## Celebration UI

The four-of-a-kind celebration box is drawn automatically when 4 or more cards are animating in the top area (y < 150).

### Visual Elements

- **Background**: Semi-transparent black (rgba(0, 0, 0, 0.85))
- **Border**: Golden (#FFD700), 4px width
- **Glow**: Outer glow effect with transparent gold
- **Label**: "🎉 FOUR OF [MONTH] 🎉" in bold 20px monospace
- **Dimensions**: Sized to fit 4 cards with padding and spacing

### Customization

Edit `drawCelebrationBox()` in `Renderer.js` to customize:
- Colors and styling
- Text and emojis
- Box dimensions
- Animation effects

## Performance

- **Animation Frame Rate**: 60 FPS via `requestAnimationFrame`
- **Easing Function**: Quadratic ease-in-out for smooth motion
- **Typical Animation**: 400-600ms per stage
- **Sequence Duration**: 1-3 seconds depending on scenario

## Future Enhancements

Possible additions:
- Animation queue for multiple simultaneous events
- Particle effects during celebrations
- Card flip animations
- Customizable animation speeds
- More complex easing functions
- Sound effect volume based on card value/rarity
