/**
 * Card3DManager - Manages all Card3D instances and state synchronization
 */

import { Card3D } from './Card3D.js';
import { LayoutManager } from './LayoutManager.js';
import { debugLogger } from './DebugLogger.js';

export class Card3DManager {
  constructor(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.cards = new Map(); // cardId → Card3D
    this.zoneCards = {
      deck: new Set(),
      field: new Set(),
      playerHand: new Set(),
      opponentHand: new Set(),
      playerTrick: new Set(),
      opponentTrick: new Set()
    };

    this.layoutManager = new LayoutManager();
    this.lastUpdateTime = performance.now();

    // Dirty flags for optimization
    this.dirtyZones = new Set();
    this.renderQueueDirty = true;
    this.renderQueue = [];

    // Animation settings
    this.useAnimations = true;
  }

  /**
   * Update viewport dimensions (on window resize)
   */
  setViewportDimensions(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    // Mark all zones dirty to recalculate layouts
    Object.keys(this.zoneCards).forEach(zone => this.dirtyZones.add(zone));
  }

  /**
   * Enable or disable animations (affects layout centering)
   */
  setAnimationsEnabled(enabled) {
    if (this.useAnimations !== enabled) {
      this.useAnimations = enabled;
      // Mark all zones dirty to recalculate layouts
      Object.keys(this.zoneCards).forEach(zone => this.dirtyZones.add(zone));
    }
  }

  /**
   * Initialize all cards from game state
   */
  initializeFromGameState(gameState) {
    debugLogger.log('3dCards', '🎴 Initializing Card3D system from game state', null);

    // Clear existing
    this.cards.clear();
    Object.values(this.zoneCards).forEach(set => set.clear());

    // Gather all cards from game state
    const cardSources = [
      { cards: gameState.deck?.cards || [], zone: 'deck' },
      { cards: gameState.field || [], zone: 'field' },
      { cards: gameState.playerHand || [], zone: 'playerHand' },
      { cards: gameState.opponentHand || [], zone: 'opponentHand' },
      { cards: gameState.playerCaptured || [], zone: 'playerTrick' },
      { cards: gameState.opponentCaptured || [], zone: 'opponentTrick' }
    ];

    let totalCards = 0;
    cardSources.forEach(({ cards, zone }) => {
      cards.forEach((cardData, index) => {
        if (!this.cards.has(cardData.id)) {
          const card3D = new Card3D(cardData);
          // Assign grid slot for field cards to maintain fixed positions
          if (zone === 'field') {
            card3D.gridSlot = index;
          }
          this.cards.set(cardData.id, card3D);
          this.assignToZone(card3D, zone, false); // Don't animate initial placement
          totalCards++;
        }
      });
    });

    debugLogger.log('3dCards', `✅ Initialized ${totalCards} Card3D objects`, {
      deck: this.zoneCards.deck.size,
      field: this.zoneCards.field.size,
      playerHand: this.zoneCards.playerHand.size,
      opponentHand: this.zoneCards.opponentHand.size,
      playerTrick: this.zoneCards.playerTrick.size,
      opponentTrick: this.zoneCards.opponentTrick.size
    });

    // Initial layout for all zones
    Object.keys(this.zoneCards).forEach(zone => {
      this.relayoutZone(zone, false); // No animation for initial layout
    });
  }

  /**
   * Synchronize with game state (called after game logic changes)
   */
  synchronize(gameState) {
    // Build current zone mapping from game state
    const currentMapping = this.buildZoneMapping(gameState);

    // Detect cards that changed zones
    for (const [cardId, newZone] of currentMapping) {
      const card3D = this.cards.get(cardId);
      if (!card3D) {
        debugLogger.logAnimationWarning('Card not found in Card3D system', { cardId });
        continue;
      }

      if (card3D.homeZone !== newZone) {
        debugLogger.log('3dCards', `📦 Card ${card3D.cardData.name} moved: ${card3D.homeZone} → ${newZone}`, null);
        this.moveCardToZone(card3D, newZone);
      }
    }

    // Update layouts for dirty zones
    this.updateDirtyZones();
  }

