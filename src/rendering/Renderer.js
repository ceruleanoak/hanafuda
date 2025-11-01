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

    // Force resize after a short delay to ensure layout is settled
    setTimeout(() => this.resize(), 100);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;

    // Get the parent container size (main element)
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();

    // Use parent dimensions or fallback to window size
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight - 200; // Account for header/footer

    // Set actual size in memory (scaled for retina displays)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Set display size
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    // Scale context to match device pixel ratio
    this.ctx.scale(dpr, dpr);

    this.displayWidth = width;
    this.displayHeight = height;
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
    const spacing = 15;
    const margin = 30;

    // Calculate layout zones
    const centerX = this.displayWidth / 2;
    const centerY = this.displayHeight / 2;

    // Define distinct zones for each area
    const zones = {
      opponentHand: margin + 10,
      opponentCaptured: margin + 10,
      field: centerY - cardHeight / 2,
      playerHand: this.displayHeight - cardHeight - margin - 10,
      playerCaptured: this.displayHeight - cardHeight - margin - 10,
      deck: centerY - cardHeight / 2
    };

    // Draw opponent hand (top, face down)
    if (gameState.opponentHand && gameState.opponentHand.length > 0) {
      this.drawCardRow(
        gameState.opponentHand,
        centerX,
        zones.opponentHand,
        [],
        'opponent',
        true // face down
      );
    }

    // Draw field cards (center)
    if (gameState.field && gameState.field.length > 0) {
      // Highlight matching cards if in drawn card selection phase
      const highlightedCards = gameState.phase === 'select_drawn_match'
        ? gameState.drawnCardMatches.map(c => ({ id: c.id, owner: 'field' }))
        : gameState.selectedCards;

      this.drawCardRow(
        gameState.field,
        centerX,
        zones.field,
        highlightedCards,
        'field'
      );
    }

    // Draw drawn card hover area (if waiting for selection)
    if (gameState.drawnCard && gameState.phase === 'select_drawn_match') {
      this.drawDrawnCardHover(gameState.drawnCard, centerX, centerY - cardHeight - 50);
    }

    // Draw player hand (bottom)
    if (gameState.playerHand && gameState.playerHand.length > 0) {
      this.drawCardRow(
        gameState.playerHand,
        centerX,
        zones.playerHand,
        gameState.selectedCards,
        'player'
      );
    }

    // Draw deck (left side)
    if (gameState.deckCount > 0) {
      const deckX = margin;
      const deckY = zones.deck;
      this.cardRenderer.drawCard(
        this.ctx,
        { name: `Deck (${gameState.deckCount})` },
        deckX,
        deckY,
        false,
        true
      );
    }

    // Draw captured cards (right side)
    this.drawCapturedCards(gameState);
  }

  /**
   * Draw drawn card in hover area
   */
  drawDrawnCardHover(card, centerX, y) {
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    // Draw background panel
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(centerX - cardWidth / 2 - 20, y - 40, cardWidth + 40, cardHeight + 80);

    this.ctx.strokeStyle = '#4ecdc4';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(centerX - cardWidth / 2 - 20, y - 40, cardWidth + 40, cardHeight + 80);

    // Draw label
    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('DRAWN CARD', centerX, y - 20);

    // Draw card
    this.cardRenderer.drawCard(this.ctx, card, centerX - cardWidth / 2, y, false, false);

    this.ctx.restore();
  }

  /**
   * Draw a row of cards centered horizontally
   */
  drawCardRow(cards, centerX, y, selectedCards, owner, faceDown = false) {
    const { width: cardWidth } = this.cardRenderer.getCardDimensions();
    const spacing = 15;
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
    const rightMargin = 30;
    const verticalMargin = 40;

    // Player captured (bottom right)
    if (gameState.playerCaptured && gameState.playerCaptured.length > 0) {
      this.drawCapturedStack(
        gameState.playerCaptured,
        gameState.playerYaku || [],
        this.displayWidth - cardWidth - rightMargin,
        this.displayHeight - cardHeight - verticalMargin,
        'Player Captured'
      );
    }

    // Opponent captured (top right)
    if (gameState.opponentCaptured && gameState.opponentCaptured.length > 0) {
      this.drawCapturedStack(
        gameState.opponentCaptured,
        gameState.opponentYaku || [],
        this.displayWidth - cardWidth - rightMargin,
        verticalMargin,
        'Opponent Captured'
      );
    }
  }

  /**
   * Draw stack of captured cards with yaku
   */
  drawCapturedStack(cards, yaku, x, y, label) {
    this.ctx.save();

    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    // Draw yaku list above captured stack
    let yakuY = y - 30;
    if (yaku && yaku.length > 0) {
      this.ctx.fillStyle = '#4ecdc4';
      this.ctx.font = 'bold 11px monospace';
      this.ctx.textAlign = 'right';

      // Draw yaku in reverse order (most recent at bottom)
      for (let i = Math.min(yaku.length - 1, 4); i >= 0; i--) {
        const yakuItem = yaku[i];
        this.ctx.fillText(`${yakuItem.name} (${yakuItem.points})`, x + cardWidth, yakuY);
        yakuY -= 14;
      }

      if (yaku.length > 5) {
        this.ctx.fillStyle = '#888';
        this.ctx.fillText(`+${yaku.length - 5} more...`, x + cardWidth, yakuY);
      }
    }

    // Draw label
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 13px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${label}: ${cards.length}`, x + cardWidth / 2, y - 10);

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
