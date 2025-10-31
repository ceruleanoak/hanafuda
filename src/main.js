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

    this.game = new KoiKoi();
    this.renderer = new Renderer(this.canvas);

    this.setupEventListeners();
    this.gameLoop();
  }

  setupEventListeners() {
    // Canvas click
    this.canvas.addEventListener('click', (e) => this.handleClick(e));

    // New game button
    this.newGameButton.addEventListener('click', () => this.newGame());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' || e.key === 'N') {
        this.newGame();
      }
    });
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

  newGame() {
    this.game.newRound();
    this.updateUI();
    this.statusElement.classList.remove('show');
  }

  updateUI() {
    const state = this.game.getState();

    // Update scores
    this.playerScoreElement.textContent = state.playerScore;
    this.opponentScoreElement.textContent = state.opponentScore;

    // Update instructions
    this.instructionsElement.textContent = state.message;

    // Show game over status
    if (state.gameOver) {
      this.statusElement.textContent = state.message + '\n\nPress N or click New Game';
      this.statusElement.classList.add('show');
    }
  }

  gameLoop() {
    const state = this.game.getState();

    // Render
    this.renderer.render(state);

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
