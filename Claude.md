# Claude.md - AI Assistant Context for Hanafuda Koi-Koi

**Version:** 2.0 (Post-Technical Analysis)
**Last Updated:** November 2024
**Architecture Status:** In Transition (See: TECHNICAL_ANALYSIS.md for full architectural review)

## Project Overview
This is a web-based Hanafuda card game framework supporting 5 game modes (Koi-Koi, Sakura, Hachi-Hachi, Match, Shop) with shared rendering, animation, and core systems. Development follows unified architectural practices to enable rapid mode addition and minimize code duplication.

## Codebase Architecture

### Core Systems
- **Game Logic**: `/src/game/` - Pure game state management with 5 game mode implementations
  - **Game modes:** KoiKoi.js, Sakura.js, HachiHachi.js, MatchGame.js, KoiKoiShop.js
  - **Shared utilities:** Deck.js (source of truth for deck), GameOptions.js, Card value helpers
  - **Scoring/Yaku:** Yaku.js (Koi-Koi), SakuraYaku.js (Sakura), Teyaku.js + Dekiyaku.js (Hachi-Hachi)
  - **AI:** AdvancedAI.js (Koi-Koi), HachiHachiAI.js (Hachi-Hachi)

- **Rendering**: `/src/rendering/` - Canvas-based rendering with 3D animation support
  - Renderer.js (main canvas controller)
  - CardRenderer.js (individual card drawing)

- **3D Animation**: `/src/utils/` - Modern card animation and positioning
  - **Primary system:** Card3DManager.js (zone-based card state), Card3D.js (individual card 3D state)
  - **Layout:** LayoutManager.js (zone positioning configs)
  - **Utilities:** DebugLogger.js, AudioManager.js, GameStateValidator.js

- **Data Layer**: `/src/data/` - Single source of truth for game data
  - **cards.js** (CRITICAL): All 48 hanafuda cards defined with full metadata (id, month, type, name, etc.)
  - **cardBacks.js**: Card back designs

- **Main Loop**: `/src/main.js` - Game controller (~4,459 lines, requires refactoring per TECHNICAL_ANALYSIS.md)
  - Mode switching logic
  - Event handling
  - UI callback coordination
  - Game state synchronization

### Key Design Patterns

#### 3D Animation System
- **Fixed Grid Positions**: Field cards occupy fixed 8-slot grid, empty slots stay empty
- **Zone-Based Layout**: Cards belong to zones (deck, field, playerHand, opponentHand, playerTrick, opponentTrick)
- **Tween Animations**: Use deterministic tweens, not spring physics for predictable movement
- **Grid Slot Tracking**: Field cards have `gridSlot` property to maintain fixed positions

#### Game State Flow
```
select_hand → select_field → drawing → (show_drawn|select_drawn_match) → opponent_turn
```

#### Dual Animation Systems
- **Legacy (2D)**: `animatingCards` array, manual position tracking
- **Modern (3D)**: Card3DManager automatically syncs with game state changes
- Both can coexist; 3D enabled via `this.use3DSystem` flag

## Data Layer Best Practices

### Single Source of Truth: cards.js
**CRITICAL:** All card references MUST come from `/src/data/cards.js` (HANAFUDA_DECK export).

✅ **Correct pattern:**
```javascript
import { HANAFUDA_DECK, CARD_TYPES } from '../data/cards.js';
const card = HANAFUDA_DECK[cardId];
const isBright = card.type === CARD_TYPES.BRIGHT;
```

❌ **Never hardcode card data:**
```javascript
// WRONG - Don't do this
const brightCards = [1, 2, 3, 4, 5];
if (cardId === 1) { /* it's January bright */ }
```

**Card metadata available:**
```javascript
{
  id: number,           // 0-47
  month: number,        // 1-12
  name: string,         // Card name (e.g., "Pine Crane")
  type: string,         // 'bright' | 'ribbon' | 'animal' | 'chaff'
  suit: string,         // Synonym for type
  displayName: string   // Human-readable (e.g., "Crane")
}
```

