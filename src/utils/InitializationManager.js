/**
 * InitializationManager - Orchestrates game initialization and asset loading
 *
 * Manages initialization in phases:
 * 1. Critical Assets - Load all card images
 * 2. System Initialization - Initialize game systems
 * 3. Validation - Verify all systems are ready
 * 4. Ready - Enable event handlers and start game loop
 */

import { HANAFUDA_DECK } from '../data/cards.js';
import { debugLogger } from './DebugLogger.js';

export class InitializationManager {
  constructor() {
    this.phase = 'idle';
    this.progress = 0;
    this.totalAssets = 0;
    this.loadedAssets = 0;
    this.errors = [];
    this.onProgressCallback = null;
    this.onPhaseChangeCallback = null;
  }

  /**
   * Set callback for progress updates
   * @param {Function} callback - Called with (phase, progress, total, message)
   */
  setOnProgress(callback) {
    this.onProgressCallback = callback;
  }

  /**
   * Set callback for phase changes
   * @param {Function} callback - Called with (newPhase, data)
   */
  setOnPhaseChange(callback) {
    this.onPhaseChangeCallback = callback;
  }

  /**
   * Notify progress
   */
  notifyProgress(message) {
    if (this.onProgressCallback) {
      this.onProgressCallback(this.phase, this.loadedAssets, this.totalAssets, message);
    }
  }

  /**
   * Change phase
   */
  changePhase(newPhase, data = {}) {
    this.phase = newPhase;
    debugLogger.log('init', `📍 Phase: ${newPhase}`, data);
    if (this.onPhaseChangeCallback) {
      this.onPhaseChangeCallback(newPhase, data);
    }
  }

  /**
   * Main initialization sequence
   * @param {CardRenderer} cardRenderer - Card renderer instance for image loading
   * @param {Card3DManager} card3DManager - Card3D manager for validation
   * @param {Object} gameState - Initial game state
   * @returns {Promise<Object>} - Result with success status and errors
   */
  async initialize(cardRenderer, card3DManager, gameState) {
    debugLogger.log('init', '🚀 Starting initialization sequence', null);
    this.errors = [];

    try {
      // Phase 1: Load Critical Assets
      await this.loadCriticalAssets(cardRenderer);

      // Phase 2: System Initialization (already done synchronously, just validate)
      await this.validateSystemInitialization(card3DManager, gameState);

      // Phase 3: Final Validation
      await this.performFinalValidation(card3DManager, gameState);

      // Phase 4: Ready
      this.changePhase('ready', { success: true });

      debugLogger.log('init', '✅ Initialization complete', {
        totalAssets: this.totalAssets,
        errors: this.errors.length
      });

      return {
        success: true,
        errors: this.errors
      };
    } catch (error) {
      debugLogger.logError('❌ Initialization failed', error);
      this.changePhase('error', { error });
      return {
        success: false,
        errors: [...this.errors, error.message]
      };
    }
  }

  /**
   * Phase 1: Load all card images
   */
  async loadCriticalAssets(cardRenderer) {
    this.changePhase('loading_assets');

    // Count total assets to load
    const imagePaths = HANAFUDA_DECK
      .filter(card => card.image)
      .map(card => card.image);

    this.totalAssets = imagePaths.length;
    this.loadedAssets = 0;

    debugLogger.log('init', `📦 Loading ${this.totalAssets} card images`, null);

    // Load all images in parallel
    const loadPromises = imagePaths.map(async (imagePath, index) => {
      try {
        await cardRenderer.loadImage(imagePath);
        this.loadedAssets++;

        // Update progress every 5 images or on last image
        if (this.loadedAssets % 5 === 0 || this.loadedAssets === this.totalAssets) {
          this.notifyProgress(`Loading assets... ${this.loadedAssets}/${this.totalAssets}`);
        }

        return { success: true, path: imagePath };
      } catch (error) {
        this.errors.push(`Failed to load image: ${imagePath}`);
        debugLogger.logError(`Failed to load image: ${imagePath}`, error);
        // Continue even if some images fail - we'll use fallback rendering
        return { success: false, path: imagePath, error };
      }
    });

    const results = await Promise.all(loadPromises);

    const failedLoads = results.filter(r => !r.success);
    if (failedLoads.length > 0) {
      debugLogger.log('init', `⚠️ ${failedLoads.length} images failed to load (will use fallback)`, null);
    }

    debugLogger.log('init', `✅ Asset loading complete (${this.loadedAssets}/${this.totalAssets})`, null);
  }

  /**
   * Phase 2: Validate system initialization
   */
  async validateSystemInitialization(card3DManager, gameState) {
    this.changePhase('validating_systems');
    this.notifyProgress('Validating systems...');

    debugLogger.log('init', '🔍 Validating system initialization', null);

    // Validate Card3D system
    const card3DValidation = this.validateCard3DSystem(card3DManager, gameState);
    if (!card3DValidation.success) {
      throw new Error(`Card3D system validation failed: ${card3DValidation.errors.join(', ')}`);
    }

    // Validate game state integrity
    const gameStateValidation = this.validateGameState(gameState);
    if (!gameStateValidation.success) {
      throw new Error(`Game state validation failed: ${gameStateValidation.errors.join(', ')}`);
    }

    debugLogger.log('init', '✅ System validation complete', null);
  }

