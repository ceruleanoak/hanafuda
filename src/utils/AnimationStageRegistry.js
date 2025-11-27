/**
 * AnimationStageRegistry - Central registry for all animation stage definitions
 *
 * This registry makes animation stages EXPLICIT instead of implicit in zone transitions.
 * Each stage has:
 * - duration: Animation length in milliseconds
 * - easing: Easing function name
 * - controlPoint: Optional bezier control point for arcing animations
 * - flipTiming: When to flip card during animation (0-1, where 0.5 is midpoint)
 * - isDisplayAnimation: Whether this is a "display" animation (elevated layer)
 * - waitMode: How to wait for animation completion ('waitCard', 'waitZone', 'waitAll')
 * - description: Human-readable description of the stage
 */

export const ANIMATION_STAGE = {
  // Core transitions
  DECK_TO_HAND: 'deck-to-hand',
  HAND_TO_FIELD: 'hand-to-field',
  HAND_TO_TRICK: 'hand-to-trick',
  HAND_TO_DISCARD: 'hand-to-discard',
  SNAP_MATCH: 'snap-match',              // NEW: Drawn/played card snaps onto matched card FIRST
  FIELD_TO_TRICK: 'field-to-trick',      // MODIFIED: Now used after SNAP_MATCH
  FIELD_SELF_ADJUST: 'field-self-adjust',

  // Mode-specific stages
  SAKURA_HIKI_CAPTURE: 'sakura-hiki-capture',

  HACHIHACHI_TEYAKU_DISPLAY: 'hachihachi-teyaku-display',
  HACHIHACHI_PAYMENT_SETTLE: 'hachihachi-payment-settle',
  HACHIHACHI_DEKIYAKU_UPDATE: 'hachihachi-dekiyaku-update',
  HACHIHACHI_SAGE_DECISION: 'hachihachi-sage-decision',

  MATCHGAME_FLIP_UNMATCHED: 'matchgame-flip-unmatched',
  MATCHGAME_FADE_MATCHED: 'matchgame-fade-matched',
};

export const STAGE_DEFINITIONS = {
  [ANIMATION_STAGE.DECK_TO_HAND]: {
    duration: 350,
    easing: 'easeOutCubic',
    controlPoint: null,
    flipTiming: 0.5,
    isDisplayAnimation: true,
    waitMode: 'waitCard',
    description: 'Card drawn from deck to player hand'
  },

  [ANIMATION_STAGE.HAND_TO_FIELD]: {
    duration: 400,
    easing: 'easeInOutCubic',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitZone',
    description: 'Player plays hand card to field'
  },

  [ANIMATION_STAGE.HAND_TO_TRICK]: {
    duration: 500,
    easing: 'easeInOutCubic',
    controlPoint: { x: 0, y: 0, z: 80 },  // Arc upward
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitZone',
    description: 'Hand card directly to trick pile (no field match)'
  },

  [ANIMATION_STAGE.HAND_TO_DISCARD]: {
    duration: 400,
    easing: 'easeInOutCubic',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitZone',
    description: 'Hand card to discard pile (no match available)'
  },

  [ANIMATION_STAGE.SNAP_MATCH]: {
    duration: 300,
    easing: 'easeInOutQuad',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitCard',
    description: 'NEW: Drawn/played card snaps directly onto matched field card (no arc yet)'
  },

  [ANIMATION_STAGE.FIELD_TO_TRICK]: {
    duration: 500,
    easing: 'easeInOutCubic',
    controlPoint: { x: 0, y: 0, z: 150 },  // Arc upward (increased from 80)
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitZone',
    description: 'MODIFIED: Matched pair (already snapped) animates to trick pile with arc'
  },

  [ANIMATION_STAGE.FIELD_SELF_ADJUST]: {
    duration: 200,
    easing: 'easeInOutQuad',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitZone',
    description: 'Remaining field cards reposition after match removal'
  },

  // Sakura-specific stages
  [ANIMATION_STAGE.SAKURA_HIKI_CAPTURE]: {
    duration: 350,
    easing: 'easeInOutCubic',
    controlPoint: { x: 0, y: 0, z: 60 },
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitZone',
    description: 'Sakura suit capture (hiki rule)'
  },

  // Hachi-Hachi specific (currently missing explicit stages)
  [ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY]: {
    duration: 300,
    easing: 'easeOutCubic',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitAll',
    description: 'Show teyaku payment grid with pause for readability'
  },

  [ANIMATION_STAGE.HACHIHACHI_PAYMENT_SETTLE]: {
    duration: 400,
    easing: 'easeInOutCubic',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitAll',
    description: 'Animate payment flows between players'
  },

  [ANIMATION_STAGE.HACHIHACHI_DEKIYAKU_UPDATE]: {
    duration: 300,
    easing: 'easeOutCubic',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitZone',
    description: 'Captured combo accumulation display update'
  },

  [ANIMATION_STAGE.HACHIHACHI_SAGE_DECISION]: {
    duration: 200,
    easing: 'easeInOutCubic',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitAll',
    description: 'Pause for Sage/Shoubu decision (currently implicit)'
  },

  // MatchGame-specific stages
  [ANIMATION_STAGE.MATCHGAME_FLIP_UNMATCHED]: {
    duration: 250,
    easing: 'easeInOutQuad',
    controlPoint: null,
    flipTiming: 0.5,
    isDisplayAnimation: false,
    waitMode: 'waitCard',
    description: 'Card flip back when no match found'
  },

  [ANIMATION_STAGE.MATCHGAME_FADE_MATCHED]: {
    duration: 300,
    easing: 'easeOutCubic',
    controlPoint: null,
    flipTiming: null,
    isDisplayAnimation: false,
    waitMode: 'waitCard',
    description: 'Fade out matched card pair'
  },
};