**Usage patterns:**
- Always import HANAFUDA_DECK from cards.js
- Use card.type for comparisons, never magic IDs
- Reference CARD_TYPES enum for type constants
- Never duplicate card data in game logic files

---

## Development Conventions

### When Adding Features (Updated Per TECHNICAL_ANALYSIS.md)

**Priority 1: Follow Unified Patterns**
1. **Card values**: Use centralized CardValues.js (in progress per Recommendation R2)
   - Standard: Bright=20, Ribbon=5, Animal=10, Chaff=1
   - Sakura: Bright=20, Ribbon=10, Animal=5, Chaff=0
   - Never hardcode point calculations

2. **Game callbacks**: Use standardized signature (in progress per Recommendation R6)
   - setUICallback(decision: string, params: object)
   - setRoundSummaryCallback(data: object)
   - setAudioManager(audioManager)
   - setCard3DManager(card3DManager)

3. **Animation system**: Use Card3DManager exclusively (no animationQueue)
   - Card3DManager.moveCardToZone(cardId, zoneName, duration)
   - No legacy 2D animation queue system (being deprecated)

4. **Card3D integration**: Initialize from game state
   - card3DManager.initializeFromGameState(gameState, isNewGame)
   - Call setPlayerCount() if player count changes mid-game

**Priority 2: Testing & Validation**
1. **Always test with `npm run build`** before committing (catches build errors)
2. **Use Card3DManager exclusively** for card positioning (no manual position tracking)
3. **Use debugLogger** instead of console.log (categories: 'animation', 'gameState', '3dCards', 'hachihachi')
4. **Validate game state** after major changes using GameStateValidator

**Priority 3: Code Quality**
- Maintain fixed grid positions (no dynamic centering)
- Use named zones (player0Hand, player1Hand, etc.) for multi-player modes
- Extract common logic to GameMode base class (pending Recommendation R1)

### File Modification Patterns (Updated)

**Never modify directly; instead:**
- **Card references/properties**: Import from `/src/data/cards.js`, never hardcode
- **Card values/points**: Reference CardValues.js (Recommendation R2 in progress)
- **Card positioning**: Modify `LayoutManager.js` zone configs
- **Card animation**: Use `Card3DManager.moveCardToZone()` (no animationQueue)
- **Game rules**: Modify game class in `/src/game/`, never scatter logic
- **Game callbacks**: Define in game class, register in main.js via generic dispatcher
- **Rendering**: Modify `Renderer.js` render3D() path only (2D legacy is deprecated)
- **UI**: Keep mode-specific UI handlers in corresponding modal files

### Important: Fixed Position Philosophy
The 3D system uses **fixed grid positions**:
- Field cards occupy fixed slots (0-7)
- Empty slots remain empty when cards are matched
- New cards fill first available slot from top-left
- NO dynamic centering or sliding cards together
- Trick piles, deck, yaku info all use fixed zone positions

## Critical Best Practices

### Card Data (Highest Priority)
✅ **DO:**
```javascript
import { HANAFUDA_DECK, CARD_TYPES } from '../data/cards.js';
// Reference cards by ID from HANAFUDA_DECK
const cardData = HANAFUDA_DECK[cardId];
if (cardData.type === CARD_TYPES.BRIGHT) { /* ... */ }
```

❌ **DON'T:**
```javascript
// Hardcoded card lists
const brightCardIds = [1, 2, 3, 4, 5];
// Card data scattered across files
const cardNames = { 1: "Pine Crane", 2: "Plum Warbler" };
// Magic ID checks
if (cardId >= 1 && cardId <= 5) { /* it's a bright */ }
```

### Card Valuation (Planned R2)
✅ **DO:**
```javascript
// (When CardValues.js is created)
import { CARD_VALUES, SAKURA_CARD_VALUES } from '../utils/CardValues.js';
const points = CARD_VALUES[card.type];
```