  /**
   * Build mapping of cardId → zoneName from game state
   */
  buildZoneMapping(gameState) {
    const mapping = new Map();

    const addCards = (cards, zone) => {
      if (cards) {
        cards.forEach(card => mapping.set(card.id, zone));
      }
    };

    addCards(gameState.deck?.cards, 'deck');
    addCards(gameState.field, 'field');
    addCards(gameState.playerHand, 'playerHand');
    addCards(gameState.opponentHand, 'opponentHand');
    addCards(gameState.playerCaptured, 'playerTrick');
    addCards(gameState.opponentCaptured, 'opponentTrick');

    return mapping;
  }

  /**
   * Move a card to a new zone
   */
  moveCardToZone(card3D, newZone) {
    const oldZone = card3D.homeZone;

    // Remove from old zone
    if (oldZone) {
      this.zoneCards[oldZone].delete(card3D);
      this.dirtyZones.add(oldZone);
    }

    // If moving to field zone, assign next available grid slot
    if (newZone === 'field' && card3D.gridSlot === undefined) {
      card3D.gridSlot = this.getNextAvailableFieldSlot();
    }

    // Store previous zone for animation logic
    card3D.previousZone = oldZone;

    // Add to new zone
    this.zoneCards[newZone].add(card3D);
    card3D.homeZone = newZone;
    this.dirtyZones.add(newZone);

    // Mark render queue dirty
    this.renderQueueDirty = true;

    debugLogger.log('3dCards', `📦 Card zone change: ${oldZone} → ${newZone}`, {
      card: card3D.cardData.name,
      oldZone,
      newZone
    });
  }

  /**
   * Get next available grid slot for field (prioritizes top-left)
   */
  getNextAvailableFieldSlot() {
    const fieldCards = Array.from(this.zoneCards.field);
    const occupiedSlots = new Set(fieldCards.map(card => card.gridSlot).filter(slot => slot !== undefined));

    // Find first unoccupied slot (0-7, prioritizing top-left)
    for (let slot = 0; slot < 8; slot++) {
      if (!occupiedSlots.has(slot)) {
        return slot;
      }
    }

    // Fallback: return next sequential slot
    return fieldCards.length;
  }

  /**
   * Assign card to zone without animation (for initialization)
   */
  assignToZone(card3D, zone, animate = true) {
    card3D.homeZone = zone;
    this.zoneCards[zone].add(card3D);
    this.dirtyZones.add(zone);
    this.renderQueueDirty = true;

    if (!animate) {
      // Get zone config
      const config = LayoutManager.getZoneConfig(zone, this.viewportWidth, this.viewportHeight, this.useAnimations);

      // Set initial face state
      if (config.faceUp !== undefined) {
        card3D.faceUp = config.faceUp;
        card3D.targetFaceUp = config.faceUp;
      }

      // Set render layer
      if (config.renderLayer !== undefined) {
        card3D.renderLayer = config.renderLayer;
      }
    }
  }

  /**
   * Recalculate layout for a zone and update card home positions
   */
  relayoutZone(zone, animate = true) {
    const zoneSet = this.zoneCards[zone];
    if (!zoneSet || zoneSet.size === 0) return;

    // Get zone configuration
    const config = LayoutManager.getZoneConfig(zone, this.viewportWidth, this.viewportHeight, this.useAnimations);

    // Convert set to array for layout calculation
    const cards = Array.from(zoneSet);

    // Calculate positions
    const positions = this.layoutManager.layout(cards, config, this.useAnimations);

    // Update each card's home position
    cards.forEach((card3D, i) => {
      const pos = positions[i];
      card3D.homePosition = { x: pos.x, y: pos.y, z: pos.z };
      card3D.homeIndex = pos.index;

      // Update render layer
      if (config.renderLayer !== undefined) {
        card3D.renderLayer = config.renderLayer;
      }

      // Update face state
      if (config.faceUp !== undefined) {
        card3D.targetFaceUp = config.faceUp;

        // If moving from deck to field/trick, flip face up during animation
        if (card3D.previousZone === 'deck' && config.faceUp === 1 && animate) {
          // Set target face up immediately so flip starts
          card3D.setFaceUp(1);
          // Clear previous zone tracking after using it
          card3D.previousZone = null;
        }
      }

      // Trigger animation if needed
      if (animate) {
        if (card3D.animationMode === 'idle') {
          // Use tween for smooth, deterministic animation
          const duration = this.getAnimationDuration(card3D, pos);
          card3D.tweenTo(
            { x: pos.x, y: pos.y, z: pos.z },
            duration,
            'easeInOutCubic'
          );
        }
        // If card is already animating (tween or spring), let it continue
      } else {
        // Snap to home immediately (for initialization)
        card3D.snapToHome();
      }
    });

    this.renderQueueDirty = true;
  }

