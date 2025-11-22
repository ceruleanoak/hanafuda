# Claude.md - AI Assistant Context for Hanafuda Koi-Koi

## Project Overview
This is a web-based Hanafuda Koi-Koi card game implementation with dual rendering systems (2D legacy and 3D modern).

## Codebase Architecture

### Core Systems
- **Game Logic**: `/src/game/` - Pure game state management (KoiKoi.js, Deck.js, Yaku.js)
- **Rendering**: `/src/rendering/` - Canvas-based rendering (Renderer.js, CardRenderer.js)
- **3D Animation**: `/src/utils/` - Card3D.js, Card3DManager.js, LayoutManager.js
- **Main Loop**: `/src/main.js` - Game controller, event handling, game loop

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

## Development Conventions

### When Adding Features
1. **Always test with `npm run build`** before committing
2. **Check both animation systems** if modifying card movement
3. **Use debugLogger** instead of console.log (categories: 'animation', 'gameState', '3dCards')
4. **Maintain fixed positions** - avoid dynamic centering/sliding in 3D mode

### File Modification Patterns
- **Card positioning**: Modify `LayoutManager.js` zone configs
- **Card animation**: Modify `Card3D.js` (tween/spring) or `Card3DManager.js` (layout)
- **Game rules**: Modify `/src/game/KoiKoi.js`
- **Rendering**: Modify `Renderer.js` (check both `render()` and `render3D()` paths)

### Important: Fixed Position Philosophy
The 3D system uses **fixed grid positions**:
- Field cards occupy fixed slots (0-7)
- Empty slots remain empty when cards are matched
- New cards fill first available slot from top-left
- NO dynamic centering or sliding cards together
- Trick piles, deck, yaku info all use fixed zone positions

## Common Pitfalls

### ❌ Don't Do This
- Don't use spring animations for zone changes (use tweens)
- Don't calculate positions based on array length in 3D mode
- Don't add await/async in animation sequences (breaks sync)
- Don't rely on card position for UI elements (use zone config)

### ✅ Do This Instead
- Use `card3D.tweenTo()` with duration and easing
- Use fixed grid slots with `gridSlot` property
- Use callbacks (`onAnimationComplete`) for sequences
- Use `LayoutManager.getZoneConfig()` for fixed positions

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

*This file is for AI assistant context only. For user documentation, see README.md*
