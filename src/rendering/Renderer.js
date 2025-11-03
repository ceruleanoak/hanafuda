/**
 * Renderer - Main canvas rendering engine
 */

import { CardRenderer } from './CardRenderer.js';
import { debugLogger } from '../utils/DebugLogger.js';
import { HANAFUDA_DECK } from '../data/cards.js';

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
   * @param {Object} options - Render options (helpMode, hoverX, hoverY)
   */
  render(gameState, animatingCards = [], options = {}) {
    const { helpMode = false, hoverX = -1, hoverY = -1 } = options;

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

    // Draw opponent played card (before they draw from deck)
    if (gameState.opponentPlayedCard && gameState.phase === 'opponent_playing') {
      const playedCardY = margin + 60;
      this.drawOpponentPlayedCardHover(gameState.opponentPlayedCard, centerX, playedCardY);
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

    // Check for hover on deck and show all cards grid
    if (hoverX >= 0 && hoverY >= 0) {
      const deckX = margin;
      const deckY = zones.deck;
      if (this.cardRenderer.isPointInCard(hoverX, hoverY, deckX, deckY)) {
        this.drawAllCardsGrid(gameState);
      }

      // Check for hover on player captured pile
      const playerCapturedX = this.displayWidth - cardWidth - this.rightMargin;
      const playerCapturedY = this.displayHeight - cardHeight - this.verticalMargin;
      if (gameState.playerCaptured && gameState.playerCaptured.length > 0) {
        if (this.cardRenderer.isPointInCard(hoverX, hoverY, playerCapturedX, playerCapturedY)) {
          this.drawTricksList(gameState.playerCaptured, 'Player Tricks');
        }
      }

      // Check for hover on opponent captured pile
      const opponentCapturedX = this.displayWidth - cardWidth - this.rightMargin;
      const opponentCapturedY = this.verticalMargin;
      if (gameState.opponentCaptured && gameState.opponentCaptured.length > 0) {
        if (this.cardRenderer.isPointInCard(hoverX, hoverY, opponentCapturedX, opponentCapturedY)) {
          this.drawTricksList(gameState.opponentCaptured, 'Opponent Tricks');
        }
      }
    }

    // Show help mode highlighting
    if (helpMode && gameState.phase === 'select_hand') {
      this.highlightMatchableCards(gameState);
    }
  }

  // Need to define these constants at the class level for use in hover detection
  get rightMargin() { return 30; }
  get verticalMargin() { return 40; }

  /**
   * Draw animating cards
   */
  drawAnimatingCards(animatingCards) {
    if (!animatingCards || animatingCards.length === 0) return;

    // Check if cards are in celebration area (top of screen, y < 150)
    const celebrationCards = animatingCards.filter(
      anim => anim.card._animY !== undefined && anim.card._animY < 150
    );

    // Draw celebration box if cards are celebrating
    if (celebrationCards.length >= 4) {
      this.drawCelebrationBox(celebrationCards);
    }

    // Draw all animating cards
    for (const anim of animatingCards) {
      try {
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
        } else {
          debugLogger.logAnimationWarning('Animating card missing position', {
            card: anim.card.name,
            hasAnimX: anim.card._animX !== undefined,
            hasAnimY: anim.card._animY !== undefined
          });
        }
      } catch (err) {
        debugLogger.logError('Error drawing animating card', err);
      }
    }
  }

  /**
   * Draw celebration box for four-of-a-kind
   */
  drawCelebrationBox(cards) {
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    // Calculate box dimensions to fit all cards
    const padding = 20;
    const spacing = 15;
    const boxWidth = (4 * cardWidth) + (3 * spacing) + (2 * padding);
    const boxHeight = cardHeight + (2 * padding) + 60; // Extra space for label

    const centerX = this.displayWidth / 2;
    const boxX = centerX - boxWidth / 2;
    const boxY = 30;

    this.ctx.save();

    // Draw semi-transparent background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Draw golden border
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Draw inner glow
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    this.ctx.lineWidth = 8;
    this.ctx.strokeRect(boxX - 4, boxY - 4, boxWidth + 8, boxHeight + 8);

    // Draw label
    const month = cards.length > 0 ? cards[0].card.month : 'Unknown';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`🎉 FOUR OF ${month.toUpperCase()} 🎉`, centerX, boxY + 25);

    this.ctx.restore();
  }

  /**
   * Draw opponent's played card hover area
   */
  drawOpponentPlayedCardHover(card, centerX, y) {
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    // Draw background panel
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.fillRect(centerX - cardWidth / 2 - 20, y - 40, cardWidth + 40, cardHeight + 80);

    // Red border for opponent action
    this.ctx.strokeStyle = '#ff6b6b';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(centerX - cardWidth / 2 - 20, y - 40, cardWidth + 40, cardHeight + 80);

    // Draw label
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('OPPONENT PLAYS', centerX, y - 20);

    // Draw card
    this.cardRenderer.drawCard(this.ctx, card, centerX - cardWidth / 2, y, false, false);

    this.ctx.restore();
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
    const rightMargin = this.rightMargin;
    const verticalMargin = this.verticalMargin;

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
      this.ctx.font = '11px monospace';
      this.ctx.textAlign = 'right';

      for (let i = 0; i < Math.min(yakuProgress.length, 3); i++) {
        const prog = yakuProgress[i];
        // Use red color if impossible, yellow if still possible
        this.ctx.fillStyle = prog.isPossible === false ? '#ff6b6b' : '#ffeb3b';
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

  /**
   * Draw tricks list overlay when hovering over captured pile
   */
  drawTricksList(capturedCards, title) {
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();
    const padding = 20;
    const cardSpacing = 10;
    const cols = 6;
    const rows = Math.ceil(capturedCards.length / cols);

    const overlayWidth = cols * (cardWidth + cardSpacing) + padding * 2;
    const overlayHeight = rows * (cardHeight + cardSpacing) + padding * 2 + 40;

    const x = (this.displayWidth - overlayWidth) / 2;
    const y = (this.displayHeight - overlayHeight) / 2;

    this.ctx.save();

    // Draw semi-transparent background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    this.ctx.fillRect(x, y, overlayWidth, overlayHeight);

    // Draw border
    this.ctx.strokeStyle = '#4ecdc4';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, overlayWidth, overlayHeight);

    // Draw title
    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.font = 'bold 18px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, x + overlayWidth / 2, y + 30);

    // Draw cards in grid
    capturedCards.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cardX = x + padding + col * (cardWidth + cardSpacing);
      const cardY = y + padding + 40 + row * (cardHeight + cardSpacing);

      this.cardRenderer.drawCard(this.ctx, card, cardX, cardY, false, false);
    });

    this.ctx.restore();
  }

  /**
   * Draw all cards grid overlay when hovering over deck
   */
  drawAllCardsGrid(gameState) {
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();
    const padding = 20;
    const cardSpacing = 8;
    const cols = 12;
    const rows = 4; // 48 cards / 12 cols = 4 rows

    const overlayWidth = cols * (cardWidth + cardSpacing) + padding * 2;
    const overlayHeight = rows * (cardHeight + cardSpacing) + padding * 2 + 40;

    const x = (this.displayWidth - overlayWidth) / 2;
    const y = (this.displayHeight - overlayHeight) / 2;

    this.ctx.save();

    // Draw semi-transparent background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    this.ctx.fillRect(x, y, overlayWidth, overlayHeight);

    // Draw border
    this.ctx.strokeStyle = '#ffeb3b';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, overlayWidth, overlayHeight);

    // Draw title
    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.font = 'bold 18px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('All Cards (grayed = captured)', x + overlayWidth / 2, y + 30);

    // Create sets for different card states
    const capturedCardIds = new Set();
    gameState.playerCaptured.forEach(c => capturedCardIds.add(c.id));
    gameState.opponentCaptured.forEach(c => capturedCardIds.add(c.id));

    const playerHandIds = new Set(gameState.playerHand.map(c => c.id));
    const fieldIds = new Set(gameState.field.map(c => c.id));

    // Draw all 48 cards
    HANAFUDA_DECK.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cardX = x + padding + col * (cardWidth + cardSpacing);
      const cardY = y + padding + 40 + row * (cardHeight + cardSpacing);

      // Gray out captured cards, highlight player's hand and field cards
      const isCaptured = capturedCardIds.has(card.id);
      const isInPlayerHand = playerHandIds.has(card.id);
      const isInField = fieldIds.has(card.id);

      let opacity = 1.0;
      let highlight = false;

      if (isCaptured) {
        opacity = 0.3; // Grayed out
      } else if (isInPlayerHand || isInField) {
        highlight = true; // Highlight these
      }

      this.cardRenderer.drawCard(this.ctx, card, cardX, cardY, false, false, opacity);

      // Draw highlight border for player's hand and field cards
      if (highlight) {
        this.ctx.strokeStyle = isInPlayerHand ? '#4ecdc4' : '#ffeb3b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
      }
    });

    this.ctx.restore();
  }

  /**
   * Highlight matchable cards in help mode
   */
  highlightMatchableCards(gameState) {
    // Find which cards in player hand can match cards on the field
    const matchableHandCards = new Set();
    const matchableFieldCards = new Set();

    gameState.playerHand.forEach(handCard => {
      const matches = gameState.field.filter(fieldCard =>
        fieldCard.month === handCard.month
      );
      if (matches.length > 0) {
        matchableHandCards.add(handCard.id);
        matches.forEach(m => matchableFieldCards.add(m.id));
      }
    });

    this.ctx.save();

    // Highlight matchable cards in player hand
    gameState.playerHand.forEach(card => {
      if (matchableHandCards.has(card.id) && card._renderX !== undefined) {
        this.ctx.strokeStyle = '#ffeb3b';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(
          card._renderX - 2,
          card._renderY - 2,
          this.cardRenderer.cardWidth + 4,
          this.cardRenderer.cardHeight + 4
        );

        // Add glow effect
        this.ctx.shadowColor = '#ffeb3b';
        this.ctx.shadowBlur = 15;
        this.ctx.strokeRect(
          card._renderX - 2,
          card._renderY - 2,
          this.cardRenderer.cardWidth + 4,
          this.cardRenderer.cardHeight + 4
        );
        this.ctx.shadowBlur = 0;
      }
    });

    // Highlight matchable cards on field
    gameState.field.forEach(card => {
      if (matchableFieldCards.has(card.id) && card._renderX !== undefined) {
        this.ctx.strokeStyle = '#4ecdc4';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(
          card._renderX - 2,
          card._renderY - 2,
          this.cardRenderer.cardWidth + 4,
          this.cardRenderer.cardHeight + 4
        );

        // Add glow effect
        this.ctx.shadowColor = '#4ecdc4';
        this.ctx.shadowBlur = 15;
        this.ctx.strokeRect(
          card._renderX - 2,
          card._renderY - 2,
          this.cardRenderer.cardWidth + 4,
          this.cardRenderer.cardHeight + 4
        );
        this.ctx.shadowBlur = 0;
      }
    });

    this.ctx.restore();
  }
}
