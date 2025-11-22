# Hachi-Hachi UI Improvements

## Summary
Fixed the Hachi-Hachi game mode UI to properly show round selection (like Koi-Koi), skipping the unused Sakura multi-player selection screen. Also fixed teyaku payment grid display to show correct values.

## Changes Made

### 1. Round Selection UI (main.js)
**Purpose:** Show the round selection modal when starting Hachi-Hachi, same as Koi-Koi

#### Change A: Initialization (lines 272-275)
- **Before:** Hachi-Hachi was not showing the round modal during initialization
- **After:** Now calls `this.showRoundModal()` during initialization, same as Sakura/Koi-Koi

```javascript
// BEFORE (line 274)
this.switchGameMode('hachihachi');

// AFTER (lines 274-275)
this.switchGameMode('hachihachi');
this.showRoundModal();
```

#### Change B: Game Mode Switching (lines 955-957)
- **Before:** `switchGameMode('hachihachi')` immediately started the game
- **After:** Shows round modal instead, consistent with Sakura/Koi-Koi pattern

```javascript
// BEFORE (lines 954-965)
} else if (mode === 'hachihachi') {
  // For Hachi-Hachi mode, initialize 3-player game
  this.card3DManager.setPlayerCount(3);
  this.game.startGame();
  this.updateUI();
  // ... initialization code ...
}

// AFTER (lines 955-957)
} else if (mode === 'hachihachi') {
  // For Hachi-Hachi mode, show round modal (similar to Koi-Koi/Sakura)
  this.showRoundModal();
}
```

#### Change C: Game Start (lines 814-817)
- **Before:** Hachi-Hachi had no handler in `startNewGame()`
- **After:** Properly initializes 3-player Card3D system and starts game with selected round count

```javascript
// ADDED (lines 814-817)
} else if (this.currentGameMode === 'hachihachi') {
  // Hachi-Hachi uses rounds (always 3 players)
  this.card3DManager.setPlayerCount(3);
  this.game.startGame(rounds || 6);
}
```

### 2. Teyaku Payment Grid Display (HachiHachi.js)
**Purpose:** Fix the teyaku values showing as "undefined" in the payment grid modal

#### Change: Teyaku Parameter Formatting (lines 205-207)
- **Before:** Sent `playerTeyaku: this.players.map(p => p.teyaku)` (single array)
- **After:** Sends separate arrays for each player: `playerTeyaku`, `opponent1Teyaku`, `opponent2Teyaku`

```javascript
// BEFORE (line 205)
playerTeyaku: this.players.map(p => p.teyaku),

// AFTER (lines 205-207)
playerTeyaku: this.players[0].teyaku,
opponent1Teyaku: this.players[1].teyaku,
opponent2Teyaku: this.players[2].teyaku,
```

**Why this was needed:**
- The modal rendering code in HachiHachiModals.js expects separate `playerTeyaku`, `opponent1Teyaku`, `opponent2Teyaku` parameters
- main.js's `showTeyakuPaymentGrid()` unpacks these as separate parameters
- The single array format was causing all three to be undefined

## Files Modified
1. `/src/main.js` (3 changes: initialization, game mode switching, game start)
2. `/src/game/HachiHachi.js` (1 change: teyaku parameter formatting)

## UI Flow (After Changes)

```
User selects "Hachi-Hachi" from game mode dropdown
  ↓
switchGameMode('hachihachi') is called
  ↓
showRoundModal() displays (hidden Sakura player selection, visible round selection)
  ↓
User selects round count (1, 3, 6, or 12 rounds)
  ↓
startNewGame(rounds) is called
  ↓
Card3D system set to 3 players
  ↓
game.startGame(rounds) begins the game
  ↓
Deal phase → Teyaku detection
  ↓
Teyaku payment grid modal shows with correct values
  ↓
Main play phase begins
```

## Build Status
✅ `npm run build` - Zero errors
- 31 modules transformed
- dist/assets/index.js: 306.87 kB (gzip: 72.01 kB)
- Build time: 490ms

## Testing Checklist
- [ ] Select "Hachi-Hachi" from game mode dropdown
- [ ] Verify round selection modal appears (not player selection)
- [ ] Select number of rounds (1, 3, 6, or 12)
- [ ] Verify teyaku payment grid shows correct values (not "undefined")
- [ ] Verify game starts correctly with 3 players
- [ ] Verify Card3D animations work for 3-player layout
- [ ] Play through a complete round
