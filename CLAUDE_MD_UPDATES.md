# CLAUDE.md Updates - Architecture & Best Practices Codification

**Date:** November 2024
**Purpose:** Update project guidance to enforce architectural best practices from TECHNICAL_ANALYSIS.md
**Status:** ✅ Complete

---

## Summary of Changes

The project-level `CLAUDE.md` has been updated from v1 (generic Koi-Koi guidance) to v2 (comprehensive framework for 5-mode development). All future development work should align with these practices.

**File:** `/Users/thomaslarson/gamedev/hanafuda/CLAUDE.md`
**Size:** 584 lines (was ~280 lines; +304 lines of guidance)
**Focus Areas:** Data layer best practices, architectural patterns, refactoring roadmap

---

## Key Additions

### 1. **Data Layer Best Practices (NEW SECTION)**
**Purpose:** Enforce single source of truth for card data

**Critical Rule:**
```javascript
// ALWAYS use HANAFUDA_DECK from cards.js
import { HANAFUDA_DECK, CARD_TYPES } from '../data/cards.js';
const card = HANAFUDA_DECK[cardId];
if (card.type === CARD_TYPES.BRIGHT) { }

// NEVER hardcode card data
const brightCardIds = [1, 2, 3, 4, 5];  // ❌ WRONG
```

**Available metadata:**
- id (0-47)
- month (1-12)
- name (full name)
- type ('bright' | 'ribbon' | 'animal' | 'chaff')
- suit (synonym for type)
- displayName (human-readable)

**Enforced across all files:** All card logic must reference cards.js as single source of truth.

---

### 2. **Card Valuation Pattern (In Progress)**
**Purpose:** Centralize card point calculations

**Pattern (Post-R2):**
```javascript
import { CARD_VALUES, SAKURA_CARD_VALUES } from '../utils/CardValues.js';

// Standard (Koi-Koi, Hachi-Hachi base)
const points = CARD_VALUES[card.type];  // Bright=20, Ribbon=5, Animal=10, Chaff=1

// Sakura variant
const sakuraPoints = SAKURA_CARD_VALUES[card.type];  // Bright=20, Ribbon=10, Animal=5, Chaff=0
```

**Current scattered locations (to be consolidated):**
- Yaku.js
- SakuraYaku.js
- HachiHachi.js
- Teyaku.js

**Status:** Recommendation R2 (30-minute quick win to implement immediately)

---

### 3. **Development Conventions (UPDATED)**
**Priority 1: Unified Patterns**
1. **Card values** - Use centralized CardValues.js (planned)
2. **Game callbacks** - Standard signature: setUICallback(decision: string, params: object)
3. **Animation system** - Card3DManager exclusively (no animationQueue)
4. **Card3D integration** - Initialize from game state via initializeFromGameState()

**Priority 2: Testing & Validation**
1. npm run build before commit
2. Use Card3DManager exclusively (no manual positioning)
3. Use debugLogger (not console.log)
4. Validate game state after major changes

**Priority 3: Code Quality**
- Maintain fixed grid positions
- Use named zones (player0Hand, player1Hand, etc.)
- Extract common logic to GameMode base class (pending R1)

---

### 4. **File Modification Patterns (REFINED)**
**New guidance for each system:**
- **Card references:** Import from `/src/data/cards.js` only
- **Card values:** Reference CardValues.js (pending creation)
- **Card positioning:** Modify LayoutManager.js zone configs
- **Card animation:** Use Card3DManager.moveCardToZone() only
- **Game rules:** Keep in game class, never scatter logic
- **Game callbacks:** Define in game class, register via generic dispatcher
- **Rendering:** Use render3D() path exclusively (2D legacy deprecated)
- **UI:** Keep mode-specific handlers in corresponding modal files

---

### 5. **Critical Best Practices (NEW SECTION)**
Explicit ✅ DO / ❌ DON'T guidance for:

