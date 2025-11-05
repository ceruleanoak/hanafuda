/**
 * AnimationSequencer - Manages complex multi-step card animations for 3D system
 * Handles card plays, draws, matches with proper timing and visual feedback
 */

import { debugLogger } from './DebugLogger.js';
import { LayoutManager } from './LayoutManager.js';

export class AnimationSequencer {
  constructor(card3DManager) {
    this.card3DManager = card3DManager;
    this.isSequencePlaying = false;
    this.currentSequence = null;
    this.sequenceQueue = [];
    this.lastPhase = null;
  }

  /**
   * Check if a sequence is currently playing
   */
  isPlaying() {
    return this.isSequencePlaying;
  }

  /**
   * Play a card from hand to field or to match a field card
   * @param {Object} handCard - Card being played
   * @param {Object} targetFieldCard - Field card to match (null if placing on field)
   * @param {string} player - 'player' or 'opponent'
   */
  playCardSequence(handCard, targetFieldCard, player, onComplete) {
    if (this.isSequencePlaying) {
      debugLogger.log('animation', '⚠️ Sequence already playing, queueing', null);
      this.sequenceQueue.push(() => this.playCardSequence(handCard, targetFieldCard, player, onComplete));
      return;
    }

    this.isSequencePlaying = true;
    const handCard3D = this.card3DManager.getCard(handCard);

    if (!handCard3D) {
      debugLogger.logAnimationWarning('Card3D not found for hand card', { card: handCard.name });
      this.isSequencePlaying = false;
      if (onComplete) onComplete();
      return;
    }

    debugLogger.log('animation', `🎴 Playing card: ${handCard.name}`, {
      hasMatch: !!targetFieldCard,
      matchCard: targetFieldCard?.name
    });

    if (targetFieldCard) {
      // Animate to match position
      const targetCard3D = this.card3DManager.getCard(targetFieldCard);
      if (!targetCard3D) {
        debugLogger.logAnimationWarning('Target field card3D not found', null);
        this.isSequencePlaying = false;
        if (onComplete) onComplete();
        return;
      }

      // Step 1: Tween hand card to field card position (face up)
      handCard3D.tweenTo(
        { x: targetCard3D.x, y: targetCard3D.y, z: targetCard3D.z + 5, faceUp: 1 },
        600,
        'easeInOutCubic'
      );

      handCard3D.onAnimationComplete = () => {
        // Step 2: Pause to show match
        setTimeout(() => {
          // Highlight match (could add visual effect here)
          debugLogger.log('animation', `✨ Match! ${handCard.name} + ${targetFieldCard.name}`, null);

          // Step 3: Both cards to trick pile (will be synced after sequence)
          this.isSequencePlaying = false;
          if (onComplete) onComplete();
          this.processQueue();
        }, 400); // Pause to observe match
      };
    } else {
      // Place on field - tween to next available field position
      const nextSlot = this.card3DManager.getNextAvailableFieldSlot();

      // Calculate field position
      const fieldConfig = LayoutManager.getZoneConfig(
        'field',
        this.card3DManager.viewportWidth,
        this.card3DManager.viewportHeight
      );

      const spacing = fieldConfig.spacing || 115;
      const centerX = this.card3DManager.viewportWidth / 2;
      const startX = centerX - (8 * spacing) / 2;
      const approxX = startX + (nextSlot * spacing);
      const approxY = this.card3DManager.viewportHeight / 2;

      handCard3D.tweenTo(
        { x: approxX, y: approxY, z: 5, faceUp: 1 },
        500,
        'easeInOutCubic'
      );

      handCard3D.onAnimationComplete = () => {
        this.isSequencePlaying = false;
        if (onComplete) onComplete();
        this.processQueue();
      };
    }
  }