❌ **DON'T:**
```javascript
// Scattered card value definitions
if (card.type === 'bright') return 20;
const SAKURA_CARD_VALUES = { bright: 20, ribbon: 10, ... };  // Don't duplicate
// Inline calculations
const points = card.type === 'bright' ? 20 : card.type === 'ribbon' ? 5 : ...;
```

### Animation System
✅ **DO:**
- Use Card3DManager exclusively: `card3DManager.moveCardToZone(cardId, zone, duration)`
- Call `initializeFromGameState()` after game state changes
- Use debugLogger for animation events

❌ **DON'T:**
- Use animationQueue (legacy, deprecated)
- Manually set card positions outside Card3DManager
- Use spring physics for zone transitions (use tweens)
- Calculate positions based on card array length

### Game Modes & Callbacks
✅ **DO:**
```javascript
// Inherit from GameMode base class (pending R1)
class MyGameMode extends GameMode {
  setUICallback(decision, params) { /* handle generically */ }
  setRoundSummaryCallback(data) { /* handle generically */ }
}
```

❌ **DON'T:**
- Define custom callback signatures per mode
- Scatter game logic across files
- Use mode-specific string constants without enums
- Duplicate reset() or startNewGame() logic

### Rendering
✅ **DO:**
- Use Renderer.render3D() path exclusively
- Check for both KoiKoi and non-KoiKoi modes when rendering yaku
- Use LayoutManager zones for positioning

❌ **DON'T:**
- Use legacy 2D animation paths
- Hardcode card positions
- Calculate positions from viewport dimensions directly

## Game Domain Context

### Hanafuda Terms
- **Trick/Captured**: Cards won by a player (shown in right corner piles)
- **Field**: Center 8 cards available for matching
- **Yaku**: Scoring combinations (like poker hands)
- **Koi-Koi**: "Continue" - player chooses to keep playing for more points
- **Shobu**: "Stop" - player ends the round and wins with their current points
- **Bomb card**: Special rule - 4 of same month in hand

### Koi-Koi Rules (IMPORTANT)
**Winner Determination** (Winner-Take-All):
- Only ONE player scores per round (unless "both players score" is enabled)
- Winner is determined by who ends the round:
  1. Shobu caller wins immediately
  2. Player who calls koi-koi and improves wins (no multiplier)
  3. Player who scores after opponent's koi-koi wins (with 2× multiplier)
  4. Deck exhaustion: player with yaku wins (or both score if both have yaku)
- **NEVER compare scores** to determine winner!

**2× Multiplier**:
- Only applies if OPPONENT called koi-koi and YOU scored after
- Does NOT apply if you call koi-koi yourself

**Koi-Koi Penalty**:
- If you call koi-koi but don't improve (via new captures), you lose all points

### Game Phases
- `select_hand`: Player choosing card from hand
- `select_field`: Player choosing field card to match
- `drawing`: Drawing from deck
- `show_drawn`: Brief display of drawn card
- `select_drawn_match`: Player choosing which field card to match with drawn card
- `opponent_*`: Opponent's turn variations

## Testing & Verification

### How to Test Changes
```bash
npm run build          # Check for build errors
npm run dev           # Manual testing in browser
```

### What to Check
- [ ] Cards animate smoothly from origin to destination
- [ ] Empty field positions remain empty
- [ ] Cards flip face-up when drawn from deck
- [ ] Fixed positions maintained (no sliding/centering)
- [ ] Both players' trick piles work correctly
- [ ] Hover interactions work (deck, trick piles)

## Debug Tools

### Debug Logger Categories
```javascript
debugLogger.log('3dCards', message, data)    // 3D system events
debugLogger.log('animation', message, data)   // Animation events
debugLogger.log('gameState', message, data)   // Game logic events
```

### Console Commands
- Enable debug output in DebugLogger.js: Set categories to `true`

## Current State (As of Latest Commit)

### Recent Changes
- Fixed grid positioning for field cards (8 fixed slots)
- Smooth tween animations for card movements (300-800ms based on distance)
- Cards flip face-up when drawn from deck
- Trick pile hover shows text list (not card grid)
- Removed popup windows for played/drawn cards

### Known Issues
- None currently tracked (check open issues)

