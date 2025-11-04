# 3D Card System Architecture Design

## Executive Summary

This document explores the feasibility and architecture of replacing the current 2D canvas rendering with a real-time 3D card system where all 48 cards are continuously tracked and rendered as 3D objects. This enables fluid animations at any time without pre-computation or state snapshots.

## Feasibility Analysis

### Performance Considerations

**Card Count**: Maximum 48 cards (standard Hanafuda deck)
- Simultaneously visible: ~30-35 cards (8 field + 8 player hand + 8 opponent hand + trick piles + deck + drawn card)
- With viewport culling: ~20-25 cards typically rendered

**Rendering Budget** (Canvas 2D at 60fps):
- Each card: ~0.2ms (image draw + transform + filter)
- 30 cards: ~6ms per frame
- **Verdict**: ✅ Feasible - well under 16.67ms budget

**Update Budget**:
- Physics update per card: ~0.01ms (position integration, velocity damping)
- 48 cards: ~0.5ms per frame
- Layout calculations: ~1ms per frame
- **Verdict**: ✅ Feasible - minimal CPU overhead

**Memory Footprint**:
- Card3D object: ~400 bytes (floats, references)
- 48 cards: ~19KB
- Image cache: ~2-3MB (reused across cards)
- **Verdict**: ✅ Negligible

### Technical Challenges

1. **Z-Ordering**: Need painter's algorithm sorting every frame (48 cards * log(48) = ~282 comparisons)
   - **Solution**: Sort only visible cards; cache when static

2. **Hit Detection**: Mouse picking in 3D space with 2D canvas projection
   - **Solution**: Track screen-space AABB per card after transform

3. **Animation Blending**: Smooth transitions when layout changes mid-animation
   - **Solution**: Velocity-based damping naturally blends; avoid hard position snaps

4. **Layout Management**: Dynamic repositioning when cards added/removed
   - **Solution**: Zone-based layout managers with spring physics

5. **State Synchronization**: Card3D positions vs. game logic state
   - **Solution**: Game logic owns card data; Card3D is presentation layer only

**Overall Feasibility**: ✅ **HIGHLY FEASIBLE** - no fundamental blockers

---

## Proposed Architecture

### Core Object: Enhanced Card3D

```javascript
class Card3D {
  // ===== IDENTITY & DATA =====
  cardData;          // Reference to game card data (month, type, name, image)
  id;                // Unique card ID for tracking

  // ===== SPATIAL STATE =====
  x, y, z;           // Current world position (pixels)
  vx, vy, vz;        // Current velocity (pixels/second)
  ax, ay, az;        // Current acceleration (pixels/second²)

  rotation;          // Rotation angle (radians, around Z-axis)
  rotationVelocity;  // Angular velocity (radians/second)

  scale;             // Uniform scale multiplier (1.0 = normal size)
  scaleVelocity;     // Scale change rate

  // ===== PRESENTATION STATE =====
  faceUp;            // Face orientation (0 = face down, 1 = face up)
  targetFaceUp;      // Target face orientation
  faceUpVelocity;    // Flip animation velocity

  opacity;           // Visual opacity (0-1)
  targetOpacity;     // Target opacity for fading

  // ===== LAYOUT & HOME POSITION =====
  homeZone;          // Zone ID ('deck', 'field', 'playerHand', 'opponentHand', 'playerTrick', 'opponentTrick')
  homePosition;      // {x, y, z} - where this card "lives" when at rest
  homeIndex;         // Index within zone for layout ordering

  // ===== ANIMATION STATE =====
  animationMode;     // 'physics', 'tween', 'spring', 'idle'
  tweenTarget;       // {x, y, z, rotation, scale, faceUp} - tween destination
  tweenDuration;     // Tween duration (ms)
  tweenProgress;     // Tween progress (0-1)
  tweenEasing;       // Easing function name

  springStrength;    // Spring force coefficient (for spring mode)
  springDamping;     // Spring damping coefficient

  // ===== RENDERING & CULLING =====
  screenAABB;        // {minX, minY, maxX, maxY} - screen-space bounding box
  isVisible;         // Cached visibility flag (inside viewport?)
  renderLayer;       // Rendering priority (higher = drawn later)

  // ===== STATE TRACKING =====
  isAtHome;          // Boolean: is card currently at home position?
  isAnimating;       // Boolean: is card actively animating?
  isDragging;        // Boolean: is card being dragged by user?

  // ===== LIFECYCLE =====
  isActive;          // Boolean: is this card currently in play?
  pooled;            // Boolean: is this card in object pool?

  // ===== CALLBACKS =====
  onAnimationComplete; // Callback when animation finishes
  onArriveAtHome;      // Callback when card reaches home position
  onFlipComplete;      // Callback when flip animation finishes
}
```

