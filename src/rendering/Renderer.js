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
   * @param {Array} animatingCards - Array of cards currently animating
   */
  render(gameState, animatingCards = []) {
    this.clear();
    this.drawBackground();

    // Create set of animating card IDs for quick lookup
    const animatingCardIds = new Set(animatingCards.map(anim => anim.card.id));

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
      const visibleCards = gameState.opponentHand.filter(c => !animatingCardIds.has(c.id));
      if (visibleCards.length > 0) {
        this.drawCardRow(
          visibleCards,
          centerX,
          zones.opponentHand,
          [],
          'opponent',
          true // face down
        );
      }
    }

    // Draw field cards (center) - exclude animating cards
    if (gameState.field && gameState.field.length > 0) {
      const visibleCards = gameState.field.filter(c => !animatingCardIds.has(c.id));

      // Highlight matching cards if in drawn card selection phase
      const highlightedCards = gameState.phase === 'select_drawn_match'
        ? gameState.drawnCardMatches.map(c => ({ id: c.id, owner: 'field' }))
        : gameState.selectedCards;

      if (visibleCards.length > 0) {
        this.drawCardRow(
          visibleCards,
          centerX,
          zones.field,
          highlightedCards,
          'field'
        );
      }
    }

    // Draw drawn card hover area (if waiting for selection OR showing drawn card)
    // Position it at TOP of screen to avoid covering field cards
    if (gameState.drawnCard && (
      gameState.phase === 'select_drawn_match' ||
      gameState.phase === 'show_drawn' ||
      gameState.phase === 'drawing' ||
      gameState.phase === 'opponent_drawing' ||
      gameState.phase === 'opponent_drawn'
    )) {
      // Draw at very top of screen (just below margin)
      const drawnCardY = margin + 60;
      this.drawDrawnCardHover(gameState.drawnCard, centerX, drawnCardY, gameState.phase);
    }

    // Draw player hand (bottom) - exclude animating cards
    if (gameState.playerHand && gameState.playerHand.length > 0) {
      const visibleCards = gameState.playerHand.filter(c => !animatingCardIds.has(c.id));
      if (visibleCards.length > 0) {
        this.drawCardRow(
          visibleCards,
          centerX,
          zones.playerHand,
          gameState.selectedCards,
          'player'
        );
      }
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

    // Draw animating cards on top
    this.drawAnimatingCards(animatingCards);
  }

  /**
   * Draw animating cards
   */
  drawAnimatingCards(animatingCards) {
    if (!animatingCards || animatingCards.length === 0) return;

    for (const anim of animatingCards) {
      if (anim.card._animX !== undefined && anim.card._animY !== undefined) {
        this.cardRenderer.drawCard(
          this.ctx,
          anim.card,
          anim.card._animX,
          anim.card._animY,
          false,
          false,
          anim.opacity !== undefined ? anim.opacity : 1.0
        );
      }
    }
  }

  /**
   * Draw drawn card in hover area
   */
  drawDrawnCardHover(card, centerX, y, phase) {
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    // Draw background panel
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.fillRect(centerX - cardWidth / 2 - 20, y - 40, cardWidth + 40, cardHeight + 80);

    // Color based on phase - cyan for player choice, yellow for auto-actions, red for opponent
    const isOpponentPhase = phase === 'opponent_drawing' || phase === 'opponent_drawn';
    const isPlayerChoice = phase === 'select_drawn_match';
    this.ctx.strokeStyle = isOpponentPhase ? '#ff6b6b' : (isPlayerChoice ? '#4ecdc4' : '#ffeb3b');
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(centerX - cardWidth / 2 - 20, y - 40, cardWidth + 40, cardHeight + 80);

    // Draw label
    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'center';
    const label = (phase === 'drawing' || phase === 'opponent_drawing') ? 'DRAWING...' :
                  isOpponentPhase ? 'OPPONENT DREW' : 'DRAWN CARD';
    this.ctx.fillText(label, centerX, y - 20);

    // Draw card (only if not in "drawing" phase)
    if (phase !== 'drawing' && phase !== 'opponent_drawing') {
      this.cardRenderer.drawCard(this.ctx, card, centerX - cardWidth / 2, y, false, false);
    }

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
        gameState.playerYakuProgress || [],
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
        gameState.opponentYakuProgress || [],
        this.displayWidth - cardWidth - rightMargin,
        verticalMargin,
        'Opponent Captured',
        true // Show fanned cards for opponent
      );
    }
  }

  /**
   * Draw stack of captured cards with yaku and progress
   */
  drawCapturedStack(cards, yaku, yakuProgress, x, y, label, showFanned = false) {
    this.ctx.save();

    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    // Draw yaku list and progress above captured stack
    let yakuY = y - 30;

    // Draw completed yaku
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
        yakuY -= 14;
      }
    }

    // Draw yaku progress (incomplete combinations)
    if (yakuProgress && yakuProgress.length > 0) {
      this.ctx.fillStyle = '#ffeb3b';
      this.ctx.font = '11px monospace';
      this.ctx.textAlign = 'right';

      for (let i = 0; i < Math.min(yakuProgress.length, 3); i++) {
        const prog = yakuProgress[i];
        this.ctx.fillText(`${prog.name} ${prog.current}/${prog.needed}`, x + cardWidth, yakuY);
        yakuY -= 14;
      }

      if (yakuProgress.length > 3) {
        this.ctx.fillStyle = '#888';
        this.ctx.fillText(`+${yakuProgress.length - 3} more...`, x + cardWidth, yakuY);
      }
    }

    // Draw label
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 13px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${label}: ${cards.length}`, x + cardWidth / 2, y - 10);

    // Draw cards
    if (cards.length > 0) {
      if (showFanned && cards.length > 1) {
        // Show multiple cards fanned out for review
        const maxCardsToShow = Math.min(5, cards.length);
        const fanOffset = 8;
        const startIndex = Math.max(0, cards.length - maxCardsToShow);

        for (let i = 0; i < maxCardsToShow; i++) {
          const card = cards[startIndex + i];
          const offsetX = i * fanOffset;
          const offsetY = i * fanOffset;

          this.cardRenderer.drawCard(
            this.ctx,
            card,
            x + offsetX,
            y + offsetY,
            false,
            false,
            i < maxCardsToShow - 1 ? 0.7 : 1.0 // Slightly transparent for cards behind
          );
        }
      } else {
        // Just show top card
        this.cardRenderer.drawCard(
          this.ctx,
          cards[cards.length - 1],
          x,
          y,
          false,
          false
        );
      }
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
