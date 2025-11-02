# Animation & Debug Logging System

## Overview

This document describes the comprehensive logging and debugging system implemented for the Hanafuda Koi-Koi game, specifically focused on diagnosing animation issues.

## Debug Logger

The game now includes a centralized debug logging system (`src/utils/DebugLogger.js`) that tracks:

1. **Animation Events**
   - Animation creation (with start/end positions)
   - Animation progress (at 25%, 50%, 75% intervals)
   - Animation completion
   - Animation warnings and failures

2. **Game Messages**
   - All messages displayed to the player
   - Message history tracking
   - Game state changes

3. **Game State Changes**
   - Phase transitions
   - Card captures
   - Field changes
   - Player/opponent actions

4. **Rendering**
   - Frame rendering (can be enabled)
   - Card position tracking
   - Render errors

## Using the Debug Logger

### In Browser Console

The debug logger is available globally in the browser console:

```javascript
// Show debug summary
window.debugLogger.printSummary()

// Get animation statistics
window.debugLogger.getAnimationStats()

// Get message history
window.debugLogger.getMessageHistory()

// Enable/disable logging
window.debugLogger.setEnabled(true)  // or false

// Enable/disable specific categories
window.debugLogger.setCategoryEnabled('animation', true)
window.debugLogger.setCategoryEnabled('render', true)  // Very verbose!
```

### Log Categories

- **animation**: Animation creation, progress, completion
- **message**: Player-visible messages
- **gameState**: Game state changes, phase transitions
- **render**: Frame rendering (disabled by default, very verbose)
- **error**: Errors and warnings

### Color Coding

Logs are color-coded for easy identification:
- 🟡 **Yellow**: Animation events
- 🔵 **Cyan**: Messages and game info
- 🟣 **Purple**: Game state changes
- ⚪ **Gray**: Render events
- 🔴 **Red**: Errors and warnings

## Animation System Flow

### 1. Card Click
```
User clicks card
  ↓
Card render position captured (_lastRenderX, _lastRenderY)
  ↓
Game state changes
  ↓
handleGameStateChange() detects state changes
  ↓
Animations created with start/end positions
  ↓
Animation objects added to animatingCards array
```

### 2. Animation Loop
```
gameLoop() runs at 60fps
  ↓
updateAnimations(deltaTime) called
  ↓
For each animation:
  - Update progress
  - Calculate eased position
  - Update card._animX and card._animY
  - Log progress at intervals
  ↓
Animation completes when progress >= 1
  ↓
Card removed from animatingCards array
```

### 3. Rendering
```
renderer.render() called
  ↓
Create set of animating card IDs
  ↓
Draw static cards (exclude animating ones)
  ↓
drawAnimatingCards() draws cards at animation positions
  ↓
Cards drawn on top layer
```

## Fallback Mechanisms

The system includes several fallback mechanisms:

1. **Missing Render Positions**: If a card's render position isn't captured, the system uses zone-based fallback positions (field, player_hand, etc.)

2. **Error Handling**: All animation operations are wrapped in try-catch blocks to prevent crashes

3. **Animation Failure Recovery**: Failed animations are removed from the queue and logged

4. **Game Loop Protection**: The game loop continues even if errors occur in animation or rendering

## Common Issues and Diagnostics

### Issue: No animations visible

**Check the console for:**
1. "Game loop started" - Confirms the game loop is running
2. "Animation Created" logs - Confirms animations are being created
3. Animation warnings - May indicate missing positions or other issues

**Diagnostic commands:**
```javascript
// Check if animations are being created
window.debugLogger.getAnimationStats()
// Should show: { created: X, completed: Y, failed: Z, active: N }

// Check message history
window.debugLogger.getMessageHistory()
// Should show all player messages

// Enable render logging to see what's being drawn
window.debugLogger.setCategoryEnabled('render', true)
```

### Issue: Animations created but not completing

**Check for:**
- Animation stats showing `active` count stuck at a number
- Animation progress logs stopping at a certain percentage
- Render errors

### Issue: Cards not being captured for animation

**Check for:**
- "Card clicked but has no render position" warnings
- "Card missing _lastRenderX" warnings
- Look at card click logs to see if render positions are being set

## Animation Statistics

The debug logger tracks:
- `created`: Total animations created
- `completed`: Total animations completed successfully
- `failed`: Total animations that failed
- `active`: Current number of active animations

These statistics help identify if animations are:
1. Being created (created > 0)
2. Running (active > 0)
3. Completing (completed increases over time)
4. Failing (failed > 0 indicates problems)

## Example Debug Session

```javascript
// 1. Start a game and make a move

// 2. Check animation stats
window.debugLogger.getAnimationStats()
// Output: { created: 2, completed: 2, failed: 0, active: 0 }

// 3. Check recent messages
window.debugLogger.getMessageHistory()
// Output: Array of message objects with timestamps

// 4. Print full summary
window.debugLogger.printSummary()
// Output: Complete debug summary with all stats and recent messages
```

## Performance Impact

- **Low**: Animation and message logging
- **Medium**: Game state logging
- **High**: Render logging (disabled by default)

For production, you can disable logging:
```javascript
window.debugLogger.setEnabled(false)
```
