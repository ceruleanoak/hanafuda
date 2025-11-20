/**
 * LayoutManager - Calculates card positions for different zones
 * Uses fixed anchor points for predictable animations
 */

// Offset for header height (50px to account for the game header covering the game area)
const HEADER_OFFSET = 50;

export class LayoutManager {
  constructor(cardWidth = 100, cardHeight = 140) {
    this.cardWidth = cardWidth;
    this.cardHeight = cardHeight;
    this.scaleFactor = 1.0;
  }

  /**
   * Update card dimensions and calculate scaled spacing
   * @param {number} cardWidth - Card width in pixels
   * @param {number} cardHeight - Card height in pixels
   * @param {number} scaleFactor - Scale factor (1.0 = 100%)
   */
  updateCardDimensions(cardWidth, cardHeight, scaleFactor = 1.0) {
    this.cardWidth = cardWidth;
    this.cardHeight = cardHeight;
    this.scaleFactor = scaleFactor;
  }

  /**
   * Get scaled spacing value
   * @param {number} baseSpacing - Base spacing at 100% scale
   * @returns {number} Scaled spacing
   */
  getScaledSpacing(baseSpacing) {
    return Math.floor(baseSpacing * this.scaleFactor);
  }

  /**
   * Calculate positions for all cards in a zone
   * @param {Array} cards - Cards to layout
   * @param {Object} zoneConfig - Configuration for the zone
   * @param {boolean} useAnimations - Whether animations are enabled (affects centering)
   * @returns {Array} Array of {x, y, z, index} positions
   */
  layout(cards, zoneConfig, useAnimations = true) {
    if (cards.length === 0) return [];

    switch (zoneConfig.type) {
      case 'stack':
        return this.layoutStack(cards, zoneConfig);
      case 'row':
        return this.layoutRow(cards, zoneConfig, useAnimations);
      case 'grid':
        return this.layoutGrid(cards, zoneConfig, useAnimations);
      case 'fan':
        return this.layoutFan(cards, zoneConfig);
      case 'arc':
        return this.layoutArc(cards, zoneConfig, useAnimations);
      default:
        return this.layoutRow(cards, zoneConfig, useAnimations);
    }
  }

  /**
   * Stack layout - cards stacked on top of each other with slight offset
   */
  layoutStack(cards, config) {
    const { position, offset = { x: 0.5, y: 0.5, z: 0.2 } } = config;

    return cards.map((card, i) => ({
      x: position.x + (i * offset.x),
      y: position.y + (i * offset.y),
      z: i * offset.z,
      index: i
    }));
  }

  /**
   * Row layout - cards in a horizontal row
   */
  layoutRow(cards, config, useAnimations) {
    const baseSpacing = config.spacing !== undefined ? config.spacing : 115;
    const spacing = this.getScaledSpacing(baseSpacing);
    const { anchorPoint, centerX } = config;

    // Always center the layout for consistent positioning
    const totalWidth = cards.length * spacing;
    const startX = (centerX || anchorPoint.x) - totalWidth / 2;
    const y = anchorPoint.y;

    return cards.map((card, i) => ({
      x: startX + (i * spacing),
      y: y,
      z: 0,
      index: i
    }));
  }

  /**
   * Grid layout - cards in rows and columns
   */
  layoutGrid(cards, config, useAnimations) {
    const baseSpacing = config.spacing !== undefined ? config.spacing : 115;
    const baseRowSpacing = config.rowSpacing !== undefined ? config.rowSpacing : 160;
    const spacing = this.getScaledSpacing(baseSpacing);
    const rowSpacing = this.getScaledSpacing(baseRowSpacing);
    const { anchorPoint, maxPerRow = 8, useFixedPositions = false } = config;

    let startX;
    if (useFixedPositions) {
      // Always use fixed grid positions (8 slots) - consistent regardless of animation state
      const totalWidth = maxPerRow * spacing;
      startX = (config.centerX || anchorPoint.x) - totalWidth / 2;
    } else {
      // Center based on actual card count in first row
      const firstRowCount = Math.min(cards.length, maxPerRow);
      const totalWidth = firstRowCount * spacing;
      startX = (config.centerX || anchorPoint.x) - totalWidth / 2;
    }

    const startY = anchorPoint.y;

    return cards.map((card, i) => {
      // If using fixed positions, use the card's gridSlot if available
      const slotIndex = (useFixedPositions && card.gridSlot !== undefined) ? card.gridSlot : i;
      const row = Math.floor(slotIndex / maxPerRow);
      const col = slotIndex % maxPerRow;

      return {
        x: startX + (col * spacing),
        y: startY + (row * rowSpacing),
        z: row * 0.5, // Each row gets slightly higher z to prevent overlap
        index: slotIndex
      };
    });
  }