### Active Feature Flags
- `this.use3DSystem`: Enables 3D animation system (set in main.js)
- `animationsEnabled`: User-configurable option in game options

## Quick Reference

### Adding a New Card Animation
1. Modify `Card3DManager.moveCardToZone()` to track zone transition
2. Update `relayoutZone()` to handle special animation cases
3. Use `card3D.tweenTo()` with appropriate duration
4. Test that `gridSlot` is preserved for field cards

### Modifying UI Positioning
1. Update zone config in `LayoutManager.getZoneConfig()`
2. Ensure positions are fixed, not calculated from array length
3. Update both `render()` and `render3D()` in Renderer.js if needed
4. Test with various card counts (0, 1, 4, 8 cards)

### Adding New Game Phase
1. Add phase constant in KoiKoi.js
2. Handle phase in game loop state checks
3. Add rendering logic in `render3D()` if UI needed
4. Update phase transitions in game logic

## Animation System Details

### Card3D Object Properties
```javascript
{
  x, y, z: number              // Current 3D position
  homePosition: {x, y, z}      // Target "home" position in zone
  homeZone: string             // Current zone name
  previousZone: string         // Used for animation transitions
  gridSlot: number             // Fixed slot index (field cards only)
  animationMode: string        // 'idle', 'tween', 'spring', 'physics'
  faceUp: number              // 0-1, face orientation
  targetFaceUp: number        // Target face orientation
}
```

### Layout Manager Zone Configs
Each zone has:
- `type`: 'stack', 'row', 'grid', 'fan', 'arc'
- `position` or `anchorPoint`: Fixed position in viewport
- `spacing`: Distance between cards
- `faceUp`: 0 (face down) or 1 (face up)
- `renderLayer`: Drawing order (higher = drawn later)
- `useFixedPositions`: For field grid (maintains empty slots)

### Animation Timing
- Card movement: 300-800ms (distance-based)
- Flip animation: Automatic, smooth transition
- Match pause: 400ms to observe match
- Phase transitions: Handled by game logic timing

## Hachi-Hachi (88) Game Rules and Implementation

### Overview
Hachi-Hachi is a 3-player hanafuda gambling game where the goal is to accumulate the most card points. The name comes from the par value of 88 - each third of the 264 total card points in the deck.

### Game Flow
1. **Dealing**: Dealer distributes 8 cards to each player + 8 to field (4 at a time)
2. **Teyaku Declaration**: Players declare hand combinations (teyaku) - settled via direct payments
3. **Main Play**: Players play cards and capture field cards, earning deck yaku
4. **Shoubu/Sage Decision**: Player with highest score decides to end (Shoubu) or continue (Sage)
5. **Round End**: Round winner determined, scores calculated with multipliers

### Teyaku (Hand Combinations)
Scoring combinations held at start of round:

**Group A (Common)**:
- All Chaff: 4 kan
- All Bright: 7 kan
- All Animal: 5 kan
- All Ribbon: 5 kan
- Triplet: 2 kan
- Two Brights: 3 kan
- Flush (5+ same type): 4 kan

**Group B (Advanced)**:
- Four Three (specific suit distribution): 20 kan
- Three Poetry Red Ribbons: 7 kan
- Three Inro: 6 kan
- Three Sake Cup: 6 kan
- Blue Ribbons: 4 kan
- Willow Combination: 20 kan (special)

### Teyaku Payment Rule (CRITICAL)
**Each player WITH teyaku collects their teyaku value from EACH OTHER PLAYER individually.**

Example (Small Field, 1× multiplier):
- You: No teyaku (0 kan)
- Opponent 1: One Bright (4 kan)
- Opponent 2: Red (2 kan)

**Payments:**
- Opp1 collects 4 kan from You
- Opp1 collects 4 kan from Opp2
- Opp2 collects 2 kan from You
- Opp2 collects 2 kan from Opp1

