# Development Priorities & Quick Start Guide

**Date:** November 2024
**Audience:** Development team
**Purpose:** Clear, actionable list of what to do first

---

## The Goal

Transform Hanafuda from a **fragmented 5-mode codebase** (10K LOC with 10% reuse) into a **unified framework** (40-50% code reuse, 2-3× faster mode development).

**Current state:** 5.8/10 health score
**Target state:** 8.0+/10 health score
**Timeline:** Q1 2025 (3-4 weeks for P1, then P2)

---

## Phase 1: Immediate Actions (This Week)

### Action 1: Centralize Card Values (30 minutes) ⭐ START HERE

**What:** Create `/src/utils/CardValues.js` with all card point values

**Why:** Currently scattered across 4 files; one change = 4 edits

**How:**
1. Create new file: `/src/utils/CardValues.js`
2. Add:
```javascript
export const CARD_VALUES = {
  bright: 20,
  ribbon: 5,
  animal: 10,
  chaff: 1
};

export const SAKURA_CARD_VALUES = {
  bright: 20,
  ribbon: 10,
  animal: 5,
  chaff: 0
};

export const HACHI_HACHI_CARD_VALUES = {
  bright: 20,
  ribbon: 5,
  animal: 10,
  chaff: 1
};
```

3. Replace hardcoded values in:
   - `/src/game/Yaku.js` (search for "20", "5", "10", "1")
   - `/src/game/SakuraYaku.js` (search for SAKURA_CARD_VALUES)
   - `/src/game/HachiHachi.js` (search for CARD_VALUES)
   - `/src/game/Teyaku.js` (search for point calculations)

4. Test: `npm run build` (should have no errors)

**Time:** 30 minutes
**Risk:** None (pure refactoring, no behavior change)
**Tools:** Standard Claude Code (not ArchitectureRefactorAgent yet)

**Acceptance Criteria:**
- [ ] CardValues.js created with both value sets
- [ ] All 4 files import from CardValues.js
- [ ] No hardcoded point values remain in game logic
- [ ] `npm run build` succeeds
- [ ] Game plays identically to before (same points awarded)

---

### Action 2: Review & Bookmark Key Documents (15 minutes)

**What:** Understand the architecture and why changes are needed

**Files to review:**
1. `/TECHNICAL_ANALYSIS.md` - Full analysis (read Sections 1-3)
   - Executive Summary (5 min read)
   - Mode-by-mode assessment (5 min skim)
   - Health scores (2 min scan)

2. `/CLAUDE.md` (Updated v2.0)
   - Data Layer Best Practices (5 min)
   - Critical Best Practices section (5 min)
   - Architecture Roadmap (10 min)

3. This file (DEVELOPMENT_PRIORITIES.md)
   - Sections 1-3 give complete picture

**Why:** You need to understand the target architecture before implementing it

**Time:** 15 minutes
**Risk:** None

**Acceptance Criteria:**
- [ ] You can explain why card values were scattered
- [ ] You know the 8 recommendations (R1-R8) in order
- [ ] You understand P1 (critical), P2 (important), P3 (nice-to-have) phases
- [ ] You know when to use ArchitectureRefactorAgent

---

## Phase 2: Short-Term Roadmap (Weeks 2-4)

### Action 3: Create GameMode Base Class (High Effort, High Return)

**Depends on:** Action 1 (card values centralized)

**What:** Define abstract base class for all game modes

**Impact:**
- 50% reduction in duplicate init/reset code
- Consistent callback signatures
- New modes inherit standard structure
- Unblocks R5, R6 (mode registry, callbacks)

**How:** Use ArchitectureRefactorAgent (`/invoke-ar`)
- Request: "Implement Recommendation R1 (GameMode Base Class)"
- Agent will:
  1. Extract common patterns from KoiKoi, Sakura, HachiHachi, MatchGame, Shop
  2. Create abstract base class with interface
  3. Migrate each mode incrementally
  4. Validate tests pass after each migration
  5. Generate documentation

**Time:** High effort (~8-12 hours)
**Risk:** Low (refactoring only, agent validates tests pass)
**Order:** Do this before R5/R6

---

### Action 4: Create ModeRegistry (Medium Effort, High Return)

**Depends on:** Action 3 (GameMode base class stable)

**What:** Eliminate 60+ game-mode conditionals from main.js