  /**
   * Fan layout - cards fanned out with offset
   */
  layoutFan(cards, config) {
    const { position, fanOffset = { x: 8, y: 8, z: 2 }, maxVisible = 5 } = config;

    // Only show last N cards
    const startIndex = Math.max(0, cards.length - maxVisible);
    const visibleCards = cards.slice(startIndex);

    return cards.map((card, i) => {
      if (i < startIndex) {
        // Hidden cards at bottom of stack
        return {
          x: position.x,
          y: position.y,
          z: i * 0.1,
          index: i
        };
      } else {
        // Visible cards fanned out
        const visibleIndex = i - startIndex;
        return {
          x: position.x + (visibleIndex * fanOffset.x),
          y: position.y + (visibleIndex * fanOffset.y),
          z: visibleIndex * fanOffset.z,
          index: i
        };
      }
    });
  }

  /**
   * Arc layout - cards arranged in a gentle arc
   */
  layoutArc(cards, config, useAnimations) {
    const {
      anchorPoint,
      arcRadius = 800,
      arcSpan = 800,
      spacing = 100,
      centerX
    } = config;

    if (cards.length === 0) return [];

    // Calculate arc parameters
    const totalArcLength = (cards.length - 1) * spacing;
    const angleSpan = totalArcLength / arcRadius; // radians

    // Always center the arc for consistent positioning
    const startX = (centerX || anchorPoint.x) - arcSpan / 2;
    const startY = anchorPoint.y;

    return cards.map((card, i) => {
      // Calculate angle for this card
      const t = cards.length === 1 ? 0.5 : i / (cards.length - 1);
      const angle = -angleSpan / 2 + (angleSpan * t);

      // Calculate position on arc
      const arcX = startX + (i * spacing);
      const arcY = startY - (arcRadius - arcRadius * Math.cos(angle));

      return {
        x: arcX,
        y: arcY,
        z: 0,
        index: i
      };
    });
  }

