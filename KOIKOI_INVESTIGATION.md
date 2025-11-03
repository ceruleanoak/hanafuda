# Koi-Koi Decision Mechanic Investigation

## Executive Summary

This document investigates the "koi-koi" decision mechanic for the Hanafuda game, including rule variations and implementation recommendations. The koi-koi decision is the core mechanic that gives the game its name and strategic depth.

---

## 1. Core Koi-Koi Decision Mechanic

### What is Koi-Koi?

When a player forms a **new yaku** (scoring combination) or **improves an existing yaku**, they must make a critical decision:

1. **Call "Shobu" (しょうぶ - "match/game")**
   - Ends the round immediately
   - Player secures their current points
   - Safe option with no risk

2. **Call "Koi-Koi" (こいこい - "come on, come on!")**
   - Round continues
   - Player can potentially score more yaku
   - **Risk**: If opponent scores next, opponent gets point multiplier
   - **Reward**: If player scores again, they get point multiplier

### When Does the Decision Occur?

The decision is triggered when:
- A player forms a **new yaku** they didn't have before
- A player **improves an existing yaku** (e.g., Ribbons going from 5 to 6 cards)
- This happens after capturing cards (either from hand or drawn card)

### Current Implementation Gap

The current codebase (`KoiKoi.js:437-455`) detects yaku formation but **does not pause for decision**:
```javascript
updateYaku(player) {
  // ... checks for yaku
  if (yaku.length > 0) {
    const score = Yaku.calculateScore(yaku);
    this.message = `Yaku! ${yakuNames} (${score} points)`;
    // ❌ No decision prompt - game just continues
  }
}
```

**Implementation Location**: The decision modal should appear in `updateYaku()` when:
- `player === 'player'` (human player scored)
- `yaku.length > 0` (has at least one yaku)
- Koi-koi rules are enabled in options

---

## 2. Rule Variations

### Variation 1: Point Multipliers (Critical)

Different ways to calculate scores after koi-koi calls:

#### Option A: Cumulative Multipliers (Traditional Japanese)
- First koi-koi: 2× points if you score again
- Second koi-koi: 3× points if you score again
- Third koi-koi: 4× points if you score again
- Opponent scoring after your koi-koi: 2× their points

**Example**: Player has 6 points, calls koi-koi, scores 3 more points = (6+3) × 2 = 18 points

#### Option B: Single Multiplier Only
- Any koi-koi call results in 2× multiplier
- Multiple koi-koi calls don't stack
- Simpler but less dramatic

#### Option C: 7+ Point Auto-Double
- If final score is 7+ points, automatically double it
- No koi-koi call needed
- Can combine with other multiplier rules

**Recommendation**: Offer all three as separate toggle options:
- "Koi-Koi Multipliers" (dropdown: None / 2x only / 2x-3x-4x)
- "Auto-double 7+ points" (checkbox)

### Variation 2: Viewing Yaku Toggles

The two "viewing" yaku can be controversial:

**Viewing Sake (花見酒 - Hanami-zake)**: 3 points
- Requires: March Curtain + September Sake Cup
- Cards: `{month: 'March', name: 'curtain'}` + `{month: 'September', name: 'sake cup'}`

**Moon Viewing Sake (月見酒 - Tsukimi-zake)**: 3 points
- Requires: August Moon + September Sake Cup
- Cards: `{month: 'August', name: 'moon'}` + `{month: 'September', name: 'sake cup'}`

**Variation Options**:
1. **Always Enabled** (current implementation)
2. **Always Disabled** (stricter variant)
3. **Enabled Only With Other Yaku** (requires at least one non-viewing yaku)

**Current Code Location**: `Yaku.js:58-64`
```javascript
// Viewing Sake (花見酒) - 3 points
const hanami = this.checkHanami(cards);
if (hanami) yaku.push(hanami);

// Moon Viewing Sake (月見酒) - 3 points
const tsukimi = this.checkTsukimi(cards);
if (tsukimi) yaku.push(tsukimi);
```

**Implementation**: These checks need to be wrapped in conditional logic based on options.

### Variation 3: Game Length

Current implementation supports 1, 3, or 6 rounds (modal in `index.html:28-37`).

Traditional variants:
- **Short Game**: 6 rounds (already supported ✓)
- **Long Game**: 12 rounds (add option)
- **Single Round**: 1 round (already supported ✓)

**Recommendation**: Add 12-round option to existing modal.

### Variation 4: Teyaku (Hand Yaku) - Advanced