### Animation Modes Explained

#### 1. **'physics' Mode** (Ballistic Motion)
- Card moves according to velocity + acceleration
- Damping applied each frame
- Use for: dramatic flings, celebration animations
- No guaranteed arrival time

```javascript
card.animationMode = 'physics';
card.applyImpulse(500, -300, 200); // Launch velocity
card.setAcceleration(0, 50, -400);  // Gravity-like
card.springDamping = 0.92;          // Air resistance
```

#### 2. **'tween' Mode** (Deterministic Motion)
- Guaranteed arrival at target at specific time
- Easing function for smoothness
- Use for: UI animations, card dealing, captures
- Precise timing for choreography

```javascript
card.animationMode = 'tween';
card.tweenTarget = {x: 400, y: 300, z: 0, faceUp: 1};
card.tweenDuration = 500; // ms
card.tweenEasing = 'easeOutCubic';
```

#### 3. **'spring' Mode** (Reactive Motion)
- Card pulled toward home position by spring force
- Natural, responsive feel
- Use for: hand reorganization, layout changes
- Interruptible and blendable

```javascript
card.animationMode = 'spring';
card.homePosition = {x: 350, y: 500, z: 0};
card.springStrength = 8.0;  // Higher = faster pull
card.springDamping = 0.85;  // Higher = less oscillation
```

#### 4. **'idle' Mode**
- No animation, locked at current position
- Use for: cards in deck, stationary cards
- No physics updates needed

---

## Zone Layout System

### Critical Design Constraint: Fixed Anchor Points

**🚨 IMPORTANT**: When 3D animations are enabled, card rows must use **left-aligned (or fixed anchor) positioning**, NOT centered positioning.

**Why?**
- **Centered layouts**: Card positions depend on total count in row
  - Adding/removing cards shifts the center point
  - All cards shift horizontally to re-center
  - Home positions become unpredictable during animations
  - Tween targets change mid-flight → visual stuttering

- **Left-aligned layouts**: Card positions calculated from fixed anchor
  - Each card position only depends on its index and anchor point
  - Adding card at end doesn't shift existing cards' homes
  - Removing cards creates gap, remaining cards stay put
  - Predictable tween destinations

**Example Problem (Centered)**:
```javascript
// Before: 3 cards centered at x=400
cards: [350, 400, 450]  // positions

// After adding 4th card: center shifts
cards: [327.5, 382.5, 437.5, 492.5]  // ALL positions changed!
```

**Solution (Left-Aligned)**:
```javascript
// Before: 3 cards from anchor x=100, spacing=115
cards: [100, 215, 330]  // positions

// After adding 4th card: only new card positioned
cards: [100, 215, 330, 445]  // existing cards unchanged
```

**Implementation**: Zone configs must specify `anchorPoint` instead of `centerPoint` when animations are enabled.

### Layout Manager Architecture

Each zone has a layout manager that calculates home positions:

```javascript
class LayoutManager {
  // Calculate positions for all cards in a zone
  layout(cards, zoneConfig) {
    // Returns array of {x, y, z, index} for each card
    // Uses anchorPoint + spacing (not centered)
  }
}
```

### Zone Configurations

#### **Deck Zone** (Draw Pile)
```javascript
{
  type: 'stack',
  position: {x: 50, y: centerY},
  offset: {x: 0.5, y: 0.5, z: 0.2},  // Slight offset for depth
  faceUp: 0,
  renderLayer: 1
}
```

#### **Field Zone** (Center Play Area)
```javascript
{
  type: 'grid',
  anchorPoint: {x: 100, y: centerY},  // Fixed left anchor (NOT centered)
  layout: 'row',           // or 'grid' for >8 cards
  spacing: 115,            // Card width (100) + gap (15)
  maxPerRow: 8,
  faceUp: 1,
  renderLayer: 3
}
```

**Note**: Field uses left-aligned row. With 8 cards max and spacing=115, rightmost card is at x = 100 + (7 × 115) = 905. Adjust anchor if this exceeds viewport.

