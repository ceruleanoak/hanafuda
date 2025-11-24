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
    this.viewportChangedDirty = false; // Track if dirty zones came from viewport change
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
      // Teyaku display zones for Hachi-Hachi (3-player mode)
      zones[`player${i}Teyaku`] = new Set();
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
    // Flag that dirty zones came from viewport change (should snap, not animate)
    this.viewportChangedDirty = true;
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
    } else {
      // Legacy 2-player format (Koi Koi) - explicitly set player count to 2
      this.setPlayerCount(2);
    }

    // Clear existing
    this.cards.clear();
    Object.values(this.zoneCards).forEach(set => set.clear());

    // Build card sources using unified indexed naming
    let cardSources = [];

    cardSources.push({ cards: gameState.deck?.cards || [], zone: 'deck' });
    cardSources.push({ cards: gameState.field || [], zone: 'field' });

    // Add drawn card if present
    if (gameState.drawnCard) {
      cardSources.push({ cards: [gameState.drawnCard], zone: 'drawnCard' });
    }

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
          // Slot 0 is reserved for deck, field cards use slots 1-8
          if (zone === 'field') {
            card3D.gridSlot = index + 1;
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

    // Use indexed naming for all player counts
    for (let i = 0; i < this.playerCount; i++) {
      debugInfo[`player${i}Hand`] = this.zoneCards[`player${i}Hand`]?.size || 0;
      debugInfo[`player${i}Trick`] = this.zoneCards[`player${i}Trick`]?.size || 0;
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
    const rotationVariance = 10 * Math.PI / 180; // 10 degrees (reduced from 20)
    const positionXVariance = 30; // Reduced from 60 to 30 (half)
    const positionYVariance = 5;

    // Starting position: calculate deck position from field grid (gridSlot 0)
    const fieldConfig = LayoutManager.getZoneConfig('field', this.viewportWidth, this.viewportHeight, this.playerCount);
    const layoutManager = new LayoutManager();
    const dummyCard = { gridSlot: 0 };
    const positions = layoutManager.layoutGrid([dummyCard], fieldConfig);
    const slot0Position = positions[0];

    const startX = slot0Position.x;
    const startY = slot0Position.y;
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
    } else {
      // Legacy 2-player format (Koi Koi) - explicitly set player count to 2
      this.setPlayerCount(2);
    }

    // Build current zone mapping from game state
    const currentMapping = this.buildZoneMapping(gameState);

    // Detect cards that changed zones
    for (const [cardId, newZone] of currentMapping) {
      const card3D = this.cards.get(cardId);
      if (!card3D) {
        // Card not yet initialized in Card3D system - skip it
        // This can happen during initial setup or after switching game modes
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

    // Handle opponent played card (single card during opponent_playing phase)
    if (gameState.opponentPlayedCard) {
      mapping.set(gameState.opponentPlayedCard.id, 'opponentPlayedCard');
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

    // Convert legacy zone names to indexed names
    const legacyMap = {
      'playerHand': 'player0Hand',
      'opponentHand': 'player1Hand',
      'playerTrick': 'player0Trick',
      'opponentTrick': 'player1Trick'
    };
    newZone = legacyMap[newZone] || newZone;

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

    // Reset animation state to allow new zone layout to animate the card
    // This prevents cards from getting stuck when moving zones
    if (card3D.animationMode !== 'idle') {
      card3D.animationMode = 'idle';
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
   * Get next available slot for field (8-slot array with deck reserved at 0)
   * Slot 0 is reserved for deck
   * Field cards use slots 1-8 (8 fixed positions on first row)
   * Returns the first empty slot, or extends beyond 9 if needed (fallback)
   */
  getNextAvailableFieldSlot() {
    const fieldCards = Array.from(this.zoneCards.field);
    const occupiedSlots = new Set(fieldCards.map(card => card.gridSlot).filter(slot => slot !== undefined));

    // Try slots 1-8 first (standard field size, slot 0 reserved for deck)
    for (let slot = 1; slot <= 8; slot++) {
      if (!occupiedSlots.has(slot)) {
        return slot;
      }
    }

    // Fallback: if all 8 slots are occupied, find next available beyond 8
    let slot = 9;
    while (occupiedSlots.has(slot)) {
      slot++;
    }
    return slot;
  }

  /**
   * Assign card to zone without animation (for initialization)
   */
  assignToZone(card3D, zone, animate = true) {
    // Convert legacy zone names to indexed names
    const legacyMap = {
      'playerHand': 'player0Hand',
      'opponentHand': 'player1Hand',
      'playerTrick': 'player0Trick',
      'opponentTrick': 'player1Trick'
    };
    zone = legacyMap[zone] || zone;

    card3D.homeZone = zone;
    this.zoneCards[zone].add(card3D);
    this.dirtyZones.add(zone);
    this.renderQueueDirty = true;

    // Deck zone doesn't have a traditional config - handle it specially
    if (zone === 'deck') {
      card3D.renderLayer = 1; // Deck cards are below other elements
      if (!animate) {
        card3D.faceUp = 0; // Deck cards face down
        card3D.targetFaceUp = 0;
      }
      return;
    }

    // Get zone config to set properties
    const config = LayoutManager.getZoneConfig(zone, this.viewportWidth, this.viewportHeight, this.playerCount, this.useAnimations);

    // Always set render layer (important for correct drawing order)
    if (config.renderLayer !== undefined) {
      card3D.renderLayer = config.renderLayer;
    }

    if (!animate) {
      // Set initial face state when not animating
      if (config.faceUp !== undefined) {
        card3D.faceUp = config.faceUp;
        card3D.targetFaceUp = config.faceUp;
      }
    }
  }

  /**
   * Recalculate layout for a zone and update card home positions
   */
  relayoutZone(zone, animate = true) {
    const zoneSet = this.zoneCards[zone];
    if (!zoneSet || zoneSet.size === 0) return;

    // Special handling for deck zone - deck cards are rendered separately at field gridSlot 0 position
    if (zone === 'deck') {
      // Position all deck cards at the field gridSlot 0 position (calculated dynamically)
      const fieldConfig = LayoutManager.getZoneConfig('field', this.viewportWidth, this.viewportHeight, this.playerCount);
      const fieldLayoutManager = new LayoutManager();
      const dummyCard = { gridSlot: 0 };
      const positions = fieldLayoutManager.layoutGrid([dummyCard], fieldConfig);
      const slot0Position = positions[0];

      // All deck cards share the same position (they're stacked visually in Renderer)
      // Deck cards are ALWAYS snapped to their position (not animated) because they're rendered
      // as a deck graphic, not as individual card objects. This ensures they always match
      // the calculated gridSlot 0 position even when window is resized or zoomed.
      Array.from(zoneSet).forEach(card3D => {
        card3D.homePosition = { x: slot0Position.x, y: slot0Position.y, z: 0 };
        // Always snap to position for deck cards - they don't animate as individuals
        card3D.x = slot0Position.x;
        card3D.y = slot0Position.y;
        card3D.z = 0;
      });
      return;
    }

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

      // Update render layer (but preserve animation layer 10 if card is display animating)
      if (config.renderLayer !== undefined) {
        if (card3D.isDisplayAnimating) {
          // Card is display animating - keep it at layer 10, but save zone's layer for later
          card3D.homeRenderLayer = config.renderLayer;
        } else {
          // Normal zone layer assignment
          card3D.renderLayer = config.renderLayer;
        }
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
          // Apply display animation (with Z lift) only when card moves FROM hand zones
          // Hand cards should never be elevated - only cards being drawn/displayed get lift
          const isFromHandZone = card3D.previousZone && card3D.previousZone.includes('Hand');
          const isDisplayAnimation = card3D.previousZone !== null && !isFromHandZone;
          card3D.tweenTo(
            { x: pos.x, y: pos.y, z: pos.z },
            duration,
            'easeInOutCubic',
            null, // controlPoint
            0.5, // flipTiming
            null, // peakScale
            isDisplayAnimation
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

    // If viewport changed, snap all cards to positions without animation
    const shouldAnimate = this.useAnimations && !this.viewportChangedDirty;

    this.dirtyZones.forEach(zone => {
      this.relayoutZone(zone, shouldAnimate);
    });

    this.dirtyZones.clear();
    this.viewportChangedDirty = false;
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
   * Wait for a specific card to finish animating
   * @param {Card3D} card3D - The card to wait for
   * @param {Function} callback - Function to call when animation completes
   * @param {number} maxWaitMs - Maximum time to wait (default 5000ms)
   */
  waitForCardAnimation(card3D, callback, maxWaitMs = 5000) {
    if (!card3D) {
      callback();
      return;
    }

    const startTime = performance.now();

    const check = () => {
      const elapsed = performance.now() - startTime;

      // Check if animation is complete or timeout reached
      if (!card3D.isAnimating() || elapsed > maxWaitMs) {
        if (elapsed > maxWaitMs) {
          debugLogger.log('3dCards', '⚠️ Animation wait timeout exceeded', {
            cardId: card3D.cardData?.id,
            elapsed
          });
        }
        callback();
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  }

  /**
   * Wait for all cards in a zone to finish animating
   * @param {string} zone - The zone name
   * @param {Function} callback - Function to call when all animations complete
   * @param {number} maxWaitMs - Maximum time to wait (default 5000ms)
   */
  waitForZoneAnimations(zone, callback, maxWaitMs = 5000) {
    const cardsInZone = this.getCardsInZone(zone);
    if (cardsInZone.length === 0) {
      callback();
      return;
    }

    const startTime = performance.now();

    const check = () => {
      const elapsed = performance.now() - startTime;
      const animating = cardsInZone.filter(card => card.isAnimating());

      if (animating.length === 0 || elapsed > maxWaitMs) {
        if (elapsed > maxWaitMs) {
          debugLogger.log('3dCards', '⚠️ Zone animation wait timeout exceeded', {
            zone,
            stillAnimating: animating.length,
            elapsed
          });
        }
        callback();
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  }

  /**
   * Wait for all cards to finish animating
   * @param {Function} callback - Function to call when all animations complete
   * @param {number} maxWaitMs - Maximum time to wait (default 5000ms)
   */
  waitForAllAnimations(callback, maxWaitMs = 5000) {
    const startTime = performance.now();

    const check = () => {
      const elapsed = performance.now() - startTime;

      if (!this.isAnyAnimating() || elapsed > maxWaitMs) {
        if (elapsed > maxWaitMs) {
          debugLogger.log('3dCards', '⚠️ All animations wait timeout exceeded', { elapsed });
        }
        callback();
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
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
