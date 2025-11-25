/**
 * Renderer - Main canvas rendering engine
 */

import { CardRenderer } from './CardRenderer.js';
import { debugLogger } from '../utils/DebugLogger.js';
import { HANAFUDA_DECK } from '../data/cards.js';
import { LayoutManager } from '../utils/LayoutManager.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cardRenderer = new CardRenderer();
    this.backgroundImage = null;
    this.backgroundColor = '#000';
    this.onResizeCallback = null;
    this.overlayCtx = null; // For drawing hover previews above modals
    this.cancelSageButtonBounds = null; // Bounds of Cancel Sage button for click detection

    this.setupCanvas();
  }

  /**
   * Set callback to be notified when viewport resizes
   * @param {Function} callback - Called with (width, height) when resize occurs
   */
  setOnResizeCallback(callback) {
    this.onResizeCallback = callback;
  }

  /**
   * Set overlay canvas context for drawing hover previews above modals
   * @param {CanvasRenderingContext2D} ctx - 2D context of overlay canvas
   */
  setOverlayContext(ctx) {
    this.overlayCtx = ctx;
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

    // Update card renderer scale based on new viewport dimensions
    const cardDimensions = this.cardRenderer.updateCardScale(width, height);

    // Notify listeners of resize with card dimensions
    if (this.onResizeCallback) {
      this.onResizeCallback(width, height, cardDimensions);
    }
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
   * @param {Array} _ - Unused (kept for backwards compatibility)
   * @param {Object} options - Render options (helpMode, hoverX, hoverY, isModalVisible, card3DManager)
   */
  render(gameState, _ = [], options = {}) {
    const { helpMode = false, hoverX = -1, hoverY = -1, isModalVisible = false, card3DManager = null, isDragging = false, isGameOver = false, isRoundSummaryVisible = false, isSageDecisionModalVisible = false, isKoikoiModalVisible = false } = options;

    // Always use 3D rendering path
    if (card3DManager) {
      this.render3D(gameState, card3DManager, { helpMode, hoverX, hoverY, isModalVisible, isDragging, isGameOver, isRoundSummaryVisible, isSageDecisionModalVisible, isKoikoiModalVisible, card3DManager });
    }
  }

  /**
   * 3D rendering path using Card3DManager
   * @param {Object} gameState - Current game state
   * @param {Card3DManager} card3DManager - Card3D manager instance
   * @param {Object} options - Render options
   */
  render3D(gameState, card3DManager, options = {}) {
    const { helpMode = false, hoverX = -1, hoverY = -1, isModalVisible = false, isGameOver = false, isRoundSummaryVisible = false, isSageDecisionModalVisible = false, isKoikoiModalVisible = false, isDragging = false } = options;

    this.clear();

    // Clear overlay canvas for hover previews
    if (this.overlayCtx) {
      this.overlayCtx.clearRect(0, 0, this.displayWidth, this.displayHeight);
    }

    this.drawBackground();

    // Get all visible cards sorted by render order
    const visibleCards = card3DManager.getVisibleCards();

    // Determine if we should show point values (Sakura and Hachi-Hachi modes)
    const pointValueOptions = (gameState.isSakuraMode || gameState.isHachihachiMode) ? {
      enabled: true,
      getValue: (card) => {
        if (gameState.isSakuraMode) {
          // Sakura point values
          const SAKURA_VALUES = {
            'bright': 20,  // All bright cards = 20 points
            'ribbon': 10,  // All ribbon cards = 10 points
            'animal': 5,   // All animal cards = 5 points
            'chaff': 0     // All chaff cards = 0 points
          };
          return SAKURA_VALUES[card.type] || 0;
        } else {
          // Hachi-Hachi point values
          const HACHIHACHI_VALUES = {
            'bright': 20,  // All bright cards = 20 points
            'ribbon': 5,   // All ribbon cards = 5 points
            'animal': 10,  // All animal cards = 10 points
            'chaff': 1     // All chaff cards = 1 point
          };
          return HACHIHACHI_VALUES[card.type] || 0;
        }
      }
    } : null;

    // Determine if we should show wild card effect (Sakura mode, Gaji card)
    const wildCardOptions = gameState.isSakuraMode ? {
      enabled: true,
      isWildCard: (card) => {
        // Gaji is the Lightning card (November chaff, ID 44)
        const GAJI_CARD_ID = 44;

        // Check if this is the Gaji card
        if (card.id !== GAJI_CARD_ID) return false;

        // Check Gaji state - only wild when in hand, just drawn, or in selection mode
        const gajiState = gameState.gajiState;
        if (!gajiState) return false;

        // Wild when in player's hand, opponent's hand (we can see it), just drawn, or in selection mode
        return gajiState.location === 'player_hand' ||
               gajiState.location === 'opponent_hand' ||
               gajiState.inSelection === true ||
               (gajiState.location === 'deck' && gameState.drawnCard && gameState.drawnCard.id === GAJI_CARD_ID);
      }
    } : null;

    // Draw all visible cards
    visibleCards.forEach(card3D => {
      // Skip rendering deck cards if deck is empty (count = 0)
      if (card3D.homeZone === 'deck' && gameState.deckCount === 0) {
        return;
      }
      this.cardRenderer.drawCard3D(this.ctx, card3D, false, card3D.opacity, pointValueOptions, wildCardOptions);
    });

    // Draw deck at field gridSlot 0 position (calculated from field layout)
    if (gameState.deckCount > 0) {
      const fieldConfig = LayoutManager.getZoneConfig('field', this.displayWidth, this.displayHeight, card3DManager.playerCount);
      const layoutManager = new LayoutManager();

      // Create a dummy card with gridSlot 0 to calculate its position
      const dummyCard = { gridSlot: 0 };
      const positions = layoutManager.layoutGrid([dummyCard], fieldConfig);
      const slot0Position = positions[0];

      // Draw a stacked deck representation at slot 0 position (from center)
      const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();
      const stackDepth = 3; // Draw 3 cards stacked for deck visual
      const centerX = slot0Position.x - cardWidth / 2;
      const centerY = slot0Position.y - cardHeight / 2;

      for (let i = 0; i < stackDepth; i++) {
        const offset = i * 2; // 2px offset per card for visual depth
        this.cardRenderer.drawCard(
          this.ctx,
          { name: 'Deck' },
          centerX + offset,
          centerY + offset,
          false,
          true // face down
        );
      }

      // Draw deck count on top (at center position)
      this.drawDeckCount(slot0Position.x, slot0Position.y, gameState.deckCount);

      // Store deck position for hover detection
      this.deckPosition = { x: slot0Position.x, y: slot0Position.y };
    }

    // Draw trick pile labels using fixed zone positions (N-player support)
    // Determine player count from card3DManager
    const playerCount = card3DManager.playerCount || 2;
    const isTeamsMode = playerCount === 4; // Teams mode is 4-player

    // Helper to get player label (You/Opponent/Ally)
    const getPlayerLabel = (playerIndex) => {
      if (playerIndex === 0) return 'You';
      if (isTeamsMode && playerCount === 4) {
        // Team assignments: P0 + P2 vs P1 + P3
        return playerIndex === 2 ? 'Ally' : `Opponent ${playerIndex === 1 ? 1 : 2}`;
      }
      return `Opponent ${playerIndex}`;
    };

    // Get trick configs for 2-player mode (will be used in multiple places below)
    let playerTrickConfig, opponentTrickConfig;
    if (playerCount === 2) {
      // 2-player layout - use indexed names
      playerTrickConfig = LayoutManager.getZoneConfig('player0Trick', this.displayWidth, this.displayHeight, playerCount);
      opponentTrickConfig = LayoutManager.getZoneConfig('player1Trick', this.displayWidth, this.displayHeight, playerCount);

      const playerTrickCards = card3DManager.getCardsInZone('player0Trick');
      if (playerTrickCards.length > 0) {
        this.drawTrickLabel(playerTrickConfig.position.x, playerTrickConfig.position.y, `You`, false);
      }

      const opponentTrickCards = card3DManager.getCardsInZone('player1Trick');
      if (opponentTrickCards.length > 0) {
        this.drawTrickLabel(opponentTrickConfig.position.x, opponentTrickConfig.position.y, `Opponent`, true);
      }
    } else {
      // N-player layout (3-4 players)
      for (let i = 0; i < playerCount; i++) {
        const trickZone = `player${i}Trick`;
        const trickConfig = LayoutManager.getZoneConfig(trickZone, this.displayWidth, this.displayHeight, playerCount, this.useAnimations);
        const trickCards = card3DManager.getCardsInZone(trickZone);

        if (trickCards.length > 0) {
          const playerLabel = getPlayerLabel(i);
          this.drawTrickLabel(trickConfig.position.x, trickConfig.position.y, playerLabel, i !== 0);
        }
      }
    }

    // Draw yaku information (trick progress) - only when Help is active
    if (helpMode) {
      this.draw3DYakuInfo(gameState, card3DManager);
    }

    // Drawn card is rendered in 3D card system (via visibleCards above)
    // but this section provides fallback rendering for legacy mode or highlight
    // Note: drawnCard zone cards are included in visibleCards through getVisibleCards()

    // Show help mode highlighting (but not while animations are playing)
    if (helpMode && gameState.phase === 'select_hand' && !card3DManager.isAnyAnimating()) {
      this.highlight3DMatchableCards(gameState, card3DManager);
    }

    // Apply matching card animations and highlighting during select_drawn_match phase
    if (gameState.phase === 'select_drawn_match' && gameState.drawnCard) {
      this.animateAndHighlightMatchingCards(gameState, card3DManager, helpMode);
    } else {
      // Clear rotation animations from field cards when not in select_drawn_match phase
      gameState.field.forEach(fieldCard => {
        const card3D = card3DManager.getCard(fieldCard);
        if (card3D && card3D.rotation !== 0) {
          card3D.rotation = 0;
        }
      });
    }

    // Draw field slot highlights when dragging a hand card (shows where to drop)
    // Show during select_hand phase and any phase where we might drag from player hand
    if (isDragging && gameState.field && gameState.field.length >= 0) {
      debugLogger.log('render', `🟡 isDragging=${isDragging}, phase=${gameState.phase}, field=${gameState.field.length} cards`, null);

      if (gameState.phase === 'select_hand' || gameState.phase === 'select_field') {
        const layoutManager = new LayoutManager();
        // Get player count from card3DManager if available, otherwise default to 2
        const playerCount = card3DManager.playerCount || 2;
        debugLogger.log('render', `✅ Drawing field slot highlights`, null);
        this.drawFieldSlotHighlights(gameState, layoutManager, playerCount);
      }
    }

    // Hover interactions (show when no modal visible, or when overlay canvas available for decision modals)
    if (hoverX >= 0 && hoverY >= 0 && (!isModalVisible || this.overlayCtx) && !isGameOver) {
      const hoveredCard = card3DManager.getCardAtPosition(hoverX, hoverY);
      const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

      // Deck hover - use dynamic deck position calculated from field grid
      if (this.deckPosition && gameState.deckCount > 0) {
        const deckZoneRect = {
          x: this.deckPosition.x - cardWidth / 2,
          y: this.deckPosition.y - cardHeight / 2,
          width: cardWidth,
          height: cardHeight
        };
        if (hoverX >= deckZoneRect.x && hoverX <= deckZoneRect.x + deckZoneRect.width &&
            hoverY >= deckZoneRect.y && hoverY <= deckZoneRect.y + deckZoneRect.height) {
          this.drawAllCardsGrid(gameState);
        }
      }

      // Trick pile hover - calculate bounding box of entire visible pile
      // This encompasses all visible cards in the fan layout

      /**
       * Calculate the bounding box that encompasses all visible cards in a trick pile
       * Uses actual Card3D rendered positions, not LayoutManager positions
       * Returns the leftmost, topmost, rightmost, and bottommost positions
       */
      const getTrickPileBounds = (zone, card3DManager) => {
        const cards = card3DManager.getCardsInZone(zone);
        // Only include cards that have finished animating to the trick pile
        const settledCards = cards.filter(card => !card.isAnimating());
        if (settledCards.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        // Use actual rendered positions from Card3D objects
        settledCards.forEach(card3D => {
          const cardX = card3D.x - cardWidth / 2;  // Card3D.x is center, we need top-left
          const cardY = card3D.y - cardHeight / 2;

          minX = Math.min(minX, cardX);
          minY = Math.min(minY, cardY);
          maxX = Math.max(maxX, cardX + cardWidth);
          maxY = Math.max(maxY, cardY + cardHeight);
        });

        const bounds = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };

        return bounds;
      };

      if (playerCount === 2) {
        // 2-player trick pile hover
        if (gameState.playerCaptured.length > 0) {
          const playerBounds = getTrickPileBounds('player0Trick', card3DManager);
          if (playerBounds) {
            if (hoverX >= playerBounds.x && hoverX <= playerBounds.x + playerBounds.width &&
                hoverY >= playerBounds.y && hoverY <= playerBounds.y + playerBounds.height) {
              this.drawTricksList(gameState.playerCaptured, 'You', pointValueOptions);
            }
          }
        }

        if (gameState.opponentCaptured.length > 0) {
          const opponentBounds = getTrickPileBounds('player1Trick', card3DManager);
          if (opponentBounds &&
              hoverX >= opponentBounds.x && hoverX <= opponentBounds.x + opponentBounds.width &&
              hoverY >= opponentBounds.y && hoverY <= opponentBounds.y + opponentBounds.height) {
            this.drawTricksList(gameState.opponentCaptured, 'Opponent', pointValueOptions);
          }
        }
      } else if (gameState.players) {
        // N-player trick pile hover (3-4 players)
        for (let i = 0; i < playerCount; i++) {
          const trickZone = `player${i}Trick`;
          const trickCards = card3DManager.getCardsInZone(trickZone);

          if (trickCards.length > 0 && gameState.players[i].captured && gameState.players[i].captured.length > 0) {
            const bounds = getTrickPileBounds(trickZone, card3DManager);
            if (bounds &&
                hoverX >= bounds.x && hoverX <= bounds.x + bounds.width &&
                hoverY >= bounds.y && hoverY <= bounds.y + bounds.height) {
              const playerLabel = getPlayerLabel(i);
              this.drawTricksList(gameState.players[i].captured || [], playerLabel, pointValueOptions);
            }
          }
        }
      }
    }

    // Draw trick pile hover indicators on overlay canvas only when decision modals are visible
    // These help players see their captured cards when making crucial decisions
    if (this.overlayCtx && (isSageDecisionModalVisible || isKoikoiModalVisible)) {
      this.drawTrickPileIndicators(gameState, card3DManager, playerCount);
    }

    // Draw Cancel Sage button for Hachi-Hachi mode (store bounds for click detection)
    this.cancelSageButtonBounds = this.drawCancelSageButton(gameState);
  }

  /**
   * Draw deck card count
   */
  drawDeckCount(x, y, count) {
    this.ctx.save();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(`${count}`, x + 50, y + 70);
    this.ctx.fillText(`${count}`, x + 50, y + 70);
    this.ctx.restore();
  }

  /**
   * Draw trick pile label
   */
  drawTrickLabel(x, y, label, isOpponent) {
    this.ctx.save();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 11px monospace';
    this.ctx.textAlign = 'center';

    if (isOpponent) {
      this.ctx.fillText(label, x + 50, y + 160);
    } else {
      this.ctx.fillText(label, x + 50, y - 10);
    }
    this.ctx.restore();
  }

  /**
   * Draw yaku info for 3D rendering (N-player support)
   */
  draw3DYakuInfo(gameState, card3DManager) {
    const playerCount = card3DManager.playerCount || 2;

    // Get trick configs for 2-player mode
    let playerTrickConfig, opponentTrickConfig;
    if (playerCount === 2) {
      // 2-player layout - use indexed names
      playerTrickConfig = LayoutManager.getZoneConfig('player0Trick', this.displayWidth, this.displayHeight, playerCount);
      opponentTrickConfig = LayoutManager.getZoneConfig('player1Trick', this.displayWidth, this.displayHeight, playerCount);

      const playerTrickCards = card3DManager.getCardsInZone('player0Trick');
      const opponentTrickCards = card3DManager.getCardsInZone('player1Trick');

      if (playerTrickCards.length > 0) {
        this.drawYakuList(
          playerTrickConfig.position.x,
          playerTrickConfig.position.y - 50,
          gameState.playerYaku || [],
          gameState.playerYakuProgress || [],
          false
        );
      }

      if (opponentTrickCards.length > 0) {
        this.drawYakuList(
          opponentTrickConfig.position.x,
          opponentTrickConfig.position.y + 180,
          gameState.opponentYaku || [],
          gameState.opponentYakuProgress || [],
          true
        );
      }
    } else {
      // N-player layout (3-4 players)
      // Use players array from gameState if available
      if (gameState.players && Array.isArray(gameState.players)) {
        gameState.players.forEach((player, index) => {
          const trickZone = `player${index}Trick`;
          const trickConfig = LayoutManager.getZoneConfig(trickZone, this.displayWidth, this.displayHeight, playerCount);
          const trickCards = card3DManager.getCardsInZone(trickZone);

          if (trickCards.length > 0 && player.yaku && player.yaku.length > 0) {
            // Position yaku info above or below trick pile depending on player position
            const isOpponent = index !== 0;
            const yOffset = isOpponent ? 180 : -50;
            this.drawYakuList(
              trickConfig.position.x,
              trickConfig.position.y + yOffset,
              player.yaku || [],
              [], // No progress tracking for N-player yet
              isOpponent
            );
          }
        });
      }
    }
  }

  /**
   * Draw yaku list at position
   */
  drawYakuList(x, y, yaku, yakuProgress, isOpponent) {
    this.ctx.save();
    let offsetY = 0;

    // Draw completed yaku (all of them)
    if (yaku && yaku.length > 0) {
      this.ctx.fillStyle = '#4ecdc4';
      this.ctx.font = 'bold 11px monospace';
      this.ctx.textAlign = 'right';

      yaku.forEach(yakuItem => {
        this.ctx.fillText(`${yakuItem.name} (${yakuItem.points})`, x + 100, y + offsetY);
        offsetY += isOpponent ? 14 : -14;
      });
    }

    // Draw yaku progress (all of them)
    if (yakuProgress && yakuProgress.length > 0) {
      this.ctx.font = '11px monospace';
      this.ctx.textAlign = 'right';

      yakuProgress.forEach(prog => {
        this.ctx.fillStyle = prog.isPossible === false ? '#ff6b6b' : '#ffeb3b';
        this.ctx.fillText(`${prog.name} ${prog.current}/${prog.needed}`, x + 100, y + offsetY);
        offsetY += isOpponent ? 14 : -14;
      });
    }

    this.ctx.restore();
  }

  /**
   * Highlight matchable cards in 3D mode
   */
  highlight3DMatchableCards(gameState, card3DManager) {
    const matchableHandCards = new Set();

    // Get player 0's hand (works for both KoiKoi and Sakura)
    const playerHand = gameState.players?.[0]?.hand || gameState.playerHand || [];
    playerHand.forEach(handCard => {
      const matches = gameState.field.filter(fieldCard =>
        fieldCard.month === handCard.month
      );
      if (matches.length > 0) {
        matchableHandCards.add(handCard.id);
      }
    });

    this.ctx.save();

    // Highlight matchable hand cards only
    card3DManager.getCardsInZone('player0Hand').forEach(card3D => {
      if (matchableHandCards.has(card3D.id)) {
        this.drawCardHighlight(card3D, '#ffeb3b');
      }
    });

    this.ctx.restore();
  }

  /**
   * Animate and highlight matching field cards during select_drawn_match phase
   * Applies subtle rotation animation and highlighting (same style as hand card matching)
   */
  animateAndHighlightMatchingCards(gameState, card3DManager, helpMode) {
    // Find field cards that match the drawn card
    const matchingFieldCards = gameState.field.filter(fieldCard =>
      fieldCard.month === gameState.drawnCard.month
    );

    if (matchingFieldCards.length === 0) return;

    // Get current time for rotation animation (continuous back-and-forth)
    const now = performance.now();
    const animationCycle = 1000; // 1 second per full cycle
    const progress = (now % animationCycle) / animationCycle; // 0 to 1

    // Calculate rotation: -5% to +5% (converts to radians: ±0.087 radians = ±5 degrees)
    const maxRotation = 0.087; // 5 degrees in radians
    const rotation = maxRotation * Math.sin(progress * Math.PI * 2);

    this.ctx.save();

    // Apply animation and highlighting to matching field cards
    matchingFieldCards.forEach(matchCard => {
      const card3D = card3DManager.getCard(matchCard);
      if (card3D) {
        // Apply rotation animation
        card3D.rotation = rotation;

        // Always highlight matching field cards (same as hand card matching)
        this.drawCardHighlight(card3D, '#ffeb3b'); // Yellow highlight like hand cards
      }
    });

    this.ctx.restore();
  }

  /**
   * Draw highlight around a Card3D
   */
  drawCardHighlight(card3D, color) {
    const scale = card3D.getScale();
    const w = this.cardRenderer.cardWidth * scale;
    const h = this.cardRenderer.cardHeight * scale;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(card3D.x - w / 2 - 2, card3D.y - h / 2 - 2, w + 4, h + 4);

    // Add glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    this.ctx.strokeRect(card3D.x - w / 2 - 2, card3D.y - h / 2 - 2, w + 4, h + 4);
    this.ctx.shadowBlur = 0;
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

    // Check if this is the opponent's stack (at top of screen)
    const isOpponent = label.includes('Opponent');

    // For opponent, draw info below the pile; for player, draw above
    if (isOpponent) {
      // Draw label below pile
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 13px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${label}: ${cards.length}`, x + cardWidth / 2, y + cardHeight + 20);

      // Draw yaku list and progress below label
      let yakuY = y + cardHeight + 35;

      // Draw completed yaku
      if (yaku && yaku.length > 0) {
        this.ctx.fillStyle = '#4ecdc4';
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'right';

        // Draw yaku in order (top to bottom)
        for (let i = Math.max(0, yaku.length - 5); i < yaku.length; i++) {
          const yakuItem = yaku[i];
          this.ctx.fillText(`${yakuItem.name} (${yakuItem.points})`, x + cardWidth, yakuY);
          yakuY += 14;
        }

        if (yaku.length > 5) {
          this.ctx.fillStyle = '#888';
          this.ctx.fillText(`+${yaku.length - 5} more...`, x + cardWidth, yakuY);
          yakuY += 14;
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
          yakuY += 14;
        }

        if (yakuProgress.length > 3) {
          this.ctx.fillStyle = '#888';
          this.ctx.fillText(`+${yakuProgress.length - 3} more...`, x + cardWidth, yakuY);
        }
      }
    } else {
      // Player's stack - draw info above pile (existing behavior)
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

      // Draw label above pile
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 13px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${label}: ${cards.length}`, x + cardWidth / 2, y - 10);
    }

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
    const playerHand = gameState.players?.[0]?.hand || gameState.playerHand || [];
    if (playerHand) {
      const result = checkCards(playerHand, 'player');
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
   * @param {Array} capturedCards - Array of card objects
   * @param {String} title - Title for the overlay
   * @param {Object} pointValueOptions - Optional { enabled: boolean, getValue: (card) => number }
   */
  drawTricksList(capturedCards, title, pointValueOptions = null) {
    // Use overlay context if available (when modal is active), otherwise use main context
    const ctx = this.overlayCtx || this.ctx;

    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();
    const padding = 20;
    const cardSpacing = 10;
    const cols = 6;
    const rows = Math.ceil(capturedCards.length / cols);

    const overlayWidth = cols * (cardWidth + cardSpacing) + padding * 2;
    const overlayHeight = rows * (cardHeight + cardSpacing) + padding * 2 + 40;

    const x = (this.displayWidth - overlayWidth) / 2;
    const y = (this.displayHeight - overlayHeight) / 2;

    ctx.save();

    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(x, y, overlayWidth, overlayHeight);

    // Draw border
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, overlayWidth, overlayHeight);

    // Draw title
    ctx.fillStyle = '#4ecdc4';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + overlayWidth / 2, y + 30);

    // Draw cards in grid
    capturedCards.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cardX = x + padding + col * (cardWidth + cardSpacing);
      const cardY = y + padding + 40 + row * (cardHeight + cardSpacing);

      this.cardRenderer.drawCard(ctx, card, cardX, cardY, false, false, 1.0, pointValueOptions);
    });

    ctx.restore();
  }

  /**
   * Draw trick text list overlay (text-based list instead of card grid)
   */
  drawTrickTextList(capturedCards, title) {
    const padding = 20;
    const lineHeight = 20;
    const maxWidth = 400;

    // Calculate overlay dimensions
    const overlayWidth = maxWidth;
    const overlayHeight = Math.min(capturedCards.length * lineHeight + 80, this.displayHeight - 100);

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

    // Draw count
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`Total: ${capturedCards.length} cards`, x + overlayWidth / 2, y + 50);

    // Draw card names in a scrollable list
    this.ctx.font = '14px monospace';
    this.ctx.textAlign = 'left';
    const startY = y + 70;
    const maxVisibleCards = Math.floor((overlayHeight - 90) / lineHeight);
    const visibleCards = capturedCards.slice(0, maxVisibleCards);

    visibleCards.forEach((card, index) => {
      this.ctx.fillStyle = '#fff';
      // Format card text: show value if it exists and is not undefined
      let cardText = `• ${card.name}`;
      if (card.value !== undefined && card.value !== null) {
        cardText += ` (${card.value} pts)`;
      }
      this.ctx.fillText(cardText, x + padding, startY + index * lineHeight);
    });

    // If there are more cards, show indicator
    if (capturedCards.length > maxVisibleCards) {
      this.ctx.fillStyle = '#888';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`... and ${capturedCards.length - maxVisibleCards} more`, x + overlayWidth / 2, startY + maxVisibleCards * lineHeight);
    }

    this.ctx.restore();
  }

  /**
   * Draw all cards grid overlay when hovering over deck
   */
  drawAllCardsGrid(gameState) {
    // Use overlay context if available (when modal is active), otherwise use main context
    const ctx = this.overlayCtx || this.ctx;

    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();
    const padding = 20;
    const cardSpacing = 8;
    const cols = 12;
    const rows = 4; // 48 cards / 12 cols = 4 rows

    const overlayWidth = cols * (cardWidth + cardSpacing) + padding * 2;
    const overlayHeight = rows * (cardHeight + cardSpacing) + padding * 2 + 40;

    const x = (this.displayWidth - overlayWidth) / 2;
    const y = (this.displayHeight - overlayHeight) / 2;

    ctx.save();

    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(x, y, overlayWidth, overlayHeight);

    // Draw border
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, overlayWidth, overlayHeight);

    // Draw title
    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('All Cards (grayed = captured)', x + overlayWidth / 2, y + 30);

    // Create sets for different card states
    const capturedCardIds = new Set();

    // Collect captured cards from all players (works for 2P, 3P, 4P modes)
    if (gameState.players && Array.isArray(gameState.players)) {
      gameState.players.forEach(player => {
        if (player.captured) {
          player.captured.forEach(c => capturedCardIds.add(c.id));
        }
      });
    } else {
      // Legacy 2-player format fallback
      const playerTrick = gameState.playerCaptured || [];
      const opponentTrick = gameState.opponentCaptured || [];
      playerTrick.forEach(c => capturedCardIds.add(c.id));
      opponentTrick.forEach(c => capturedCardIds.add(c.id));
    }

    const playerHand = gameState.players?.[0]?.hand || gameState.playerHand || [];
    const playerHandIds = new Set(playerHand.map(c => c.id));
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

      this.cardRenderer.drawCard(ctx, card, cardX, cardY, false, false, opacity);

      // Draw highlight border for player's hand and field cards
      if (highlight) {
        ctx.strokeStyle = isInPlayerHand ? '#4ecdc4' : '#ffeb3b';
        ctx.lineWidth = 2;
        ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
      }
    });

    ctx.restore();
  }

  /**
   * Draw trick pile indicators on overlay canvas
   * Shows all visible cards in each trick pile with face-down rendering
   * Only called when decision modals are visible (Shoubu/Sage, Koi-koi)
   */
  drawTrickPileIndicators(gameState, card3DManager, playerCount) {
    if (!this.overlayCtx) return; // Only draw on overlay canvas

    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    /**
     * Draw all visible cards in a trick pile with face-down rendering
     * This shows the entire pile structure when hovering
     */
    const drawTrickPile = (cards, config) => {
      const { position, fanOffset = { x: 8, y: 8 }, maxVisible = 5 } = config;
      const visibleCount = Math.min(cards.length, maxVisible);

      // Draw all visible cards
      for (let i = 0; i < visibleCount; i++) {
        const card = cards[cards.length - visibleCount + i]; // Get from end of array
        const cardX = position.x + (i * fanOffset.x);
        const cardY = position.y + (i * fanOffset.y);

        this.overlayCtx.save();
        this.cardRenderer.drawCard(
          this.overlayCtx,
          card,
          cardX,
          cardY,
          true,  // isFaceDown - show card backs
          false,
          1.0
        );
        this.overlayCtx.restore();
      }
    };

    if (playerCount === 2) {
      // 2-player mode
      const playerTrickConfig = LayoutManager.getZoneConfig('playerTrick', this.displayWidth, this.displayHeight, playerCount);
      const opponentTrickConfig = LayoutManager.getZoneConfig('opponentTrick', this.displayWidth, this.displayHeight, playerCount);

      if (gameState.playerCaptured && gameState.playerCaptured.length > 0) {
        drawTrickPile(gameState.playerCaptured, playerTrickConfig);
      }

      if (gameState.opponentCaptured && gameState.opponentCaptured.length > 0) {
        drawTrickPile(gameState.opponentCaptured, opponentTrickConfig);
      }
    } else if (gameState.players) {
      // N-player mode (3-4 players)
      for (let i = 0; i < playerCount; i++) {
        const trickZone = `player${i}Trick`;
        const trickConfig = LayoutManager.getZoneConfig(trickZone, this.displayWidth, this.displayHeight, playerCount);

        if (gameState.players[i].captured && gameState.players[i].captured.length > 0) {
          drawTrickPile(gameState.players[i].captured, trickConfig);
        }
      }
    }
  }

  /**
   * Highlight matchable cards in help mode
   */
  highlightMatchableCards(gameState) {
    // Find which cards in player hand can match cards on the field
    const matchableHandCards = new Set();
    const matchableFieldCards = new Set();

    const playerHand = gameState.players?.[0]?.hand || gameState.playerHand || [];
    playerHand.forEach(handCard => {
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
    playerHand.forEach(card => {
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

  /**
   * Draw 3D animated cards
   * @param {Animation3DManager} animation3DManager - The 3D animation manager
   */
  draw3DAnimatedCards(animation3DManager) {
    // Get cards sorted by Z position (back to front)
    const sortedCards = animation3DManager.getCardsSortedByZ();

    // Draw each card
    sortedCards.forEach(card3D => {
      this.cardRenderer.drawCard3D(this.ctx, card3D, false, 1.0);
    });
  }

  /**
   * Draw empty field slot highlights for hand card drag zones
   * Shows transparent white fill on unoccupied field slots
   * @param {Object} gameState - Current game state
   * @param {LayoutManager} layoutManager - Layout manager for zone positions
   * @param {number} playerCount - Number of players (for layout configuration)
   */
  drawFieldSlotHighlights(gameState, layoutManager, playerCount = 2) {
    if (!gameState.field) {
      debugLogger.log('slots', `❌ No field in gameState`, null);
      return;
    }

    const fieldConfig = LayoutManager.getZoneConfig('field', this.displayWidth, this.displayHeight, playerCount);
    const { width: cardWidth, height: cardHeight } = this.cardRenderer.getCardDimensions();

    debugLogger.log('slots', `📋 Field State:`, {
      fieldLength: gameState.field.length,
      fieldCards: gameState.field.map(c => ({
        id: c.id,
        name: c.name,
        gridSlot: c.gridSlot,
        month: c.month
      }))
    });

    // Get all 8 field slot positions (slots 1-8, slot 0 is reserved for deck)
    const allSlots = Array.from({ length: 8 }, (_, i) => ({ gridSlot: i + 1 }));
    const positions = layoutManager.layout(allSlots, fieldConfig);

    debugLogger.log('slots', `📍 All 8 Slot Positions:`,
      positions.map((pos, idx) => ({
        slotIndex: idx,
        x: pos.x.toFixed(0),
        y: pos.y.toFixed(0),
        z: pos.z
      }))
    );

    // Create set of occupied grid slots
    // Log the mapping process in detail
    debugLogger.log('slots', `🔍 Building occupied slots set:`, null);
    const occupiedSlotsArray = gameState.field.map((card, fieldIndex) => {
      const slotIndex = card.gridSlot !== undefined ? card.gridSlot : fieldIndex;
      debugLogger.log('slots', `  Card[${fieldIndex}]: "${card.name}" → slot ${slotIndex} (gridSlot=${card.gridSlot}, indexOf=${fieldIndex})`, null);
      return slotIndex;
    });

    const occupiedSlots = new Set(occupiedSlotsArray);
    // Note: Slot 0 is reserved for deck, we only track field card slots 1-8

    debugLogger.log('slots', `✓ Occupied Slot Indices: [${Array.from(occupiedSlots).sort((a,b) => a-b).join(', ')}]`, {
      occupiedCount: occupiedSlots.size,
      details: Array.from(occupiedSlots).map(slot => ({
        slotIndex: slot,
        occupiedBy: gameState.field.find(c => (c.gridSlot !== undefined ? c.gridSlot : gameState.field.indexOf(c)) === slot)?.name || 'UNKNOWN'
      }))
    });

    // Calculate empty slots (check slots 1-8)
    const emptySlotIndices = [];
    for (let i = 1; i <= 8; i++) {
      if (!occupiedSlots.has(i)) {
        emptySlotIndices.push(i);
      }
    }

    debugLogger.log('slots', `⭕ Empty Slot Indices: [${emptySlotIndices.join(', ')}]`, {
      emptyCount: emptySlotIndices.length,
      totalSlots: 8,
      occupancyRate: `${((occupiedSlots.size / 8) * 100).toFixed(1)}%`
    });

    this.ctx.save();

    // Draw highlights for empty slots
    let highlightCount = 0;
    positions.forEach((pos, index) => {
      const slotNumber = index + 1; // Map positions array index (0-7) to slot numbers (1-8)
      if (!occupiedSlots.has(slotNumber)) {
        highlightCount++;
        const x = pos.x - cardWidth / 2;
        const y = pos.y - cardHeight / 2;

        debugLogger.log('slots', `🎨 Drawing highlight for empty slot ${slotNumber} at (${x.toFixed(0)}, ${y.toFixed(0)})`, null);

        // Draw semi-transparent white fill over empty slots
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'; // Increased opacity to 0.25 for visibility
        this.ctx.fillRect(x, y, cardWidth, cardHeight);

        // Add a visible border for clarity
        this.ctx.strokeStyle = 'rgba(200, 200, 255, 0.4)'; // Light blue border for better visibility
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, cardWidth, cardHeight);
      }
    });

    debugLogger.log('slots', `✅ COMPLETE: Drew ${highlightCount} highlights (${emptySlotIndices.length} expected)`, {
      match: highlightCount === emptySlotIndices.length ? '✓ CORRECT' : '✗ MISMATCH'
    });

    this.ctx.restore();
  }

  /**
   * The Cancel Sage button on the game field
   * @param {Object} gameState - Current game state
   * @returns {Object|null} Button bounds for click detection, or null if not visible
   */
  drawCancelSageButton(gameState) {
    // Only draw for Hachi-Hachi mode when player has sage active
    if (gameState.gameType !== 'hachihachi' || !gameState.playerHasSageActive) {
      return null;
    }

    const buttonWidth = 120;
    const buttonHeight = 50;
    const padding = 20;

    // Position button in bottom-right area of game field
    const buttonX = this.displayWidth - buttonWidth - padding;
    const buttonY = this.displayHeight - buttonHeight - padding;

    this.ctx.save();

    // Draw button background
    this.ctx.fillStyle = 'rgba(220, 80, 80, 0.8)';
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Draw button border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Draw button text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Cancel Sage', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);

    this.ctx.restore();

    // Return button bounds for click detection
    return {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight
    };
  }
}
