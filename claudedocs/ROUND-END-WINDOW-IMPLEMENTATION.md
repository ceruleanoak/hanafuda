# Round-End Window Implementation

## Overview
Implemented a unified round-end window system that supports 2P, 3P, and 4P game modes with responsive layouts. The system dynamically adapts to different player counts and team modes while maximizing horizontal space utilization.

## Status
✅ **COMPLETE** - No bugs found. Implementation is production-ready.

## Architecture

### Core Design Principles
- **Single Layout System**: One HTML structure serves all player counts (2P, 3P, 4P)
- **CSS-Driven Responsiveness**: Grid layouts controlled by `data-player-count` and `data-teams-mode` attributes
- **DRY Code**: Single score card generation loop, single yaku display loop
- **Future-Proof**: Easy to extend to 5+ players with CSS changes only

### Key Components

#### HTML Structure (`src/index.html`)
```html
<!-- Single unified structure for all modes -->
<div id="round-score-display" data-player-count="2">
  <div class="round-score-grid"></div>
</div>

<div id="round-yaku-display" data-player-count="2">
  <div class="yaku-grid"></div>
</div>
```

#### JavaScript Logic (`src/main.js`)

**Game Controller Properties:**
- `selectedPlayerCount`: Tracks number of players (2, 3, or 4)
- `isTeamsMode`: Tracks whether 4P is teams (true) or competitive (false)
- Automatically set to `true` when player count is 4

**Display Functions:**
- `displayRoundSummaryModal(data)`: Main unified display function
  - Handles score card generation for all player counts
  - Special handling for 4P teams mode (groups scores into team sections)
  - Generates yaku/trick detail cards

**4P Teams Organization:**
- Team 1: Player 0 (You) + Player 2 (AI 1)
- Team 2: Player 1 (AI 2) + Player 3 (AI 3)

#### CSS Layout System (`src/styles.css`)

**Responsive Grid Rules:**

```css
/* 2 Players: 2-column layout */
#round-score-display[data-player-count="2"] .round-score-grid {
  grid-template-columns: repeat(2, 1fr);
}

/* 3 Players: 3-column layout */
#round-score-display[data-player-count="3"] .round-score-grid {
  grid-template-columns: repeat(3, 1fr);
}

/* 4 Players Competitive: 2×2 grid */
#round-score-display[data-player-count="4"] .round-score-grid {
  grid-template-columns: repeat(2, 1fr);
}

/* 4 Players Teams: Team groups with 2-column layout each */
#round-score-display[data-player-count="4"][data-teams-mode="true"] .team-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  /* Grouped with header and border */
}

/* Yaku: Always full-width individual columns */
#round-yaku-display[data-player-count="4"][data-teams-mode="true"] .yaku-grid {
  grid-template-columns: repeat(4, 1fr);
}
```

**Customization Hooks (CSS Variables):**
- `--score-card-border-color`: Default #4ecdc4
- `--score-card-bg-color`: Default rgba(0, 0, 0, 0.3)
- `--score-card-border-color-you`: Default #ffeb3b (highlights current player)
- `--score-card-bg-color-you`: Default rgba(255, 235, 59, 0.1)

## Display Layouts

### 2P Mode
```
Scores:
[You] [Opponent]

Yaku:
[Your Yaku] [Opponent Yaku]
```

### 3P Mode
```
Scores:
[You] [Opponent 1] [Opponent 2]

Yaku:
[You] [Opponent 1] [Opponent 2]
```

### 4P Competitive Mode
```
Scores:
[You]        [Opponent 1]
[Opponent 2] [Opponent 3]

Yaku:
[You] [Opponent 1] [Opponent 2] [Opponent 3]
```

### 4P Teams Mode
```
Scores:
┌─ Team 1 (You & AI 1) ─┐  ┌─ Team 2 (AI 2 & AI 3) ─┐
│  [You] [AI 1]         │  │  [AI 2] [AI 3]         │
└───────────────────────┘  └────────────────────────┘

Yaku (individual columns):
[You] [AI 1] [AI 2] [AI 3]
```

## Features

### ✅ Implemented
- [x] Unified HTML structure (single layout for all modes)
- [x] Responsive CSS Grid (2P, 3P, 4P support)
- [x] 4P Teams Mode with visual team grouping for scores
- [x] 4P individual yaku columns for full width utilization
- [x] Backward compatibility with Koi-Koi 2P (individual score fields)
- [x] Sakura multi-player yaku details display
- [x] Score breakdown details for Koi-Koi
- [x] Header/footer overflow prevention (max-height with scroll)
- [x] CSS customization variables for artist styling
- [x] Hover effects and transitions
- [x] Proper null checking for optional yaku/breakdown data
- [x] Button text based on game state (isGameOver flag)