  /**
   * Validate Card3D system has all cards
   */
  validateCard3DSystem(card3DManager, gameState) {
    const errors = [];

    // Count expected cards
    const expectedCards = new Set();
    [
      ...(gameState.deck?.cards || []),
      ...(gameState.field || []),
      ...(gameState.playerHand || []),
      ...(gameState.opponentHand || []),
      ...(gameState.playerCaptured || []),
      ...(gameState.opponentCaptured || [])
    ].forEach(card => expectedCards.add(card.id));

    // Check if Card3DManager has all cards
    const actualCards = card3DManager.cards.size;

    debugLogger.log('init', '🎴 Card3D validation', {
      expected: expectedCards.size,
      actual: actualCards
    });

    if (actualCards !== expectedCards.size) {
      errors.push(`Card count mismatch: expected ${expectedCards.size}, got ${actualCards}`);
    }

    // Check each card exists in 3D system
    for (const cardId of expectedCards) {
      if (!card3DManager.cards.has(cardId)) {
        errors.push(`Card ${cardId} missing from 3D system`);
      }
    }

    // Validate zone assignments
    const zoneValidation = this.validateZoneAssignments(card3DManager, gameState);
    if (!zoneValidation.success) {
      errors.push(...zoneValidation.errors);
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Validate zone assignments match game state
   */
  validateZoneAssignments(card3DManager, gameState) {
    const errors = [];

    // Determine player count from game state
    const playerCount = gameState.playerCount || gameState.players?.length || 2;

    const zoneChecks = [
      { zone: 'deck', expected: gameState.deck?.cards?.length || 0 },
      { zone: 'field', expected: gameState.field?.length || 0 }
    ];

    // Add hand and trick zones for all players using indexed naming
    if (gameState.players && Array.isArray(gameState.players)) {
      gameState.players.forEach((player, index) => {
        zoneChecks.push({ zone: `player${index}Hand`, expected: player.hand?.length || 0 });
        zoneChecks.push({ zone: `player${index}Trick`, expected: player.captured?.length || 0 });
      });
    } else {
      // Legacy 2-player format - convert to indexed names for validation
      zoneChecks.push({ zone: 'player0Hand', expected: gameState.playerHand?.length || 0 });
      zoneChecks.push({ zone: 'player1Hand', expected: gameState.opponentHand?.length || 0 });
      zoneChecks.push({ zone: 'player0Trick', expected: gameState.playerCaptured?.length || 0 });
      zoneChecks.push({ zone: 'player1Trick', expected: gameState.opponentCaptured?.length || 0 });
    }

    for (const { zone, expected } of zoneChecks) {
      const actual = card3DManager.getCardsInZone(zone).length;
      if (actual !== expected) {
        errors.push(`Zone ${zone}: expected ${expected} cards, got ${actual}`);
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Validate game state integrity
   */
  validateGameState(gameState) {
    const errors = [];

    // Check field has exactly 8 cards (standard starting state)
    if (gameState.field && gameState.field.length !== 8) {
      // This is actually a warning, not an error - field can vary during game
      debugLogger.log('init', `ℹ️ Field has ${gameState.field.length} cards (expected 8 for new game)`, null);
    }

    // Check hands have expected number of cards (multi-player support)
    // Standard: 8 per hand for 2-player, 7 for 3-player, 5 for 4-player
    if (gameState.players && Array.isArray(gameState.players)) {
      const playerCount = gameState.players.length;
      const expectedSize = playerCount === 2 ? 8 : (playerCount === 3 ? 7 : 5);
      for (let i = 0; i < gameState.players.length; i++) {
        if (gameState.players[i].hand && gameState.players[i].hand.length !== expectedSize) {
          errors.push(`Hand size mismatch: player ${i} has ${gameState.players[i].hand.length}, expected ${expectedSize}`);
        }
      }
    } else {
      // Legacy 2-player format
      const expectedHandSize = gameState.playerHand?.length || 8;
      if (gameState.opponentHand && gameState.opponentHand.length !== expectedHandSize) {
        errors.push(`Hand size mismatch: player has ${expectedHandSize}, opponent has ${gameState.opponentHand.length}`);
      }
    }

    // Check deck exists
    if (!gameState.deck || !gameState.deck.cards) {
      errors.push('Deck is missing or invalid');
    }

    // Validate phase
    if (!gameState.phase) {
      errors.push('Game phase is undefined');
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Phase 3: Final validation before starting game
   */
  async performFinalValidation(card3DManager, gameState) {
    this.changePhase('final_validation');
    this.notifyProgress('Performing final checks...');

    debugLogger.log('init', '🔍 Final validation', null);

    // Check viewport dimensions are valid
    if (card3DManager.viewportWidth <= 0 || card3DManager.viewportHeight <= 0) {
      throw new Error('Invalid viewport dimensions');
    }

    // Check all zones have been laid out
    // Get zones from card3DManager which are already initialized with correct names (indexed format)
    const allZones = Object.keys(card3DManager.zoneCards);
    for (const zone of allZones) {
      const cards = card3DManager.getCardsInZone(zone);
      for (const card3D of cards) {
        if (card3D.x === 0 && card3D.y === 0 && zone !== 'deck') {
          // Cards at (0,0) might not have been laid out properly (except deck which may be intentional)
          debugLogger.log('init', `⚠️ Card in ${zone} at origin (0,0) - might not be laid out`, {
            cardId: card3D.id
          });
        }
      }
    }

    debugLogger.log('init', '✅ Final validation complete', null);
  }

  /**
   * Get current initialization status
   */
  getStatus() {
    return {
      phase: this.phase,
      progress: this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) : 0,
      loadedAssets: this.loadedAssets,
      totalAssets: this.totalAssets,
      errors: this.errors
    };
  }
}