Some variants include "teyaku" - scoring combinations in your initial hand before playing:
- **Four of a Kind**: 4 cards of same month in hand = 6 points
- **Four Pairs**: 4 pairs of matching months in hand = 6 points

**Note**: This is a major feature addition. Recommend **not implementing** in initial phase.

---

## 3. Implementation Plan

### Phase 1: Options/Rules Menu

Create a comprehensive settings modal:

```
Options
├── Game Rules
│   ├── Enable Koi-Koi Decision [✓]
│   │   └── Multiplier Mode: [2x→3x→4x ▼]
│   ├── Auto-double 7+ points [ ]
│   └── Number of Rounds: [6 ▼]
│
└── Yaku Rules
    ├── Viewing Sake [▼]
    │   ├── Always Enabled
    │   ├── Always Disabled
    │   └── Require Other Yaku
    └── Moon Viewing Sake [▼]
        ├── Always Enabled
        ├── Always Disabled
        └── Require Other Yaku
```

**File Changes Needed**:
1. `index.html`: Add options modal HTML
2. `styles.css`: Style options modal (reuse existing modal styles)
3. `main.js`: Add options button and event listeners
4. `KoiKoi.js`: Add options parameter to constructor
5. New file: `GameOptions.js` - Manage options state and localStorage

### Phase 2: Koi-Koi Decision Modal

When player scores a yaku:

```
╔════════════════════════════════╗
║     You formed a Yaku!         ║
║                                ║
║  Poetry Ribbons - 6 points     ║
║  Current Score: 6 points       ║
║                                ║
║  Continue playing?             ║
║                                ║
║  [ Shobu ]      [ Koi-Koi! ]   ║
║  (End Round)    (Continue)     ║
╚════════════════════════════════╝
```

**File Changes**:
1. `index.html`: Add koi-koi decision modal
2. `KoiKoi.js`:
   - Pause game when yaku is formed
   - Wait for player decision
   - Track koi-koi state (who called it, how many times)
   - Apply multipliers based on options

### Phase 3: Multiplier Logic

Track these new states in `KoiKoi.js`:
```javascript
constructor() {
  // ... existing code
  this.koikoiState = {
    playerCalled: false,
    opponentCalled: false,
    playerCount: 0,      // How many times player called koi-koi
    opponentCount: 0,
    roundActive: true     // Is the round still going after koi-koi?
  };
}
```

Modify `endRound()` to apply multipliers:
```javascript
endRound() {
  let playerRoundScore = Yaku.calculateScore(playerYaku);
  let opponentRoundScore = Yaku.calculateScore(opponentYaku);

  // Apply koi-koi multipliers
  if (this.options.koikoiEnabled) {
    playerRoundScore *= this.calculateMultiplier('player');
    opponentRoundScore *= this.calculateMultiplier('opponent');
  }

  // Apply 7+ auto-double
  if (this.options.autoDouble7Plus) {
    if (playerRoundScore >= 7) playerRoundScore *= 2;
    if (opponentRoundScore >= 7) opponentRoundScore *= 2;
  }

  // ... rest of scoring
}
```

### Phase 4: Opponent AI for Koi-Koi

Opponent needs strategy for koi-koi decision:

**Simple AI Strategy**:
- If score ≥ 10 points: Always call Shobu (safe)
- If score 7-9 points: 70% Shobu, 30% Koi-Koi
- If score 4-6 points: 50% Shobu, 50% Koi-Koi
- If score ≤ 3 points: 70% Koi-Koi, 30% Shobu

**Advanced AI Strategy** (future):
- Consider cards remaining in deck
- Evaluate opponent's progress toward yaku
- Risk assessment based on game state

---

## 4. Files to Modify

### New Files
- `src/game/GameOptions.js` - Options management and localStorage
- `KOIKOI_INVESTIGATION.md` - This document

### Modified Files
1. **src/index.html**
   - Add options button in header
   - Add options modal HTML
   - Add koi-koi decision modal HTML

2. **src/styles.css**
   - Style options modal
   - Style koi-koi decision modal
   - Add toggle/checkbox/dropdown styles

3. **src/main.js**
   - Add options button event listener
   - Load options from localStorage
   - Pass options to KoiKoi constructor

4. **src/game/KoiKoi.js**
   - Accept options in constructor
   - Add koi-koi state tracking
   - Modify `updateYaku()` to show decision modal
   - Add `handleKoikoiDecision()` method
   - Modify `endRound()` to apply multipliers
   - Add opponent AI decision logic

5. **src/game/Yaku.js**
   - Wrap viewing yaku checks in conditionals
   - Accept options parameter in `checkYaku()`

