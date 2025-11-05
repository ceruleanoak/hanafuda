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
        z: 0,
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
   */
  static getZoneConfig(zoneName, viewportWidth, viewportHeight, useAnimations = true) {
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const margin = 30;

    const configs = {
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
        anchorPoint: { x: 100, y: centerY },
        centerX: centerX,
        spacing: 115,
        maxPerRow: 8,
        useFixedPositions: true,
        faceUp: 1,
        renderLayer: 3
      },

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
        position: { x: viewportWidth - 150, y: viewportHeight - 170 },
        fanOffset: { x: 8, y: 8, z: 2 },
        maxVisible: 5,
        faceUp: 1,
        renderLayer: 2
      },

      opponentTrick: {
        type: 'fan',
        position: { x: viewportWidth - 150, y: 40 },
        fanOffset: { x: 8, y: 8, z: 2 },
        maxVisible: 5,
        faceUp: 1,
        renderLayer: 2
      }
    };

    return configs[zoneName] || configs.field;
  }
}
