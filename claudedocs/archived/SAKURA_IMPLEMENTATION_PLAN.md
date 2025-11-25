# Sakura Game Implementation Plan

**Last Updated**: 2025-11-13
**Status**: Phase 1-4 Complete, Phase 5+ Pending
**Build Status**: ✅ Passing

---

## Executive Summary

The Sakura (Hawaiian Hanafuda) game has been substantially updated to match official rules and support game variants. **Critical gameplay rules are now correct** - card values are fixed in both game logic AND card display. All core scoring variants are functional in 2-player mode. Multi-player support (3-4 players) requires architectural refactoring - the UI and framework are ready, but game logic is still hardcoded for 2 players.

---

## Completed Work (Phases 1-4)

### Phase 1: Critical Rules Fixes ✅
**Files**: `src/game/Sakura.js`, `src/game/SakuraYaku.js`, `src/rendering/Renderer.js`

#### Card Values Corrected
```javascript
// Now correct in both game logic AND rendering:
BRIGHT:  20 pts ✓
RIBBON:  10 pts ✓ (was 5)
ANIMAL:   5 pts ✓ (was 1)
CHAFF:    0 pts ✓
// Deck total: 240 points
```

**Note**: Card values were fixed in TWO places:
1. **Game Logic** (`Sakura.js` line 34-39): Scoring calculations
2. **Rendering** (`Renderer.js` line 154-159): Visual display on cards
   - **Bug Fixed**: Renderer still displayed old KoiKoi values (animal: 1, ribbon: 5)
   - **Now Fixed**: Animal cards display "5", ribbon cards display "10"

#### All 8 Yaku Redefined (Exact Match to Rules)
| # | Name | Cards | Type |
|---|------|-------|------|
| 1 | Drinking (Nomi) | Cherry Curtain + Susuki Moon + Chrysanthemum Cup | Bright+Animal |
| 2 | Spring (Omote Sugawara) | Pine Crane + Plum Warbler + Cherry Curtain | Bright+Animal |
| 3 | Akatan | Red Poetry Ribbons (Jan, Feb, Mar) | Ribbon |
| 4 | Aotan | Blue Ribbons (Jun, Sep, Oct) | Ribbon |
| 5 | Kusatan | Plain Ribbons (Apr, May, Jul - NOT Nov) | Ribbon |
| 6 | Animals A | Peony Butterfly + Chrysanthemum Cup + Maple Deer | Animal |
| 7 | Animals B | Wisteria Cuckoo + Iris Bridge + Clover Boar | Animal |
| 8 | Inoshikagan | Clover Boar + Susuki Geese + Maple Deer | Animal |

**Old yaku removed**: Sanko, Shiko, Ame-Shiko, Goko, Ino-Shika-Cho, Tanzaku

---

### Phase 2: Dynamic Variants System ✅
**Files**: `src/index.html`, `src/main.js`, `src/game/GameOptions.js`

#### Variant Checkboxes Added to Variations Modal
5 new Sakura-specific variants available:
1. **Chitsiobiki** (Three-of-a-Kind Trade) - House rule variant
2. **Victory Scoring** - Count wins instead of cumulative points
3. **Basa & Chu Multipliers** - Double wins for large score margins
4. **Both Players Score** - Yaku awards bonus instead of subtracting
5. **Oi-bana** (Auction) - 2-player elimination (placeholder)

#### GameOptions Extended
New persistent options in `GameOptions.js`:
```javascript
chitsiobikiEnabled: false
victoryScoringEnabled: false
basaChuEnabled: false
bothPlayersScoreEnabled: false
oibanaEnabled: false
```

#### UI Logic
- Modal shows game-mode-appropriate variations
  - Koi-Koi: Shows Bomb variation
  - Sakura: Shows 5 Sakura variants
- Checkboxes toggle variants with confirmation
- Game resets when variant toggled

---