**Net Settlement:**
- You: -4 (to Opp1) -2 (to Opp2) = **-6 kan**
- Opp1: +4 (from You) -2 (to Opp2) +4 (from Opp2) = **+6 kan**
- Opp2: +2 (from You) -4 (to Opp1) +2 (from Opp1) = **0 kan**

### Field Multiplier
Applied to ALL scoring (teyaku, dekiyaku, and card point differences):
- **1× (Small Field)**: No bright cards on field
- **2× (Large Field / Big Deal)**: Bright cards from Pine (1), Cherry Blossom (3), or Eulalia/Moon (8) on field
- **4× (Grand Field / Great Deal)**: Bright cards from Willow (11) or Paulownia (12) on field

Priority: If multiple bright cards are present, use the highest multiplier (4× takes precedence over 2×).

The multiplier is applied **during calculation** (value × multiplier), not after settlement. It affects teyaku payments, dekiyaku values, and card point differences equally.

### Dekiyaku (Captured Combinations)
Scoring combinations formed by captured cards during play:
- Three Brights: 8 kan
- Four Brights: 16 kan (if available in deck)
- Poetry Ribbons: 5 kan
- Animal Pairs: 1 kan each (max 3 for total 3 kan)

### Par Value Scoring
Card points are calculated as: (Total captured points - 88) × Field Multiplier

Example:
- Player captured 120 points: (120 - 88) × 1 = 32 kan
- Player captured 80 points: (80 - 88) × 1 = -8 kan

### Implementation Notes
- Teyaku payment grid shown immediately after dealing (teaching moment)
- Field multiplier calculated from field state before play begins
- All point values recalculated if field multiplier changes (should not happen mid-round)
- Zero-sum principle: All payments sum to 0 each round

---

## Architecture Refactoring Roadmap

**Status:** Transitional (moving from fragmented to unified architecture)

See `/TECHNICAL_ANALYSIS.md` for full architectural review (10K+ lines of game logic analyzed).

### Recommended Sub-Agent: **ArchitectureRefactorAgent**

For implementing the refactoring recommendations, use the specialized sub-agent:

**Invoke with:** `/invoke-ar` or `/architecture-refactor`

**Responsibilities:**
- Execute R1-R8 recommendations sequentially
- Maintain architectural consistency across all game modes
- Validate that refactoring preserves game logic (no behavioral changes)
- Provide implementation guidance for new game modes post-refactoring
- Coordinate multi-file changes (e.g., card value refactoring across 4 files)

**Use this agent when:**
- Implementing any P1/P2 recommendation (R1-R7)
- Adding new game mode that should follow unified architecture
- Need guidance on callback patterns or base class inheritance
- Migrating legacy code to new patterns

**Don't use this agent for:**
- Game logic bugs (use standard Claude Code)
- UI/rendering issues (use Renderer-specific guidance)
- Animation tweaks (use Card3DManager documentation)

**Agent will:**
1. Extract common patterns from existing modes
2. Create base classes with proper abstractions
3. Refactor existing modes incrementally (one at a time, testing between)
4. Generate documentation for new patterns
5. Validate architectural consistency post-refactoring

### Completed Patterns
- ✅ Card3DManager system (well-architected, ready for expansion)
- ✅ Deck.js (shared, no duplication)
- ✅ GameOptions.js (centralized option management)
- ✅ Renderer + Card3DManager integration

### In-Progress: Planned Recommendations (Priority Order)

#### **P1 (Critical) - Phase 1: Architectural Foundation**

**R1: GameMode Base Class** (High effort, high return)
- Extract common init/reset logic to abstract base class
- Define standard interface: startNewGame(), getState(), selectCard(), reset()
- Standardize callback signatures: setUICallback(decision, params), setRoundSummaryCallback(data)
- Migrate all 5 game modes to inherit
- **Impact:** 50% code reduction in game mode duplication, enables variant creation

**R2: Card Values Central** (Low effort, high return) ⭐ DO FIRST
- Create `/src/utils/CardValues.js` with CARD_VALUES, SAKURA_CARD_VALUES constants
- Replace all scattered card value definitions in Yaku.js, SakuraYaku.js, HachiHachi.js, Teyaku.js
- **Impact:** Single point of change for all card values; 30 minutes to complete

