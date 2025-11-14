/**
 * Card3DManager - Manages all Card3D instances and state synchronization
 */

import { Card3D } from './Card3D.js';
import { LayoutManager } from './LayoutManager.js';
import { debugLogger } from './DebugLogger.js';

export class Card3DManager {
  constructor(viewportWidth, viewportHeight, playerCount = 2) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.playerCount = playerCount; // Track player count for dynamic zone setup

    this.cards = new Map(); // cardId → Card3D

    // Initialize zones based on player count
    this.zoneCards = this.initializeZones(playerCount);

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
   * Initialize zone structure based on player count
   * Uses unified indexed naming: player0Hand, player1Hand, etc. for all player counts
   */
  initializeZones(playerCount) {
    const zones = {
      deck: new Set(),
      drawnCard: new Set(),
      field: new Set()
    };

    // Use indexed names for ALL player counts (2, 3, or 4)
    for (let i = 0; i < playerCount; i++) {
      zones[`player${i}Hand`] = new Set();
      zones[`player${i}Trick`] = new Set();
    }

    return zones;
  }

  /**
   * Update player count and reinitialize zones
   */
  setPlayerCount(playerCount) {
    if (this.playerCount !== playerCount) {
      this.playerCount = playerCount;
      // Clear and reinitialize zones
      Object.values(this.zoneCards).forEach(set => set.clear());
      this.zoneCards = this.initializeZones(playerCount);
      // Mark all zones dirty
      Object.keys(this.zoneCards).forEach(zone => this.dirtyZones.add(zone));
    }
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
   * Uses unified indexed zone naming (player0Hand, player1Hand, etc.) for all player counts
   */
  initializeFromGameState(gameState, isNewGame = false) {
    debugLogger.log('3dCards', '🎴 Initializing Card3D system from game state', null);

    // Detect and set player count if using N-player format
    if (gameState.players && Array.isArray(gameState.players)) {
      this.setPlayerCount(gameState.players.length);
    }

    // Clear existing
    this.cards.clear();
    Object.values(this.zoneCards).forEach(set => set.clear());

    // Build card sources using unified indexed naming
    let cardSources = [];

    cardSources.push({ cards: gameState.deck?.cards || [], zone: 'deck' });
    cardSources.push({ cards: gameState.field || [], zone: 'field' });

    // Use indexed player format for all player counts
    if (gameState.players && Array.isArray(gameState.players)) {
      // Players array available (primary source)
      gameState.players.forEach((player, index) => {
        cardSources.push({ cards: player.hand || [], zone: `player${index}Hand` });
        cardSources.push({ cards: player.captured || [], zone: `player${index}Trick` });
      });
    } else {
      // Legacy 2-player format fallback - convert to indexed names
      const players = [
        { hand: gameState.playerHand || [], captured: gameState.playerCaptured || [] },
        { hand: gameState.opponentHand || [], captured: gameState.opponentCaptured || [] }
      ];
      players.forEach((player, index) => {
        cardSources.push({ cards: player.hand, zone: `player${index}Hand` });
        cardSources.push({ cards: player.captured, zone: `player${index}Trick` });
      });
    }

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

    // Build debug log info based on format
    const debugInfo = {
      deck: this.zoneCards.deck?.size || 0,
      field: this.zoneCards.field?.size || 0
    };

    if (this.playerCount === 2) {
      debugInfo.playerHand = this.zoneCards.playerHand?.size || 0;
      debugInfo.opponentHand = this.zoneCards.opponentHand?.size || 0;
      debugInfo.playerTrick = this.zoneCards.playerTrick?.size || 0;
      debugInfo.opponentTrick = this.zoneCards.opponentTrick?.size || 0;
    } else {
      for (let i = 0; i < this.playerCount; i++) {
        debugInfo[`player${i}Hand`] = this.zoneCards[`player${i}Hand`]?.size || 0;
        debugInfo[`player${i}Trick`] = this.zoneCards[`player${i}Trick`]?.size || 0;
      }
    }

    debugLogger.log('3dCards', `✅ Initialized ${totalCards} Card3D objects`, debugInfo);

    // Initial layout for all zones
    Object.keys(this.zoneCards).forEach(zone => {
      // For new games with animations enabled, use Toss Across animation for field cards
      const shouldAnimateField = isNewGame && this.useAnimations && zone === 'field';
      this.relayoutZone(zone, false); // No animation for initial layout

      // Apply Toss Across animation to field cards after initial layout
      if (shouldAnimateField) {
        this.applyTossAcrossAnimation();
      }
    });
  }

  /**
   * Apply Toss Across animation to field cards
   * @param {boolean} endFaceUp - Whether cards should end face up (default: true for Koi Koi, false for Match Game)
   */
  applyTossAcrossAnimation(endFaceUp = true) {
    const fieldCards = Array.from(this.zoneCards.field);
    if (fieldCards.length === 0) return;

    debugLogger.log('3dCards', '🎬 Applying Toss Across animation to field cards', { endFaceUp });

    // Toss Across animation preset parameters
    const duration = 1350;
    const easing = 'easeOutCubic';
    const flipTiming = 0.5;
    const peakScale = 0;
    const rotationVariance = 20 * Math.PI / 180; // 20 degrees
    const positionXVariance = 30; // Reduced from 60 to 30 (half)
    const positionYVariance = 5;

    // Starting position: draw pile location (deck position)
    const margin = 30;
    const startX = margin + 50; // Deck x position (80)
    const startY = this.viewportHeight / 2; // Deck y position (centerY)
    const startZ = 0;

    fieldCards.forEach((card3D) => {
      // Store the target position (already set by relayoutZone)
      const targetX = card3D.homePosition.x;
      const targetY = card3D.homePosition.y;
      const targetZ = card3D.homePosition.z;

      // Apply variance to target position and rotation
      const variantX = targetX + (Math.random() * 2 - 1) * positionXVariance;
      const variantY = targetY + (Math.random() * 2 - 1) * positionYVariance;
      const variantRotation = (Math.random() * 2 - 1) * rotationVariance;

      // Set card to starting position
      card3D.x = startX;
      card3D.y = startY;
      card3D.z = startZ;
      card3D.rotation = 0;
      card3D.faceUp = 0; // Start face down
      card3D.opacity = 1.0;

      // Animate to target position with variance
      card3D.tweenTo(
        {
          x: variantX,
          y: variantY,
          z: targetZ,
          rotation: variantRotation,
          faceUp: endFaceUp ? 1 : 0, // Configurable end face state
          opacity: 1.0
        },
        duration,
        easing,
        null, // No control point
        flipTiming,
        peakScale
      );
    });
  }

  /**
   * Synchronize with game state (called after game logic changes)
   */
  synchronize(gameState) {
    // Store current game state for use in layout calculations
    this.currentGameState = gameState;

    // Detect and set player count from gameState if using N-player format
    if (gameState.players && Array.isArray(gameState.players)) {
      this.setPlayerCount(gameState.players.length);
    }

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
        this.moveCardToZone(card3D, newZone);
      }
    }