### Phase 3: Game Setup Flow ✅
**Files**: `src/index.html`, `src/main.js`

#### Player Count Selection (Pre-Rounds)
New modal section: `sakura-player-selection`
```
Sakura Game Start Flow:
1. Click "New Game"
2. Select number of players: 2, 3, or 4
3. (For 4 players) See team assignment info
4. Select number of rounds: 1, 3, 6, or 12
5. Game starts with selected settings
```

#### Round Modal Refactored
- Sakura: Player count first, then rounds
- Other games: Rounds only (unchanged)
- `showRoundSelection()` helper reveals rounds after player selection
- Team info box shows for 4-player selection

#### State Tracking
- `GameController.selectedPlayerCount` property
- Passed to `Sakura.startNewGame(rounds, playerCount)`
- Defaults to 2 players if not selected

---

### Phase 4: Scoring System Updates ✅
**Files**: `src/game/Sakura.js`

#### Both Players Score Variant
When enabled:
```javascript
// Instead of:
playerScore = basePoints - opponentYakuPenalty
opponentScore = basePoints - playerYakuPenalty

// Do this:
playerScore = basePoints + (playerYaku.length * 50)
opponentScore = basePoints + (opponentYaku.length * 50)
```
- Both players can score in same round
- Yaku awards 50 pts instead of penalizing opponent

#### Victory Scoring Variant
When enabled:
```javascript
// Track wins instead of cumulative points
playerRoundWins += (player won ? 1 : 0)
opponentRoundWins += (opponent won ? 1 : 0)

// Match winner determined by:
if (playerRoundWins > opponentRoundWins) → Player wins
else if (opponentRoundWins > playerRoundWins) → Opponent wins
else → Tie
```

#### Basa & Chu Multipliers
Requires Victory Scoring enabled. Score margin grants bonus wins:
```javascript
pointMargin = winnerScore - loserScore

if (pointMargin >= 100)  // Basa
  winnerWins = 2
else if (pointMargin >= 50)  // Chu
  winnerWins = 2
else
  winnerWins = 1
```

#### Standard Scoring (Default)
- Base points from card values
- Yaku subtract 50 from opponent's score (not added to player)
- Cumulative score across rounds
- Highest cumulative score wins match

---

## Current Architecture Overview

### Game State Structure (2-Player)
```
Sakura (class)
├── playerHand, opponentHand (5-10 cards each)
├── field (6-8 cards, open to both)
├── playerCaptured, opponentCaptured (trick piles)
├── playerYaku, opponentYaku (detected yaku)
├── variants: {
│   chitsiobiki, victoryScoring, basaChu,
│   bothPlayersScore, oibana
│ }
├── scoring: {
│   playerMatchScore, opponentMatchScore,
│   playerRoundWins, opponentRoundWins
│ }
└── gaji state, hiki tracking, phase management
```

### File Organization

**Core Game Files**:
- `src/game/Sakura.js` (1,670 lines) - Main game logic
- `src/game/SakuraYaku.js` (340 lines) - Yaku detection & scoring
- `src/game/GameOptions.js` (40 lines) - Variant storage
- `src/game/Deck.js` (64 lines) - Card deck management

**UI/Controller Files**:
- `src/main.js` (2,100+ lines) - Game controller, event handlers
- `src/index.html` (500+ lines) - HTML modal for variants & player selection
- `src/rendering/Renderer.js` - Canvas rendering (Sakura-aware)

**Supporting Files**:
- `src/data/cards.js` - Card definitions
- `src/utils/Card3D.js` - 3D card animation system

### Key Methods in Sakura.js

**Initialization**:
- `startNewGame(rounds, playerCount)` - Set up match with variants
- `updateOptions(gameOptions)` - Load variant settings
- `reset()` - Initialize round state
- `deal()` - Distribute cards based on player count

