/**
 * AnimationPipeline - Automatic detection of animation stages from zone transitions
 *
 * Maps zone transitions (e.g., 'deck' → 'player0Hand') to animation stages
 * Enables Card3DManager to apply correct duration/easing without hardcoding
 */

import { ANIMATION_STAGE, STAGE_DEFINITIONS, getStage } from './AnimationStageRegistry.js';

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
    const stageName = this.transitionMap[key];

    if (!stageName) {
      // Don't warn for null/undefined fromZone (initial placement)
      if (fromZone !== null && fromZone !== undefined) {
        console.warn(`No animation stage defined for transition: ${key}`);
      }
      return null;
    }

    return getStage(stageName);
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
  console.log('AnimationPipeline available for debugging:');
  console.log('  window.animationPipeline.getStageForTransition(fromZone, toZone)');
  console.log('  window.animationPipeline.getStagesForGameMode(mode)');
  console.log('  window.animationPipeline.validateMode(mode)');
  console.log('  window.animationPipeline.generatePipelineDiagram(stages)');
}
