/**
 * Main entry point for Hanafuda Koi-Koi game
 */

import { KoiKoi } from './game/KoiKoi.js';
import { Renderer } from './rendering/Renderer.js';
import { debugLogger } from './utils/DebugLogger.js';

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
    this.lastMessage = '';
    this.lastGameOverMessage = '';
    this.frameCount = 0;

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

      // Capture state before action
      const beforeState = this.game.getState();

      const success = this.game.selectCard(card, owner);

      if (success) {
        // Check if we should animate
        const afterState = this.game.getState();
        this.handleGameStateChange(beforeState, afterState, card);
        this.updateUI();
      }
    }
  }

  handleDoubleClick(event) {
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

      // Capture state before action
      const beforeState = this.game.getState();

      // Auto-match if match exists
      const success = this.game.autoMatchCard(card);

      if (success) {
        const afterState = this.game.getState();
        this.handleGameStateChange(beforeState, afterState, card);
        this.updateUI();
      }
    }
  }

  /**
   * Handle state changes and trigger animations
   */
  handleGameStateChange(beforeState, afterState, triggeredCard) {
    debugLogger.logGameStateChange(beforeState, afterState, 'Player action');

    // Check if cards were captured
    if (afterState.playerCaptured.length > beforeState.playerCaptured.length) {
      // Player captured cards - animate them
      const capturedCount = afterState.playerCaptured.length - beforeState.playerCaptured.length;
      const newlyCaptured = afterState.playerCaptured.slice(-capturedCount);

      debugLogger.log('animation', `Player captured ${capturedCount} card(s)`, {
        cards: newlyCaptured.map(c => c.name)
      });

      newlyCaptured.forEach((card, index) => {
        const startPos = (card._lastRenderX !== undefined) ?
          { x: card._lastRenderX, y: card._lastRenderY } :
          this.getZonePosition('field', afterState);

        const endPos = this.getZonePosition('player_captured', afterState);

        // Warn if start position is not set
        if (card._lastRenderX === undefined) {
          debugLogger.logAnimationWarning('Card missing _lastRenderX, using fallback position', {
            card: card.name,
            fallbackZone: 'field'
          });
        }

        setTimeout(() => {
          this.animateCard(card, startPos.x, startPos.y, endPos.x, endPos.y, 500);
        }, index * 100);
      });
    }

    // Check if cards were added to opponent's captured
    if (afterState.opponentCaptured.length > beforeState.opponentCaptured.length) {
      const capturedCount = afterState.opponentCaptured.length - beforeState.opponentCaptured.length;
      const newlyCaptured = afterState.opponentCaptured.slice(-capturedCount);

      debugLogger.log('animation', `Opponent captured ${capturedCount} card(s)`, {
        cards: newlyCaptured.map(c => c.name)
      });

      newlyCaptured.forEach((card, index) => {
        const startPos = (card._lastRenderX !== undefined) ?
          { x: card._lastRenderX, y: card._lastRenderY } :
          this.getZonePosition('field', afterState);

        const endPos = this.getZonePosition('opponent_captured', afterState);

        // Warn if start position is not set
        if (card._lastRenderX === undefined) {
          debugLogger.logAnimationWarning('Card missing _lastRenderX, using fallback position', {
            card: card.name,
            fallbackZone: 'field'
          });
        }

        setTimeout(() => {
          this.animateCard(card, startPos.x, startPos.y, endPos.x, endPos.y, 500);
        }, index * 100);
      });
    }

    // Check if card was added to field (placed without capture)
    if (afterState.field.length > beforeState.field.length && triggeredCard) {
      debugLogger.log('animation', 'Card placed on field', {
        card: triggeredCard.name
      });

      const startPos = (triggeredCard._lastRenderX !== undefined) ?
        { x: triggeredCard._lastRenderX, y: triggeredCard._lastRenderY } :
        this.getZonePosition('player_hand', afterState);

      const endPos = this.getZonePosition('field', afterState);

      // Warn if start position is not set
      if (triggeredCard._lastRenderX === undefined) {
        debugLogger.logAnimationWarning('Card missing _lastRenderX, using fallback position', {
          card: triggeredCard.name,
          fallbackZone: 'player_hand'
        });
      }

      this.animateCard(triggeredCard, startPos.x, startPos.y, endPos.x, endPos.y, 500);
    }
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

          // Log animation progress at intervals
          debugLogger.logAnimationProgress(anim.card, anim.progress, {
            x: anim.card._animX,
            y: anim.card._animY
          });
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