**Gameplay**:
- `playHandCard(cardIndex)` - Play from hand
- `drawAndPlayCard()` - Draw and play phase 2 card
- `executeOpponentTurn()` - AI opponent logic
- `determineMatches(card)` - Find matchable field cards

**Scoring**:
- `endRound()` - Calculate scores with variants applied
- `endMatch()` - Determine match winner
- `updateYaku()` - Detect yaku in captured cards
- `calculateBasePoints(cards)` - Sum card values

**Special Mechanics**:
- `performHiki()` - Suit capture mechanic
- `selectGajiTarget()` - Wild card selection
- `applyGajiEndOfRoundBonus()` - Remaining cards bonus

---

## Remaining Work (Phases 5+)

### Phase 5: Multi-Player Architecture (MAJOR REFACTOR)

**Current Limitation**: Game logic hardcoded for 2 players
```javascript
// Current (won't scale):
this.playerHand
this.opponentHand
this.playerCaptured
this.opponentCaptured
this.currentPlayer === 'player' || 'opponent'

// Needed for 3-4 players:
this.players = [{hand, captured, score, yaku}, ...]
this.currentPlayerIndex = 0
this.playOrder = [0, 1, 2, 3] // Rotation
```

**Required Changes**:

#### 5A. Game State Refactoring
**File**: `src/game/Sakura.js`

1. **Convert Player References to Arrays**
   ```javascript
   // Replace:
   playerHand, opponentHand → hands[playerIndex]
   playerCaptured → captured[playerIndex]
   playerYaku → yaku[playerIndex]
   playerMatchScore → matchScore[playerIndex]
   ```

2. **Track Current Player Index**
   ```javascript
   currentPlayer: 0, 1, 2, or 3
   playOrder: [0, 1, 2, 3] // Counter-clockwise
   ```

3. **Dealing Logic** (Already exists, needs integration)
   ```javascript
   dealingRules = {
     2: { handSize: 10, fieldSize: 8 },
     3: { handSize: 7, fieldSize: 6 },
     4: { handSize: 5, fieldSize: 8 }
   }
   // Distribute to hands[0], hands[1], etc.
   ```

4. **Turn Rotation**
   ```javascript
   nextPlayer() {
     const currentIndex = playOrder.indexOf(currentPlayer)
     const nextIndex = (currentIndex + 1) % playOrder.length
     currentPlayer = playOrder[nextIndex]
   }
   ```

5. **Scoring for Multiple Players**
   ```javascript
   // Round winner: highest score (no ties except with dealer)
   const scores = matchScore.map((s, i) => ({ player: i, score: s }))
   const winner = scores.reduce((max, curr) =>
     curr.score > max.score ? curr : max
   )

   // Match winner: highest cumulative or most round wins
   ```

#### 5B. AI Expansion
**File**: `src/game/Sakura.js` (methods: `selectBestCard`, `selectBestGajiTarget`, etc.)

1. **Multi-Opponent Logic**
   - Each AI player gets difficulty level
   - Evaluate card value + yaku impact for each opponent
   - Account for more complex board state

2. **Strategy Updates**
   - Card valuation becomes more complex with 3-4 players
   - Blocking other players becomes important
   - Yaku detection for all opponents, not just one

#### 5C. Team Play Support (4-Player Mode)
**File**: `src/game/Sakura.js`

1. **Team Assignment**
   - Teams auto-assigned: Player 0+2 vs Player 1+3
   - Or: Player 0+1 vs Player 2+3 (configurable)

2. **Team Scoring**
   ```javascript
   teamScores = [0, 0] // Team A, Team B
   // When player 0 scores, add to Team A
   // When player 2 scores, add to Team A
   ```

3. **Team Yaku**
   ```javascript
   teamYaku[team] = yaku[player0] + yaku[player2]
   // Team penalty = team's total yaku * 50
   ```

#### 5D. Rendering Updates
**File**: `src/rendering/Renderer.js`