    // Update layouts for dirty zones
    this.updateDirtyZones();
  }

  /**
   * Build mapping of cardId → zoneName from game state
   * Uses the playerCount already set in this.playerCount to determine zone names
   */
  buildZoneMapping(gameState) {
    const mapping = new Map();

    const addCards = (cards, zone) => {
      if (cards) {
        cards.forEach(card => mapping.set(card.id, zone));
      }
    };

    addCards(gameState.deck?.cards, 'deck');

    // Handle single drawnCard (not an array)
    if (gameState.drawnCard) {
      mapping.set(gameState.drawnCard.id, 'drawnCard');
    }

    addCards(gameState.field, 'field');

    // Use unified indexed zone naming for ALL player counts
    if (gameState.players && Array.isArray(gameState.players)) {
      // Players array format - use indexed names
      gameState.players.forEach((player, index) => {
        const handZone = `player${index}Hand`;
        const trickZone = `player${index}Trick`;
        addCards(player.hand, handZone);
        addCards(player.captured, trickZone);
      });
    } else {
      // Legacy 2-player format fallback - convert to indexed names
      addCards(gameState.playerHand, 'player0Hand');
      addCards(gameState.opponentHand, 'player1Hand');
      addCards(gameState.playerCaptured, 'player0Trick');
      addCards(gameState.opponentCaptured, 'player1Trick');
    }

    return mapping;
  }

  /**
   * Move a card to a new zone
   */
  moveCardToZone(card3D, newZone) {
    const oldZone = card3D.homeZone;

    // Validate new zone exists
    if (!this.zoneCards[newZone]) {
      console.error(`Invalid zone: ${newZone}. Available zones: ${Object.keys(this.zoneCards).join(', ')}`);
      return;
    }

    // Remove from old zone
    if (oldZone && this.zoneCards[oldZone]) {
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

    // For Match Game field zone, use stored positions from game state
    const isMatchGameField = this.currentGameState?.phase === 'match_game' && zone === 'field';

    if (isMatchGameField) {
      // Use custom positions from Match Game state
      const cards = Array.from(zoneSet);
      cards.forEach(card3D => {
        // Find the card in allCards array which has the position
        const cardData = this.currentGameState.allCards?.find(c => c.id === card3D.cardData.id);
        if (cardData?.position) {
          // Preserve custom position from Match Game
          card3D.homePosition = {
            x: cardData.position.x,
            y: cardData.position.y,
            z: 0
          };

          // Don't animate resize - just snap to position
          if (!animate) {
            card3D.x = cardData.position.x;
            card3D.y = cardData.position.y;
            card3D.z = card3D.opacity === 0 ? -50 : 0; // Preserve fade state
          }
        }
      });
      return; // Skip normal layout calculation
    }

    // Get zone configuration using unified indexed zone names
    // No translation needed - all zones use indexed names (player0Hand, player1Hand, etc.)
    const config = LayoutManager.getZoneConfig(zone, this.viewportWidth, this.viewportHeight, this.playerCount, this.useAnimations);

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