6. **README.md**
   - Update TODO list (remove koi-koi item)
   - Document new options menu
   - Explain rule variations

---

## 5. User Experience Flow

### First-Time User
1. Starts game → Shows round selection modal (existing)
2. (Optional) Clicks "Options" button → Sees rules menu
3. Configures desired rules
4. Plays game
5. Forms first yaku → Sees koi-koi decision modal with explanation
6. Makes choice
7. Options persist in localStorage for next session

### Returning User
1. Starts game with saved options
2. Can change options mid-game (applies to next round)

---

## 6. Testing Checklist

- [ ] Options modal opens and closes properly
- [ ] Options persist in localStorage
- [ ] Koi-koi decision modal appears when player scores yaku
- [ ] Shobu ends round immediately with correct score
- [ ] Koi-Koi continues game and tracks state
- [ ] Multipliers apply correctly (2x, 3x, 4x based on settings)
- [ ] Opponent can score after player's koi-koi and get multiplier
- [ ] Player can score again after koi-koi and get multiplier
- [ ] 7+ auto-double works independently
- [ ] Viewing yaku respect option settings (always/never/require other)
- [ ] Opponent AI makes reasonable koi-koi decisions
- [ ] Multiple rounds work correctly with koi-koi scoring
- [ ] Edge case: Player forms multiple yaku in one turn
- [ ] Edge case: Improving existing yaku (e.g., 5→6 ribbons)
- [ ] Edge case: Both players call koi-koi in same round

---

## 7. Implementation Priority

### High Priority (MVP)
1. ✅ Options modal with basic toggles
2. ✅ Enable/disable koi-koi decision feature
3. ✅ Koi-koi decision modal (Shobu vs Koi-Koi)
4. ✅ Basic 2x multiplier (winner after koi-koi)
5. ✅ Viewing yaku toggle (on/off)

### Medium Priority
1. Cumulative multipliers (2x→3x→4x)
2. 7+ auto-double option
3. Viewing yaku "require other yaku" variant
4. Opponent AI koi-koi decision logic
5. 12-round game option

### Low Priority
1. Multiplier display during gameplay
2. Koi-koi history/statistics
3. Sound effects for koi-koi call
4. Animation for multiplier application
5. Teyaku (hand yaku) - major feature

---

## 8. Technical Considerations

### LocalStorage Schema
```javascript
{
  "hanafuda_options": {
    "koikoiEnabled": true,
    "multiplierMode": "cumulative",  // "none" | "2x" | "cumulative"
    "autoDouble7Plus": false,
    "viewingSakeMode": "always",     // "always" | "never" | "requireOther"
    "moonViewingSakeMode": "always", // "always" | "never" | "requireOther"
    "defaultRounds": 6
  }
}
```

### State Management
The koi-koi state needs careful tracking:
- Who called koi-koi?
- How many times?
- Has anyone scored since?
- When to reset state? (each round)

### Backward Compatibility
- Game should work with no options set (use defaults)
- Existing saves/URLs should not break
- Default behavior: Koi-koi decision **disabled** (current behavior)

---

## 9. Open Questions

1. **Should koi-koi decision be default or opt-in?**
   - Recommendation: **Opt-in** (checkbox off by default)
   - Reason: Preserves current behavior for existing users

2. **Can opponent call koi-koi after player?**
   - Yes, if opponent scores after player's koi-koi
   - Creates interesting "koi-koi battle" scenarios

3. **What if both improve yaku simultaneously?**
   - Current player (who triggered the captures) decides first
   - Their decision affects opponent's multiplier

4. **Should options be changeable mid-game?**
   - Recommendation: Yes, but apply to **next round only**
   - Show confirmation: "Options will apply starting next round"

---

## 10. References

Based on research from:
- Wikipedia: Koi-Koi game rules
- Fuda Wiki: Traditional Japanese variants
- Multiple online hanafuda rule sites
- Video game implementations (Nintendo, mobile apps)

**Note**: Rule variations differ by region and era. This investigation focuses on the most common variants found in modern implementations.

---

## Conclusion

The koi-koi decision mechanic is the defining feature of the game and adds significant strategic depth. Implementing it with configurable variations ensures the game appeals to both traditional players and those who prefer different rule sets.

**Estimated Implementation Time**:
- High Priority features: 8-12 hours
- Medium Priority features: 4-6 hours
- Low Priority features: 6-8 hours
- **Total MVP**: ~12 hours of development

**Next Steps**:
1. Review this investigation with stakeholders
2. Prioritize which variations to implement
3. Create detailed technical specifications
4. Begin Phase 1: Options menu implementation