### Game Mode Support
- [x] Koi-Koi 2P
- [x] Sakura 2P
- [x] Sakura 3P
- [x] Sakura 4P Teams
- [x] Shop Mode (inherits Koi-Koi display)

## Technical Details

### Data Flow
1. Game engine (Sakura.js, KoiKoi.js) calls round summary callback
2. GameController.showRoundSummary() receives data
3. Calls displayRoundSummaryModal(data) with playerScores array
4. Function sets data attributes on DOM elements
5. CSS handles responsive layout based on attributes
6. Score and yaku cards generated dynamically

### Data Structure
```javascript
{
  playerCount: 2|3|4,
  currentRound: number,
  isGameOver: boolean,
  playerTotalScore: number,
  opponentTotalScore: number,
  isTeamsMode: boolean,
  playerScores: [
    {
      roundScore: number,
      basePoints: number,    // Sakura
      yaku: array,           // Sakura
      yakuPenalty: number,   // Sakura
      playerIndex: number
    },
    // ... more players
  ],
  playerYaku: array,        // Koi-Koi
  opponentYaku: array,      // Koi-Koi
  playerScoreBreakdown: {}, // Koi-Koi
  opponentScoreBreakdown: {}// Koi-Koi
}
```

### Backward Compatibility
- Koi-Koi games pass individual fields (`playerRoundScore`, `opponentRoundScore`)
- Code constructs `playerScores` array from these fields if not provided
- Null checks prevent errors from missing optional fields

## Visual Refinements

### Space Optimization
- Modal max-height: `calc(100vh - 120px)` (accounts for header/footer)
- Card padding: `1rem` (compact but readable)
- Font sizes optimized for 4-column layout:
  - Headers: `1.1rem`
  - Yaku cards: `0.85rem`
  - Score values: `1.2rem`
- Gaps: `1.5rem` between cards, `1.25rem` within team groups

### Visual Hierarchy
- Current player ("You") highlighted with yellow border and tint
- Opponents use cyan border
- Team groups have distinct headers with cyan background
- Score values in bright yellow for easy reading
- Yaku labels in muted gray for secondary information

## Testing Checklist

✅ 2P Koi-Koi - Round end displays correctly
✅ 2P Sakura - Round end displays correctly
✅ 3P Sakura - 3-column layout works
✅ 4P Sakura Teams - Team grouping and individual yaku columns work
✅ No header/footer cutoff - Modal scrolls properly
✅ All yaku/trick details display correctly
✅ Score calculations shown accurately
✅ Responsive to different screen sizes

## Known Limitations

None. No bugs found during implementation and testing.

## Future Enhancements (Not Required)

- Add 5P+ support (CSS change only)
- Custom player names (instead of "AI 1", "AI 2")
- Animation for card appearance
- Custom card backgrounds per game mode
- Animated score updates with point increments

## Files Modified

- `src/index.html`: Unified HTML structure
- `src/styles.css`: Responsive grid layouts, customization variables
- `src/main.js`:
  - Added `isTeamsMode` property
  - Consolidated display functions
  - Added team grouping logic for 4P
  - Updated yaku display to individual columns

## Notes for Artist/Designer

### CSS Variables Available
Modify these in `src/styles.css` to customize appearance:

```css
.round-score-display {
  --score-card-border-color: #4ecdc4;        /* Border for opponents */
  --score-card-border-width: 4px;
  --score-card-bg-color: rgba(0, 0, 0, 0.3);
  --score-card-bg-color-you: rgba(255, 235, 59, 0.1);
  --score-card-border-color-you: #ffeb3b;    /* Border for current player */
  --score-grid-gap: 1.5rem;
}

.round-yaku-display {
  --yaku-card-bg-color: rgba(0, 0, 0, 0.2);
  --yaku-card-bg-color-you: rgba(255, 235, 59, 0.05);
  --yaku-grid-gap: 1.5rem;
}
```

### Classes for Styling
- `.player-score-card` / `.yaku-card`: Main card containers
- `.player-you`: Applied to current player cards (allow differentiation)
- `.team-group`: Container for team score groupings (4P teams only)
- `.score-card-label` / `.yaku-card-header`: Player name headers
- `.score-value`: Displayed point values

---

**Last Updated**: 2025-11-15
**Status**: Production Ready ✅
