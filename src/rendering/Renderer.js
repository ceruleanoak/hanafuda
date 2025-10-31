/**
 * Renderer - Main canvas rendering engine
 */

import { CardRenderer } from './CardRenderer.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cardRenderer = new CardRenderer();
    this.backgroundImage = null;
    this.backgroundColor = '#000';

    this.setupCanvas();
  }

  setupCanvas() {
    // Set canvas to full size
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    // Set actual size in memory (scaled for retina displays)
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Set display size
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    // Scale context to match device pixel ratio
    this.ctx.scale(dpr, dpr);

    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
  }

  /**
   * Load background texture
   * @param {string} imageUrl - URL to background image
   */
  async loadBackground(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /**
   * Set solid background color
   */
  setBackgroundColor(color) {
    this.backgroundColor = color;
  }

  /**
   * Clear and draw background
   */
  drawBackground() {
    if (this.backgroundImage) {
      // Draw tiled or stretched background
      this.ctx.drawImage(
        this.backgroundImage,
        0, 0,
        this.displayWidth,
        this.displayHeight
      );
    } else {
      // Draw solid color
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
    }
  }

  /**
   * Clear canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
  }

  /**
   * Main render function
   * @param {Object} gameState - Current game state
   */
  render(gameState) {
    this.clear();
    this.drawBackground();

    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();
    const spacing = 10;

    // Calculate layout
    const centerX = this.displayWidth / 2;
    const centerY = this.displayHeight / 2;

    // Draw field cards (center)
    if (gameState.field && gameState.field.length > 0) {
      this.drawCardRow(
        gameState.field,
        centerX,
        centerY - cardHeight - spacing,
        gameState.selectedCards,
        'field'
      );
    }

    // Draw player hand (bottom)
    if (gameState.playerHand && gameState.playerHand.length > 0) {
      this.drawCardRow(
        gameState.playerHand,
        centerX,
        this.displayHeight - cardHeight - 20,
        gameState.selectedCards,
        'player'
      );
    }

    // Draw opponent hand (top, face down)
    if (gameState.opponentHand && gameState.opponentHand.length > 0) {
      this.drawCardRow(
        gameState.opponentHand,
        centerX,
        20,
        [],
        'opponent',
        true // face down
      );
    }

    // Draw deck
    if (gameState.deckCount > 0) {
      const deckX = 20;
      const deckY = centerY - cardHeight / 2;
      this.cardRenderer.drawCard(
        this.ctx,
        { name: `Deck (${gameState.deckCount})` },
        deckX,
        deckY,
        false,
        true
      );
    }

    // Draw captured cards count
    this.drawCapturedCards(gameState);
  }

  /**
   * Draw a row of cards centered horizontally
   */
  drawCardRow(cards, centerX, y, selectedCards, owner, faceDown = false) {
    const { width: cardWidth } = this.cardRenderer.getCardDimensions();
    const spacing = 10;
    const totalWidth = cards.length * (cardWidth + spacing) - spacing;
    const startX = centerX - totalWidth / 2;

    cards.forEach((card, index) => {
      const x = startX + index * (cardWidth + spacing);
      const isSelected = selectedCards.some(
        sc => sc.id === card.id && sc.owner === owner
      );

      this.cardRenderer.drawCard(
        this.ctx,
        card,
        x,
        y,
        isSelected,
        faceDown
      );

      // Store position for click detection
      card._renderX = x;
      card._renderY = y;
      card._owner = owner;
    });
  }

  /**
   * Draw captured cards display
   */
  drawCapturedCards(gameState) {
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();
    const rightMargin = 20;
    const topMargin = 20;

    // Player captured
    if (gameState.playerCaptured && gameState.playerCaptured.length > 0) {
      this.drawCapturedStack(
        gameState.playerCaptured,
        this.displayWidth - cardWidth - rightMargin,
        this.displayHeight - cardHeight - topMargin,
        'Player'
      );
    }

    // Opponent captured
    if (gameState.opponentCaptured && gameState.opponentCaptured.length > 0) {
      this.drawCapturedStack(
        gameState.opponentCaptured,
        this.displayWidth - cardWidth - rightMargin,
        topMargin,
        'Opponent'
      );
    }
  }

  /**
   * Draw stack of captured cards
   */
  drawCapturedStack(cards, x, y, label) {
    this.ctx.save();

    // Draw label
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    const { width: cardWidth } = this.cardRenderer.getCardDimensions();
    this.ctx.fillText(`${label}: ${cards.length}`, x + cardWidth / 2, y - 5);

    // Draw top card of stack
    if (cards.length > 0) {
      this.cardRenderer.drawCard(
        this.ctx,
        cards[cards.length - 1],
        x,
        y,
        false,
        false
      );
    }

    this.ctx.restore();
  }

  /**
   * Find card at given screen coordinates
   */
  getCardAtPosition(x, y, gameState) {
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    const checkCards = (cards, owner) => {
      for (const card of cards) {
        if (card._renderX !== undefined && card._renderY !== undefined) {
          if (this.cardRenderer.isPointInCard(x, y, card._renderX, card._renderY)) {
            return { card, owner };
          }
        }
      }
      return null;
    };

    // Check player hand
    if (gameState.playerHand) {
      const result = checkCards(gameState.playerHand, 'player');
      if (result) return result;
    }

    // Check field
    if (gameState.field) {
      const result = checkCards(gameState.field, 'field');
      if (result) return result;
    }

    return null;
  }
}