**Card Data (Highest Priority)**
```javascript
✅ DO:
import { HANAFUDA_DECK, CARD_TYPES } from '../data/cards.js';
const card = HANAFUDA_DECK[cardId];
if (card.type === CARD_TYPES.BRIGHT) { }

❌ DON'T:
const brightCardIds = [1, 2, 3, 4, 5];
if (cardId >= 1 && cardId <= 5) { }
```

**Card Valuation**
```javascript
✅ DO:
import { CARD_VALUES, SAKURA_CARD_VALUES } from '../utils/CardValues.js';
const points = CARD_VALUES[card.type];

❌ DON'T:
if (card.type === 'bright') return 20;
const SAKURA_CARD_VALUES = { bright: 20, ... };  // Don't duplicate
```

**Animation System**
```javascript
✅ DO:
card3DManager.moveCardToZone(cardId, zone, duration);
card3DManager.initializeFromGameState(gameState);

❌ DON'T:
this.animationQueue.push(animation);
card.x = position.x; // Manual positioning
```

**Game Modes & Callbacks**
```javascript
✅ DO:
class MyGameMode extends GameMode {
  setUICallback(decision, params) { }
}

❌ DON'T:
Custom callback signatures per mode
Scatter game logic across files
```

**Rendering**
```javascript
✅ DO:
Renderer.render3D() path exclusively
Use LayoutManager zones

❌ DON'T:
Legacy 2D animation paths
Hardcoded card positions
```

---

### 6. **Architecture Refactoring Roadmap (NEW SECTION)**

**Status: Transitional** - Moving from fragmented to unified architecture

**Completed patterns:**
- ✅ Card3DManager system
- ✅ Deck.js
- ✅ GameOptions.js
- ✅ Renderer + Card3D integration

**In-Progress: Planned Recommendations (P1-P3)**

#### **P1 (Critical) - Phase 1: Architectural Foundation**
- **R1: GameMode Base Class** (High effort, high return)
  - Extract init/reset logic to abstract base class
  - Standardize callback signatures
  - Migrate all 5 modes to inherit
  - **Impact:** 50% code reduction in duplication

- **R2: Card Values Central** ⭐ **DO FIRST** (Low effort, high return)
  - Create CardValues.js
  - Consolidate Yaku.js, SakuraYaku.js, HachiHachi.js, Teyaku.js
  - **Impact:** Single point of change; 30 minutes

- **R5: Mode Dispatcher** (Medium effort, high return)
  - Extract 60+ conditionals from main.js
  - Create ModeRegistry
  - Reduce main.js 4,459 → 3,500 lines
  - **Impact:** Easy mode addition

- **R6: Callback Interface Standard** (Medium effort, medium return)
  - Define UIDecision enum
  - Unify callback signatures
  - Enable generic UI dispatcher
  - **Impact:** Simpler UI integration

#### **P2 (Important) - Phase 2: Code Quality**
- **R4: Yaku Base Class**
- **R7: KoiKoi 3D Migration**
- **R3: Animation Queue Cleanup**

#### **P3 (Nice-to-Have) - Phase 3: Long-Term**
- **R8: Options Interface** (deferred until 10+ variants)

**Development principles:**
1. All tests pass after each recommendation
2. No behavioral changes (refactoring only)
3. Backward compatibility maintained
4. Each recommendation is independent
5. Code review: duplication elimination, callback consistency, data flow

**Post-refactoring targets:**
- New game modes: 50% less implementation time
- Variants: self-service (add to GameOptions, register callback)
- Bug fixes: localized to single file
- Animation system: singular (Card3DManager only)

---

### 7. **Recommended Sub-Agent: ArchitectureRefactorAgent (NEW)**

**Invoke with:** `/invoke-ar` or `/architecture-refactor`

**Responsibilities:**
- Execute R1-R8 recommendations sequentially
- Maintain architectural consistency
- Validate refactoring preserves logic
- Provide guidance for new modes post-refactoring
- Coordinate multi-file changes

**Use when:**
- Implementing P1/P2 recommendations (R1-R7)
- Adding new game mode
- Need guidance on callback patterns or inheritance
- Migrating legacy code

**Don't use for:**
- Game logic bugs (use standard Claude Code)
- UI/rendering issues
- Animation tweaks