  /**
   * Get zone configuration for a given zone name and viewport dimensions
   * Supports N-player layouts (2, 3, or 4 players)
   *
   * @param {string} zoneName - Zone name (e.g., 'player0Hand', 'field', 'playerTrick')
   * @param {number} viewportWidth - Viewport width
   * @param {number} viewportHeight - Viewport height
   * @param {number} playerCount - Number of players (2, 3, or 4)
   * @param {boolean} useAnimations - Whether animations are enabled (default: true)
   * @returns {Object} Zone configuration object
   */
  static getZoneConfig(zoneName, viewportWidth, viewportHeight, playerCount = 2, useAnimations = true) {
    // Validate inputs
    if (typeof zoneName !== 'string') {
      console.error(`Invalid zoneName: ${zoneName} (expected string)`);
      return {};
    }
    if (![2, 3, 4].includes(playerCount)) {
      console.warn(`Invalid playerCount: ${playerCount}, defaulting to 2`);
      playerCount = 2;
    }

    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const margin = 30;

    // Calculate dynamic spacing based on viewport width
    // For mobile, cards need to overlap more to fit on screen
    // Base spacing at 1920px is 115 (for 100px wide cards)
    // Dynamic spacing ensures 8 cards fit in hand, 9 cards fit in field row
    const CARDS_IN_HAND = 8;
    const CARDS_IN_FIELD = 9;
    const HORIZONTAL_MARGIN = 20;

    // Calculate spacing to fit cards on screen
    const handSpacing = Math.min(115, (viewportWidth - HORIZONTAL_MARGIN) / CARDS_IN_HAND);
    const fieldSpacing = Math.min(115, (viewportWidth - HORIZONTAL_MARGIN) / CARDS_IN_FIELD);

    // Calculate row spacing based on viewport height (for field grid)
    // Need to fit: opponent hand, 2 field rows, player hand
    const verticalSections = 4;
    const rowSpacing = Math.min(180, (viewportHeight - 100) / verticalSections);

    // Detect if we're on a mobile device (small viewport)
    const isMobile = viewportWidth <= 768 || viewportHeight <= 500;

    // Footer height to account for on mobile (footer is fixed at bottom)
    const footerHeight = isMobile ? 50 : 0;

    // Calculate vertical margins - move hands closer to center on small screens
    // Use proportional positioning based on available space
    const availableHeight = viewportHeight - footerHeight;
    const topMargin = isMobile ? Math.max(20, availableHeight * 0.08) : 40;
    const bottomMargin = isMobile ? Math.max(60, availableHeight * 0.15) : 170;

    // Base configs shared across all modes
    const baseConfigs = {
      drawnCard: {
        type: 'stack',
        position: { x: centerX, y: 90 + HEADER_OFFSET }, // Center-top of screen
        offset: { x: 0, y: 0, z: 0 },
        faceUp: 1,
        renderLayer: 6 // Above everything else to show prominently
      },

      opponentPlayedCard: {
        type: 'stack',
        position: { x: centerX, y: 120 + HEADER_OFFSET }, // Center-top of screen, below drawnCard
        offset: { x: 0, y: 0, z: 0 },
        faceUp: 1,
        renderLayer: 5 // Below drawnCard but above most other elements
      },

      field: {
        type: 'grid',
        // Center field vertically between player hand (viewportHeight - 170) and opponent hand (40)
        anchorPoint: { x: 100, y: (viewportHeight - 130) / 2 + HEADER_OFFSET },
        centerX: centerX,
        spacing: fieldSpacing,
        maxPerRow: 9,
        rowSpacing: rowSpacing,
        useFixedPositions: true,
        faceUp: 1,
        renderLayer: 3
      }
    };

    // Generate configs based on player count
    // Uses unified indexed naming for all player counts
    const getPlayerHandConfigs = () => {
      if (playerCount === 2) {
        // 2-Player Layout: P0 bottom, P1 top (uses indexed names for consistency)
        // Calculate vertical positions - move hands closer to center on mobile
        const playerHandY = viewportHeight - bottomMargin + HEADER_OFFSET;
        const opponentHandY = topMargin + HEADER_OFFSET;

        return {
          player0Hand: {
            type: 'row',
            anchorPoint: { x: 50, y: playerHandY },
            centerX: centerX,
            spacing: handSpacing,
            maxCards: 8,
            faceUp: 1,
            renderLayer: 5,
            hoverLift: 20
          },
          player1Hand: {
            type: 'row',
            anchorPoint: { x: 50, y: opponentHandY },
            centerX: centerX,
            spacing: handSpacing,
            maxCards: 8,
            faceUp: 0,
            renderLayer: 5
          },
          player0Trick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: viewportHeight - 170 + HEADER_OFFSET },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 1,
            renderLayer: 2
          },
          player1Trick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: 40 + HEADER_OFFSET },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 1,
            renderLayer: 2
          }
        };
      } else if (playerCount === 3) {
        // 3-Player Layout: P0 bottom, P1 top-left, P2 top-right
        const playerHandY = viewportHeight - bottomMargin + HEADER_OFFSET;

        return {
          player0Hand: {
            type: 'row',
            anchorPoint: { x: 50, y: playerHandY },
            centerX: centerX,
            spacing: handSpacing,
            maxCards: 7,
            faceUp: 1,
            renderLayer: 5,
            hoverLift: 20
          },
          player1Hand: {
            type: 'fan',
            position: { x: 150, y: 100 + HEADER_OFFSET },
            fanOffset: { x: 8, y: -8, z: 2 },
            maxVisible: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player2Hand: {
            type: 'fan',
            position: { x: viewportWidth - 150, y: 100 + HEADER_OFFSET },
            fanOffset: { x: -8, y: -8, z: 2 },
            maxVisible: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player0Trick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: viewportHeight - 170 + HEADER_OFFSET },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 1,
            renderLayer: 2
          },
          player1Trick: {
            type: 'fan',
            position: { x: margin + 50, y: 150 + HEADER_OFFSET },
            fanOffset: { x: 8, y: -8, z: 2 },
            maxVisible: 4,
            faceUp: 1,
            renderLayer: 2
          },
          player2Trick: {
            type: 'fan',
            position: { x: viewportWidth - margin - 50, y: 150 + HEADER_OFFSET },
            fanOffset: { x: -8, y: -8, z: 2 },
            maxVisible: 4,
            faceUp: 1,
            renderLayer: 2
          }
        };
      } else if (playerCount === 4) {
        // 4-Player Layout: You (bottom-center), Opponent1 (left-center), Opponent2 (top-center), Opponent3 (right-center)
        // Trick piles in four corners: You (bottom-right), Opponent1 (bottom-left), Opponent2 (top-left), Opponent3 (top-right)
        // Deck integrated into field grid at position 0
        const playerHandY = viewportHeight - bottomMargin + HEADER_OFFSET;
        const opponentHandY = topMargin + HEADER_OFFSET;

        return {
          player0Hand: {
            type: 'row',
            anchorPoint: { x: 50, y: playerHandY },
            centerX: centerX,
            spacing: handSpacing,
            maxCards: 5,
            faceUp: 1,
            renderLayer: 5,
            hoverLift: 20
          },
          player1Hand: {
            type: 'fan',
            position: { x: 80, y: centerY + HEADER_OFFSET },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player2Hand: {
            type: 'row',
            anchorPoint: { x: 50, y: opponentHandY },
            centerX: centerX,
            spacing: handSpacing,
            maxCards: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player3Hand: {
            type: 'fan',
            position: { x: viewportWidth - 80, y: centerY + HEADER_OFFSET },
            fanOffset: { x: -8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player0Trick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: viewportHeight - 170 + HEADER_OFFSET },
            fanOffset: { x: -8, y: -8, z: 2 },
            maxVisible: 6,
            faceUp: 1,
            renderLayer: 2
          },
          player1Trick: {
            type: 'fan',
            position: { x: margin + 50, y: viewportHeight - 170 + HEADER_OFFSET },
            fanOffset: { x: 8, y: -8, z: 2 },
            maxVisible: 6,
            faceUp: 1,
            renderLayer: 2
          },
          player2Trick: {
            type: 'fan',
            position: { x: margin + 50, y: 80 + HEADER_OFFSET },
            fanOffset: { x: -8, y: 8, z: 2 },
            maxVisible: 6,
            faceUp: 1,
            renderLayer: 2
          },
          player3Trick: {
            type: 'fan',
            position: { x: viewportWidth - margin - 50, y: 80 + HEADER_OFFSET },
            fanOffset: { x: -8, y: 8, z: 2 },
            maxVisible: 6,
            faceUp: 1,
            renderLayer: 2
          }
        };
      }
    };

    const handConfigs = getPlayerHandConfigs();
    const allConfigs = { ...baseConfigs, ...handConfigs };

    // Return specific zone config
    if (!allConfigs[zoneName]) {
      console.error(`Zone config not found: ${zoneName}. Available: ${Object.keys(allConfigs).join(', ')}`);
      // Return a default row config as fallback
      return {
        type: 'row',
        anchorPoint: { x: 50, y: centerY },
        centerX: centerX,
        spacing: 115,
        faceUp: 1,
        renderLayer: 5
      };
    }
    return allConfigs[zoneName];
  }

  /**
   * Helper: Get all zone names for a given player count
   * Uses unified indexed naming for all player counts
   */
  static getZoneNamesForPlayerCount(playerCount) {
    const baseZones = ['deck', 'drawnCard', 'field'];
    const playerZones = [];

    // Add indexed zone names for all players
    for (let i = 0; i < playerCount; i++) {
      playerZones.push(`player${i}Hand`);
      playerZones.push(`player${i}Trick`);
    }

    return [...baseZones, ...playerZones];
  }

  /**
   * Helper: Convert 2-player zone names to N-player names
   * playerHand → player0Hand, opponentHand → player1Hand, etc.
   */
  static getZoneName(zoneOrIndex, playerIndex = null) {
    if (typeof zoneOrIndex === 'number') {
      // Called with playerIndex only - return hand and trick zones
      return [`player${zoneOrIndex}Hand`, `player${zoneOrIndex}Trick`];
    }

    // Legacy zone name conversion
    const legacyMap = {
      'playerHand': 'player0Hand',
      'opponentHand': 'player1Hand',
      'playerTrick': 'player0Trick',
      'opponentTrick': 'player1Trick'
    };

    return legacyMap[zoneOrIndex] || zoneOrIndex;
  }
}