**Impact:**
- main.js shrinks from 4,459 to ~3,500 lines
- Adding new mode requires ONLY mode registry entry (not main.js changes)
- Clear separation: mode logic vs. controller logic
- Unblocks easy 6th game mode addition

**How:** Use ArchitectureRefactorAgent (`/invoke-ar`)
- Request: "Implement Recommendation R5 (Mode Dispatcher Refactor)"
- Agent will:
  1. Design mode configuration structure
  2. Create ModeRegistry class
  3. Extract all mode-specific conditionals
  4. Update main.js to use registry
  5. Validate all modes still work

**Time:** Medium effort (~6-8 hours)
**Risk:** Medium (main.js is critical; careful testing required)
**Order:** After R1 is stable

---

### Action 5: Standardize Callback Interface (Medium Effort, Medium Return)

**Depends on:** Action 3 & 4

**What:** Unify all callback signatures to (decision: string, params: object)

**Current state (messy):**
```javascript
// KoiKoi
setUICallback(yaku, score) { }

// HachiHachi
setUICallback(decision, params) { }

// Sakura
(no callback; uses roundSummaryCallback only)
```

**Target state (clean):**
```javascript
// All modes
setUICallback(decision, params) {
  // decision: 'koikoi', 'sage', 'gaji-choice', etc.
  // params: { yaku: [], score: 100, ... }
}
```

**Impact:**
- Single UI handler dispatcher in main.js
- New modes integrate faster
- Type safety path (toward TypeScript)

**How:** Use ArchitectureRefactorAgent (`/invoke-ar`)
- Request: "Implement Recommendation R6 (Callback Interface Standard)"
- Agent will:
  1. Define UIDecision enum with all decision types
  2. Update all game modes to use standard signature
  3. Create generic UI dispatcher
  4. Update main.js to route callbacks

**Time:** Medium effort (~6-8 hours)
**Risk:** Medium (all modes affected; careful testing)
**Order:** After R1; pairs with R5

---

## Phase 3: Medium-Term (Month 2+)

### Action 6: Yaku Base Class (If Variants Multiply)

**Trigger:** When 2+ Yaku variants exist beyond current 4

**What:** Extract common yaku checking logic to base class

**Impact:** Easier to add new yaku systems (e.g., custom variants)

**How:** Use ArchitectureRefactorAgent
- Request: "Implement Recommendation R4 (Yaku Base Class)"

---

### Action 7: KoiKoi 3D Migration (Quality Improvement)

**Depends on:** Action 3 (GameMode base class stable)

**What:** Migrate KoiKoi from manual positioning to Card3DManager

**Impact:** Consistent animation system across all modes

**How:** Use ArchitectureRefactorAgent
- Request: "Implement Recommendation R7 (KoiKoi 3D Migration)"

---

## Critical Success Factors

### Must-Dos
1. **Always reference cards from HANAFUDA_DECK** (cards.js)
   - Never hardcode card IDs
   - Never duplicate card data
   - See: CLAUDE.md Data Layer Best Practices

2. **Run `npm run build` before every commit**
   - Catches build errors early
   - Ensures no regressions

3. **Use ArchitectureRefactorAgent for R1-R7 implementations**
   - It validates tests pass
   - It coordinates multi-file changes
   - It generates documentation
   - You don't do this alone

4. **No behavioral changes during refactoring**
   - Game must play identically
   - Scores must match
   - Animations must look same

5. **Code review checklist** (before merging)
   - [ ] All card refs from HANAFUDA_DECK
   - [ ] Card values use CardValues.js
   - [ ] Callbacks follow standard signature
   - [ ] No duplicate game logic
   - [ ] Tests pass
   - [ ] Animations use Card3DManager (not animationQueue)

### Must-Not-Dos
- ❌ Don't hardcode card data
- ❌ Don't duplicate card value calculations
- ❌ Don't use animationQueue (it's deprecated)
- ❌ Don't define mode-specific callback signatures
- ❌ Don't scatter game logic across files
- ❌ Don't commit without running `npm run build`
- ❌ Don't refactor without ArchitectureRefactorAgent (for R1-R7)

---

## When to Use ArchitectureRefactorAgent

