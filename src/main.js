/**
 * Main entry point for Hanafuda Koi-Koi game
 */

import { KoiKoi } from './game/KoiKoi.js';
import { Renderer } from './rendering/Renderer.js';
import { debugLogger } from './utils/DebugLogger.js';
import { AnimationSequence } from './utils/AnimationSequence.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.statusElement = document.getElementById('game-status');
    this.instructionsElement = document.getElementById('instructions');
    this.playerScoreElement = document.getElementById('player-score');
    this.opponentScoreElement = document.getElementById('opponent-score');
    this.newGameButton = document.getElementById('new-game-btn');
    this.roundModal = document.getElementById('round-modal');

    this.game = new KoiKoi();
    this.renderer = new Renderer(this.canvas);
    this.animatingCards = [];
    this.currentSequence = null;  // Current animation sequence playing
    this.isAnimating = false;     // Block input during animations
    this.lastMessage = '';
    this.lastGameOverMessage = '';
    this.frameCount = 0;

    // Track state for change detection
    this.lastStateLengths = {
      playerCaptured: 0,
      opponentCaptured: 0,
      field: 8
    };
    this.lastCapturedCards = {
      player: [],
      opponent: []
    };

    debugLogger.log('gameState', 'Game initializing...', {
      canvasSize: `${this.canvas.width}x${this.canvas.height}`,
      displaySize: `${this.renderer.displayWidth}x${this.renderer.displayHeight}`
    });

    this.setupEventListeners();
    this.showRoundModal(); // Show modal on startup
    this.gameLoop();

    debugLogger.log('gameState', 'Game initialized successfully', null);
  }

  setupEventListeners() {
    // Canvas click
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    // Canvas double-click for auto-match
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

    // New game button
    this.newGameButton.addEventListener('click', () => this.showRoundModal());

    // Round selection buttons
    document.querySelectorAll('.round-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rounds = parseInt(e.target.dataset.rounds);
        this.startNewGame(rounds);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' || e.key === 'N') {
        this.showRoundModal();
      }
    });
  }

  showRoundModal() {
    this.roundModal.classList.add('show');
  }

  hideRoundModal() {
    this.roundModal.classList.remove('show');
  }

  startNewGame(rounds) {
    this.hideRoundModal();
    this.game.startNewGame(rounds);
    this.updateUI();
    this.statusElement.classList.remove('show');
  }

  handleClick(event) {
    // Block input during animations
    if (this.isAnimating) {
      debugLogger.log('gameState', '🚫 Click blocked - animation playing', null);
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gameState = this.game.getState();
    const result = this.renderer.getCardAtPosition(x, y, gameState);

    if (result) {
      const { card, owner } = result;

      debugLogger.log('gameState', `Card clicked: ${card.name}`, {
        owner,
        hasRenderPosition: card._renderX !== undefined,
        renderPosition: card._renderX !== undefined ?
          `(${Math.round(card._renderX)}, ${Math.round(card._renderY)})` :
          'not set'
      });

      // Store card position before state changes
      if (card._renderX !== undefined && card._renderY !== undefined) {
        card._lastRenderX = card._renderX;
        card._lastRenderY = card._renderY;
        debugLogger.log('animation', 'Captured card position for animation', {
          card: card.name,
          position: `(${Math.round(card._renderX)}, ${Math.round(card._renderY)})`
        });
      } else {
        debugLogger.logAnimationWarning('Card clicked but has no render position', {
          card: card.name,
          owner
        });
      }

      // Capture state LENGTHS before action (getState() returns references, not copies!)
      const state = this.game.getState();
      const beforeLengths = {
        playerCaptured: state.playerCaptured.length,
        opponentCaptured: state.opponentCaptured.length,
        field: state.field.length,
        playerHand: state.playerHand.length
      };

      debugLogger.log('gameState', `BEFORE selectCard - lengths captured`, {
        playerCaptured: beforeLengths.playerCaptured,
        opponentCaptured: beforeLengths.opponentCaptured,
        field: beforeLengths.field
      });

      const success = this.game.selectCard(card, owner);

      if (success) {
        // Check if we should animate by comparing actual changes
        const afterState = this.game.getState();

        debugLogger.log('gameState', `AFTER selectCard - checking lengths`, {
          playerCapturedBefore: beforeLengths.playerCaptured,
          playerCapturedAfter: afterState.playerCaptured.length,
          willTriggerAnimation: afterState.playerCaptured.length > beforeLengths.playerCaptured
        });

        this.handleGameStateChange(beforeLengths, afterState, card);
        this.updateUI();
      }
    }
  }

  handleDoubleClick(event) {
    // Block input during animations
    if (this.isAnimating) {
      debugLogger.log('gameState', '🚫 Double-click blocked - animation playing', null);
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gameState = this.game.getState();
    const result = this.renderer.getCardAtPosition(x, y, gameState);

    if (result && result.owner === 'player' && gameState.phase === 'select_hand') {
      const { card } = result;

      debugLogger.log('gameState', `Card double-clicked (auto-match): ${card.name}`, {
        owner: result.owner,
        phase: gameState.phase
      });

      // Store card position before state changes
      if (card._renderX !== undefined && card._renderY !== undefined) {
        card._lastRenderX = card._renderX;
        card._lastRenderY = card._renderY;
        debugLogger.log('animation', 'Captured card position for auto-match animation', {
          card: card.name,
          position: `(${Math.round(card._renderX)}, ${Math.round(card._renderY)})`
        });
      }

      // Capture state LENGTHS before action (getState() returns references, not copies!)
      const state = this.game.getState();
      const beforeLengths = {
        playerCaptured: state.playerCaptured.length,
        opponentCaptured: state.opponentCaptured.length,
        field: state.field.length,
        playerHand: state.playerHand.length
      };

      // Auto-match if match exists
      const success = this.game.autoMatchCard(card);

      if (success) {
        const afterState = this.game.getState();
        this.handleGameStateChange(beforeLengths, afterState, card);
        this.updateUI();
      }
    }
  }

  /**
   * Handle state changes and trigger animations
   */
  handleGameStateChange(beforeLengths, afterState, triggeredCard) {
    // Log state change
    debugLogger.log('gameState', 'State Change: Player action', {
      phase: afterState.phase,
      playerCaptured: `${beforeLengths.playerCaptured} → ${afterState.playerCaptured.length}`,
      opponentCaptured: `${beforeLengths.opponentCaptured} → ${afterState.opponentCaptured.length}`,
      field: `${beforeLengths.field} → ${afterState.field.length}`,
      deckCount: afterState.deckCount
    });

    // Check if player captured cards
    if (afterState.playerCaptured.length > beforeLengths.playerCaptured) {
      const capturedCount = afterState.playerCaptured.length - beforeLengths.playerCaptured;
      const newlyCaptured = afterState.playerCaptured.slice(-capturedCount);

      if (capturedCount === 4) {
        // SCENARIO 5: Four-of-a-kind!
        const month = newlyCaptured[0].month;
        debugLogger.log('animation', `🎉 FOUR OF A KIND: ${month}!`, {
          cards: newlyCaptured.map(c => c.name)
        });

        const sequence = this.createFourOfAKindSequence(
          newlyCaptured,
          month,
          'player_captured',
          'Player'
        );
        this.playSequence(sequence);

      } else if (capturedCount === 2 && triggeredCard) {
        // SCENARIOS 1-4: Normal match (hand/drawn card + field card)
        // Determine which card moved and which was the target
        const movingCard = newlyCaptured.find(c => c.id === triggeredCard.id) || newlyCaptured[0];
        const targetCard = newlyCaptured.find(c => c.id !== movingCard.id);

        debugLogger.log('animation', `🎴 Player Match: ${movingCard.name} → ${targetCard.name}`, null);

        const sequence = this.createMatchSequence(
          movingCard,
          targetCard,
          'player_captured',
          'Player'
        );
        this.playSequence(sequence);

      } else {
        // Fallback: simple animations
        debugLogger.logAnimationWarning('Unexpected capture count', {
          count: capturedCount,
          cards: newlyCaptured.map(c => c.name)
        });
        this.fallbackSimpleAnimation(newlyCaptured, 'player_captured');
      }
    }

    // Check if opponent captured cards
    if (afterState.opponentCaptured.length > beforeLengths.opponentCaptured) {
      const capturedCount = afterState.opponentCaptured.length - beforeLengths.opponentCaptured;
      const newlyCaptured = afterState.opponentCaptured.slice(-capturedCount);

      if (capturedCount === 4) {
        // SCENARIO 5: Four-of-a-kind!
        const month = newlyCaptured[0].month;
        debugLogger.log('animation', `🎉 OPPONENT FOUR OF A KIND: ${month}!`, {
          cards: newlyCaptured.map(c => c.name)
        });

        const sequence = this.createFourOfAKindSequence(
          newlyCaptured,
          month,
          'opponent_captured',
          'Opponent'
        );
        this.playSequence(sequence);

      } else if (capturedCount === 2) {
        // Opponent match - first card is hand/drawn, second is field
        const movingCard = newlyCaptured[0];
        const targetCard = newlyCaptured[1];

        debugLogger.log('animation', `🎴 Opponent Match: ${movingCard.name} → ${targetCard.name}`, null);

        const sequence = this.createMatchSequence(
          movingCard,
          targetCard,
          'opponent_captured',
          'Opponent'
        );
        this.playSequence(sequence);

      } else {
        this.fallbackSimpleAnimation(newlyCaptured, 'opponent_captured');
      }
    }

    // Check if card was placed on field without capture
    if (afterState.field.length > beforeLengths.field && triggeredCard) {
      debugLogger.log('animation', '🎴 Card placed on field (no match)', {
        card: triggeredCard.name
      });

      const startPos = {
        x: triggeredCard._lastRenderX || 0,
        y: triggeredCard._lastRenderY || 0
      };
      const endPos = this.getZonePosition('player_hand', afterState);

      // Simple animation to field
      this.animateCard(
        triggeredCard,
        startPos.x,
        startPos.y,
        endPos.x,
        endPos.y,
        400
      );
    }
  }

  /**
   * Fallback simple animation (if sequence logic fails)
   */
  fallbackSimpleAnimation(cards, capturedZone) {
    const endPos = this.getZonePosition(capturedZone, this.game.getState());

    cards.forEach((card, index) => {
      const startPos = {
        x: card._lastRenderX || card._renderX || 0,
        y: card._lastRenderY || card._renderY || 0
      };

      setTimeout(() => {
        this.animateCard(card, startPos.x, startPos.y, endPos.x, endPos.y, 500);
      }, index * 100);
    });
  }

  updateUI() {
    const state = this.game.getState();

    // Update scores - show round progress
    const roundText = state.totalRounds > 1 ? ` (Round ${state.currentRound}/${state.totalRounds})` : '';
    this.playerScoreElement.textContent = state.playerScore + roundText;
    this.opponentScoreElement.textContent = state.opponentScore;

    // Update instructions and log if message changed
    if (this.lastMessage !== state.message) {
      debugLogger.logMessage(state.message);
      this.lastMessage = state.message;
    }
    this.instructionsElement.textContent = state.message;

    // Show game over status
    if (state.gameOver) {
      const gameOverMsg = state.message + '\n\nPress N or click New Game';
      this.statusElement.textContent = gameOverMsg;
      this.statusElement.classList.add('show');
      if (this.lastGameOverMessage !== gameOverMsg) {
        debugLogger.logMessage(gameOverMsg);
        this.lastGameOverMessage = gameOverMsg;
      }
    }
  }

  updateAnimations(deltaTime) {
    // Update all animating cards
    for (let i = this.animatingCards.length - 1; i >= 0; i--) {
      try {
        const anim = this.animatingCards[i];
        anim.progress += deltaTime / anim.duration;

        if (anim.progress >= 1) {
          // Animation complete
          debugLogger.logAnimationCompleted(anim.card);
          this.animatingCards.splice(i, 1);
          if (anim.onComplete) {
            try {
              anim.onComplete();
            } catch (err) {
              debugLogger.logError('Error in animation onComplete callback', err);
            }
          }
        } else {
          // Update position with easing
          const t = this.easeInOutQuad(anim.progress);
          anim.card._animX = anim.startX + (anim.endX - anim.startX) * t;
          anim.card._animY = anim.startY + (anim.endY - anim.startY) * t;
        }
      } catch (err) {
        debugLogger.logError('Error updating animation', err);
        // Remove failed animation
        this.animatingCards.splice(i, 1);
      }
    }
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Create an animation for a card
   */
  animateCard(card, startX, startY, endX, endY, duration = 500, onComplete = null) {
    // Set initial animation position
    card._animX = startX;
    card._animY = startY;

    const animation = {
      card,
      startX,
      startY,
      endX,
      endY,
      duration,
      progress: 0,
      onComplete
    };

    this.animatingCards.push(animation);

    // Log animation creation
    debugLogger.logAnimationCreated(
      card,
      { x: startX, y: startY },
      { x: endX, y: endY },
      duration
    );

    return animation;
  }

  /**
   * Play an animation sequence
   */
  playSequence(sequence, onComplete = null) {
    if (this.isAnimating) {
      debugLogger.logAnimationWarning('Already playing animation, queuing sequence', { name: sequence.name });
      // Could implement a queue here if needed
      return;
    }

    this.isAnimating = true;
    this.currentSequence = sequence;

    const stages = sequence.getStages();
    debugLogger.log('animation', `▶️  Starting sequence: ${sequence.name}`, {
      stages: stages.length,
      types: stages.map(s => `${s.type}${s.name ? `: ${s.name}` : ''}`).join(' → ')
    });

    this.playSequenceStage(0, stages, () => {
      debugLogger.log('animation', `✅ Sequence complete: ${sequence.name}`, null);
      this.isAnimating = false;
      this.currentSequence = null;
      if (onComplete) onComplete();
    });
  }

  /**
   * Play a specific stage of a sequence
   */
  playSequenceStage(stageIndex, stages, onSequenceComplete) {
    if (stageIndex >= stages.length) {
      onSequenceComplete();
      return;
    }

    const stage = stages[stageIndex];
    debugLogger.log('animation', `Playing stage ${stageIndex + 1}/${stages.length}: ${stage.type}`, {
      name: stage.name || 'unnamed'
    });

    const nextStage = () => this.playSequenceStage(stageIndex + 1, stages, onSequenceComplete);

    switch (stage.type) {
      case 'parallel':
        this.playParallelAnimations(stage.configs, nextStage);
        break;
      case 'sequential':
        this.playSequentialAnimations(stage.configs, nextStage);
        break;
      case 'delay':
        setTimeout(nextStage, stage.duration);
        break;
      case 'event':
        this.fireAnimationEvent(stage.eventName, stage.data);
        nextStage();
        break;
      default:
        debugLogger.logAnimationWarning('Unknown stage type', { type: stage.type });
        nextStage();
    }
  }

  /**
   * Play multiple animations in parallel (simultaneously)
   */
  playParallelAnimations(configs, onComplete) {
    if (configs.length === 0) {
      onComplete();
      return;
    }

    let completedCount = 0;
    configs.forEach(config => {
      const anim = this.animateCard(
        config.card,
        config.startX,
        config.startY,
        config.endX,
        config.endY,
        config.duration || 500,
        () => {
          completedCount++;
          if (completedCount === configs.length) {
            onComplete();
          }
        }
      );
    });
  }

  /**
   * Play animations sequentially (one after another)
   */
  playSequentialAnimations(configs, onComplete) {
    if (configs.length === 0) {
      onComplete();
      return;
    }

    const playNext = (index) => {
      if (index >= configs.length) {
        onComplete();
        return;
      }

      const config = configs[index];
      this.animateCard(
        config.card,
        config.startX,
        config.startY,
        config.endX,
        config.endY,
        config.duration || 500,
        () => playNext(index + 1)
      );
    };

    playNext(0);
  }

  /**
   * Fire an animation event for sound hooks
   */
  fireAnimationEvent(eventName, data) {
    debugLogger.log('animation', `🔊 Animation Event: ${eventName}`, data);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hanafuda:animation', {
        detail: {
          event: eventName,
          data: data
        }
      }));
    }
  }

  /**
   * SCENARIO 1 & 2: Create sequence for hand/drawn card matching with field card
   * Stage 1: Moving card → target card position
   * Stage 2: Match event fires
   * Stage 3: Brief delay
   * Stage 4: Both cards → trick pile together
   */
  createMatchSequence(movingCard, targetCard, capturedZone, player) {
    const sequence = new AnimationSequence(`${player} Match`);

    // Use _renderX/Y which is set during last render (before cards moved to captured)
    const movingStartPos = {
      x: movingCard._renderX !== undefined ? movingCard._renderX : 0,
      y: movingCard._renderY !== undefined ? movingCard._renderY : 0
    };

    const targetPos = {
      x: targetCard._renderX !== undefined ? targetCard._renderX : 0,
      y: targetCard._renderY !== undefined ? targetCard._renderY : 0
    };

    const pilePos = this.getZonePosition(capturedZone, this.game.getState());

    debugLogger.log('animation', `Creating match sequence`, {
      movingCard: movingCard.name,
      movingStart: `(${Math.round(movingStartPos.x)}, ${Math.round(movingStartPos.y)})`,
      targetCard: targetCard.name,
      targetPos: `(${Math.round(targetPos.x)}, ${Math.round(targetPos.y)})`,
      pilePos: `(${Math.round(pilePos.x)}, ${Math.round(pilePos.y)})`
    });

    // Stage 1: Moving card animates to target card
    sequence.addParallelStage([{
      card: movingCard,
      startX: movingStartPos.x,
      startY: movingStartPos.y,
      endX: targetPos.x,
      endY: targetPos.y,
      duration: 400
    }], 'Card arrives at match');

    // Stage 2: Fire match event
    sequence.addEvent('card_match', {
      movingCard: movingCard.name,
      targetCard: targetCard.name,
      player: player
    });

    // Stage 3: Brief delay to show the match
    sequence.addDelay(200);

    // Stage 4: Both cards to pile together from the same position
    sequence.addParallelStage([
      {
        card: movingCard,
        startX: targetPos.x,
        startY: targetPos.y,
        endX: pilePos.x,
        endY: pilePos.y,
        duration: 500
      },
      {
        card: targetCard,
        startX: targetPos.x,
        startY: targetPos.y,
        endX: pilePos.x,
        endY: pilePos.y,
        duration: 500
      }
    ], 'Both cards to pile');

    return sequence;
  }

  /**
   * SCENARIO 5: Create four-of-a-kind celebration sequence
   * All 4 cards of same month captured together
   */
  createFourOfAKindSequence(cards, month, capturedZone, player) {
    const sequence = new AnimationSequence(`${player} Four of ${month}`);

    const celebrationY = 60; // Top of screen
    const centerX = this.renderer.displayWidth / 2;
    const { width: cardWidth } = this.renderer.cardRenderer.getCardDimensions();
    const spacing = 15;

    // Calculate positions for 4 cards in a row
    const totalWidth = 4 * (cardWidth + spacing) - spacing;
    const startX = centerX - totalWidth / 2;

    const celebrationPositions = cards.map((card, index) => ({
      x: startX + index * (cardWidth + spacing),
      y: celebrationY
    }));

    const pilePos = this.getZonePosition(capturedZone, this.game.getState());

    // Stage 1: All cards fly to celebration positions simultaneously
    sequence.addParallelStage(cards.map((card, index) => {
      const startX = card._renderX !== undefined ? card._renderX : celebrationPositions[index].x;
      const startY = card._renderY !== undefined ? card._renderY : celebrationPositions[index].y;

      debugLogger.log('animation', `Card ${index + 1}/4 for celebration`, {
        card: card.name,
        start: `(${Math.round(startX)}, ${Math.round(startY)})`,
        end: `(${Math.round(celebrationPositions[index].x)}, ${Math.round(celebrationPositions[index].y)})`
      });

      return {
        card: card,
        startX: startX,
        startY: startY,
        endX: celebrationPositions[index].x,
        endY: celebrationPositions[index].y,
        duration: 600
      };
    }), 'Cards to celebration area');

    // Stage 2: Fire celebration event
    sequence.addEvent('four_of_a_kind', {
      month: month,
      cards: cards.map(c => c.name),
      player: player
    });

    // Stage 3: Display celebration (pause)
    sequence.addDelay(1200);

    // Stage 4: Cards move together toward center (visual merge)
    const mergeX = centerX - (2 * cardWidth) / 2;
    sequence.addParallelStage(cards.map((card, index) => ({
      card: card,
      startX: celebrationPositions[index].x,
      startY: celebrationPositions[index].y,
      endX: mergeX + (index * cardWidth / 4), // Compress together
      endY: celebrationY,
      duration: 400
    })), 'Cards merge together');

    // Stage 5: Brief pause
    sequence.addDelay(300);

    // Stage 6: All cards to pile together
    sequence.addParallelStage(cards.map((card, index) => ({
      card: card,
      startX: mergeX + (index * cardWidth / 4),
      startY: celebrationY,
      endX: pilePos.x,
      endY: pilePos.y,
      duration: 500
    })), 'All cards to pile');

    return sequence;
  }

  /**
   * Get position for a zone (hand, field, captured, etc.)
   */
  getZonePosition(zone, gameState) {
    const { width: cardWidth, height: cardHeight } = this.renderer.cardRenderer.getCardDimensions();
    const margin = 30;
    const centerX = this.renderer.displayWidth / 2;
    const centerY = this.renderer.displayHeight / 2;

    switch (zone) {
      case 'player_hand':
        return { x: centerX, y: this.renderer.displayHeight - cardHeight - margin - 10 };
      case 'opponent_hand':
        return { x: centerX, y: margin + 10 };
      case 'field':
        return { x: centerX, y: centerY - cardHeight / 2 };
      case 'player_captured':
        return { x: this.renderer.displayWidth - cardWidth - margin, y: this.renderer.displayHeight - cardHeight - margin };
      case 'opponent_captured':
        return { x: this.renderer.displayWidth - cardWidth - margin, y: margin };
      case 'deck':
        return { x: margin, y: centerY - cardHeight / 2 };
      default:
        return { x: centerX, y: centerY };
    }
  }

  gameLoop() {
    try {
      const now = performance.now();
      const deltaTime = this.lastTime ? now - this.lastTime : 0;
      this.lastTime = now;

      const state = this.game.getState();

      // Check for state changes and trigger animations (only when not already animating)
      if (!this.isAnimating) {
        this.checkForStateChanges(state);
      }

      // Update animations
      try {
        this.updateAnimations(deltaTime);
      } catch (err) {
        debugLogger.logError('Error in updateAnimations', err);
      }

      // Render
      try {
        this.renderer.render(state, this.animatingCards);
      } catch (err) {
        debugLogger.logError('Error in render', err);
      }

      // Update UI
      try {
        this.updateUI();
      } catch (err) {
        debugLogger.logError('Error in updateUI', err);
      }

      // Log game loop status periodically (every 300 frames ~5 seconds at 60fps)
      this.frameCount++;
      if (this.frameCount === 1) {
        debugLogger.log('gameState', '🎮 Game loop started', null);
      } else if (this.frameCount % 300 === 0) {
        debugLogger.log('gameState', `Game loop running (frame ${this.frameCount})`, {
          animatingCards: this.animatingCards.length,
          phase: state.phase,
          deltaTime: Math.round(deltaTime)
        });
      }
    } catch (err) {
      debugLogger.logError('Critical error in game loop', err);
    }

    // Continue loop (always, even if there was an error)
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Check for state changes and trigger animations
   */
  checkForStateChanges(state) {
    // Check if player captured cards
    if (state.playerCaptured.length > this.lastStateLengths.playerCaptured) {
      const capturedCount = state.playerCaptured.length - this.lastStateLengths.playerCaptured;
      const newlyCaptured = state.playerCaptured.slice(-capturedCount);

      debugLogger.log('animation', `📊 DETECTED player capture via polling`, {
        before: this.lastStateLengths.playerCaptured,
        after: state.playerCaptured.length,
        newCards: newlyCaptured.map(c => c.name)
      });

      this.triggerCaptureAnimation(newlyCaptured, 'player_captured', 'Player');
      this.lastStateLengths.playerCaptured = state.playerCaptured.length;
    }

    // Check if opponent captured cards
    if (state.opponentCaptured.length > this.lastStateLengths.opponentCaptured) {
      const capturedCount = state.opponentCaptured.length - this.lastStateLengths.opponentCaptured;
      const newlyCaptured = state.opponentCaptured.slice(-capturedCount);

      debugLogger.log('animation', `📊 DETECTED opponent capture via polling`, {
        before: this.lastStateLengths.opponentCaptured,
        after: state.opponentCaptured.length,
        newCards: newlyCaptured.map(c => c.name)
      });

      this.triggerCaptureAnimation(newlyCaptured, 'opponent_captured', 'Opponent');
      this.lastStateLengths.opponentCaptured = state.opponentCaptured.length;
    }

    // Update field count (for future use)
    this.lastStateLengths.field = state.field.length;
  }

  /**
   * Trigger appropriate animation sequence for captured cards
   */
  triggerCaptureAnimation(cards, capturedZone, player) {
    if (cards.length === 4) {
      // Four of a kind!
      const month = cards[0].month;
      const sequence = this.createFourOfAKindSequence(cards, month, capturedZone, player);
      this.playSequence(sequence);
    } else if (cards.length === 2) {
      // Normal match - determine which card came from hand and which from field
      // The card from hand/opponent hand should move TO the field card
      const fieldCard = cards.find(c => c._owner === 'field');
      const handCard = cards.find(c => c._owner === 'player' || c._owner === 'opponent');

      // If we can't determine by owner, use Y position (hand cards are higher/lower than field)
      let movingCard, targetCard;
      if (fieldCard && handCard) {
        movingCard = handCard;  // Hand card moves to field card
        targetCard = fieldCard;
      } else {
        // Fallback: use the card with higher/lower Y as hand card
        // Field is in center, player hand is at bottom, opponent hand is at top
        const centerY = this.renderer.displayHeight / 2;
        if (Math.abs((cards[0]._renderY || 0) - centerY) > Math.abs((cards[1]._renderY || 0) - centerY)) {
          movingCard = cards[0];  // Card farther from center (hand)
          targetCard = cards[1];  // Card closer to center (field)
        } else {
          movingCard = cards[1];
          targetCard = cards[0];
        }
      }

      debugLogger.log('animation', `Determined animation direction`, {
        movingCard: `${movingCard.name} (owner: ${movingCard._owner})`,
        targetCard: `${targetCard.name} (owner: ${targetCard._owner})`
      });

      const sequence = this.createMatchSequence(movingCard, targetCard, capturedZone, player);
      this.playSequence(sequence);
    } else {
      // Unexpected count, use fallback
      this.fallbackSimpleAnimation(cards, capturedZone);
    }
  }

  /**
   * Load background texture (optional)
   */
  async loadBackground(imageUrl) {
    try {
      await this.renderer.loadBackground(imageUrl);
      console.log('Background loaded successfully');
    } catch (error) {
      console.warn('Failed to load background:', error);
    }
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();

  // Example: Load background if available
  // game.loadBackground('./assets/backgrounds/texture.jpg');

  console.log('Hanafuda Koi-Koi initialized');
});