#### **Player Hand Zone**
```javascript
{
  type: 'row',             // Simple row (arc optional for polish)
  anchorPoint: {x: 50, y: screenHeight - 100},  // Fixed left anchor
  spacing: 115,
  maxCards: 8,
  faceUp: 1,
  renderLayer: 5,          // Above field
  hoverLift: 20            // Z-lift on hover
}
```

**Alternative Arc Layout** (if desired for aesthetics):
```javascript
{
  type: 'arc',
  anchorPoint: {x: 50, y: screenHeight - 100},  // Arc starts from left
  arcRadius: 800,          // Large radius = gentle curve
  arcSpan: 800,            // Horizontal span (not centered!)
  spacing: 100,            // Arc length spacing
  faceUp: 1,
  renderLayer: 5
}
```

#### **Opponent Hand Zone**
```javascript
{
  type: 'row',
  anchorPoint: {x: 50, y: 100},  // Fixed left anchor
  spacing: 115,
  maxCards: 8,
  faceUp: 0,               // Face down
  renderLayer: 5
}
```

#### **Trick Pile Zones**
```javascript
{
  type: 'fan',             // Fanned stack for visibility
  position: {x: screenWidth - 150, y: varies},
  fanOffset: {x: 8, y: 8, z: 2},
  maxVisible: 5,
  faceUp: 1,
  renderLayer: 2
}
```

### Layout Anchor Points: Aesthetic Trade-offs

**Left-Aligned Positioning**:
- ✅ Predictable animation targets
- ✅ Stable positions during card addition/removal
- ✅ No re-centering jitter
- ⚠️ Cards may appear "bunched" to left side with few cards
- ⚠️ Visual balance depends on viewport size

**Centering Fallback (When Animations Disabled)**:
- ✅ Better visual balance with any card count
- ✅ Traditional card game aesthetic
- ⚠️ Incompatible with smooth animations

**Hybrid Approach (Recommended)**:
```javascript
// In GameOptions
animationsEnabled: true → use anchorPoint layout
animationsEnabled: false → use centered layout

// Layout calculation
function calculateCardPositions(zone, cards, useAnimations) {
  if (useAnimations) {
    // Fixed anchor, left-aligned
    return cards.map((card, i) => ({
      x: zone.anchorPoint.x + (i * zone.spacing),
      y: zone.anchorPoint.y
    }));
  } else {
    // Traditional centered layout
    const totalWidth = cards.length * zone.spacing;
    const startX = centerX - totalWidth / 2;
    return cards.map((card, i) => ({
      x: startX + (i * zone.spacing),
      y: zone.anchorPoint.y
    }));
  }
}
```

**Visual Compensation Options**:
1. **Dynamic Anchor Adjustment**: Shift anchor point based on card count (still predictable)
   ```javascript
   anchorX = centerX - (cardCount * spacing) / 2; // Recalc only when count changes, not during anim
   ```
2. **Viewport-Relative Anchors**: Use percentage of screen width
   ```javascript
   anchorX = screenWidth * 0.1; // 10% from left edge
   ```
3. **Accept Left-Alignment**: Embrace the aesthetic; common in many digital card games

### Dynamic Layout Updates

When cards are added/removed from a zone:

```javascript
// Example: Player captures a card
onCardCaptured(card, targetZone) {
  // 1. Update card's zone
  card.homeZone = targetZone;

  // 2. Recalculate ALL home positions in target zone
  const cards = getAllCardsInZone(targetZone);
  const newPositions = layoutManager.layout(cards, zoneConfigs[targetZone]);

  // 3. Update each card's home position
  cards.forEach((c, i) => {
    c.homePosition = newPositions[i];
    c.homeIndex = i;

    // 4. If card is idle, trigger spring animation to new home
    if (c.animationMode === 'idle') {
      c.animationMode = 'spring';
    }
  });

  // 5. For captured card specifically, use tween for precise choreography
  card.animationMode = 'tween';
  card.tweenTarget = newPositions[capturedIndex];
  card.tweenDuration = 500;
  card.tweenEasing = 'easeInOutQuad';
}
```

---

## Animation Orchestration

### Use Case 1: Draw Pile → Field (No Match)

**Scenario**: Player plays card from hand, it doesn't match field, gets placed on field.