**Use `/invoke-ar` when:**
- Implementing R1 (GameMode base class)
- Implementing R4 (Yaku base class)
- Implementing R5 (Mode dispatcher)
- Implementing R6 (Callback standard)
- Implementing R7 (KoiKoi 3D migration)
- Adding new game mode (to follow unified architecture)
- Need guidance on callback patterns
- Need guidance on inheritance design
- Need to coordinate multi-file changes

**Don't use when:**
- Fixing game logic bugs (use standard Claude Code)
- Fixing animation/rendering issues
- Adding new game features/rules
- Tweaking card positions

---

## Testing Strategy

### After Action 1 (CardValues)
```bash
npm run build          # Check build succeeds
npm run dev            # Play a round, verify scores are same
```

### After Action 3 (GameMode base class)
```bash
npm run build          # Build must succeed
npm run dev            # Test each game mode:
                       # - Koi-Koi (2-player)
                       # - Sakura (2-4 player)
                       # - Hachi-Hachi (3-player)
                       # - MatchGame (1-player)
                       # - Shop (Koi-Koi with bonus)
```

### After Action 4 & 5 (ModeRegistry + Callbacks)
```bash
npm run build          # Build must succeed
npm run dev            # Test:
                       # - Mode switching (via dropdown)
                       # - All game modes playable
                       # - Koi-koi decision modal works
                       # - Hachi-Hachi sage decision works
                       # - Round summary displays correctly
```

---

## Success Metrics

**Phase 1 Complete When:**
- ✅ CardValues.js exists and is imported by 4 files
- ✅ No hardcoded card values remain
- ✅ All tests pass
- ✅ Game plays identically

**Phase 2 Complete When:**
- ✅ GameMode base class exists and all 5 modes inherit
- ✅ ModeRegistry exists; mode switching uses registry
- ✅ All callbacks follow (decision, params) signature
- ✅ main.js reduced from 4,459 to ~3,500 lines
- ✅ Adding new mode requires no main.js changes
- ✅ All tests pass
- ✅ All modes play identically

**Full Success When:**
- Development velocity for new modes: 2-3× faster
- Code reuse: 40-50% (up from 10%)
- Bug fix localization: single file (not scattered)
- System health: 8.0+/10

---

## Frequently Asked Questions

**Q: Do I need to do R1 before R5?**
A: Yes. R5 (ModeRegistry) depends on R1 (GameMode base class). Do them in order.

**Q: Can I add a new game mode before these refactorings?**
A: Not recommended. Wait for R1. Otherwise you'll duplicate all the init/reset logic you'll just extract later.

**Q: What if I'm working on a bug fix?**
A: Use standard Claude Code (not ArchitectureRefactorAgent). Don't mix bug fixes with refactoring.

**Q: Should I use TypeScript?**
A: Not yet. After R1-R6 are stable, TypeScript becomes a good next step. It's deferred.

**Q: What if the refactoring breaks something?**
A: ArchitectureRefactorAgent validates tests pass. If something breaks, it gets caught immediately.

**Q: How long until I can add new game modes fast?**
A: After R1-R6 (3-4 weeks). Then new modes take ~1 week instead of 2-3 weeks.

---

## Summary

| Phase | Action | Effort | Impact | Status |
|-------|--------|--------|--------|--------|
| **1** | CardValues centralization | 30 min | Enables R1-R8 | 🔴 DO FIRST |
| **2** | GameMode base class | High | 50% duplication removed | 🔴 BLOCKING |
| **2** | ModeRegistry refactor | Medium | 1000 LOC deleted from main.js | 🔴 BLOCKING |
| **2** | Callback standardization | Medium | Generic UI dispatcher | 🔴 BLOCKING |
| **3** | Yaku base class | Medium | Variant-ready | 🟡 OPTIONAL |
| **3** | KoiKoi 3D migration | Medium | Animation consistency | 🟡 OPTIONAL |
| **3** | Animation cleanup | Low | Dead code removal | 🟢 DEFERRED |
| **3** | Options interface | Low-Med | Advanced variants | 🟢 DEFERRED |

---

**Next Step:** Start with **Action 1 (CardValues)** today. Takes 30 minutes. Unblocks everything else.

**Questions?** See CLAUDE.md (Development Conventions), TECHNICAL_ANALYSIS.md (detailed rationale), or ask ArchitectureRefactorAgent (`/invoke-ar`).

---

**Version:** 1.0
**Last Updated:** November 2024
**Status:** Ready to begin Phase 1