export const STAGE_SEQUENCES = {
  HAND_TO_FIELD_CAPTURE: {
    name: 'hand-to-field-capture',
    stages: [
      ANIMATION_STAGE.HAND_TO_FIELD,      // 400ms: Hand card to field
      ANIMATION_STAGE.SNAP_MATCH,         // 300ms: Snap onto matched card - NEW
      ANIMATION_STAGE.FIELD_TO_TRICK      // 500ms: Arc to trick pile
    ],
    totalDuration: 1200
  },

  DECK_TO_FIELD_CAPTURE: {
    name: 'deck-to-field-capture',
    stages: [
      ANIMATION_STAGE.HAND_TO_FIELD,      // 400ms: Drawn card plays to field
      ANIMATION_STAGE.SNAP_MATCH,         // 300ms: Snap onto matched card - NEW
      ANIMATION_STAGE.FIELD_TO_TRICK      // 500ms: Arc to trick pile
    ],
    totalDuration: 1200
  },

  FIELD_AFTER_CAPTURE: {
    name: 'field-after-capture',
    stages: [
      ANIMATION_STAGE.FIELD_SELF_ADJUST   // 200ms: Reposition remaining cards
    ],
    totalDuration: 200
  },

  // Hachi-Hachi enriched sequence (currently missing stages)
  HACHIHACHI_TEYAKU_PHASE: {
    name: 'hachihachi-teyaku-phase',
    stages: [
      ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY,     // 300ms: Show grid
      ANIMATION_STAGE.HACHIHACHI_PAYMENT_SETTLE      // 400ms: Animate payments
    ],
    totalDuration: 700
  },

  HACHIHACHI_DEKIYAKU_PHASE: {
    name: 'hachihachi-dekiyaku-phase',
    stages: [
      ANIMATION_STAGE.HACHIHACHI_DEKIYAKU_UPDATE     // 300ms: Update combos
    ],
    totalDuration: 300
  },
};

/**
 * Get stage definition by name
 * @param {string} stageName - Stage identifier from ANIMATION_STAGE
 * @returns {object|null} Stage definition object or null if not found
 */
export function getStage(stageName) {
  if (!STAGE_DEFINITIONS[stageName]) {
    console.warn(`Stage ${stageName} not defined in registry`);
    return null;
  }
  return STAGE_DEFINITIONS[stageName];
}

/**
 * Get sequence definition by name
 * @param {string} sequenceName - Sequence identifier from STAGE_SEQUENCES keys
 * @returns {object|null} Sequence definition object or null if not found
 */
export function getSequence(sequenceName) {
  if (!STAGE_SEQUENCES[sequenceName]) {
    console.warn(`Sequence ${sequenceName} not defined in registry`);
    return null;
  }
  return STAGE_SEQUENCES[sequenceName];
}

/**
 * Get all stages used by a specific game mode
 * @param {string} gameMode - Mode name (koikoi, sakura, hachihachi, matchgame)
 * @returns {array} Array of stage names
 */
export function getStagesForGameMode(gameMode) {
  const stageMap = {
    koikoi: [
      ANIMATION_STAGE.DECK_TO_HAND,
      ANIMATION_STAGE.HAND_TO_FIELD,
      ANIMATION_STAGE.SNAP_MATCH,
      ANIMATION_STAGE.FIELD_TO_TRICK,
      ANIMATION_STAGE.FIELD_SELF_ADJUST,
    ],
    sakura: [
      ANIMATION_STAGE.DECK_TO_HAND,
      ANIMATION_STAGE.HAND_TO_FIELD,
      ANIMATION_STAGE.SNAP_MATCH,
      ANIMATION_STAGE.FIELD_TO_TRICK,
      ANIMATION_STAGE.FIELD_SELF_ADJUST,
      ANIMATION_STAGE.SAKURA_HIKI_CAPTURE,
    ],
    hachihachi: [
      ANIMATION_STAGE.DECK_TO_HAND,
      ANIMATION_STAGE.HAND_TO_FIELD,
      ANIMATION_STAGE.SNAP_MATCH,
      ANIMATION_STAGE.FIELD_TO_TRICK,
      ANIMATION_STAGE.FIELD_SELF_ADJUST,
      ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY,
      ANIMATION_STAGE.HACHIHACHI_PAYMENT_SETTLE,
      ANIMATION_STAGE.HACHIHACHI_DEKIYAKU_UPDATE,
      ANIMATION_STAGE.HACHIHACHI_SAGE_DECISION,
    ],
    matchgame: [
      ANIMATION_STAGE.MATCHGAME_FLIP_UNMATCHED,
      ANIMATION_STAGE.MATCHGAME_FADE_MATCHED,
    ],
  };

  return stageMap[gameMode] || [];
}