**R5: Mode Dispatcher Refactor** (Medium effort, high return)
- Extract 60+ game-mode conditionals from main.js into ModeRegistry
- Define mode configuration structure (gameClass, uiHandlers, renderOptions)
- Reduce main.js from 4,459 to ~3,500 lines
- **Impact:** Enables easy mode addition without modifying main.js

**R6: Callback Interface Standard** (Medium effort, medium return)
- Define UIDecision enum: 'koikoi', 'sage', 'gaji-choice', 'round-summary', etc.
- Unify all callback signatures to: (decision: string, params: object)
- Enable generic UI dispatcher in main.js
- **Impact:** Simpler UI integration, type safety path

#### **P2 (Important) - Phase 2: Code Quality**

**R4: Yaku Base Class** (Medium effort, medium return)
- Create abstract YakuChecker base class with common validation utilities
- Standardize return signatures: {name, points, cards}
- Extract helpers: cardsContain(), countByType(), etc.
- **Blocks:** Yaku system variants; custom scoring rules

**R7: KoiKoi 3D Migration** (Medium effort, low-medium return)
- Migrate KoiKoi from manual positioning to Card3DManager
- Consolidate animation system (currently using two parallel paths)
- **Blocks:** Consistent animation experience across all modes

**R3: Animation Queue Cleanup** (Low effort, low return)
- Delete unused animationQueue/isAnimating from KoiKoi, Sakura, MatchGame
- Confirms Card3DManager is primary animation system
- **Impact:** Removes ~30 lines of dead code; clarifies architecture

#### **P3 (Nice-to-Have) - Phase 3: Long-Term**

**R8: Options Interface** (Low-medium effort, medium return)
- Standardize variant management per game mode
- Define variant keys in enums (KOI_KOI_VARIANTS, SAKURA_VARIANTS)
- Create getVariant()/setVariant() interface
- **Deferred:** Only if 10+ variants emerge

### Development Principles

**During refactoring:**
1. All tests must pass after each recommendation
2. No behavioral changes; refactoring only
3. Backward compatibility maintained until legacy systems removed
4. Each recommendation is independent (can be applied in any order, but P1 must precede P2)
5. Code review focuses on: duplication elimination, callback consistency, data flow clarity

**Post-refactoring (Target: Q1 2025):**
- New game modes take 50% less implementation time
- Variant creation is self-service (add to GameOptions, register callback)
- Bug fixes localized to single file (no 3-place updates)
- Animation system is singular (Card3DManager exclusively)

### When to Apply Each Recommendation

| Recommendation | Apply When | Blocker For |
|---|---|---|
| **R2 (CardValues)** | Immediately (easy win) | None |
| **R1 (GameMode base)** | Before adding 2nd variant mode | R5, R6, future modes |
| **R5 (Mode registry)** | After R1 is stable | Adding 6th game mode |
| **R6 (Callbacks)** | After R1; pairs with R5 | Generic UI dispatcher |
| **R4 (Yaku base)** | When 2+ yaku variants exist | Custom scoring systems |
| **R7 (KoiKoi 3D)** | After R1; quality improvement | Consistent UX |
| **R3 (Animation cleanup)** | End of project | None |
| **R8 (Options interface)** | When 10+ variants exist | Advanced variant management |

---

## Alignment with Technical Analysis

**Full analysis:** See `/TECHNICAL_ANALYSIS.md` (7+ sections, 100+ lines)

**Key metrics:**
- Current system health: 5.8/10 (fragmented)
- Post-recommendations: 8.0+/10 (unified)
- Code duplication: 10% → 40-50% reuse
- Development velocity: 1× → 2-3× faster for new modes

**Risk assessment:**
- P1 recommendations: Low risk, high return
- P2 recommendations: Moderate risk, medium return
- P3 recommendations: Deferred until variance grows

---

*This file is for AI assistant context only. For user documentation, see README.md. For full technical analysis, see TECHNICAL_ANALYSIS.md.*
