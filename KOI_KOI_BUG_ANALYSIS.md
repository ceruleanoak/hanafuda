# Koi-Koi Decision Logic Bug Analysis

## Summary
The game has a critical race condition where game turns continue executing before the koi-koi decision is resolved, causing the game to not pause correctly when awaiting a koi-koi decision.

---

## 1. YAKU FORMATION CHECKING
**Location:** `/home/user/hanafuda/src/game/KoiKoi.js` - `Yaku.checkYaku()` method

**File:** `/home/user/hanafuda/src/game/Yaku.js` (lines 14-72)

The yaku detection checks for:
- Five Brights (15 points)
- Four Brights (10 points) 
- Rainy Four Brights (8 points)
- Three Brights (6 points)
- Poetry Ribbons (6 points)
- Blue Ribbons (6 points)
- Ribbons (5 points)
- Boar-Deer-Butterfly (6 points)
- Animals (5 points)
- Chaff (1 point)
- Viewing Sake (3 points)
- Moon Viewing Sake (3 points)

Detection is called via: `Yaku.checkYaku(captured, this.gameOptions)` at line 512 in KoiKoi.js

---

## 2. KOIN-KOI DECISION MODAL TRIGGERING
**Location:** `/home/user/hanafuda/src/game/KoiKoi.js` - `updateYaku()` method (lines 510-556)

**Flow:**
1. When yaku is detected: `const yaku = Yaku.checkYaku(captured, this.gameOptions);` (line 512)
2. Check if it's a NEW yaku: `const isNewYaku = this.hasNewYaku(previousYaku, yaku);` (line 531)
3. If new AND koi-koi enabled: Check which player
   - **For Player (lines 542-549):**
     ```javascript
     if (player === 'player' && this.currentPlayer === 'player') {
       this.koikoiState.waitingForDecision = true;
       this.koikoiState.decisionPlayer = 'player';
       if (this.uiCallback) {
         this.uiCallback(yaku, score);  // Shows modal in main.js
       }
     }
     ```
   - **For Opponent (lines 550-553):**
     ```javascript
     else if (player === 'opponent' && this.currentPlayer === 'opponent') {
       this.opponentKoikoiDecision(yaku, score);  // AI decision
     }
     ```

**UI Modal Callback:** `/home/user/hanafuda/src/main.js` - `showKoikoiDecision()` (lines 362-381)
- Displays yaku list and scores
- Shows modal at line 380: `this.koikoiModal.classList.add('show');`

---

## 3. OPPONENT AI DECISION MAKING
**Location:** `/home/user/hanafuda/src/game/KoiKoi.js` - `opponentKoikoiDecision()` (lines 577-601)

**Strategy:**
- Score >= 10 points: 10% koi-koi, 90% shobu (conservative)
- Score 7-9 points: 30% koi-koi, 70% shobu
- Score 4-6 points: 50% koi-koi, 50% shobu
- Score <= 3 points: 70% koi-koi, 30% shobu

**Decision Resolution:** Uses setTimeout with 1500ms delay:
```javascript
const decision = Math.random() < koikoiProbability ? 'koikoi' : 'shobu';
setTimeout(() => {
  this.resolveKoikoiDecision(decision, 'opponent');
}, 1500);
```

---

## 4. KOIN-KOI DECISION PHASES

**State tracking in `koikoiState` object (lines 19-28):**
```javascript
koikoiState = {
  playerCalled: false,
  opponentCalled: false,
  playerCount: 0,        // Times player called koi-koi
  opponentCount: 0,      // Times opponent called koi-koi
  roundActive: true,
  waitingForDecision: false,  // KEY FLAG
  decisionPlayer: null,       // Who needs to decide
  roundWinner: null
}
```

**Decision Resolution Flow:** `resolveKoikoiDecision()` (lines 606-635)
- Sets `waitingForDecision = false`
- If "Shobu": Ends round immediately via `this.endRound()`
- If "Koi-Koi": Sets flags and allows playing to continue
- **CRITICAL:** Does NOT resume turn after koi-koi decision!

---

## 5. THE BUG: Game Doesn't Wait for Decision Before Continuing