```javascript
playCardToField(card) {
  // 1. Card leaves player hand
  card.homeZone = 'field';

  // 2. Recalculate field layout
  const fieldCards = getAllCardsInZone('field');
  fieldCards.push(card);
  const fieldPositions = layoutManager.layout(fieldCards, zoneConfigs.field);

  // 3. Update all field cards' homes (spring animation for existing cards)
  fieldCards.forEach((c, i) => {
    c.homePosition = fieldPositions[i];
    if (c !== card && c.animationMode === 'idle') {
      c.animationMode = 'spring'; // Make room for new card
    }
  });

  // 4. Animate played card with tween
  card.animationMode = 'tween';
  card.tweenTarget = fieldPositions[findIndex(fieldCards, card)];
  card.tweenDuration = 400;
  card.tweenEasing = 'easeOutCubic';
  card.onAnimationComplete = () => {
    card.animationMode = 'idle';
    card.isAtHome = true;
  };
}
```

### Use Case 2: Hand → Field Match → Trick Pile

**Scenario**: Player plays card from hand that matches a field card. Both cards captured.

```javascript
playCardMatch(handCard, fieldCard, trickZone) {
  // STAGE 1: Hand card flies to field card position
  handCard.animationMode = 'tween';
  handCard.tweenTarget = {
    x: fieldCard.x,
    y: fieldCard.y,
    z: fieldCard.z + 5,  // Slightly above
    faceUp: 1
  };
  handCard.tweenDuration = 400;
  handCard.tweenEasing = 'easeOutQuad';

  handCard.onAnimationComplete = () => {
    // STAGE 2: Brief pause (visual confirmation of match)
    setTimeout(() => {
      // STAGE 3: Both cards to trick pile together
      const trickCards = getAllCardsInZone(trickZone);
      trickCards.push(handCard, fieldCard);
      const trickPositions = layoutManager.layout(trickCards, zoneConfigs[trickZone]);

      // Update homes
      handCard.homeZone = trickZone;
      fieldCard.homeZone = trickZone;
      handCard.homePosition = trickPositions[trickPositions.length - 2];
      fieldCard.homePosition = trickPositions[trickPositions.length - 1];

      // Animate both cards in parallel
      [handCard, fieldCard].forEach(card => {
        card.animationMode = 'tween';
        card.tweenTarget = card.homePosition;
        card.tweenDuration = 500;
        card.tweenEasing = 'easeInOutCubic';
        card.onAnimationComplete = () => {
          card.animationMode = 'idle';
          card.isAtHome = true;
        };
      });

      // Reorganize field (spring animations)
      const remainingField = getAllCardsInZone('field');
      const newFieldPositions = layoutManager.layout(remainingField, zoneConfigs.field);
      remainingField.forEach((c, i) => {
        c.homePosition = newFieldPositions[i];
        if (c.animationMode === 'idle') {
          c.animationMode = 'spring';
        }
      });
    }, 200); // 200ms pause
  };
}
```

### Use Case 3: Four-of-a-Kind Celebration

**Scenario**: All 4 cards of same month captured → celebration → trick pile.

```javascript
celebrateFourOfAKind(cards, trickZone) {
  // STAGE 1: All cards fly to celebration positions (top center)
  const celebrationY = 80;
  const spacing = 115;
  const startX = centerX - (cards.length * spacing) / 2;

  cards.forEach((card, i) => {
    card.animationMode = 'tween';
    card.tweenTarget = {
      x: startX + i * spacing,
      y: celebrationY,
      z: 50,  // Elevated
      faceUp: 1,
      scale: 1.1  // Slightly enlarged
    };
    card.tweenDuration = 600;
    card.tweenEasing = 'easeOutBack';  // Bounce effect
    card.renderLayer = 10;  // Above everything
  });

  // STAGE 2: Wait for all to arrive + display time
  waitForAll(cards).then(() => {
    setTimeout(() => {
      // STAGE 3: Cards converge to center
      cards.forEach(card => {
        card.animationMode = 'tween';
        card.tweenTarget = {x: centerX, y: celebrationY, z: 50};
        card.tweenDuration = 400;
        card.tweenEasing = 'easeInCubic';
      });

      // STAGE 4: Drop to trick pile
      waitForAll(cards).then(() => {
        const trickCards = getAllCardsInZone(trickZone);
        const trickPositions = layoutManager.layout(
          [...trickCards, ...cards],
          zoneConfigs[trickZone]
        );

        cards.forEach((card, i) => {
          card.homeZone = trickZone;
          card.homePosition = trickPositions[trickCards.length + i];
          card.animationMode = 'tween';
          card.tweenTarget = card.homePosition;
          card.tweenDuration = 500;
          card.tweenEasing = 'easeInOutCubic';
          card.renderLayer = 2;
          card.onAnimationComplete = () => {
            card.animationMode = 'idle';
            card.scale = 1.0;  // Reset scale
          };
        });
      });
    }, 1200); // Display celebration
  });
}
```