  /**
   * Draw a card from deck and animate to destination
   * @param {Object} drawnCard - Card being drawn
   * @param {Object} matchCard - Field card to match (null if no match)
   * @param {string} player - 'player' or 'opponent'
   */
  drawCardSequence(drawnCard, matchCard, player, onComplete) {
    if (this.isSequencePlaying) {
      debugLogger.log('animation', '⚠️ Sequence already playing, queueing', null);
      this.sequenceQueue.push(() => this.drawCardSequence(drawnCard, matchCard, player, onComplete));
      return;
    }

    this.isSequencePlaying = true;
    const drawnCard3D = this.card3DManager.getCard(drawnCard);

    if (!drawnCard3D) {
      debugLogger.logAnimationWarning('Card3D not found for drawn card', { card: drawnCard.name });
      this.isSequencePlaying = false;
      if (onComplete) onComplete();
      return;
    }

    debugLogger.log('animation', `🃏 Drawing card: ${drawnCard.name}`, {
      hasMatch: !!matchCard,
      matchCard: matchCard?.name
    });

    // Step 1: Lift card up and flip face up
    const currentX = drawnCard3D.x;
    const currentY = drawnCard3D.y;

    drawnCard3D.tweenTo(
      { x: currentX, y: currentY, z: 20, faceUp: 1 },
      400,
      'easeOutCubic'
    );

    drawnCard3D.onAnimationComplete = () => {
      if (matchCard) {
        // Step 2: Move to match position
        const matchCard3D = this.card3DManager.getCard(matchCard);
        if (!matchCard3D) {
          debugLogger.logAnimationWarning('Match card3D not found', null);
          this.isSequencePlaying = false;
          if (onComplete) onComplete();
          return;
        }

        setTimeout(() => {
          drawnCard3D.tweenTo(
            { x: matchCard3D.x, y: matchCard3D.y, z: matchCard3D.z + 5 },
            500,
            'easeInOutCubic'
          );

          drawnCard3D.onAnimationComplete = () => {
            // Step 3: Pause to show match
            setTimeout(() => {
              debugLogger.log('animation', `✨ Match! ${drawnCard.name} + ${matchCard.name}`, null);

              this.isSequencePlaying = false;
              if (onComplete) onComplete();
              this.processQueue();
            }, 400);
          };
        }, 300); // Brief pause after flip

      } else {
        // Step 2: Move to field position
        setTimeout(() => {
          const nextSlot = this.card3DManager.getNextAvailableFieldSlot();
          const fieldConfig = LayoutManager.getZoneConfig(
            'field',
            this.card3DManager.viewportWidth,
            this.card3DManager.viewportHeight
          );

          const spacing = fieldConfig.spacing || 115;
          const centerX = this.card3DManager.viewportWidth / 2;
          const startX = centerX - (8 * spacing) / 2;
          const approxX = startX + (nextSlot * spacing);
          const approxY = this.card3DManager.viewportHeight / 2;

          drawnCard3D.tweenTo(
            { x: approxX, y: approxY, z: 0 },
            500,
            'easeInOutCubic'
          );

          drawnCard3D.onAnimationComplete = () => {
            this.isSequencePlaying = false;
            if (onComplete) onComplete();
            this.processQueue();
          };
        }, 300);
      }
    };
  }

  /**
   * Animate matched cards to trick pile
   * @param {Array} cards - Cards to move to trick pile
   * @param {string} trickZone - 'playerTrick' or 'opponentTrick'
   */
  matchToTrickSequence(cards, trickZone, onComplete) {
    if (this.isSequencePlaying) {
      debugLogger.log('animation', '⚠️ Sequence already playing, queueing', null);
      this.sequenceQueue.push(() => this.matchToTrickSequence(cards, trickZone, onComplete));
      return;
    }

    this.isSequencePlaying = true;

    debugLogger.log('animation', `📦 Moving ${cards.length} cards to ${trickZone}`, {
      cards: cards.map(c => c.name)
    });

    let completedCount = 0;
    const totalCards = cards.length;

    cards.forEach((card, index) => {
      const card3D = this.card3DManager.getCard(card);
      if (!card3D) {
        completedCount++;
        if (completedCount === totalCards) {
          this.isSequencePlaying = false;
          if (onComplete) onComplete();
          this.processQueue();
        }
        return;
      }

      // Stagger the animations slightly
      setTimeout(() => {
        // Cards will move to trick pile - position will be set by sync
        // Just animate them up and away
        card3D.tweenTo(
          { z: 15 },
          300,
          'easeInOutQuad'
        );

        card3D.onAnimationComplete = () => {
          completedCount++;
          if (completedCount === totalCards) {
            this.isSequencePlaying = false;
            if (onComplete) onComplete();
            this.processQueue();
          }
        };
      }, index * 50);
    });
  }

  /**
   * Process queued sequences
   */
  processQueue() {
    if (this.sequenceQueue.length > 0) {
      const nextSequence = this.sequenceQueue.shift();
      nextSequence();
    }
  }

  /**
   * Clear all sequences
   */
  clear() {
    this.isSequencePlaying = false;
    this.currentSequence = null;
    this.sequenceQueue = [];
  }
}