1. **Display Multiple Hands**
   - 3-player: Triangle layout (top, bottom-left, bottom-right)
   - 4-player: Square layout (top, right, bottom, left)
   - Team indicator for 4-player

2. **Score Display**
   - Show all players' scores
   - Highlight current player
   - Team scores for team mode

3. **UI Indicators**
   - Current player highlighting
   - Turn order indicator
   - Team membership display

**Estimated Effort**: 200-300 lines new code, 300-400 lines refactoring

---

### Phase 6: Chitsiobiki Variant Implementation

**Status**: Checkbox added, logic not implemented

**What It Does**:
- If 3 cards of same month on field, player can trade 1 from hand with 1 from field
- Optional (player chooses yes/no)
- Then play normally with new card mix

**Implementation**:

**File**: `src/game/Sakura.js`

1. **Detect Chitsiobiki Opportunity**
   ```javascript
   findChitsiobikiOpportunities() {
     // Group field cards by month
     // Return months with exactly 3 cards
   }
   ```

2. **Show Trade UI**
   - Modal: "Trade available for [Month] - Accept?"
   - If yes: show hand cards of same month
   - Player selects which hand card to trade
   - Select which field card to take

3. **Execute Trade**
   ```javascript
   executeChitsiobiki(handCard, fieldCard) {
     playerHand.push(fieldCard)
     playerHand.remove(handCard)
     field.remove(fieldCard)
     field.push(handCard)
     // Now proceed with normal play
   }
   ```

4. **AI Decision**
   - Evaluate if trade improves hand
   - Auto-accept if beneficial
   - Auto-decline if not helpful

**Estimated Effort**: 100-150 lines + UI modal

---

### Phase 7: Oi-bana Auction Variant

**Status**: Described in rules, placeholder UI added

**What It Does** (2-6 players, currently limited to 4):
1. All players bid amount
2. Top 2 bidders play Sakura round
3. Winner collects bid from loser
4. Optional: Basa/Chu multipliers on payment

**Implementation**: Requires Phase 5 (multi-player) + Phase 6

**File**: `src/game/Sakura.js`

1. **Bidding Phase**
   - Each player submits bid amount
   - Disable for Phase 6 MVP

2. **Player Selection**
   - Identify top 2 bidders
   - Others sit out (grayed out)

3. **Sakura Round**
   - Play 2-player Sakura with 2 bidders
   - Use standard or victory scoring

4. **Payment Collection**
   - Winner paid by loser
   - Amount: bid amount × multiplier (if Basa/Chu active)

**Estimated Effort**: 150-200 lines + 2-3 new UI modals

---

### Phase 8: Multi-Player AI Balancing

**Testing & Tuning**
- Test 3-4 player games
- Balance AI difficulty across multiple opponents
- Ensure varied outcomes (not deterministic)

**Estimated Effort**: 50-100 lines + extensive testing

---

## Implementation Priority & Sequence

### Immediate (Critical for Full Implementation)
1. ✅ Phase 1-4: Correct rules + variant system (DONE)
2. **Phase 5: Multi-Player Architecture** (PREREQUISITE)
   - Must complete before Phases 6-7
   - Highest complexity but enables everything

### High Priority (Variant Support)
3. Phase 6: Chitsiobiki (100-150 lines)
4. Phase 7: Oi-bana (150-200 lines, requires Phase 5)

### Medium Priority (Polish)
5. Phase 8: AI Balancing (testing-heavy)
6. UI/UX improvements for multi-player

### Optional (Nice-to-Have)
- Additional AI difficulty levels
- Match history/statistics
- Sound effects for variants

---

## Known Issues & Limitations

### Current (2-Player Only)
- ❌ 3-4 player modes not functional (UI ready, logic missing)
- ❌ Chitsiobiki variant not implemented (checkbox only)
- ❌ Team play not implemented (4-player team structure missing)
- ❌ Oi-bana variant not implemented (framework only)
- ❌ Game doesn't validate multi-player player count (always 2)

