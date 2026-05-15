/**
 * AnimationPipeline - Automatic detection of animation stages from zone transitions
 *
 * Maps zone transitions (e.g., 'deck' → 'player0Hand') to animation stages
 * Enables Card3DManager to apply correct duration/easing without hardcoding
 */

import { ANIMATION_STAGE, STAGE_DEFINITIONS, getStage } from './AnimationStageRegistry.js';
import { debugLogger } from './DebugLogger.js';

export class AnimationPipeline {
  constructor() {
    // Map zone transitions to animation stages
    // Format: 'fromZone→toZone' → ANIMATION_STAGE.XXX
    this.transitionMap = {
      // Deck to hand transitions (all players)
      'deck→player0Hand': ANIMATION_STAGE.DECK_TO_HAND,
      'deck→player1Hand': ANIMATION_STAGE.DECK_TO_HAND,
      'deck→player2Hand': ANIMATION_STAGE.DECK_TO_HAND,
      'deck→player3Hand': ANIMATION_STAGE.DECK_TO_HAND,

      // Deck to drawn card display (use same display animation as DECK_TO_HAND)
      'deck→drawnCard': ANIMATION_STAGE.DECK_TO_HAND,

      // Hand to field transitions (all players)
      'player0Hand→field': ANIMATION_STAGE.HAND_TO_FIELD,
      'player1Hand→field': ANIMATION_STAGE.HAND_TO_FIELD,
      'player2Hand→field': ANIMATION_STAGE.HAND_TO_FIELD,
      'player3Hand→field': ANIMATION_STAGE.HAND_TO_FIELD,

      // Field to trick transitions (all players)
      'field→player0Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'field→player1Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'field→player2Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'field→player3Trick': ANIMATION_STAGE.FIELD_TO_TRICK,

      // Hand to trick direct captures (all players)
      'player0Hand→player0Trick': ANIMATION_STAGE.HAND_TO_TRICK,
      'player1Hand→player1Trick': ANIMATION_STAGE.HAND_TO_TRICK,
      'player2Hand→player2Trick': ANIMATION_STAGE.HAND_TO_TRICK,
      'player3Hand→player3Trick': ANIMATION_STAGE.HAND_TO_TRICK,

      // Hachi-Hachi teyaku display (all players)
      'player0Hand→player0Teyaku': ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY,
      'player1Hand→player1Teyaku': ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY,
      'player2Hand→player2Teyaku': ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY,

      // Teyaku back to hand (after display)
      'player0Teyaku→player0Hand': ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY,
      'player1Teyaku→player1Hand': ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY,
      'player2Teyaku→player2Hand': ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY,

      // Field self-adjustment (field → field, triggered by relayoutZone)
      'field→field': ANIMATION_STAGE.FIELD_SELF_ADJUST,

      // Self-transitions (repositioning within same zone, no animation)
      'player0Hand→player0Hand': null,
      'player1Hand→player1Hand': null,
      'player2Hand→player2Hand': null,
      'player3Hand→player3Hand': null,
      'drawnCard→drawnCard': null,
      'opponentPlayedCard→opponentPlayedCard': null,

      // Opponent played card display transitions
      'player0Hand→opponentPlayedCard': ANIMATION_STAGE.HAND_TO_FIELD,
      'player1Hand→opponentPlayedCard': ANIMATION_STAGE.HAND_TO_FIELD,
      'player2Hand→opponentPlayedCard': ANIMATION_STAGE.HAND_TO_FIELD,
      'player3Hand→opponentPlayedCard': ANIMATION_STAGE.HAND_TO_FIELD,

      // Opponent played card to trick transitions
      'opponentPlayedCard→player0Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'opponentPlayedCard→player1Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'opponentPlayedCard→player2Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'opponentPlayedCard→player3Trick': ANIMATION_STAGE.FIELD_TO_TRICK,

      // Drawn card automatic match to trick
      'drawnCard→player0Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'drawnCard→player1Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'drawnCard→player2Trick': ANIMATION_STAGE.FIELD_TO_TRICK,
      'drawnCard→player3Trick': ANIMATION_STAGE.FIELD_TO_TRICK,

      // Drawn card to field (no match)
      'drawnCard→field': ANIMATION_STAGE.HAND_TO_FIELD,
    };

    // Game mode → animation stages mapping
    this.modeStagesMap = {
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
  }

  /**
   * Get animation stage for a zone transition
   * @param {string} fromZone - Source zone (e.g., 'deck', 'player0Hand', 'field')
   * @param {string} toZone - Target zone (e.g., 'player0Hand', 'field', 'player0Trick')
   * @param {object} context - Optional context (gameMode, etc.)
   * @returns {object|null} Stage definition or null if no match found
   */
  getStageForTransition(fromZone, toZone, context = {}) {
    const key = `${fromZone}→${toZone}`;

    // Check explicit map first
    if (key in this.transitionMap) {
      const stageName = this.transitionMap[key];
      // If mapped to null, it's a no-animation repositioning
      return stageName ? getStage(stageName) : null;
    }

    // Pattern-based matching for dynamic player counts
    // Match 'playerXHand→playerXHand' pattern (self-transitions)
    if (/^player\d+Hand→player\d+Hand$/.test(key)) {
      return null;  // Self-transition, no animation
    }

    // Match 'deck→playerXHand' pattern
    if (/^deck→player\d+Hand$/.test(key)) {
      return getStage(ANIMATION_STAGE.DECK_TO_HAND);
    }

    // Match 'playerXHand→field' pattern
    if (/^player\d+Hand→field$/.test(key)) {
      return getStage(ANIMATION_STAGE.HAND_TO_FIELD);
    }

    // Match 'field→playerXTrick' pattern
    if (/^field→player\d+Trick$/.test(key)) {
      return getStage(ANIMATION_STAGE.FIELD_TO_TRICK);
    }

    // Match 'drawnCard→playerXTrick' pattern
    if (/^drawnCard→player\d+Trick$/.test(key)) {
      return getStage(ANIMATION_STAGE.FIELD_TO_TRICK);
    }

    // Match 'playerXHand→playerXTeyaku' pattern
    if (/^player\d+Hand→player\d+Teyaku$/.test(key)) {
      return getStage(ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY);
    }

    // Match 'playerXTeyaku→playerXHand' pattern
    if (/^player\d+Teyaku→player\d+Hand$/.test(key)) {
      return getStage(ANIMATION_STAGE.HACHIHACHI_TEYAKU_DISPLAY);
    }

    // Match 'playerXHand→playerXTrick' pattern (direct hand to trick)
    if (/^player\d+Hand→player\d+Trick$/.test(key)) {
      return getStage(ANIMATION_STAGE.HAND_TO_TRICK);
    }

    // Don't warn for null/undefined fromZone (initial placement)
    if (fromZone !== null && fromZone !== undefined) {
      console.warn(`No animation stage defined for transition: ${key}`);
    }
    return null;
  }

  /**
   * Get all animation stages used by a game mode
   * Used for validation and debugging
   * @param {string} gameMode - Mode name (koikoi, sakura, hachihachi, matchgame)
   * @returns {array} Array of stage objects with name and definition
   */
  getStagesForGameMode(gameMode) {
    const stages = this.modeStagesMap[gameMode] || [];
    return stages.map(stageName => ({
      name: stageName,
      definition: getStage(stageName)
    }));
  }

  /**
   * For "no animation" mode: return instant stage (duration=0)
   * @param {string} fromZone
   * @param {string} toZone
   * @returns {object|null} Stage with duration=0
   */
  getInstantStage(fromZone, toZone) {
    const stage = this.getStageForTransition(fromZone, toZone);
    if (!stage) return null;

    return {
      ...stage,
      duration: 0,
      isInstant: true,
      description: `(instant) ${stage.description}`
    };
  }

  /**
   * Debug helper: generate readable animation pipeline diagram
   * Shows all stages in a sequence with durations
   * @param {array} stages - Array of stage objects or stage names
   * @returns {string} Text diagram for console output
   */
  generatePipelineDiagram(stages) {
    let diagram = 'Animation Pipeline:\n';
    let totalMs = 0;

    stages.forEach((stage, idx) => {
      const stageName = typeof stage === 'string' ? stage : stage.name;
      const stageDef = getStage(stageName);
      if (stageDef) {
        diagram += `  ${idx + 1}. ${stageDef.description} (${stageDef.duration}ms)\n`;
        totalMs += stageDef.duration;
      }
    });

    diagram += `\nTotal Duration: ${totalMs}ms\n`;
    return diagram;
  }

  /**
   * Validate that all transitions in a mode have defined stages
   * @param {string} gameMode - Mode name
   * @returns {object} Validation result {valid: bool, errors: array}
   */
  validateMode(gameMode) {
    const modes = this.modeStagesMap[gameMode];
    if (!modes) {
      return { valid: false, errors: [`Unknown game mode: ${gameMode}`] };
    }

    const errors = [];
    modes.forEach(stageName => {
      const stage = getStage(stageName);
      if (!stage) {
        errors.push(`Stage not defined: ${stageName}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      stageCount: modes.length
    };
  }
}

// Export singleton instance
export const animationPipeline = new AnimationPipeline();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.animationPipeline = animationPipeline;
  debugLogger.log('animation', 'AnimationPipeline available for debugging: window.animationPipeline.getStageForTransition(fromZone, toZone) | getStagesForGameMode(mode) | validateMode(mode) | generatePipelineDiagram(stages)');
}
