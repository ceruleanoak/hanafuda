# Sakura Multi-Player Implementation Progress

**Status**: Phase 1 Complete, Phase 2A Complete, Phase 2B FAILED - Restart Required
**Date**: November 2025
**Build Status**: ✅ Passing (but runtime broken)

## Phase 1: Core Architecture Refactoring ✅ COMPLETE

### Completed Tasks

#### 1.1 Data Structure Refactoring ✅
- **Status**: Complete
- **Changes**:
  - Replaced `this.playerHand`/`this.opponentHand` with `this.players[i].hand`
  - Replaced `this.playerCaptured`/`this.opponentCaptured` with `this.players[i].captured`
  - Replaced `this.playerYaku`/`this.opponentYaku` with `this.players[i].yaku`
  - Replaced binary strings `'player'`/`'opponent'` with numeric indices
  - Changed `this.dealer` from string to `this.dealerIndex` (0-based)
  - Changed `this.currentPlayer` from string to `this.currentPlayerIndex` (0-based)
  - Added player metadata: `matchScore`, `roundWins`, `isHuman`, `difficulty`
  - Created array-based Hiki tracking: `this.completedHikis[playerIndex]`
  - Added N-player initialization in `reset()` with player object creation

#### 1.2 Turn Management for N Players ✅
- **Status**: Complete
- **Changes**:
  - Refactored `endTurn()` to use circular advancement: `currentPlayerIndex = (currentPlayerIndex + 1) % playerCount`
  - Updated `shouldEndRound()` to check all players' hands are empty
  - Refactored turn phase logic to check `players[currentPlayerIndex].isHuman`
  - AI players automatically trigger `opponentTurn()` with 1-second delay

#### 1.3 Initialization for N Players ✅
- **Status**: Complete
- **Changes**:
  - Updated `startNewGame(rounds, playerCount)` with player count validation
  - Refactored `deal()` to distribute cards in circular fashion starting with dealer
  - Implemented proper card distribution rules:
    - 2 players: 10 cards each, 8 field
    - 3 players: 7 cards each, 6 field
    - 4 players: 5 cards each, 8 field
  - Updated `checkInitialFieldHiki()` for dealer-based capture
  - Updated `checkChitsiobiki()` to process all players
  - Refactored `locateGaji()` and `findGajiCard()` for N players

#### 1.4 Backward Compatibility Accessors ✅
- **Status**: Complete
- **Purpose**: Allow existing 2-player code to work without modification
- **Implemented Accessors**:
  - `playerHand` ↔ `players[0].hand`
  - `opponentHand` ↔ `players[1].hand`
  - `playerCaptured` ↔ `players[0].captured`
  - `opponentCaptured` ↔ `players[1].captured`
  - `playerYaku` ↔ `players[0].yaku`
  - `opponentYaku` ↔ `players[1].yaku`
  - `playerMatchScore` ↔ `players[0].matchScore`
  - `opponentMatchScore` ↔ `players[1].matchScore`
  - `playerRoundWins` ↔ `players[0].roundWins`
  - `opponentRoundWins` ↔ `players[1].roundWins`
  - `dealer` ↔ `dealerIndex` (string/index conversion)
  - `currentPlayer` ↔ `currentPlayerIndex` (string/index conversion)

#### 1.5 Helper Methods ✅
- **Status**: Complete
- **Added**:
  - `getCurrentPlayer()` - get current player object
  - `getCurrentPlayerHand()` - get current player's hand
  - `getCurrentPlayerCaptured()` - get current player's captured cards
  - `isCurrentPlayerHuman()` - check if human or AI

#### 1.6 Core Game Methods Refactored ✅
- **Status**: Complete
- **Methods Updated**:
  - `updateYaku()` - now evaluates all players in loop
  - `canGajiCapture(targetCard, playerIndex)` - changed parameter from 'player'/'opponent' to numeric index
  - `locateGaji()` - searches all player locations
  - `findGajiCard()` - searches all players' hands and captured

#### 1.7 State Management ✅
- **Status**: Complete
- **`getState()` Enhanced**:
  - Added `players` array with all player data
  - Added `playerCount`, `currentPlayerIndex`, `dealerIndex`
  - Maintains backward compatibility with 2-player fields
  - Renders `playersData` with: hand, captured, yaku, basePoints, matchScore, roundWins, isHuman, difficulty

### Test Results
- ✅ **Build**: Passes without errors
- ✅ **Syntax**: All code is syntactically valid
- ✅ **Game Logic**: 3-4 player turns work end-to-end (no crashes)

---

## Phase 2A: Multi-Player Game Flow ✅ COMPLETE

### Completed Tasks (2.1-2.3)

#### 2.1 End-of-Round Scoring for N Players ✅
- **Status**: Complete
- **Changes**:
  - Complete rewrite of `endRound()` to support N-player scoring
  - Calculates base points and yaku penalties for all N players
  - Compares all scores to determine winner (highest score wins, dealer wins ties)
  - Proper variant handling:
    - `bothPlayersScore`: All players with yaku get 50pt bonus per yaku
    - `victoryScoring`: Tracks round wins for all players with Basa/Chu multipliers
    - `basaChu`: Win multiplier based on score margin (100+ = 2 wins, 50+ = 2 wins, else = 1 win)
  - Dealer rotation: 2-player uses loser-becomes-dealer, 3+ players rotate to next player
  - Summary data includes both old 2-player fields and new N-player fields for UI compatibility