### Tests Needed
- ✅ **FIXED**: Card values now display correctly (animals: 5, ribbons: 10)
- Verify Victory Scoring works correctly
- Verify Basa/Chu multipliers calculate correctly
- Verify Both Players Score variant enables/disables properly
- Verify deck = 240 points with correct card values
- Test round/match ending with each variant

### Edge Cases
- Tie handling in victory scoring
- Gaji behavior with Both Players Score variant
- Hiki mechanics with 3+ players (needs testing)

---

## Quick Reference: Key Files to Modify

### For Adding Features

**Variant Logic**:
- `src/game/Sakura.js` → `endRound()` method (line 1363+)
- Modify: `playerRoundScore`, `opponentRoundScore` calculations

**Multi-Player Support**:
- `src/game/Sakura.js` → Constructor, reset(), deal(), turn logic
- `src/rendering/Renderer.js` → Layout and display

**UI/Options**:
- `src/index.html` → Variants modal, player selection
- `src/main.js` → Event handlers, state management
- `src/game/GameOptions.js` → New variant flags

**Yaku Detection**:
- `src/game/SakuraYaku.js` → Individual check functions (if rules change)

### Testing
- No existing test suite
- Recommend: Unit tests for scoring logic before multi-player refactor

---

## Development Checklist for Next Phase

### Phase 5 Start Checklist
- [ ] Create branch: `feature/sakura-multiplayer`
- [ ] Read entire `Sakura.js` for complete understanding
- [ ] Plan player array structure (design doc)
- [ ] Implement player state refactor (backup original)
- [ ] Update turn logic for rotation
- [ ] Fix dealing to all players
- [ ] Update scoring for multiple players
- [ ] Test with 3 players manually
- [ ] Test with 4 players manually
- [ ] Update AI to handle 3-4 opponents
- [ ] Update rendering for multi-player
- [ ] Create PR for review

---

## Reference: Sakura Rules Summary

### Core Rules (Implemented ✅)
- Deal: Varies by player count (2→10/8, 3→7/6, 4→5/8)
- Play: Select hand card, match field, draw & play
- Hiki: Capture all 4 of same suit (implemented)
- Gaji: Lightning wild card (implemented)
- Yaku: 8 specific combinations, 50 pt penalty each
- Scoring: Base points - opponent yaku penalty
- Winner: Highest cumulative score per round

### Variants (Implemented ✅)
- **Both Players Score**: Yaku awards 50, not subtract
- **Victory Scoring**: Count wins, not points
- **Basa & Chu**: Margin bonuses (50+/100+)
- **Chitsiobiki**: 3-of-kind trade (UI only)
- **Oi-bana**: Auction elimination (placeholder)

### Not Implemented ❌
- Multi-player gameplay (3-4 players)
- Chitsiobiki mechanic (requires turn interruption)
- Oi-bana variant (requires multi-player)
- Team play (requires player arrays)

---

## Build & Deployment Notes

**Current Build**: ✅ Passing
```bash
npm run build
# Output: dist/index.html, dist/assets/*.css, dist/assets/*.js
```

**Git Status** (at completion of Phase 4):
- Modified: 6 files
- Total changes: 528 insertions, 184 deletions
- No breaking changes to other game modes

**Testing Environment**:
- Vite build system (production)
- No unit tests (recommend adding before Phase 5)
- Manual testing via browser

---

## Contact & Questions

For questions on specific implementation details:
- Check `src/game/Sakura.js` for game logic comments
- Check `src/game/SakuraYaku.js` for yaku definitions
- Check `claudedocs/SAKURA_IMPLEMENTATION_PLAN.md` (this file) for architecture

---

**Document Version**: 1.1
**Last Updated By**: Claude
**Changes in 1.1**: Fixed rendering card value display bug (animals: 1→5, ribbons: 5→10)
**Next Review**: After Phase 5 completion