---

## Rendering Pipeline

### Frame Update Loop

```javascript
function updateAndRender(deltaTime) {
  // 1. UPDATE PHYSICS & ANIMATIONS
  card3DManager.update(deltaTime);

  // 2. UPDATE SCREEN-SPACE BOUNDS (for culling & input)
  card3DManager.updateScreenBounds(viewport);

  // 3. VIEWPORT CULLING
  const visibleCards = card3DManager.getVisibleCards();

  // 4. Z-SORT (painter's algorithm)
  visibleCards.sort((a, b) => a.z - b.z);

  // 5. RENDER
  ctx.clearRect(0, 0, width, height);
  drawBackground();
  visibleCards.forEach(card => cardRenderer.drawCard3D(ctx, card));
  drawUI();
}
```

### Screen-Space AABB Calculation

```javascript
updateScreenBounds(card) {
  const scale = card.getScale();
  const w = cardWidth * scale;
  const h = cardHeight * scale;

  // Handle rotation (simplified for 2D canvas)
  const cos = Math.abs(Math.cos(card.rotation));
  const sin = Math.abs(Math.sin(card.rotation));
  const boundW = w * cos + h * sin;
  const boundH = h * cos + w * sin;

  card.screenAABB = {
    minX: card.x - boundW / 2,
    minY: card.y - boundH / 2,
    maxX: card.x + boundW / 2,
    maxY: card.y + boundH / 2
  };

  // Check if intersects viewport
  card.isVisible = !(
    card.screenAABB.maxX < 0 ||
    card.screenAABB.minX > viewportWidth ||
    card.screenAABB.maxY < 0 ||
    card.screenAABB.minY > viewportHeight
  );
}
```

### Input Handling (Mouse/Touch)

```javascript
function handleClick(screenX, screenY) {
  // Check visible cards in reverse order (top to bottom)
  const visibleCards = card3DManager.getVisibleCards()
    .sort((a, b) => b.z - a.z);  // Reverse Z-order

  for (const card of visibleCards) {
    if (pointInAABB(screenX, screenY, card.screenAABB)) {
      // Found top card at this position
      onCardClicked(card);
      return;
    }
  }
}
```

---

## State Synchronization

### Game Logic ↔ Card3D Binding

**Problem**: Game logic moves cards between arrays (playerHand → field), but Card3D needs to animate smoothly.

**Solution**: Card3D objects persist independently; game logic triggers position changes.

```javascript
class Card3DManager {
  constructor() {
    this.cards = new Map(); // cardId → Card3D
    this.zoneCards = {      // Faster zone lookup
      deck: new Set(),
      field: new Set(),
      playerHand: new Set(),
      opponentHand: new Set(),
      playerTrick: new Set(),
      opponentTrick: new Set()
    };
  }

  // Called once at game start
  initializeFromGameState(gameState) {
    // Create Card3D for every card in the game
    const allCards = [
      ...gameState.deck.cards,
      ...gameState.playerHand,
      ...gameState.opponentHand,
      ...gameState.field,
      ...gameState.playerCaptured,
      ...gameState.opponentCaptured
    ];

    allCards.forEach(cardData => {
      const card3D = new Card3D(cardData);
      this.cards.set(cardData.id, card3D);

      // Determine initial zone
      const zone = this.determineZone(cardData, gameState);
      this.assignToZone(card3D, zone);
    });
  }

  // Called when game state changes (after selectCard, etc.)
  synchronize(gameState) {
    // Detect which cards moved between zones
    const currentMapping = this.buildZoneMapping(gameState);

    for (const [cardId, newZone] of currentMapping) {
      const card3D = this.cards.get(cardId);
      if (card3D.homeZone !== newZone) {
        // Card changed zones - trigger animation
        this.moveCardToZone(card3D, newZone);
      }
    }
  }

  moveCardToZone(card3D, newZone) {
    // Remove from old zone
    this.zoneCards[card3D.homeZone].delete(card3D);

    // Add to new zone
    this.zoneCards[newZone].add(card3D);
    card3D.homeZone = newZone;

    // Recalculate layout and trigger animations
    this.relayoutZone(newZone);
  }
}
```