### ROOT CAUSE
The game calls `drawPhase()` or `opponentDrawPhase()` **immediately after** `updateYaku()`, without checking if `koikoiState.waitingForDecision` is true.

### BUG SCENARIO 1: Player Captures Cards
**Sequence in `captureCards()` (lines 343-382):**
```javascript
// Line 377
this.playerCaptured.push(handCard, fieldCard);

// Line 380 - Triggers koi-koi modal if new yaku
this.updateYaku('player');

// Line 381 - IMMEDIATELY continues without waiting!
this.drawPhase();  // ❌ BUG: Game continues before decision made
```

**Result:** 
- Modal appears
- Game simultaneously starts draw phase
- Player can't interact properly with modal

### BUG SCENARIO 2: Opponent Captures Cards  
**Sequence in `opponentTurn()` (lines 712-762):**
```javascript
// Line 734-735 - Opponent captures
this.opponentCaptured.push(handCard, selectedMatch);

// Line 736 - Triggers opponent AI decision with setTimeout(1500ms)
this.updateYaku('opponent');

// Line 762 - IMMEDIATELY continues without waiting!
this.opponentDrawPhase();  // ❌ BUG: Draw phase starts before decision resolved
```

**Result:**
- Opponent AI decision is queued for 1500ms resolution
- But draw phase starts immediately
- Decision might arrive after draw phase is already executing

### BUG SCENARIO 3: Same Issue in `captureDrawnCard()` 
**At line 415:**
```javascript
this.updateYaku('player');
this.endTurn();  // Called without checking waitingForDecision
```

### BUG SCENARIO 4: Opponent Draw Phase
**In `opponentDrawPhase()` (lines 814, 831):**
```javascript
this.updateYaku('opponent');
this.endTurn();  // Called without checking waitingForDecision
```

---

## MISSING SAFEGUARDS

### No Check in Drawing Phases
Neither `drawPhase()` nor `opponentDrawPhase()` check for `koikoiState.waitingForDecision`

### No Check in Turn Transitions  
`endTurn()` doesn't verify decision is made before switching turns

### No Check in 4-Card Celebrations
When 4-card captures are celebrated, `updateYaku()` is called inside setTimeout (lines 363, 459, etc.) without preventing continuation

---

## WHERE DECISION IS HANDLED

### Player Decision
1. Modal shown via `showKoikoiDecision()` in main.js (line 30 callback)
2. Player clicks button
3. `handleKoikoiDecision()` called (main.js lines 386-389)
4. Calls `this.game.resolveKoikoiDecision(decision)`

**Problem:** No code resumes the player's turn after koi-koi is chosen!

### Opponent Decision
1. `opponentKoikoiDecision()` calls `resolveKoikoiDecision()` via setTimeout(1500ms)
2. `resolveKoikoiDecision()` sets message but doesn't resume turn

**Problem:** Turn continuation is not explicitly handled!

---

## EVIDENCE FROM CODE

### Where `waitingForDecision` is Set
- Line 544: Set to `true` when player yaku detected
- Line 607: Set to `false` in `resolveKoikoiDecision()`

### Where it Should Be Checked (But Isn't)
- NOT in `drawPhase()` (line 422)
- NOT in `opponentDrawPhase()` (line 769)
- NOT in `endTurn()` (line 640)
- NOT in `captureCards()` (after `updateYaku()` call)
- NOT in `captureDrawnCard()` (after `updateYaku()` call)
- NOT in `opponentTurn()` (after `updateYaku()` calls)

---

## RECOMMENDED FIXES

1. **Add decision check after `updateYaku()` calls:**
   ```javascript
   this.updateYaku('player');
   if (this.koikoiState.waitingForDecision) {
     return;  // Don't continue until decision made
   }
   this.drawPhase();
   ```

2. **Add explicit turn resumption in `resolveKoikoiDecision()`:**
   When koi-koi is chosen, explicitly call the next turn action based on context

3. **Create `resumeTurn()` method:**
   Store the current action context and resume when decision arrives

4. **Add phase for waiting:**
   ```javascript
   this.phase = 'waiting_for_koi_koi_decision';
   ```
   Then check this phase before accepting game actions

