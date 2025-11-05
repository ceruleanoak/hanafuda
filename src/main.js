/**
 * Main entry point for Hanafuda Koi-Koi game
 */

import { KoiKoi } from './game/KoiKoi.js';
import { Renderer } from './rendering/Renderer.js';
import { debugLogger } from './utils/DebugLogger.js';
import { GameOptions } from './game/GameOptions.js';
import { Card3DManager } from './utils/Card3DManager.js';
import { AnimationTester } from './utils/AnimationTester.js';
import { InitializationManager } from './utils/InitializationManager.js';
import { APP_VERSION } from './utils/version.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.statusElement = document.getElementById('game-status');
    this.instructionsElement = document.getElementById('instructions');
    this.playerScoreElement = document.getElementById('player-score');
    this.opponentScoreElement = document.getElementById('opponent-score');
    this.newGameButton = document.getElementById('new-game-btn');
    this.helpButton = document.getElementById('help-btn');
    this.variationsButton = document.getElementById('variations-btn');
    this.optionsButton = document.getElementById('options-btn');
    this.test3DButton = document.getElementById('test-3d-btn');
    this.animationTesterButton = document.getElementById('animation-tester-btn');
    this.roundModal = document.getElementById('round-modal');
    this.variationsModal = document.getElementById('variations-modal');
    this.optionsModal = document.getElementById('options-modal');
    this.koikoiModal = document.getElementById('koikoi-modal');
    this.roundSummaryModal = document.getElementById('round-summary-modal');
    this.tutorialBubble = document.getElementById('tutorial-bubble');
    this.animationTesterPanel = document.getElementById('animation-tester-panel');

    // Initialize game options
    this.gameOptions = new GameOptions();

    this.game = new KoiKoi(this.gameOptions);
    this.game.setUICallback((yaku, score) => this.showKoikoiDecision(yaku, score));
    this.game.setRoundSummaryCallback((data) => this.showRoundSummary(data));
    this.game.setOpponentKoikoiCallback(() => this.showOpponentKoikoiNotification());
    this.renderer = new Renderer(this.canvas);

    // Initialize Card3D system
    this.card3DManager = new Card3DManager(
      this.renderer.displayWidth,
      this.renderer.displayHeight
    );

    // Set up resize callback to update Card3D viewport dimensions
    this.renderer.setOnResizeCallback((width, height) => {
      this.card3DManager.setViewportDimensions(width, height);

      // Also update animation tester if it's active
      if (this.animationTesterActive) {
        this.animationTester.initialize(width, height);
      }

      debugLogger.log('gameState', 'Viewport resized - Card3D updated', {
        width,
        height
      });
    });

    // Initialize Card3D system from initial game state
    this.card3DManager.setAnimationsEnabled(this.gameOptions.get('animationsEnabled'));
    this.card3DManager.initializeFromGameState(this.game.getState());
    debugLogger.log('3dCards', '✨ Card3D system initialized on page load', null);

    // Initialize Animation Tester
    this.animationTester = new AnimationTester(this.renderer.cardRenderer, this.card3DManager);
    this.animationTesterActive = false;

    this.lastMessage = '';
    this.lastGameOverMessage = '';
    this.frameCount = 0;

    // New features state
    this.helpMode = this.gameOptions.get('helpMode'); // Load from saved options
    this.hoverX = -1;             // Mouse hover X position
    this.hoverY = -1;             // Mouse hover Y position
    this.hoveredCard3D = null;    // Currently hovered Card3D object

    // Track state for change detection
    this.lastStateLengths = {
      playerCaptured: 0,
      opponentCaptured: 0,
      field: 8
    };
    this.lastCapturedCards = {
      player: [],
      opponent: []
    };

    debugLogger.log('gameState', 'Game constructor complete', {
      canvasSize: `${this.canvas.width}x${this.canvas.height}`,
      displaySize: `${this.renderer.displayWidth}x${this.renderer.displayHeight}`
    });

    // Note: setupEventListeners and gameLoop are now called after async initialization
  }

  /**
   * Async initialization - loads assets and validates systems
   * @returns {Promise<void>}
   */
  async initialize() {
    debugLogger.log('init', '🎮 Starting async initialization', null);

    // Get loading screen elements
    const loadingScreen = document.getElementById('loading-screen');
    const loadingPhase = document.getElementById('loading-phase');
    const loadingMessage = document.getElementById('loading-message');
    const loadingProgressBar = document.getElementById('loading-progress-bar');
    const loadingErrors = document.getElementById('loading-errors');

    // Create initialization manager
    const initManager = new InitializationManager();

    // Set up progress callbacks
    initManager.setOnPhaseChange((phase, data) => {
      const phaseNames = {
        'loading_assets': 'Loading Assets',
        'validating_systems': 'Validating Systems',
        'final_validation': 'Final Validation',
        'ready': 'Ready',
        'error': 'Error'
      };
      loadingPhase.textContent = phaseNames[phase] || phase;
    });

    initManager.setOnProgress((phase, loaded, total, message) => {
      loadingMessage.textContent = message;
      const progress = total > 0 ? (loaded / total) * 100 : 0;
      loadingProgressBar.style.width = `${progress}%`;
    });

    try {
      // Run initialization
      const result = await initManager.initialize(
        this.renderer.cardRenderer,
        this.card3DManager,
        this.game.getState()
      );

      if (!result.success) {
        throw new Error('Initialization failed: ' + result.errors.join(', '));
      }

      // Show any non-fatal errors
      if (result.errors.length > 0) {
        debugLogger.log('init', '⚠️ Initialization completed with warnings', result.errors);
      }

      // Initialization successful - set up event listeners and start game loop
      this.setupEventListeners();

      // Initialize help button state
      if (this.helpMode) {
        this.helpButton.classList.add('active');
      }

      // Initialize variations button state
      this.updateVariationsButtonState();

      // Hide loading screen with fade out
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
      }, 500);

      // Show tutorial bubble if first time user
      if (this.gameOptions.isFirstTime()) {
        setTimeout(() => this.showTutorial(), 1000);
      }

      // Show round modal and start game loop
      this.showRoundModal();
      this.gameLoop();

      debugLogger.log('gameState', '✅ Game initialized successfully', null);

    } catch (error) {
      debugLogger.logError('❌ Fatal initialization error', error);

      // Show error on loading screen
      loadingPhase.textContent = 'Initialization Failed';
      loadingMessage.textContent = 'An error occurred while loading the game';
      loadingErrors.innerHTML = `
        <h3>Error Details:</h3>
        <p>${error.message}</p>
        <p style="margin-top: 1rem;">Please refresh the page to try again.</p>
      `;
      loadingErrors.classList.remove('hidden');
      loadingProgressBar.style.width = '0%';
      loadingProgressBar.style.background = '#ff6b6b';
    }
  }

  setupEventListeners() {
    // Canvas click
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    // Canvas double-click for auto-match
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    // Canvas mouse move for hover detection
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    // Canvas mouse leave to clear hover
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverX = -1;
      this.hoverY = -1;
    });

    // New game button
    this.newGameButton.addEventListener('click', () => this.showRoundModal());

    // Help button
    this.helpButton.addEventListener('click', () => this.toggleHelpMode());

    // Variations button
    this.variationsButton.addEventListener('click', () => this.toggleVariationsModal());

    // Options button
    this.optionsButton.addEventListener('click', () => this.showOptionsModal());

    // Test 3D animation button
    this.test3DButton.addEventListener('click', () => this.startWaveAnimation());

    // Animation tester button
    this.animationTesterButton.addEventListener('click', () => this.showAnimationTester());

    // Round selection buttons
    document.querySelectorAll('.round-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rounds = parseInt(e.target.dataset.rounds);
        this.startNewGame(rounds);
      });
    });

    // Options modal buttons
    document.getElementById('options-save').addEventListener('click', () => this.saveOptions());
    document.getElementById('options-cancel').addEventListener('click', () => this.hideOptionsModal());
    document.getElementById('options-reset').addEventListener('click', () => this.resetOptions());

    // Koi-koi decision buttons
    document.getElementById('koikoi-shobu').addEventListener('click', () => this.handleKoikoiDecision('shobu'));
    document.getElementById('koikoi-continue').addEventListener('click', () => this.handleKoikoiDecision('koikoi'));

    // Round summary button
    document.getElementById('continue-next-round').addEventListener('click', () => this.handleContinueNextRound());

    // Tutorial bubble button
    document.getElementById('tutorial-got-it').addEventListener('click', () => this.hideTutorial());

    // Variations modal buttons
    document.getElementById('variations-close').addEventListener('click', () => this.hideVariationsModal());

    // Variations checkbox - live toggle
    document.getElementById('bomb-variation-enabled').addEventListener('change', (e) => {
      this.gameOptions.set('bombVariationEnabled', e.target.checked);
      this.game.updateOptions(this.gameOptions);
      this.updateVariationsButtonState();

      // Reset game when variation is toggled
      if (confirm('Changing variations will reset the current game. Continue?')) {
        this.showRoundModal();
      } else {
        // Revert the change
        e.target.checked = !e.target.checked;
        this.gameOptions.set('bombVariationEnabled', e.target.checked);
        this.game.updateOptions(this.gameOptions);
        this.updateVariationsButtonState();
      }
    });

    // Animation tester controls
    this.setupAnimationTesterControls();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' || e.key === 'N') {
        this.showRoundModal();
      } else if (e.key === 'h' || e.key === 'H') {
        this.toggleHelpMode();
      }
    });
  }

  showRoundModal() {
    this.roundModal.classList.add('show');
  }

  hideRoundModal() {
    this.roundModal.classList.remove('show');
  }

  startNewGame(rounds) {
    this.hideRoundModal();
    this.game.startNewGame(rounds);
    this.updateUI();
    this.statusElement.classList.remove('show');

    // Initialize Card3D system from game state
    this.card3DManager.setAnimationsEnabled(this.gameOptions.get('animationsEnabled'));
    this.card3DManager.initializeFromGameState(this.game.getState());
    debugLogger.log('3dCards', '✨ Card3D system initialized for new game', null);
  }

  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gameState = this.game.getState();

    // Use 3D hit detection
    let result = null;
    const card3D = this.card3DManager.getCardAtPosition(x, y);
    if (card3D) {
      // Map zone back to owner
      const zoneToOwnerMap = {
        'playerHand': 'player',
        'field': 'field',
        'opponentHand': 'opponent'
      };
      const owner = zoneToOwnerMap[card3D.homeZone] || 'field';
      result = { card: card3D.cardData, owner };
    }

    if (result) {
      const { card, owner } = result;

      debugLogger.log('gameState', `Card clicked: ${card.name}`, { owner });

      const success = this.game.selectCard(card, owner);

      if (success) {
        this.updateUI();
      }
    }
  }

  handleDoubleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gameState = this.game.getState();

    // Use 3D hit detection
    const card3D = this.card3DManager.getCardAtPosition(x, y);
    if (card3D && card3D.homeZone === 'playerHand' && gameState.phase === 'select_hand') {
      const card = card3D.cardData;

      debugLogger.log('gameState', `Card double-clicked (auto-match): ${card.name}`, {
        phase: gameState.phase
      });

      // Auto-match if match exists
      const success = this.game.autoMatchCard(card);

      if (success) {
        this.updateUI();
      }
    }
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.hoverX = event.clientX - rect.left;
    this.hoverY = event.clientY - rect.top;
  }

  /**
   * Update hover state for Card3D objects based on mouse position
   */
  updateCardHoverState() {
    // Only detect hover if mouse is within canvas bounds
    if (this.hoverX < 0 || this.hoverY < 0) {
      // Clear hover state from previously hovered card
      if (this.hoveredCard3D) {
        this.hoveredCard3D.setHovered(false);
        this.hoveredCard3D = null;
      }
      return;
    }

    // Get card at current hover position
    const card3D = this.card3DManager.getCardAtPosition(this.hoverX, this.hoverY);

    // Check if this card is hoverable (playerHand or field zones only)
    const isHoverable = card3D && (
      card3D.homeZone === 'playerHand' ||
      card3D.homeZone === 'field'
    );

    // Update hover state
    if (isHoverable && card3D !== this.hoveredCard3D) {
      // Clear previous hover
      if (this.hoveredCard3D) {
        this.hoveredCard3D.setHovered(false);
      }
      // Set new hover
      card3D.setHovered(true);
      this.hoveredCard3D = card3D;
    } else if (!isHoverable && this.hoveredCard3D) {
      // Mouse moved away from hoverable card
      this.hoveredCard3D.setHovered(false);
      this.hoveredCard3D = null;
    }
  }

  toggleHelpMode() {
    this.helpMode = !this.helpMode;
    if (this.helpMode) {
      this.helpButton.classList.add('active');
      // Dismiss tutorial bubble when help is activated
      this.hideTutorial();
    } else {
      this.helpButton.classList.remove('active');
    }
    // Save help mode state
    this.gameOptions.set('helpMode', this.helpMode);
  }

  /**
   * Show tutorial bubble
   */
  showTutorial() {
    this.tutorialBubble.classList.remove('hidden');
  }

  /**
   * Hide tutorial bubble and mark as shown
   */
  hideTutorial() {
    this.tutorialBubble.classList.add('hidden');
    this.gameOptions.markTutorialShown();
  }

  /**
   * Toggle variations modal
   */
  toggleVariationsModal() {
    if (this.variationsModal.classList.contains('show')) {
      this.hideVariationsModal();
    } else {
      this.showVariationsModal();
    }
  }

  /**
   * Show variations modal
   */
  showVariationsModal() {
    // Populate current values
    const options = this.gameOptions.getAll();
    document.getElementById('bomb-variation-enabled').checked = options.bombVariationEnabled;

    this.variationsModal.classList.add('show');
  }

  /**
   * Hide variations modal
   */
  hideVariationsModal() {
    this.variationsModal.classList.remove('show');
  }

  /**
   * Update variations button state (active if any variation is enabled)
   */
  updateVariationsButtonState() {
    const options = this.gameOptions.getAll();
    const anyVariationEnabled = options.bombVariationEnabled;

    if (anyVariationEnabled) {
      this.variationsButton.classList.add('active');
    } else {
      this.variationsButton.classList.remove('active');
    }
  }

  /**
   * Show options modal
   */
  showOptionsModal() {
    // Populate current values
    const options = this.gameOptions.getAll();
    document.getElementById('koikoi-enabled').checked = options.koikoiEnabled;
    document.getElementById('multiplier-mode').value = options.multiplierMode;
    document.getElementById('auto-double').checked = options.autoDouble7Plus;
    document.getElementById('both-players-score').checked = options.bothPlayersScore;
    document.getElementById('viewing-sake').value = options.viewingSakeMode;
    document.getElementById('moon-viewing-sake').value = options.moonViewingSakeMode;
    document.getElementById('animations-enabled').checked = options.animationsEnabled;

    this.optionsModal.classList.add('show');
  }

  /**
   * Hide options modal (cancel)
   */
  hideOptionsModal() {
    this.optionsModal.classList.remove('show');
  }

  /**
   * Save options from modal
   */
  saveOptions() {
    const newOptions = {
      koikoiEnabled: document.getElementById('koikoi-enabled').checked,
      multiplierMode: document.getElementById('multiplier-mode').value,
      autoDouble7Plus: document.getElementById('auto-double').checked,
      bothPlayersScore: document.getElementById('both-players-score').checked,
      viewingSakeMode: document.getElementById('viewing-sake').value,
      moonViewingSakeMode: document.getElementById('moon-viewing-sake').value,
      animationsEnabled: document.getElementById('animations-enabled').checked
    };

    this.gameOptions.update(newOptions);

    // Update game options
    this.game.updateOptions(this.gameOptions);

    // Update Card3DManager animation settings
    if (this.card3DManager) {
      this.card3DManager.setAnimationsEnabled(newOptions.animationsEnabled);
    }

    this.hideOptionsModal();

    // Reset game when options change
    if (confirm('Options saved. Reset the current game to apply changes?')) {
      this.showRoundModal();
    }
  }

  /**
   * Reset options to defaults
   */
  resetOptions() {
    if (confirm('Reset all options to defaults?')) {
      this.gameOptions.reset();
      // Update game options
      this.game.updateOptions(this.gameOptions);
      // Update help mode
      this.helpMode = this.gameOptions.get('helpMode');
      // Update Card3DManager
      if (this.card3DManager) {
        this.card3DManager.setAnimationsEnabled(this.gameOptions.get('animationsEnabled'));
      }
      // Reload the form
      this.showOptionsModal();
    }
  }

  /**
   * Show koi-koi decision modal with yaku information
   */
  showKoikoiDecision(yaku, totalScore) {
    const yakuDisplay = document.getElementById('koikoi-yaku-display');
    yakuDisplay.innerHTML = '';

    // Display each yaku
    yaku.forEach(y => {
      const yakuItem = document.createElement('div');
      yakuItem.className = 'yaku-item';
      yakuItem.textContent = `${y.name}: ${y.points} points`;
      yakuDisplay.appendChild(yakuItem);
    });

    // Display total score
    const totalDiv = document.createElement('div');
    totalDiv.className = 'total-score';
    totalDiv.textContent = `Total: ${totalScore} points`;
    yakuDisplay.appendChild(totalDiv);

    this.koikoiModal.classList.add('show');
  }

  /**
   * Handle koi-koi decision (shobu or koikoi)
   */
  handleKoikoiDecision(decision) {
    this.koikoiModal.classList.remove('show');
    this.game.resolveKoikoiDecision(decision);
  }

  /**
   * Show round summary modal
   */
  showRoundSummary(data) {
    // Update title
    const title = document.getElementById('round-summary-title');
    if (data.isGameOver) {
      const winner = data.playerTotalScore > data.opponentTotalScore ? 'You Win!' :
                     data.opponentTotalScore > data.playerTotalScore ? 'Opponent Wins!' : 'Tie Game!';
      title.textContent = `Game Over - ${winner}`;
    } else {
      title.textContent = `Round ${data.roundNumber} Complete!`;
    }

    // Update round scores
    document.getElementById('player-round-points').textContent = data.playerRoundScore;
    document.getElementById('opponent-round-points').textContent = data.opponentRoundScore;

    // Update total scores
    document.getElementById('player-total-points').textContent = data.playerTotalScore;
    document.getElementById('opponent-total-points').textContent = data.opponentTotalScore;

    // Update yaku details
    const yakuDetails = document.getElementById('round-yaku-details');
    yakuDetails.innerHTML = '';

    if (data.playerYaku.length > 0) {
      const playerSection = document.createElement('div');
      playerSection.innerHTML = '<h4>Your Yaku:</h4>';
      const yakuList = document.createElement('div');
      yakuList.className = 'yaku-list';
      data.playerYaku.forEach(y => {
        const yakuLine = document.createElement('div');
        yakuLine.textContent = `• ${y.name} (${y.points} pts)`;
        yakuList.appendChild(yakuLine);
      });
      playerSection.appendChild(yakuList);

      // Add score breakdown if available
      if (data.playerScoreBreakdown) {
        const breakdown = data.playerScoreBreakdown;
        const breakdownDiv = document.createElement('div');
        breakdownDiv.className = 'score-breakdown-detail';
        breakdownDiv.innerHTML = '<strong>Score Calculation:</strong>';

        if (breakdown.koikoiPenalty) {
          breakdownDiv.innerHTML += '<br>• Koi-Koi penalty applied (didn\'t improve) = 0 pts';
        } else {
          breakdownDiv.innerHTML += `<br>• Base score: ${breakdown.baseScore} pts`;
          if (breakdown.autoDouble) {
            breakdownDiv.innerHTML += '<br>• Auto-double (7+ pts) ×2';
          }
          if (breakdown.koikoiMultiplier > 0) {
            breakdownDiv.innerHTML += `<br>• Koi-Koi bonus ×${breakdown.koikoiMultiplier} (opponent called koi-koi)`;
          }
          if (breakdown.autoDouble || breakdown.koikoiMultiplier > 0) {
            breakdownDiv.innerHTML += `<br>• <strong>Final: ${breakdown.finalScore} pts</strong>`;
          }
        }
        playerSection.appendChild(breakdownDiv);
      }

      yakuDetails.appendChild(playerSection);
    }

    if (data.opponentYaku.length > 0) {
      const opponentSection = document.createElement('div');
      opponentSection.innerHTML = '<h4>Opponent Yaku:</h4>';
      const yakuList = document.createElement('div');
      yakuList.className = 'yaku-list';
      data.opponentYaku.forEach(y => {
        const yakuLine = document.createElement('div');
        yakuLine.textContent = `• ${y.name} (${y.points} pts)`;
        yakuList.appendChild(yakuLine);
      });
      opponentSection.appendChild(yakuList);

      // Add score breakdown if available
      if (data.opponentScoreBreakdown) {
        const breakdown = data.opponentScoreBreakdown;
        const breakdownDiv = document.createElement('div');
        breakdownDiv.className = 'score-breakdown-detail';
        breakdownDiv.innerHTML = '<strong>Score Calculation:</strong>';

        if (breakdown.koikoiPenalty) {
          breakdownDiv.innerHTML += '<br>• Koi-Koi penalty applied (didn\'t improve) = 0 pts';
        } else {
          breakdownDiv.innerHTML += `<br>• Base score: ${breakdown.baseScore} pts`;
          if (breakdown.autoDouble) {
            breakdownDiv.innerHTML += '<br>• Auto-double (7+ pts) ×2';
          }
          if (breakdown.koikoiMultiplier > 0) {
            breakdownDiv.innerHTML += `<br>• Koi-Koi bonus ×${breakdown.koikoiMultiplier} (you called koi-koi)`;
          }
          if (breakdown.autoDouble || breakdown.koikoiMultiplier > 0) {
            breakdownDiv.innerHTML += `<br>• <strong>Final: ${breakdown.finalScore} pts</strong>`;
          }
        }
        opponentSection.appendChild(breakdownDiv);
      }

      yakuDetails.appendChild(opponentSection);
    }

    // Update button text
    const continueBtn = document.getElementById('continue-next-round');
    if (data.isGameOver) {
      continueBtn.textContent = 'Start New Game';
    } else {
      continueBtn.textContent = `Continue to Round ${data.roundNumber + 1}`;
    }

    // Show modal
    this.roundSummaryModal.classList.add('show');
  }

  /**
   * Handle continue to next round button
   */
  handleContinueNextRound() {
    this.roundSummaryModal.classList.remove('show');

    if (this.game.gameOver) {
      // Start new game
      this.showRoundModal();
    } else {
      // Continue to next round
      this.game.startNextRound();
    }
  }

  /**
   * Show opponent koi-koi notification
   */
  showOpponentKoikoiNotification() {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('opponent-koikoi-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'opponent-koikoi-notification';
      notification.className = 'opponent-koikoi-notification';
      document.body.appendChild(notification);
    }

    // Set notification content
    notification.innerHTML = `
      <div class="notification-content">
        <h3>⚠️ Opponent Called Koi-Koi!</h3>
        <p>They're pressing their luck! If you score next, you'll get double points!</p>
      </div>
    `;

    // Show notification
    notification.classList.add('show');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  /**
   * Handle state changes and trigger animations
   */
  handleGameStateChange(beforeLengths, afterState, triggeredCard) {
    // Log state change
    debugLogger.log('gameState', 'State Change: Player action', {
      phase: afterState.phase,
      playerCaptured: `${beforeLengths.playerCaptured} → ${afterState.playerCaptured.length}`,
      opponentCaptured: `${beforeLengths.opponentCaptured} → ${afterState.opponentCaptured.length}`,
      field: `${beforeLengths.field} → ${afterState.field.length}`,
      deckCount: afterState.deckCount
    });

    // Check if player captured cards
    if (afterState.playerCaptured.length > beforeLengths.playerCaptured) {
      const capturedCount = afterState.playerCaptured.length - beforeLengths.playerCaptured;
      const newlyCaptured = afterState.playerCaptured.slice(-capturedCount);

      if (capturedCount === 4) {
        // SCENARIO 5: Four-of-a-kind!
        const month = newlyCaptured[0].month;
        debugLogger.log('animation', `🎉 FOUR OF A KIND: ${month}!`, {
          cards: newlyCaptured.map(c => c.name)
        });

        const sequence = this.createFourOfAKindSequence(
          newlyCaptured,
          month,
          'player_captured',
          'Player'
        );
        this.playSequence(sequence);

      } else if (capturedCount === 2 && triggeredCard) {
        // SCENARIOS 1-4: Normal match (hand/drawn card + field card)
        // Determine which card moved and which was the target
        const movingCard = newlyCaptured.find(c => c.id === triggeredCard.id) || newlyCaptured[0];
        const targetCard = newlyCaptured.find(c => c.id !== movingCard.id);

        debugLogger.log('animation', `🎴 Player Match: ${movingCard.name} → ${targetCard.name}`, null);

        const sequence = this.createMatchSequence(
          movingCard,
          targetCard,
          'player_captured',
          'Player'
        );
        this.playSequence(sequence);

      } else {
        // Fallback: simple animations
        debugLogger.logAnimationWarning('Unexpected capture count', {
          count: capturedCount,
          cards: newlyCaptured.map(c => c.name)
        });
        this.fallbackSimpleAnimation(newlyCaptured, 'player_captured');
      }
    }

    // Check if opponent captured cards
    if (afterState.opponentCaptured.length > beforeLengths.opponentCaptured) {
      const capturedCount = afterState.opponentCaptured.length - beforeLengths.opponentCaptured;
      const newlyCaptured = afterState.opponentCaptured.slice(-capturedCount);

      if (capturedCount === 4) {
        // SCENARIO 5: Four-of-a-kind!
        const month = newlyCaptured[0].month;
        debugLogger.log('animation', `🎉 OPPONENT FOUR OF A KIND: ${month}!`, {
          cards: newlyCaptured.map(c => c.name)
        });

        const sequence = this.createFourOfAKindSequence(
          newlyCaptured,
          month,
          'opponent_captured',
          'Opponent'
        );
        this.playSequence(sequence);

      } else if (capturedCount === 2) {
        // Opponent match - first card is hand/drawn, second is field
        const movingCard = newlyCaptured[0];
        const targetCard = newlyCaptured[1];

        debugLogger.log('animation', `🎴 Opponent Match: ${movingCard.name} → ${targetCard.name}`, null);

        const sequence = this.createMatchSequence(
          movingCard,
          targetCard,
          'opponent_captured',
          'Opponent'
        );
        this.playSequence(sequence);

      } else {
        this.fallbackSimpleAnimation(newlyCaptured, 'opponent_captured');
      }
    }

    // Check if card was placed on field without capture
    if (afterState.field.length > beforeLengths.field && triggeredCard) {
      debugLogger.log('animation', '🎴 Card placed on field (no match)', {
        card: triggeredCard.name
      });

      // Only animate if animations are enabled
      if (this.gameOptions.get('animationsEnabled')) {
        const startPos = {
          x: triggeredCard._lastRenderX || 0,
          y: triggeredCard._lastRenderY || 0
        };
        const endPos = this.getZonePosition('player_hand', afterState);

        // Simple animation to field
        this.animateCard(
          triggeredCard,
          startPos.x,
          startPos.y,
          endPos.x,
          endPos.y,
          400
        );
      }
    }
  }

  /**
   * Fallback simple animation (if sequence logic fails)
   */
  fallbackSimpleAnimation(cards, capturedZone) {
    // Skip if animations are disabled
    if (!this.gameOptions.get('animationsEnabled')) {
      return;
    }

    const endPos = this.getZonePosition(capturedZone, this.game.getState());

    cards.forEach((card, index) => {
      const startPos = {
        x: card._lastRenderX || card._renderX || 0,
        y: card._lastRenderY || card._renderY || 0
      };

      setTimeout(() => {
        this.animateCard(card, startPos.x, startPos.y, endPos.x, endPos.y, 500);
      }, index * 100);
    });
  }

  updateUI() {
    const state = this.game.getState();

    // Update scores - show round progress
    const roundText = state.totalRounds > 1 ? ` (Round ${state.currentRound}/${state.totalRounds})` : '';
    this.playerScoreElement.textContent = state.playerScore + roundText;
    this.opponentScoreElement.textContent = state.opponentScore;

    // Update instructions and log if message changed
    if (this.lastMessage !== state.message) {
      debugLogger.logMessage(state.message);
      this.lastMessage = state.message;
    }
    this.instructionsElement.textContent = state.message;

    // Show game over status
    if (state.gameOver) {
      const gameOverMsg = state.message + '\n\nPress N or click New Game';
      this.statusElement.textContent = gameOverMsg;
      this.statusElement.classList.add('show');
      if (this.lastGameOverMessage !== gameOverMsg) {
        debugLogger.logMessage(gameOverMsg);
        this.lastGameOverMessage = gameOverMsg;
      }
    }
  }

  updateAnimations(deltaTime) {
    // Update all animating cards
    for (let i = this.animatingCards.length - 1; i >= 0; i--) {
      try {
        const anim = this.animatingCards[i];
        anim.progress += deltaTime / anim.duration;

        if (anim.progress >= 1) {
          // Animation complete
          debugLogger.logAnimationCompleted(anim.card);
          this.animatingCards.splice(i, 1);
          if (anim.onComplete) {
            try {
              anim.onComplete();
            } catch (err) {
              debugLogger.logError('Error in animation onComplete callback', err);
            }
          }
        } else {
          // Update position with easing
          const t = this.easeInOutQuad(anim.progress);
          anim.card._animX = anim.startX + (anim.endX - anim.startX) * t;
          anim.card._animY = anim.startY + (anim.endY - anim.startY) * t;
        }
      } catch (err) {
        debugLogger.logError('Error updating animation', err);
        // Remove failed animation
        this.animatingCards.splice(i, 1);
      }
    }
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Create an animation for a card
   */
  animateCard(card, startX, startY, endX, endY, duration = 500, onComplete = null) {
    // Set initial animation position
    card._animX = startX;
    card._animY = startY;

    const animation = {
      card,
      startX,
      startY,
      endX,
      endY,
      duration,
      progress: 0,
      onComplete
    };

    this.animatingCards.push(animation);

    // Log animation creation
    debugLogger.logAnimationCreated(
      card,
      { x: startX, y: startY },
      { x: endX, y: endY },
      duration
    );

    return animation;
  }

  /**
   * Play an animation sequence
   */
  playSequence(sequence, onComplete = null) {
    // Check if animations are disabled
    if (!this.gameOptions.get('animationsEnabled')) {
      debugLogger.log('animation', `⏭️  Skipping animation (disabled): ${sequence.name}`, null);
      if (onComplete) onComplete();
      return;
    }

    if (this.isAnimating) {
      debugLogger.logAnimationWarning('Already playing animation, queuing sequence', { name: sequence.name });
      // Could implement a queue here if needed
      return;
    }

    this.isAnimating = true;
    this.currentSequence = sequence;

    const stages = sequence.getStages();
    debugLogger.log('animation', `▶️  Starting sequence: ${sequence.name}`, {
      stages: stages.length,
      types: stages.map(s => `${s.type}${s.name ? `: ${s.name}` : ''}`).join(' → ')
    });

    this.playSequenceStage(0, stages, () => {
      debugLogger.log('animation', `✅ Sequence complete: ${sequence.name}`, null);
      this.isAnimating = false;
      this.currentSequence = null;
      if (onComplete) onComplete();
    });
  }

  /**
   * Play a specific stage of a sequence
   */
  playSequenceStage(stageIndex, stages, onSequenceComplete) {
    if (stageIndex >= stages.length) {
      onSequenceComplete();
      return;
    }

    const stage = stages[stageIndex];
    debugLogger.log('animation', `Playing stage ${stageIndex + 1}/${stages.length}: ${stage.type}`, {
      name: stage.name || 'unnamed'
    });

    const nextStage = () => this.playSequenceStage(stageIndex + 1, stages, onSequenceComplete);

    switch (stage.type) {
      case 'parallel':
        this.playParallelAnimations(stage.configs, nextStage);
        break;
      case 'sequential':
        this.playSequentialAnimations(stage.configs, nextStage);
        break;
      case 'delay':
        setTimeout(nextStage, stage.duration);
        break;
      case 'event':
        this.fireAnimationEvent(stage.eventName, stage.data);
        nextStage();
        break;
      default:
        debugLogger.logAnimationWarning('Unknown stage type', { type: stage.type });
        nextStage();
    }
  }

  /**
   * Play multiple animations in parallel (simultaneously)
   */
  playParallelAnimations(configs, onComplete) {
    if (configs.length === 0) {
      onComplete();
      return;
    }

    let completedCount = 0;
    configs.forEach(config => {
      const anim = this.animateCard(
        config.card,
        config.startX,
        config.startY,
        config.endX,
        config.endY,
        config.duration || 500,
        () => {
          completedCount++;
          if (completedCount === configs.length) {
            onComplete();
          }
        }
      );
    });
  }

  /**
   * Play animations sequentially (one after another)
   */
  playSequentialAnimations(configs, onComplete) {
    if (configs.length === 0) {
      onComplete();
      return;
    }

    const playNext = (index) => {
      if (index >= configs.length) {
        onComplete();
        return;
      }

      const config = configs[index];
      this.animateCard(
        config.card,
        config.startX,
        config.startY,
        config.endX,
        config.endY,
        config.duration || 500,
        () => playNext(index + 1)
      );
    };

    playNext(0);
  }

  /**
   * Fire an animation event for sound hooks
   */
  fireAnimationEvent(eventName, data) {
    debugLogger.log('animation', `🔊 Animation Event: ${eventName}`, data);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hanafuda:animation', {
        detail: {
          event: eventName,
          data: data
        }
      }));
    }
  }

  /**
   * SCENARIO 1 & 2: Create sequence for hand/drawn card matching with field card
   * Stage 1: Moving card → near field card position
   * Stage 2: Match event fires
   * Stage 3: Brief delay
   * Stage 4: Moving card snaps to field card (field card stays in place)
   * Stage 5: Snap event (for future snap sound effect)
   * Stage 6: Brief pause to show the snap
   * Stage 7: Both cards → trick pile together
   */
  createMatchSequence(movingCard, targetCard, capturedZone, player, isDrawnCardMatch = false) {
    const sequence = new AnimationSequence(`${player} Match`);

    // Use _renderX/Y which is set during last render (before cards moved to captured)
    const movingStartPos = {
      x: movingCard._renderX !== undefined ? movingCard._renderX : 0,
      y: movingCard._renderY !== undefined ? movingCard._renderY : 0
    };

    // Field card position (this is where the snap will occur)
    const fieldCardPos = {
      x: targetCard._renderX !== undefined ? targetCard._renderX : 0,
      y: targetCard._renderY !== undefined ? targetCard._renderY : 0
    };

    const pilePos = this.getZonePosition(capturedZone, this.game.getState());

    // Offset for approach (cards visibly separate before snapping)
    const snapOffset = 15;

    debugLogger.log('animation', `Creating match sequence`, {
      movingCard: movingCard.name,
      movingStart: `(${Math.round(movingStartPos.x)}, ${Math.round(movingStartPos.y)})`,
      targetCard: targetCard.name,
      fieldCardPos: `(${Math.round(fieldCardPos.x)}, ${Math.round(fieldCardPos.y)})`,
      pilePos: `(${Math.round(pilePos.x)}, ${Math.round(pilePos.y)})`,
      isDrawnCardMatch
    });

    // Stage 1: Moving card animates to near field card (slightly offset)
    // Use longer duration for drawn card to make it more visible
    const moveToMatchDuration = isDrawnCardMatch ? 500 : 400;
    sequence.addParallelStage([{
      card: movingCard,
      startX: movingStartPos.x,
      startY: movingStartPos.y,
      endX: fieldCardPos.x - snapOffset,
      endY: fieldCardPos.y,
      duration: moveToMatchDuration
    }], 'Card arrives at match');

    // Stage 2: Fire match event
    sequence.addEvent('card_match', {
      movingCard: movingCard.name,
      targetCard: targetCard.name,
      player: player
    });

    // Stage 3: Delay to show the match
    // Use longer delay for drawn card to make the match more understandable
    const matchPauseDelay = isDrawnCardMatch ? 600 : 200;
    sequence.addDelay(matchPauseDelay);

    // Stage 4: Moving card snaps to field card position (field card stays in place)
    sequence.addParallelStage([{
      card: movingCard,
      startX: fieldCardPos.x - snapOffset,
      startY: fieldCardPos.y,
      endX: fieldCardPos.x,
      endY: fieldCardPos.y,
      duration: 150 // Quick snap animation
    }], 'Card snaps to field card');

    // Stage 5: Event for snap sound effect (future feature)
    sequence.addEvent('card_snap', {
      movingCard: movingCard.name,
      targetCard: targetCard.name,
      player: player
    });

    // Stage 6: Brief pause to show the snap
    sequence.addDelay(100);

    // Stage 7: Both cards to pile together from field card position
    sequence.addParallelStage([
      {
        card: movingCard,
        startX: fieldCardPos.x,
        startY: fieldCardPos.y,
        endX: pilePos.x,
        endY: pilePos.y,
        duration: 500
      },
      {
        card: targetCard,
        startX: fieldCardPos.x,
        startY: fieldCardPos.y,
        endX: pilePos.x,
        endY: pilePos.y,
        duration: 500
      }
    ], 'Both cards to pile');

    return sequence;
  }

  /**
   * SCENARIO 5: Create four-of-a-kind celebration sequence
   * All 4 cards of same month captured together
   */
  createFourOfAKindSequence(cards, month, capturedZone, player) {
    const sequence = new AnimationSequence(`${player} Four of ${month}`);

    const celebrationY = 60; // Top of screen
    const centerX = this.renderer.displayWidth / 2;
    const { width: cardWidth } = this.renderer.cardRenderer.getCardDimensions();
    const spacing = 15;

    // Calculate positions for 4 cards in a row
    const totalWidth = 4 * (cardWidth + spacing) - spacing;
    const startX = centerX - totalWidth / 2;

    const celebrationPositions = cards.map((card, index) => ({
      x: startX + index * (cardWidth + spacing),
      y: celebrationY
    }));

    const pilePos = this.getZonePosition(capturedZone, this.game.getState());

    // Stage 1: All cards fly to celebration positions simultaneously
    sequence.addParallelStage(cards.map((card, index) => {
      const startX = card._renderX !== undefined ? card._renderX : celebrationPositions[index].x;
      const startY = card._renderY !== undefined ? card._renderY : celebrationPositions[index].y;

      debugLogger.log('animation', `Card ${index + 1}/4 for celebration`, {
        card: card.name,
        start: `(${Math.round(startX)}, ${Math.round(startY)})`,
        end: `(${Math.round(celebrationPositions[index].x)}, ${Math.round(celebrationPositions[index].y)})`
      });

      return {
        card: card,
        startX: startX,
        startY: startY,
        endX: celebrationPositions[index].x,
        endY: celebrationPositions[index].y,
        duration: 600
      };
    }), 'Cards to celebration area');

    // Stage 2: Fire celebration event
    sequence.addEvent('four_of_a_kind', {
      month: month,
      cards: cards.map(c => c.name),
      player: player
    });

    // Stage 3: Display celebration (pause)
    sequence.addDelay(1200);

    // Stage 4: Cards move together toward center (visual merge)
    const mergeX = centerX - (2 * cardWidth) / 2;
    sequence.addParallelStage(cards.map((card, index) => ({
      card: card,
      startX: celebrationPositions[index].x,
      startY: celebrationPositions[index].y,
      endX: mergeX + (index * cardWidth / 4), // Compress together
      endY: celebrationY,
      duration: 400
    })), 'Cards merge together');

    // Stage 5: Brief pause
    sequence.addDelay(300);

    // Stage 6: All cards to pile together
    sequence.addParallelStage(cards.map((card, index) => ({
      card: card,
      startX: mergeX + (index * cardWidth / 4),
      startY: celebrationY,
      endX: pilePos.x,
      endY: pilePos.y,
      duration: 500
    })), 'All cards to pile');

    return sequence;
  }

  /**
   * Get position for a zone (hand, field, captured, etc.)
   */
  getZonePosition(zone, gameState) {
    const { width: cardWidth, height: cardHeight } = this.renderer.cardRenderer.getCardDimensions();
    const margin = 30;
    const centerX = this.renderer.displayWidth / 2;
    const centerY = this.renderer.displayHeight / 2;

    switch (zone) {
      case 'player_hand':
        return { x: centerX, y: this.renderer.displayHeight - cardHeight - margin - 10 };
      case 'opponent_hand':
        return { x: centerX, y: margin + 10 };
      case 'field':
        return { x: centerX, y: centerY - cardHeight / 2 };
      case 'player_captured':
        return { x: this.renderer.displayWidth - cardWidth - margin, y: this.renderer.displayHeight - cardHeight - margin };
      case 'opponent_captured':
        return { x: this.renderer.displayWidth - cardWidth - margin, y: margin };
      case 'deck':
        return { x: margin, y: centerY - cardHeight / 2 };
      default:
        return { x: centerX, y: centerY };
    }
  }

  gameLoop() {
    try {
      const now = performance.now();
      const deltaTime = this.lastTime ? (now - this.lastTime) / 1000 : 0; // Convert to seconds
      this.lastTime = now;

      const state = this.game.getState();

      // If animation tester is active, render it instead of the game
      if (this.animationTesterActive) {
        try {
          this.animationTester.update(deltaTime);
          const ctx = this.canvas.getContext('2d');

          // Reset canvas state and clear properly
          ctx.save();
          const beforeTransform = ctx.getTransform();
          debugLogger.log('render', '🔧 AnimationTester canvas state before reset', {
            transform: `[${beforeTransform.a}, ${beforeTransform.b}, ${beforeTransform.c}, ${beforeTransform.d}, ${beforeTransform.e}, ${beforeTransform.f}]`,
            canvasSize: `${this.canvas.width}x${this.canvas.height}`,
            displaySize: `${this.renderer.displayWidth}x${this.renderer.displayHeight}`
          });

          ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to identity
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the entire physical canvas

          // Re-apply device pixel ratio scaling for proper rendering
          const dpr = window.devicePixelRatio || 1;
          ctx.scale(dpr, dpr);

          const afterTransform = ctx.getTransform();
          debugLogger.log('render', '🔧 AnimationTester canvas state after reset', {
            transform: `[${afterTransform.a}, ${afterTransform.b}, ${afterTransform.c}, ${afterTransform.d}, ${afterTransform.e}, ${afterTransform.f}]`,
            dpr
          });

          // Use display dimensions for rendering
          this.animationTester.render(ctx, this.renderer.displayWidth, this.renderer.displayHeight);
          ctx.restore();
        } catch (err) {
          debugLogger.logError('Error in animation tester', err);
        }
      } else {
        // Update Card3D system
        try {
          // Update physics and animations
          this.card3DManager.update(now);

          // Synchronize with game state (detects card movements between zones)
          this.card3DManager.synchronize(state);

          // Handle hover detection for 3D cards (only if 3D animations enabled)
          if (this.gameOptions.get('experimental3DAnimations')) {
            this.updateCardHoverState();
          }
        } catch (err) {
          debugLogger.logError('Error in Card3D system update', err);
        }

        // Render
        try {
          const renderOptions = {
            helpMode: this.helpMode,
            hoverX: this.hoverX,
            hoverY: this.hoverY,
            isModalVisible: this.koikoiModal.classList.contains('show'),
            card3DManager: this.card3DManager
          };

          this.renderer.render(state, [], renderOptions);
        } catch (err) {
          debugLogger.logError('Error in render', err);
        }

        // Update UI
        try {
          this.updateUI();
        } catch (err) {
          debugLogger.logError('Error in updateUI', err);
        }
      }

      // Log game loop status periodically (every 300 frames ~5 seconds at 60fps)
      this.frameCount++;
      if (this.frameCount === 1) {
        debugLogger.log('gameState', '🎮 Game loop started', null);
      } else if (this.frameCount % 300 === 0) {
        debugLogger.log('gameState', `Game loop running (frame ${this.frameCount})`, {
          phase: state.phase,
          deltaTime: Math.round(deltaTime)
        });
      }
    } catch (err) {
      debugLogger.logError('Critical error in game loop', err);
    }

    // Continue loop (always, even if there was an error)
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Check for state changes and trigger animations
   */
  checkForStateChanges(state) {
    // Check if player captured cards
    if (state.playerCaptured.length > this.lastStateLengths.playerCaptured) {
      const capturedCount = state.playerCaptured.length - this.lastStateLengths.playerCaptured;
      const newlyCaptured = state.playerCaptured.slice(-capturedCount);

      debugLogger.log('animation', `📊 DETECTED player capture via polling`, {
        before: this.lastStateLengths.playerCaptured,
        after: state.playerCaptured.length,
        newCards: newlyCaptured.map(c => c.name)
      });

      this.triggerCaptureAnimation(newlyCaptured, 'player_captured', 'Player');
      this.lastStateLengths.playerCaptured = state.playerCaptured.length;
    }

    // Check if opponent captured cards
    if (state.opponentCaptured.length > this.lastStateLengths.opponentCaptured) {
      const capturedCount = state.opponentCaptured.length - this.lastStateLengths.opponentCaptured;
      const newlyCaptured = state.opponentCaptured.slice(-capturedCount);

      debugLogger.log('animation', `📊 DETECTED opponent capture via polling`, {
        before: this.lastStateLengths.opponentCaptured,
        after: state.opponentCaptured.length,
        newCards: newlyCaptured.map(c => c.name)
      });

      this.triggerCaptureAnimation(newlyCaptured, 'opponent_captured', 'Opponent');
      this.lastStateLengths.opponentCaptured = state.opponentCaptured.length;
    }

    // Update field count (for future use)
    this.lastStateLengths.field = state.field.length;
  }

  /**
   * Trigger appropriate animation sequence for captured cards
   */
  triggerCaptureAnimation(cards, capturedZone, player) {
    if (cards.length === 4) {
      // Four of a kind!
      const month = cards[0].month;
      const sequence = this.createFourOfAKindSequence(cards, month, capturedZone, player);
      this.playSequence(sequence);
    } else if (cards.length === 2) {
      // Normal match - determine which card came from hand/drawnCard and which from field

      // Check if either card came from drawnCard zone
      const card3D_0 = this.card3DManager.cards.get(cards[0].id);
      const card3D_1 = this.card3DManager.cards.get(cards[1].id);

      const drawnCard = (card3D_0?.previousZone === 'drawnCard') ? cards[0] :
                       (card3D_1?.previousZone === 'drawnCard') ? cards[1] : null;

      let movingCard, targetCard;

      if (drawnCard) {
        // One card came from drawnCard zone - it should move to the other card
        movingCard = drawnCard;
        targetCard = (drawnCard === cards[0]) ? cards[1] : cards[0];

        debugLogger.log('animation', `Detected drawn card match`, {
          drawnCard: movingCard.name,
          fieldCard: targetCard.name
        });
      } else {
        // Normal hand/field match
        const fieldCard = cards.find(c => c._owner === 'field');
        const handCard = cards.find(c => c._owner === 'player' || c._owner === 'opponent');

        // If we can't determine by owner, use Y position (hand cards are higher/lower than field)
        if (fieldCard && handCard) {
          movingCard = handCard;  // Hand card moves to field card
          targetCard = fieldCard;
        } else {
          // Fallback: use the card with higher/lower Y as hand card
          // Field is in center, player hand is at bottom, opponent hand is at top
          const centerY = this.renderer.displayHeight / 2;
          if (Math.abs((cards[0]._renderY || 0) - centerY) > Math.abs((cards[1]._renderY || 0) - centerY)) {
            movingCard = cards[0];  // Card farther from center (hand)
            targetCard = cards[1];  // Card closer to center (field)
          } else {
            movingCard = cards[1];
            targetCard = cards[0];
          }
        }
      }

      debugLogger.log('animation', `Determined animation direction`, {
        movingCard: `${movingCard.name} (owner: ${movingCard._owner})`,
        targetCard: `${targetCard.name} (owner: ${targetCard._owner})`
      });

      // Use longer delays for drawn card matches to make the sequence more understandable
      const isDrawnCardMatch = (drawnCard !== null);
      const sequence = this.createMatchSequence(movingCard, targetCard, capturedZone, player, isDrawnCardMatch);
      this.playSequence(sequence);
    } else {
      // Unexpected count, use fallback
      this.fallbackSimpleAnimation(cards, capturedZone);
    }
  }

  /**
   * Start the card showcase animation - displays all cards in a beautiful fan pattern
   */
  startWaveAnimation() {
    if (!this.card3DManager) {
      debugLogger.logError('Card3DManager not initialized', null);
      return;
    }

    debugLogger.log('animation', '✨ Starting showcase animation', null);

    // Get current game state
    const state = this.game.getState();

    // Collect all Card3D objects from all zones
    const allCard3Ds = [];
    this.card3DManager.cards.forEach(card3D => {
      allCard3Ds.push(card3D);
    });

    if (allCard3Ds.length === 0) {
      debugLogger.log('animation', 'No cards available for showcase', null);
      return;
    }

    // Store original positions for return animation
    allCard3Ds.forEach(card3D => {
      card3D._showcaseOriginalZone = card3D.homeZone;
      card3D._showcaseOriginalX = card3D.homePosition.x;
      card3D._showcaseOriginalY = card3D.homePosition.y;
    });

    // Calculate fan positions in a circular arc
    const centerX = this.renderer.displayWidth / 2;
    const centerY = this.renderer.displayHeight / 2;
    const radius = Math.min(this.renderer.displayWidth, this.renderer.displayHeight) * 0.35;
    const arcAngle = Math.PI * 1.2; // 216 degrees
    const startAngle = -Math.PI / 2 - arcAngle / 2; // Start from top

    // Animate cards into fan formation
    allCard3Ds.forEach((card3D, index) => {
      const progress = allCard3Ds.length > 1 ? index / (allCard3Ds.length - 1) : 0.5;
      const angle = startAngle + arcAngle * progress;

      const targetX = centerX + Math.cos(angle) * radius;
      const targetY = centerY + Math.sin(angle) * radius;
      const targetZ = 20 + Math.sin(progress * Math.PI) * 30; // Arc in Z dimension

      const delay = index * 30; // Stagger the animation

      setTimeout(() => {
        card3D.tweenTo({
          x: targetX,
          y: targetY,
          z: targetZ,
          faceUp: 1,
          rotation: angle + Math.PI / 2 // Cards face outward from center
        }, 600, 'easeOutCubic');
      }, delay);
    });

    // Return cards to original positions after showcase
    const showcaseDuration = allCard3Ds.length * 30 + 600 + 2000; // Stagger + animation + hold time

    setTimeout(() => {
      allCard3Ds.forEach((card3D, index) => {
        const delay = index * 20; // Faster return stagger

        setTimeout(() => {
          // Restore original face-up state based on zone
          const originalFaceUp = (card3D._showcaseOriginalZone === 'opponentHand' || card3D._showcaseOriginalZone === 'deck') ? 0 : 1;

          card3D.tweenTo({
            x: card3D._showcaseOriginalX,
            y: card3D._showcaseOriginalY,
            z: 0,
            faceUp: originalFaceUp,
            rotation: 0
          }, 500, 'easeInOutQuad');
        }, delay);
      });

      debugLogger.log('animation', '✨ Showcase animation complete', null);
    }, showcaseDuration);
  }

  /**
   * Load background texture (optional)
   */
  async loadBackground(imageUrl) {
    try {
      await this.renderer.loadBackground(imageUrl);
      console.log('Background loaded successfully');
    } catch (error) {
      console.warn('Failed to load background:', error);
    }
  }

  /**
   * Show animation tester
   */
  showAnimationTester() {
    this.animationTesterPanel.classList.remove('hidden');
    this.animationTesterActive = true;
    // Use display dimensions, not physical canvas dimensions
    this.animationTester.initialize(this.renderer.displayWidth, this.renderer.displayHeight);
    // Update controls to show the calculated default positions
    this.updateAnimationTesterControls();
    debugLogger.log('animation', 'Animation tester opened', null);
  }

  /**
   * Hide animation tester
   */
  hideAnimationTester() {
    this.animationTesterPanel.classList.add('hidden');
    this.animationTesterActive = false;
    this.animationTester.deactivate();
    debugLogger.log('animation', 'Animation tester closed', null);
  }

  /**
   * Setup animation tester controls
   */
  setupAnimationTesterControls() {
    // Close button
    document.getElementById('close-animation-tester').addEventListener('click', () => {
      this.hideAnimationTester();
    });

    // Play button
    document.getElementById('play-animation').addEventListener('click', () => {
      this.animationTester.playAnimation();
    });

    // Reset button
    document.getElementById('reset-animation').addEventListener('click', () => {
      this.animationTester.stopAnimation();
    });

    // Preset selector
    document.getElementById('animation-preset').addEventListener('change', (e) => {
      const presetName = e.target.value;
      if (presetName) {
        this.animationTester.loadPreset(presetName);
        this.updateAnimationTesterControls();
      }
    });

    // End position controls
    this.setupRangeControl('endX');
    this.setupRangeControl('endY');
    this.setupRangeControl('endZ');

    // Curved path controls
    document.getElementById('curveEnabled').addEventListener('change', (e) => {
      this.animationTester.updateParam('curveEnabled', e.target.checked);
    });
    this.setupRangeControl('curveX');
    this.setupRangeControl('curveY');
    this.setupRangeControl('curveZ');

    // Animation controls
    this.setupRangeControl('duration');
    document.getElementById('easing').addEventListener('change', (e) => {
      this.animationTester.updateParam('easing', e.target.value);
    });

    // Rotation & Scale controls
    this.setupRangeControl('endRotation', (value) => value * Math.PI / 180); // Convert to radians
    this.setupRangeControl('endScale');

    // Appearance controls
    document.getElementById('endFaceUp').addEventListener('change', (e) => {
      this.animationTester.updateParam('endFaceUp', e.target.checked ? 1 : 0);
    });
    this.setupRangeControl('flipTiming');
    this.setupRangeControl('endOpacity');
  }

  /**
   * Setup a range control with value display
   */
  setupRangeControl(paramName, valueTransform = null) {
    const input = document.getElementById(paramName);
    const valueDisplay = document.getElementById(`${paramName}-value`);

    if (!input || !valueDisplay) return;

    input.addEventListener('input', (e) => {
      const displayValue = parseFloat(e.target.value);
      const actualValue = valueTransform ? valueTransform(displayValue) : displayValue;

      valueDisplay.textContent = displayValue;
      this.animationTester.updateParam(paramName, actualValue);
    });
  }

  /**
   * Update animation tester controls to reflect current values
   */
  updateAnimationTesterControls() {
    const params = this.animationTester.params;

    // Update all range inputs and their value displays
    const rangeParams = [
      'endX', 'endY', 'endZ',
      'curveX', 'curveY', 'curveZ',
      'duration',
      'endScale',
      'flipTiming',
      'endOpacity'
    ];

    rangeParams.forEach(param => {
      const input = document.getElementById(param);
      const valueDisplay = document.getElementById(`${param}-value`);
      if (input && valueDisplay) {
        input.value = params[param];
        valueDisplay.textContent = params[param];
      }
    });

    // Update rotation (convert from radians to degrees)
    const endRotInput = document.getElementById('endRotation');
    const endRotDisplay = document.getElementById('endRotation-value');
    if (endRotInput && endRotDisplay) {
      const degrees = Math.round(params.endRotation * 180 / Math.PI);
      endRotInput.value = degrees;
      endRotDisplay.textContent = degrees;
    }

    // Update checkboxes
    const endFaceUpCheckbox = document.getElementById('endFaceUp');
    if (endFaceUpCheckbox) {
      endFaceUpCheckbox.checked = params.endFaceUp === 1;
    }

    const curveEnabledCheckbox = document.getElementById('curveEnabled');
    if (curveEnabledCheckbox) {
      curveEnabledCheckbox.checked = params.curveEnabled === true;
    }

    // Update easing select
    document.getElementById('easing').value = params.easing;
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log(`Hanafuda Koi-Koi starting (v${APP_VERSION})`);

  const game = new Game();

  // Run async initialization with loading screen
  await game.initialize();

  // Example: Load background if available
  // game.loadBackground('./assets/backgrounds/texture.jpg');

  console.log(`Hanafuda Koi-Koi ready (v${APP_VERSION})`);
});