### Synchronization Timing

**Option 1: Immediate Sync**
- Call `synchronize()` immediately after game state change
- Animations triggered instantly
- Simple, deterministic

**Option 2: Deferred Sync**
- Detect state changes in next render frame
- Allows batching multiple changes
- More complex, but handles rapid actions better

**Recommendation**: Start with Option 1; optimize to Option 2 if needed.

---

## Performance Optimizations

### 1. **Object Pooling**
```javascript
class Card3DPool {
  available = [];
  active = new Set();

  acquire(cardData) {
    const card3D = this.available.pop() || new Card3D(cardData);
    card3D.reset(cardData);
    this.active.add(card3D);
    return card3D;
  }

  release(card3D) {
    card3D.isActive = false;
    this.active.delete(card3D);
    this.available.push(card3D);
  }
}
```

### 2. **Zone-Level Dirty Flags**
```javascript
// Only recalculate layout when zone changes
class ZoneLayoutCache {
  layouts = new Map();  // zone → {positions, isDirty}

  markDirty(zone) {
    this.layouts.get(zone).isDirty = true;
  }

  getLayout(zone) {
    const cached = this.layouts.get(zone);
    if (cached.isDirty) {
      cached.positions = layoutManager.layout(zone);
      cached.isDirty = false;
    }
    return cached.positions;
  }
}
```

### 3. **Batch Z-Sorting**
```javascript
// Only sort when Z-order actually changes
class RenderQueue {
  cards = [];
  isDirty = false;

  markDirty() {
    this.isDirty = true;
  }

  getSorted() {
    if (this.isDirty) {
      this.cards.sort((a, b) => a.z - b.z);
      this.isDirty = false;
    }
    return this.cards;
  }
}
```

### 4. **Culling Optimizations**
```javascript
// Spatial partitioning for large card counts (overkill for 48 cards)
class QuadTree {
  // Only if we exceed 100+ cards
}

// Simple approach: AABB checks (sufficient for 48 cards)
```

---

## Migration Strategy

### Phase 1: Parallel Systems (Current + 3D)
- Implement Card3DManager alongside existing 2D system
- Add toggle to switch between renderers
- Validate animations match visually

### Phase 2: Feature Parity
- Implement all game animations in 3D
- Match timing and feel of 2D animations
- User testing for feedback

### Phase 3: Optimization Pass
- Profile rendering performance
- Optimize hot paths (update loop, rendering)
- Add object pooling, caching

### Phase 4: Cutover
- Remove 2D animation system
- Clean up unused code
- Ship 3D-only system

### Phase 5: Advanced Features (Future)
- Particle effects (card trails)
- Advanced camera angles
- WebGL upgrade for true 3D
- Physically-based card interactions

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Performance regression on low-end devices | Medium | Extensive profiling; maintain "no animations" option |
| Animation feel doesn't match 2D system | Low | Iterative tuning; configurable timing |
| Bugs in state synchronization | Medium | Comprehensive testing; assertions in dev mode |
| Increased code complexity | Low | Clear abstractions; good documentation |
| User preference for old animations | Low | Beta testing; gather feedback |

---

## Conclusion

**✅ Full 3D realtime rendering is HIGHLY FEASIBLE and RECOMMENDED.**

**Key Benefits**:
1. **No animation state snapshots** - cards always have valid positions
2. **Interruptible animations** - spring mode naturally blends
3. **Emergent behaviors** - physics can create organic motion
4. **Future-proof** - easy to add new animation types
5. **Cleaner architecture** - clear separation of game logic and presentation

**Recommended Next Steps**:
1. Implement enhanced Card3D class with all properties
2. Build zone layout managers
3. Create Card3DManager with synchronization
4. Implement one animation use case end-to-end (hand → field)
5. Iterate on feel and timing

The system is well-scoped, performant, and maintainable. The main engineering effort is in careful design of the layout system and animation choreography, not performance concerns.