  /**
   * Calculate animation duration based on distance
   */
  getAnimationDuration(card3D, targetPos) {
    const dx = targetPos.x - card3D.x;
    const dy = targetPos.y - card3D.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Base duration: 300-800ms depending on distance
    const minDuration = 300;
    const maxDuration = 800;
    const maxDistance = 1000; // pixels

    const normalizedDistance = Math.min(distance / maxDistance, 1);
    return minDuration + (normalizedDistance * (maxDuration - minDuration));
  }

  /**
   * Update layouts for all dirty zones
   */
  updateDirtyZones() {
    if (this.dirtyZones.size === 0) return;

    this.dirtyZones.forEach(zone => {
      this.relayoutZone(zone, this.useAnimations);
    });

    this.dirtyZones.clear();
  }

  /**
   * Update all cards (physics, animations)
   */
  update(currentTime = performance.now()) {
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    // Clamp delta time to prevent large jumps
    const clampedDeltaTime = Math.min(deltaTime, 0.1);

    // Update all cards
    this.cards.forEach(card => {
      card.update(clampedDeltaTime);
    });

    // Update screen bounds for visible cards
    this.updateScreenBounds();
  }

  /**
   * Update screen-space bounding boxes for all cards
   */
  updateScreenBounds() {
    const cardWidth = this.layoutManager.cardWidth;
    const cardHeight = this.layoutManager.cardHeight;

    this.cards.forEach(card => {
      const scale = card.getScale();
      const w = cardWidth * scale;
      const h = cardHeight * scale;

      // Simple AABB (ignoring rotation for now)
      card.screenAABB = {
        minX: card.x - w / 2,
        minY: card.y - h / 2,
        maxX: card.x + w / 2,
        maxY: card.y + h / 2
      };

      // Check if visible in viewport
      card.isVisible = !(
        card.screenAABB.maxX < 0 ||
        card.screenAABB.minX > this.viewportWidth ||
        card.screenAABB.maxY < 0 ||
        card.screenAABB.minY > this.viewportHeight
      );
    });
  }

  /**
   * Get all visible cards, sorted by Z position (for rendering)
   */
  getVisibleCards() {
    if (this.renderQueueDirty) {
      this.renderQueue = Array.from(this.cards.values())
        .filter(card => card.isVisible);
      this.renderQueueDirty = true; // Keep dirty to force sort
    }

    // Sort by render layer first, then Z position
    this.renderQueue.sort((a, b) => {
      if (a.renderLayer !== b.renderLayer) {
        return a.renderLayer - b.renderLayer;
      }
      return a.z - b.z;
    });

    return this.renderQueue;
  }

  /**
   * Get card at screen position (for input handling)
   */
  getCardAtPosition(screenX, screenY) {
    // Check cards in reverse order (top to bottom)
    const visibleCards = this.getVisibleCards().reverse();

    for (const card of visibleCards) {
      if (this.pointInAABB(screenX, screenY, card.screenAABB)) {
        return card;
      }
    }

    return null;
  }

  /**
   * Point in AABB test
   */
  pointInAABB(x, y, aabb) {
    return x >= aabb.minX && x <= aabb.maxX &&
           y >= aabb.minY && y <= aabb.maxY;
  }

  /**
   * Get card by game card data
   */
  getCard(cardData) {
    return this.cards.get(cardData.id);
  }

  /**
   * Get all cards in a zone
   */
  getCardsInZone(zone) {
    return Array.from(this.zoneCards[zone] || []);
  }

  /**
   * Check if any cards are animating
   */
  isAnyAnimating() {
    for (const card of this.cards.values()) {
      if (card.isAnimating()) return true;
    }
    return false;
  }

  /**
   * Clear all cards
   */
  clear() {
    this.cards.clear();
    Object.values(this.zoneCards).forEach(set => set.clear());
    this.dirtyZones.clear();
    this.renderQueue = [];
  }
}
