/**
 * Main entry point for Hanafuda Koi-Koi game
 */

import { KoiKoi } from './game/KoiKoi.js';
import { Renderer } from './rendering/Renderer.js';

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

    this.setupEventListeners();
    this.showRoundModal(); // Show modal on startup
    this.gameLoop();
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
      const success = this.game.selectCard(card, owner);

      if (success) {
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
      // Auto-match if match exists
      const success = this.game.autoMatchCard(card);

      if (success) {
        this.updateUI();
      }
    }
  }

  updateUI() {
    const state = this.game.getState();

    // Update scores - show round progress
    const roundText = state.totalRounds > 1 ? ` (Round ${state.currentRound}/${state.totalRounds})` : '';
    this.playerScoreElement.textContent = state.playerScore + roundText;
    this.opponentScoreElement.textContent = state.opponentScore;

    // Update instructions
    this.instructionsElement.textContent = state.message;

    // Show game over status
    if (state.gameOver) {
      this.statusElement.textContent = state.message + '\n\nPress N or click New Game';
      this.statusElement.classList.add('show');
    }
  }

  updateAnimations(deltaTime) {
    // Update all animating cards
    for (let i = this.animatingCards.length - 1; i >= 0; i--) {
      const anim = this.animatingCards[i];
      anim.progress += deltaTime / anim.duration;

      if (anim.progress >= 1) {
        // Animation complete
        this.animatingCards.splice(i, 1);
        if (anim.onComplete) anim.onComplete();
      } else {
        // Update position with easing
        const t = this.easeInOutQuad(anim.progress);
        anim.card._animX = anim.startX + (anim.endX - anim.startX) * t;
        anim.card._animY = anim.startY + (anim.endY - anim.startY) * t;
      }
    }
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  gameLoop() {
    const now = performance.now();
    const deltaTime = this.lastTime ? now - this.lastTime : 0;
    this.lastTime = now;

    const state = this.game.getState();

    // Update animations
    this.updateAnimations(deltaTime);

    // Render
    this.renderer.render(state, this.animatingCards);

    // Update UI
    this.updateUI();

    // Continue loop
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
