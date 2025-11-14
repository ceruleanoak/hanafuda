/**
 * LayoutManager - Calculates card positions for different zones
 * Uses fixed anchor points for predictable animations
 */

export class LayoutManager {
  constructor(cardWidth = 100, cardHeight = 140) {
    this.cardWidth = cardWidth;
    this.cardHeight = cardHeight;
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
    const { anchorPoint, spacing = 115, centerX } = config;

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
    const { anchorPoint, spacing = 115, maxPerRow = 8, rowSpacing = 160, useFixedPositions = false } = config;

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
   * @param {string|number} zoneOrPlayerCount - Zone name (string) OR playerCount for batch initialization
   * @param {number} viewportWidth - Viewport width
   * @param {number} viewportHeight - Viewport height
   * @param {boolean|number} useAnimationsOrPlayerCount - useAnimations flag OR playerCount
   * @returns {Object|Map} Single zone config or all zone configs for player count
   */
  static getZoneConfig(zoneOrPlayerCount, viewportWidth, viewportHeight, useAnimationsOrPlayerCount = true) {
    // Handle new signature: getZoneConfig(zoneName, width, height, playerCount, useAnimations)
    // Detect if called with playerCount as 3rd or 4th parameter
    let zoneName = zoneOrPlayerCount;
    let playerCount = 2; // Default
    let useAnimations = useAnimationsOrPlayerCount === true ? true : (typeof useAnimationsOrPlayerCount === 'boolean' ? useAnimationsOrPlayerCount : true);

    // If zoneOrPlayerCount is a number, it's a playerCount request
    if (typeof zoneOrPlayerCount === 'number' && zoneOrPlayerCount !== viewportWidth) {
      playerCount = zoneOrPlayerCount;
      zoneName = null; // Will return all configs
    } else if (typeof viewportHeight === 'number' && typeof useAnimationsOrPlayerCount === 'number') {
      // Called as getZoneConfig(zoneName, width, height, playerCount)
      playerCount = useAnimationsOrPlayerCount;
      useAnimations = true;
    }

    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const margin = 30;

    // Base configs shared across all modes
    const baseConfigs = {
      deck: {
        type: 'stack',
        position: { x: margin + 50, y: centerY },
        offset: { x: 0.5, y: 0.5, z: 0.2 },
        faceUp: 0,
        renderLayer: 1
      },

      drawnCard: {
        type: 'stack',
        position: { x: centerX, y: 90 }, // Center-top of screen
        offset: { x: 0, y: 0, z: 0 },
        faceUp: 1,
        renderLayer: 6 // Above everything else to show prominently
      },

      field: {
        type: 'grid',
        // Center field vertically between player hand (viewportHeight - 170) and opponent hand (40)
        anchorPoint: { x: 100, y: (viewportHeight - 130) / 2 },
        centerX: centerX,
        spacing: 115,
        maxPerRow: 8,
        rowSpacing: 180, // Increased from default 160 to prevent overlap (card height is 140)
        useFixedPositions: true,
        faceUp: 1,
        renderLayer: 3
      }
    };

    // Generate configs based on player count
    const getPlayerHandConfigs = () => {
      if (playerCount === 2) {
        return {
          playerHand: {
            type: 'row',
            anchorPoint: { x: 50, y: viewportHeight - 170 },
            centerX: centerX,
            spacing: 115,
            maxCards: 8,
            faceUp: 1,
            renderLayer: 5,
            hoverLift: 20
          },
          opponentHand: {
            type: 'row',
            anchorPoint: { x: 50, y: 40 },
            centerX: centerX,
            spacing: 115,
            maxCards: 8,
            faceUp: 0,
            renderLayer: 5
          },
          playerTrick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: viewportHeight - 170 },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 1,
            renderLayer: 2
          },
          opponentTrick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: 40 },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 1,
            renderLayer: 2
          }
        };
      } else if (playerCount === 3) {
        // 3-Player Layout: P0 bottom, P1 top-left, P2 top-right
        return {
          player0Hand: {
            type: 'row',
            anchorPoint: { x: 50, y: viewportHeight - 170 },
            centerX: centerX,
            spacing: 115,
            maxCards: 7,
            faceUp: 1,
            renderLayer: 5,
            hoverLift: 20
          },
          player1Hand: {
            type: 'fan',
            position: { x: 150, y: 100 },
            fanOffset: { x: 8, y: -8, z: 2 },
            maxVisible: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player2Hand: {
            type: 'fan',
            position: { x: viewportWidth - 150, y: 100 },
            fanOffset: { x: -8, y: -8, z: 2 },
            maxVisible: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player0Trick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: viewportHeight - 170 },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 1,
            renderLayer: 2
          },
          player1Trick: {
            type: 'fan',
            position: { x: margin + 50, y: 150 },
            fanOffset: { x: 8, y: -8, z: 2 },
            maxVisible: 4,
            faceUp: 1,
            renderLayer: 2
          },
          player2Trick: {
            type: 'fan',
            position: { x: viewportWidth - margin - 50, y: 150 },
            fanOffset: { x: -8, y: -8, z: 2 },
            maxVisible: 4,
            faceUp: 1,
            renderLayer: 2
          }
        };
      } else if (playerCount === 4) {
        // 4-Player Layout: P0 bottom, P1 left, P2 top, P3 right (table-clockwise)
        return {
          player0Hand: {
            type: 'row',
            anchorPoint: { x: 50, y: viewportHeight - 170 },
            centerX: centerX,
            spacing: 115,
            maxCards: 5,
            faceUp: 1,
            renderLayer: 5,
            hoverLift: 20
          },
          player1Hand: {
            type: 'fan',
            position: { x: 80, y: centerY },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player2Hand: {
            type: 'row',
            anchorPoint: { x: 50, y: 100 },
            centerX: centerX,
            spacing: 115,
            maxCards: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player3Hand: {
            type: 'fan',
            position: { x: viewportWidth - 80, y: centerY },
            fanOffset: { x: -8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 0,
            renderLayer: 5
          },
          player0Trick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: viewportHeight - 170 },
            fanOffset: { x: 8, y: 8, z: 2 },
            maxVisible: 5,
            faceUp: 1,
            renderLayer: 2
          },
          player1Trick: {
            type: 'fan',
            position: { x: 80, y: viewportHeight - 100 },
            fanOffset: { x: 8, y: -8, z: 2 },
            maxVisible: 4,
            faceUp: 1,
            renderLayer: 2
          },
          player2Trick: {
            type: 'fan',
            position: { x: viewportWidth - 162, y: 80 },
            fanOffset: { x: -8, y: 8, z: 2 },
            maxVisible: 4,
            faceUp: 1,
            renderLayer: 2
          },
          player3Trick: {
            type: 'fan',
            position: { x: viewportWidth - 80, y: viewportHeight - 100 },
            fanOffset: { x: -8, y: -8, z: 2 },
            maxVisible: 4,
            faceUp: 1,
            renderLayer: 2
          }
        };
      }
    };

    const handConfigs = getPlayerHandConfigs();
    const allConfigs = { ...baseConfigs, ...handConfigs };

    // Return specific zone or all configs
    return allConfigs[zoneName] || allConfigs;
  }

  /**
   * Helper: Get all zone names for a given player count
   */
  static getZoneNamesForPlayerCount(playerCount) {
    const baseZones = ['deck', 'drawnCard', 'field'];

    if (playerCount === 2) {
      return [...baseZones, 'playerHand', 'opponentHand', 'playerTrick', 'opponentTrick'];
    } else if (playerCount === 3) {
      return [...baseZones, 'player0Hand', 'player1Hand', 'player2Hand', 'player0Trick', 'player1Trick', 'player2Trick'];
    } else if (playerCount === 4) {
      return [...baseZones, 'player0Hand', 'player1Hand', 'player2Hand', 'player3Hand', 'player0Trick', 'player1Trick', 'player2Trick', 'player3Trick'];
    }

    return baseZones;
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