**Agent will:**
1. Extract common patterns from existing modes
2. Create base classes with proper abstractions
3. Refactor modes incrementally (test between each)
4. Generate documentation for new patterns
5. Validate architectural consistency

---

### 8. **Alignment with Technical Analysis (NEW)**

**Full analysis:** `/TECHNICAL_ANALYSIS.md` (7+ sections, 100+ pages)

**Key metrics:**
- Current system health: 5.8/10 (fragmented)
- Post-recommendations: 8.0+/10 (unified)
- Code duplication: 10% → 40-50% reuse
- Development velocity: 1× → 2-3× faster for new modes

**Risk assessment:**
- P1: Low risk, high return
- P2: Moderate risk, medium return
- P3: Deferred until variance grows

---

## How to Use Updated CLAUDE.md

### For New Feature Development
1. **Check Data Layer:** Is this using HANAFUDA_DECK from cards.js? If not, fix.
2. **Check Card Values:** Are you calculating points? Use CardValues.js when available.
3. **Check Callbacks:** Are you following standard setUICallback(decision, params) signature?
4. **Check Animations:** Using Card3DManager? Not animationQueue?

### For Refactoring
1. **Read P1-P3 roadmap** for priority and timeline
2. **Use ArchitectureRefactorAgent** for implementation
3. **Follow development principles** (tests pass, no behavioral changes)
4. **Reference Critical Best Practices** section for pattern enforcement

### For Onboarding New Developers
1. **Start with Project Overview** (what are 5 game modes?)
2. **Read Data Layer Best Practices** (cards.js single source of truth)
3. **Review Critical Best Practices** (do's and don'ts)
4. **Check Architecture Roadmap** (what are we building toward?)
5. **Reference game-specific rules** (Koi-Koi, Sakura, Hachi-Hachi sections)

---

## Related Documents

| Document | Purpose | Relevance |
|----------|---------|-----------|
| **TECHNICAL_ANALYSIS.md** | Full architectural review | Detailed rationale for all recommendations |
| **CLAUDE.md** (this file) | Development guidance | Day-to-day coding standards |
| **README.md** | User documentation | Game rules, how to play |

---

## Next Steps

### Immediate (This Week)
1. ✅ Update CLAUDE.md with best practices (DONE)
2. **Create CardValues.js** (Recommendation R2)
   - Centralize CARD_VALUES, SAKURA_CARD_VALUES
   - Replace scattered definitions in 4 files
   - ~30 minutes
   - Use ArchitectureRefactorAgent to coordinate

### Short Term (Next 2-4 Weeks)
3. **Create GameMode base class** (Recommendation R1)
   - Define abstract interface
   - Migrate existing 5 modes
   - ~High effort, high return
   - Use ArchitectureRefactorAgent

4. **Create ModeRegistry** (Recommendation R5)
   - Extract mode conditionals from main.js
   - Reduce main.js bloat
   - ~Medium effort, high return
   - Depends on R1

### Medium Term (Month 2)
5. **Standardize callbacks** (Recommendation R6)
   - Define UIDecision enum
   - Unify signatures
   - ~Medium effort, medium return
   - Pairs with R5

### Long Term (As Needed)
6. P2 recommendations (R4, R7, R3)
7. P3 recommendations (R8) - only if 10+ variants

---

## Validation Checklist

**Code reviews should check:**
- [ ] All card references come from HANAFUDA_DECK (cards.js)
- [ ] No hardcoded card IDs or data
- [ ] Card values use centralized constants (when CardValues.js exists)
- [ ] Animation uses Card3DManager (not animationQueue)
- [ ] Callbacks follow standard signature (decision: string, params: object)
- [ ] Game logic is in game class (not scattered)
- [ ] No duplicate reset() or startNewGame() logic
- [ ] Tests pass; no behavioral changes

---

**Version:** 2.0
**Updated:** November 2024
**Status:** Ready for development

For questions or clarifications, see TECHNICAL_ANALYSIS.md or consult with ArchitectureRefactorAgent.