#### 2.2 End-of-Match Logic for N Players ✅
- **Status**: Complete
- **Changes**:
  - Refactored `endMatch()` to determine winner among N players
  - Compares all players' final scores/wins
  - Handles ties with dealer advantage in multi-player
  - Generates appropriate winning message for any player count

#### 2.3 AI for Non-Human Players ✅
- **Status**: Complete
- **Changes**:
  - Refactored `opponentTurn()` to use `getCurrentPlayer()` instead of hardcoded opponent
  - Refactored `opponentDrawPhase()` to work with any `currentPlayerIndex`
  - Updated all AI selection methods (Easy/Medium/Hard)
  - Updated Gaji handlers to work with any player index
  - Updated capture selection for N-player scenarios

---

## Phase 2B: Visual Layout ❌ FAILED - RESTART REQUIRED

### Attempted Implementation (Failed)

#### What Was Attempted
1. **LayoutManager**: Extended to support 3-4 player zone configurations
2. **Card3DManager**: Added zone name translation logic
3. **Renderer**: Updated UI overlays for N-player display
4. **main.js**: Added support for both 'playerHand' and 'player0Hand' zones

#### Issues Encountered

**Critical Issues**:
1. Cards in 2-player mode sit in top-left corner - 3D animations broken
2. Cards not clickable/draggable in 3-4 player modes
3. Zone name inconsistency between initialization and lookups
4. Fragile parameter interpretation in LayoutManager.getZoneConfig()
5. Zone name translation scattered across multiple files
6. Hybrid approach trying to support both legacy and indexed zone names simultaneously

**Root Cause Analysis**:
- Attempted to support BOTH 2-player zone names (playerHand/opponentHand) AND N-player zone names (player0Hand/player1Hand) at the same time
- Created constant translation and lookups between naming systems
- Caused mismatches between what zones Card3DManager initialized vs what LayoutManager returned
- Multiple translation points made the system fragile and hard to debug

### Files Modified in Failed Attempt
- `src/utils/LayoutManager.js` - Extended for 3-4 player configs
- `src/utils/Card3DManager.js` - Added zone name translation
- `src/rendering/Renderer.js` - Updated UI overlays
- `src/main.js` - Added dual zone name support

---

## Phase 2B: Visual Layout - Restart Strategy

### Problem Statement
The visual layer needs to support 3-4 player card layouts while maintaining 2-player functionality. The core issue is zone name handling between game logic (Card3DManager) and rendering (LayoutManager).

### Current Architecture Context
- **Card3DManager**: Manages Card3D objects, zones, and animations
  - Tracks zones as a Map: `zoneCards = { deck, field, playerHand, opponentHand, playerTrick, opponentTrick }`
  - Uses zone names to synchronize with game state
  - Calls `LayoutManager.getZoneConfig(zoneName)` to get positioning info

- **LayoutManager**: Provides zone positioning configuration
  - Static method `getZoneConfig(zoneName, width, height)` returns positioning for a zone
  - Currently hardcoded for 2-player layout only

- **Renderer**: Draws cards and UI based on Card3D positions
  - Reads positions from Card3DManager
  - Draws UI overlays (deck count, trick labels, yaku info)

### Decision Point
Before implementing Phase 2B again, the approach for zone naming must be selected:

**Option A: Unified Indexed Names**
- Use `player0Hand`, `player1Hand`, `player2Hand`, `player3Hand` for ALL game modes
- 2-player: Uses player0Hand/player1Hand
- 3-player: Uses player0Hand/player1Hand/player2Hand
- 4-player: Uses player0Hand/player1Hand/player2Hand/player3Hand
- Pros: Single zone naming system, no translation
- Cons: Requires updating all existing code that references 'playerHand'/'opponentHand'

**Option B: Separate Code Paths**
- 2-player: Keep using playerHand/opponentHand throughout
- 3-4 player: Use player0Hand/player1Hand/etc. with separate Card3DManager path
- Pros: Minimal changes to 2-player code
- Cons: Duplicated Card3DManager and zone management logic for N-players

**Option C: Adapter Layer**
- Keep Card3DManager using indexed names internally (player0Hand, player1Hand)
- Update Card3DManager constructor to auto-convert 2-player accessors to indexed names
- All zone names stored internally as indexed
- Adapter methods to map between old/new names for backward compatibility
- Pros: Single internal representation, backward compatible
- Cons: Adapter layer adds complexity but isolated to Card3DManager

---

## Remaining Work Summary

**Phase 2B**: Visual Layout for 3-4 players (requires restart with chosen approach)
- Estimate: 7-10 hours depending on chosen strategy

**Phase 2C**: UI Updates for N-players (depends on Phase 2B)
- Score display, dealer indicator, turn indicator
- Estimate: 2-3 hours

**Phase 3**: Testing & Validation
- Estimate: 2-3 hours

---

## Git Status
**Latest commit**: `72db0ae` - Complete Phase 2B: Visual Layout for N-players with bug fixes (BROKEN - needs revert or fix)

---

## Next Steps
1. Select zone naming approach (A, B, or C above)
2. Plan Phase 2B restart based on selected approach
3. Implement with clear separation of concerns and single responsibility for zone management
