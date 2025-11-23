/**
 * Main entry point for Hanafuda Koi-Koi game
 */

import { KoiKoi } from './game/KoiKoi.js';
import { Sakura } from './game/Sakura.js';
import { MatchGame } from './game/MatchGame.js';
import { KoiKoiShop } from './game/KoiKoiShop.js';
import { HachiHachi } from './game/HachiHachi.js';
import { HachiHachiModals } from './ui/HachiHachiModals.js';
import { Renderer } from './rendering/Renderer.js';
import { debugLogger } from './utils/DebugLogger.js';
import { GameOptions } from './game/GameOptions.js';
import { Card3DManager } from './utils/Card3DManager.js';
import { AnimationTester } from './utils/AnimationTester.js';
import { InitializationManager } from './utils/InitializationManager.js';
import { AudioManager } from './utils/AudioManager.js';
import { APP_VERSION } from './utils/version.js';
import { CARD_BACKS, getSelectedCardBack, setSelectedCardBack } from './data/cardBacks.js';
import { HANAFUDA_DECK } from './data/cards.js';
import { ShopUI } from './ui/ShopUI.js';
import { GameStateValidator } from './utils/GameStateValidator.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.statusElement = document.getElementById('game-status');
    this.instructionsElement = document.getElementById('instructions');
    this.scoreDisplayElement = document.getElementById('score-display');
    this.scoreContainer = document.getElementById('score');
    this.newGameButton = document.getElementById('new-game-btn');
    this.helpButton = document.getElementById('help-btn');
    this.variationsButton = document.getElementById('variations-btn');
    this.cardBackButton = document.getElementById('card-back-btn');
    this.optionsButton = document.getElementById('options-btn');
    this.animationTesterButton = document.getElementById('animation-tester-btn');
    this.roundModal = document.getElementById('round-modal');
    this.variationsModal = document.getElementById('variations-modal');
    this.cardBackModal = document.getElementById('card-back-modal');
    this.optionsModal = document.getElementById('options-modal');
    this.matchOptionsModal = document.getElementById('match-options-modal');
    this.koikoiModal = document.getElementById('koikoi-modal');
    this.roundSummaryModal = document.getElementById('round-summary-modal');
    this.shopModal = document.getElementById('shop-modal');
    this.tutorialBubble = document.getElementById('tutorial-bubble');
    this.animationTesterPanel = document.getElementById('animation-tester-panel');

    // Initialize game options
    this.gameOptions = new GameOptions();

    // Game mode tracking - restore from localStorage or default to 'koikoi'
    this.currentGameMode = localStorage.getItem('currentGameMode') || 'koikoi'; // 'koikoi', 'sakura', 'match', or 'shop'
    this.justSwitchedMode = false; // Track if we just switched game modes to prevent unwanted animations
    this.gameModeSelect = document.getElementById('game-mode-select');

    // Player count for Sakura (used in multi-player setup)
    this.selectedPlayerCount = 2; // Default: 2 players
    this.isTeamsMode = false; // For 4P: true = teams, false = competitive

    // Initialize all game types
    this.koikoiGame = new KoiKoi(this.gameOptions);
    this.koikoiGame.setUICallback((yaku, score) => this.showKoikoiDecision(yaku, score));
    this.koikoiGame.setRoundSummaryCallback((data) => this.showRoundSummary(data));
    this.koikoiGame.setOpponentKoikoiCallback(() => this.showOpponentKoikoiNotification());

    this.sakuraGame = new Sakura(this.gameOptions);
    this.sakuraGame.setRoundSummaryCallback((data) => this.showSakuraRoundSummary(data));

    this.matchGame = new MatchGame(this.gameOptions);

    this.shopGame = new KoiKoiShop(this.gameOptions);
    this.shopGame.setRoundSummaryCallback((data) => this.showRoundSummary(data));

    this.hachihachiGame = new HachiHachi(this.gameOptions);
    this.hachihachiGame.setUICallback((decision, params) => this.showHachihachiDecision(decision, params));
    this.hachihachiGame.setRoundSummaryCallback((data) => this.showHachihachiRoundSummary(data));
    this.hachihachiGame.setTeyakuPaymentCallback((params) => this.showTeyakuPaymentGrid(params));

    // Set active game based on mode
    this.game = this.koikoiGame;

    this.renderer = new Renderer(this.canvas);
    // Set the field background to the green color
    this.renderer.setBackgroundColor('hsl(137, 44%, 27%)');
    // Set the card back to the selected one
    const selectedCardBackId = getSelectedCardBack();
    this.renderer.cardRenderer.setCardBack(selectedCardBackId);

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
        this.animationTester.initialize(width, height, this.canvas);
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

    // Set Card3D manager for game modes that need custom animations
    this.sakuraGame.setCard3DManager(this.card3DManager);
    this.hachihachiGame.setCard3DManager(this.card3DManager);

    // Initialize Audio Manager
    this.audioManager = new AudioManager();
    this.audioManager.setEnabled(this.gameOptions.get('audioEnabled', true));
    this.audioManager.loadAudio();
    debugLogger.log('audio', '🎵 Audio Manager initialized', null);

    // Set audio manager for all games
    this.koikoiGame.setAudioManager(this.audioManager);
    this.sakuraGame.setAudioManager(this.audioManager);
    this.matchGame.setAudioManager(this.audioManager);
    this.shopGame.setAudioManager(this.audioManager);
    this.hachihachiGame.setAudioManager(this.audioManager);

    // Initialize Animation Tester
    this.animationTester = new AnimationTester(this.renderer.cardRenderer, this.card3DManager);
    this.animationTesterActive = false;

    // Initialize Shop UI
    this.shopUI = new ShopUI(this.renderer.cardRenderer);
    this.shopUI.setOnCompleteCallback((cards, condition) => this.startShopGame(cards, condition));

    this.lastMessage = '';
    this.lastGameOverMessage = '';
    this.frameCount = 0;

    // Animation tracking
    this.lastShowcaseAnimation = -1; // Track last showcase animation to prevent repeats

    this.hoverX = -1;             // Mouse hover X position
    this.hoverY = -1;             // Mouse hover Y position
    this.hoveredCard3D = null;    // Currently hovered Card3D object

    // Drag and drop state
    this.draggedCard3D = null;    // Card being dragged
    this.draggedCardData = null;  // Card data of dragged card
    this.dragStartX = -1;         // Drag start X position
    this.dragStartY = -1;         // Drag start Y position
    this.isDragging = false;      // Whether a drag is in progress
    this.dropTargetCard3D = null; // Valid drop target card (matching card on field)

    // Selected card state (for click-to-match)
    this.selectedCard3D = null;   // Card selected for matching (stays raised)

    // Floating text for match game celebrations
    this.floatingTexts = [];      // Array of {text, x, y, opacity, age, maxAge}

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

      // Restore game mode select dropdown value from localStorage
      this.gameModeSelect.value = this.currentGameMode;

      // Hide loading screen with fade out
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
      }, 500);

      // Show tutorial bubble if first time user
      if (this.gameOptions.isFirstTime()) {
        setTimeout(() => this.showTutorial(), 1000);
      }

      // Start the appropriate game based on current mode
      if (this.currentGameMode === 'match') {
        // Switch to match game mode (this will start a new match game)
        this.switchGameMode('match');
      } else if (this.currentGameMode === 'shop') {
        // Switch to shop mode (this will show the shop)
        this.switchGameMode('shop');
      } else if (this.currentGameMode === 'sakura') {
        // Switch to Sakura mode
        this.switchGameMode('sakura');
        this.showRoundModal();
      } else if (this.currentGameMode === 'hachihachi') {
        // Switch to Hachi-Hachi mode
        this.switchGameMode('hachihachi');
        this.showRoundModal();
      } else {
        // Show round modal for Koi Koi
        this.showRoundModal();
      }

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
    // Canvas mouse events for drag and drop
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    // Canvas double-click for auto-match (still supported)
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    // Canvas mouse leave to clear hover and cancel drag
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverX = -1;
      this.hoverY = -1;
      // Cancel any drag in progress
      if (this.isDragging) {
        this.cancelDrag();
      }
    });

    // Game mode selector
    this.gameModeSelect.addEventListener('change', (e) => this.switchGameMode(e.target.value));

    // New game button
    this.newGameButton.addEventListener('click', () => this.showRoundModal());

    // Help button
    this.helpButton.addEventListener('click', () => this.toggleHelpMode());

    // Variations button
    this.variationsButton.addEventListener('click', () => this.toggleVariationsModal());

    // Card back button
    this.cardBackButton.addEventListener('click', () => this.showCardBackModal());

    // Options button
    this.optionsButton.addEventListener('click', () => this.showOptionsModal());

    // Animation tester button
    this.animationTesterButton.addEventListener('click', () => this.showAnimationTester());

    // Round selection buttons
    document.querySelectorAll('.round-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rounds = parseInt(e.target.dataset.rounds);
        this.startNewGame(rounds, this.selectedPlayerCount || 2);
      });
    });

    // Sakura player count buttons
    document.querySelectorAll('.player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const players = parseInt(e.target.dataset.players);
        this.selectedPlayerCount = players;
        this.isTeamsMode = (players === 4); // 4P is always teams mode
        this.showRoundSelection();

        // Show/hide team info
        const teamInfo = document.getElementById('sakura-team-info');
        if (players === 4) {
          teamInfo.style.display = 'block';
        } else {
          teamInfo.style.display = 'none';
        }
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

    // Card back modal buttons
    document.getElementById('card-back-close').addEventListener('click', () => this.hideCardBackModal());

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

    // Sakura variations
    const sakuraVariations = ['chitsiobiki', 'victory-scoring', 'basa-chu', 'both-players-score', 'oibana'];
    sakuraVariations.forEach(variationId => {
      const element = document.getElementById(`${variationId}-enabled`);
      if (element) {
        element.addEventListener('change', (e) => {
          const optionKey = variationId.split('-').map((word, i) =>
            i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
          ).join('') + 'Enabled';

          this.gameOptions.set(optionKey, e.target.checked);
          this.game.updateOptions(this.gameOptions);
          this.updateVariationsButtonState();

          // Reset game when variation is toggled
          if (confirm('Changing variations will reset the current game. Continue?')) {
            this.showRoundModal();
          } else {
            // Revert the change
            e.target.checked = !e.target.checked;
            this.gameOptions.set(optionKey, e.target.checked);
            this.game.updateOptions(this.gameOptions);
            this.updateVariationsButtonState();
          }
        });
      }
    });

    // Match options modal buttons
    document.getElementById('match-options-start').addEventListener('click', () => this.startMatchGame());
    document.getElementById('match-options-cancel').addEventListener('click', () => this.hideMatchOptionsModal());
    document.getElementById('show-normal-scores').addEventListener('click', () => this.showHighScores(false));
    document.getElementById('show-bonus-scores').addEventListener('click', () => this.showHighScores(true));

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
    // Hide all other modals before showing this one
    this.hideAllModals();

    // Show match options modal for match game
    if (this.currentGameMode === 'match') {
      this.showMatchOptionsModal();
      return;
    }

    // Show shop modal for shop mode
    if (this.currentGameMode === 'shop') {
      this.showShopModal();
      return;
    }

    // For Sakura, show player selection first
    if (this.currentGameMode === 'sakura') {
      document.getElementById('sakura-player-selection').style.display = 'block';
      document.getElementById('round-selection').style.display = 'none';
      this.selectedPlayerCount = null;
    } else {
      // For other games, hide player selection and show round selection
      document.getElementById('sakura-player-selection').style.display = 'none';
      document.getElementById('round-selection').style.display = 'block';
    }

    this.roundModal.classList.add('show');
  }

  /**
   * Show the round selection section (called after player count is selected in Sakura)
   */
  showRoundSelection() {
    document.getElementById('sakura-player-selection').style.display = 'none';
    document.getElementById('round-selection').style.display = 'block';
  }

  hideRoundModal() {
    this.roundModal.classList.remove('show');
  }

  /**
   * Show the shop modal for Koi Koi Shop mode
   */
  showShopModal() {
    // Hide all other modals before showing this one
    this.hideAllModals();

    // Hide bonus chance display from previous game when opening shop
    this.hideActiveWinCondition();

    this.shopUI.initialize();
    this.shopUI.renderToModal(this.shopModal.querySelector('.shop-modal-content'));
    this.shopModal.classList.add('show');
  }

  /**
   * Hide the shop modal
   */
  hideShopModal() {
    this.shopModal.classList.remove('show');
  }

  /**
   * Hide all modals to ensure clean state transitions
   * This prevents multiple modals from being visible simultaneously
   */
  hideAllModals() {
    this.roundModal.classList.remove('show');
    this.shopModal.classList.remove('show');
    this.optionsModal.classList.remove('show');
    this.matchOptionsModal.classList.remove('show');
    this.koikoiModal.classList.remove('show');
    this.roundSummaryModal.classList.remove('show');
    this.cardBackModal.classList.remove('show');
    this.variationsModal.classList.remove('show');
  }

  /**
   * Start the shop game with selected cards and bonus chance
   */
  startShopGame(selectedCards, winCondition) {
    this.hideAllModals();

    // Start the shop game with the selected cards and bonus chance
    this.shopGame.startShopGame(selectedCards, winCondition);

    this.updateUI();

    // Initialize Card3D system from game state with Toss Across animation
    this.card3DManager.setAnimationsEnabled(this.gameOptions.get('animationsEnabled'));
    this.card3DManager.initializeFromGameState(this.game.getState(), true);
    debugLogger.log('3dCards', '✨ Card3D system initialized for shop game', null);

    // Add the active bonus chance display to the page
    this.showActiveWinCondition(winCondition);
  }

  /**
   * Show the active bonus chance during gameplay
   */
  showActiveWinCondition(winCondition) {
    const element = document.getElementById('active-win-condition');
    if (!element) return;

    element.innerHTML = `
      <h4>${winCondition.stars} ${winCondition.name}</h4>
      <p>${winCondition.description}</p>
      <div class="win-condition-progress" id="win-condition-progress">
        <!-- Progress will be updated here -->
      </div>
    `;

    element.classList.remove('hidden');
  }

  /**
   * Hide the active bonus chance display
   */
  hideActiveWinCondition() {
    const element = document.getElementById('active-win-condition');
    if (element) {
      element.classList.add('hidden');
    }
  }

  /**
   * Update the bonus chance progress display
   */
  updateWinConditionProgress() {
    if (this.currentGameMode !== 'shop') return;

    const progressElement = document.getElementById('win-condition-progress');
    if (!progressElement) return;

    const state = this.game.getState();
    if (!state.selectedWinCondition) return;

    // Get progress based on bonus chance type
    const progress = this.getWinConditionProgress(state);
    progressElement.textContent = progress;
  }

  /**
   * Get progress text for the current bonus chance
   */
  getWinConditionProgress(state) {
    const condition = state.selectedWinCondition;
    const playerCaptured = state.playerCaptured || [];

    switch (condition.id) {
      case 'easy_five_animals':
      case 'medium_seven_animals': {
        const count = playerCaptured.filter(c => c.type === 'animal').length;
        const target = condition.id.includes('five') ? 5 : 7;
        return `Animals: ${count}/${target}`;
      }

      case 'easy_five_ribbons':
      case 'medium_seven_ribbons':
      case 'hard_eight_ribbons': {
        const count = playerCaptured.filter(c => c.type === 'ribbon').length;
        const target = condition.id.includes('five') ? 5 : condition.id.includes('seven') ? 7 : 8;
        return `Ribbons: ${count}/${target}`;
      }

      case 'easy_ten_chaff':
      case 'medium_twelve_chaff':
      case 'hard_fourteen_chaff': {
        const count = playerCaptured.filter(c => c.type === 'chaff').length;
        const target = condition.id.includes('ten') ? 10 : condition.id.includes('twelve') ? 12 : 14;
        return `Chaff: ${count}/${target}`;
      }

      case 'easy_two_brights':
      case 'hard_three_brights': {
        const count = playerCaptured.filter(c => c.type === 'bright').length;
        const target = condition.id.includes('two') ? 2 : 3;
        return `Brights: ${count}/${target}`;
      }

      case 'medium_three_months':
      case 'hard_four_months': {
        const monthCounts = {};
        playerCaptured.forEach(card => {
          monthCounts[card.month] = (monthCounts[card.month] || 0) + 1;
        });
        const completeMonths = Object.values(monthCounts).filter(c => c === 4).length;
        const target = condition.id.includes('three') ? 3 : 4;
        return `Complete months: ${completeMonths}/${target}`;
      }

      case 'hard_speed_run': {
        const remaining = state.deck?.cards?.length || 0;
        return `Deck remaining: ${remaining} (need yaku before 10)`;
      }

      case 'easy_animal_or_ribbon': {
        const animals = playerCaptured.filter(c => c.type === 'animal').length;
        const ribbons = playerCaptured.filter(c => c.type === 'ribbon').length;
        return `Animals: ${animals}/5 or Ribbons: ${ribbons}/5`;
      }

      case 'easy_any_special':
      case 'medium_poetry_ribbons':
      case 'medium_blue_ribbons':
      case 'medium_boar_deer_butterfly':
      case 'hard_two_special_yaku': {
        // Check which special yaku are complete
        const specialYaku = ['Poetry Ribbons', 'Blue Ribbons', 'Boar-Deer-Butterfly'];
        const completedSpecial = [];
        // TODO: Would need to check yaku here, for now show general progress
        return 'Check yaku progress...';
      }

      case 'easy_any_sake':
      case 'medium_both_sake': {
        return 'Need sake cup yaku...';
      }

      case 'hard_block_opponent': {
        return 'Keep opponent from scoring yaku!';
      }

      default:
        return 'In progress...';
    }
  }

  showMatchOptionsModal() {
    // Hide all other modals before showing this one
    this.hideAllModals();

    // Load current bonus setting
    const bonusCheckbox = document.getElementById('bonus-multiplier-enabled');
    bonusCheckbox.checked = this.matchGame.bonusMultiplierEnabled;

    // Load current animation setting
    const animCheckbox = document.getElementById('match-animations-enabled');
    animCheckbox.checked = this.gameOptions.get('animationsEnabled', true);

    // Show high scores for normal mode by default
    this.showHighScores(false);

    this.matchOptionsModal.classList.add('show');
  }

  hideMatchOptionsModal() {
    this.matchOptionsModal.classList.remove('show');
  }

  startMatchGame() {
    const bonusEnabled = document.getElementById('bonus-multiplier-enabled').checked;
    const animEnabled = document.getElementById('match-animations-enabled').checked;
    this.hideAllModals();

    // Save animation setting to game options
    this.gameOptions.set('animationsEnabled', animEnabled);

    this.game.startNewGame(bonusEnabled, this.renderer.displayWidth, this.renderer.displayHeight);
    this.updateUI();

    // Initialize Card3D system from game state
    this.card3DManager.setAnimationsEnabled(animEnabled);
    this.card3DManager.initializeFromGameState(this.game.getState(), false);

    // Override card positions to use match game's predetermined positions
    const gameState = this.game.getState();
    gameState.allCards.forEach(cardData => {
      const card3D = this.card3DManager.cards.get(cardData.id);
      if (card3D && cardData.position) {
        // Set custom position from match game
        card3D.homePosition = {
          x: cardData.position.x,
          y: cardData.position.y,
          z: 0
        };
        // For match game, cards start face down
        card3D.faceUp = 0;
        card3D.setFaceUp(false);
      }
    });

    // Apply Toss Across animation if enabled (cards end face-down for match game)
    if (animEnabled) {
      this.card3DManager.applyTossAcrossAnimation(false); // false = end face down
    } else {
      // If animations disabled, immediately position cards
      gameState.allCards.forEach(cardData => {
        const card3D = this.card3DManager.cards.get(cardData.id);
        if (card3D && cardData.position) {
          card3D.x = cardData.position.x;
          card3D.y = cardData.position.y;
          card3D.z = 0;
          card3D.faceUp = 0; // Face down
        }
      });
    }

    debugLogger.log('3dCards', '✨ Card3D system initialized for match game', null);
  }

  showHighScores(bonusMode = false) {
    // Update tab active state
    document.getElementById('show-normal-scores').classList.toggle('active', !bonusMode);
    document.getElementById('show-bonus-scores').classList.toggle('active', bonusMode);

    // Create a temporary match game instance to access high scores
    const tempGame = new MatchGame();
    tempGame.bonusMultiplierEnabled = bonusMode;
    const scores = tempGame.getHighScores();

    const listElement = document.getElementById('high-scores-list');
    listElement.innerHTML = '';

    if (scores.length === 0) {
      // CSS will show the "No high scores" message via :empty pseudo-class
      return;
    }

    scores.forEach((score, index) => {
      const item = document.createElement('div');
      item.className = 'high-score-item';

      const rank = document.createElement('span');
      rank.className = 'score-rank';
      rank.textContent = `#${index + 1}`;

      const time = document.createElement('span');
      time.className = 'score-time';
      time.textContent = score.formattedTime;

      item.appendChild(rank);
      item.appendChild(time);

      if (bonusMode) {
        const points = document.createElement('span');
        points.className = 'score-points';
        points.textContent = `${score.score} pts`;
        item.appendChild(points);
      }

      const date = document.createElement('span');
      date.className = 'score-date';
      const scoreDate = new Date(score.date);
      date.textContent = scoreDate.toLocaleDateString();
      item.appendChild(date);

      listElement.appendChild(item);
    });
  }

  startNewGame(rounds, playerCount) {
    this.hideAllModals();

    if (this.currentGameMode === 'match') {
      // Match game doesn't use rounds - pass viewport dimensions
      this.game.startNewGame(false, this.renderer.displayWidth, this.renderer.displayHeight);
    } else if (this.currentGameMode === 'sakura') {
      // Sakura uses rounds and playerCount (default 6 rounds, 2 players)
      this.game.startNewGame(rounds || 6, playerCount || 2);
    } else if (this.currentGameMode === 'hachihachi') {
      // Hachi-Hachi uses rounds (always 3 players)
      this.card3DManager.setPlayerCount(3);
      this.game.startGame(rounds || 6);
    } else {
      // Koi Koi uses rounds
      this.game.startNewGame(rounds);
    }

    this.updateUI();
    this.statusElement.classList.remove('show');

    // Initialize Card3D system from game state
    // Don't use Toss Across animation if we just switched game modes, only for new games in same mode
    const shouldAnimate = !this.justSwitchedMode;
    this.justSwitchedMode = false; // Reset flag after use
    this.card3DManager.setAnimationsEnabled(this.gameOptions.get('animationsEnabled'));
    this.card3DManager.initializeFromGameState(this.game.getState(), shouldAnimate);
    debugLogger.log('3dCards', '✨ Card3D system initialized for new game', null);
  }

  switchGameMode(mode) {
    debugLogger.log('gameState', `Switching game mode to: ${mode}`, null);

    // Hide all modals before switching game modes for clean state transition
    this.hideAllModals();

    // Clear all cards from previous game mode to prevent animation artifacts
    this.card3DManager.clear();

    this.currentGameMode = mode;
    this.justSwitchedMode = true; // Flag that we just switched modes to prevent animations on next game start
    // Save game mode to localStorage so it persists across browser refreshes
    localStorage.setItem('currentGameMode', mode);

    // Hide bonus chance display when switching away from shop mode
    if (mode !== 'shop') {
      this.hideActiveWinCondition();
    }

    // Switch active game instance
    if (mode === 'match') {
      this.game = this.matchGame;

      // Hide Koi Koi specific UI elements
      document.getElementById('score').style.display = 'none';
      document.getElementById('variations-btn').style.display = 'none';

      // Keep options button visible but change its behavior
      document.getElementById('options-btn').style.display = 'inline-block';
      document.getElementById('options-btn').textContent = 'Options';

      // Update instructions
      this.instructionsElement.textContent = 'Click cards to flip and find matching pairs!';
    } else if (mode === 'shop') {
      this.game = this.shopGame;

      // Hide score display for shop mode
      document.getElementById('score').style.display = 'none';
      document.getElementById('variations-btn').style.display = 'none';

      // Update instructions
      this.instructionsElement.textContent = 'Achieve your bonus chance!';
    } else if (mode === 'sakura') {
      this.game = this.sakuraGame;

      // Show score display for Sakura mode
      document.getElementById('score').style.display = 'flex';
      document.getElementById('options-btn').style.display = 'inline-block';
      document.getElementById('variations-btn').style.display = 'none';

      // Update instructions
      this.instructionsElement.textContent = 'Sakura (Hawaiian Hanafuda) - Click cards to select them';
    } else if (mode === 'hachihachi') {
      this.game = this.hachihachiGame;

      // Show score display for Hachi-Hachi mode
      document.getElementById('score').style.display = 'flex';
      document.getElementById('options-btn').style.display = 'inline-block';
      document.getElementById('variations-btn').style.display = 'none';

      // Update instructions
      this.instructionsElement.textContent = 'Hachi-Hachi (88) - 3-player game with Sage/Shoubu decisions';
    } else {
      this.game = this.koikoiGame;

      // Show Koi Koi specific UI elements
      document.getElementById('score').style.display = 'flex';
      document.getElementById('options-btn').style.display = 'inline-block';
      document.getElementById('variations-btn').style.display = 'inline-block';

      // Update instructions
      this.instructionsElement.textContent = 'Click cards to select them';
    }

    // Start new game with the selected mode
    if (mode === 'match') {
      this.game.startNewGame(false, this.renderer.displayWidth, this.renderer.displayHeight);
      this.updateUI();

      // Initialize Card3D system from game state
      this.card3DManager.setAnimationsEnabled(this.gameOptions.get('animationsEnabled'));
      this.card3DManager.initializeFromGameState(this.game.getState(), false);

      // Override card positions to use match game's predetermined positions
      const gameState = this.game.getState();
      gameState.allCards.forEach(cardData => {
        const card3D = this.card3DManager.cards.get(cardData.id);
        if (card3D && cardData.position) {
          // Set custom position from match game
          card3D.homePosition = {
            x: cardData.position.x,
            y: cardData.position.y,
            z: 0
          };
          // For match game, cards start face down
          card3D.faceUp = 0;
          card3D.setFaceUp(false);
        }
      });

      // Apply Toss Across animation if enabled and we didn't just switch modes
      if (this.gameOptions.get('animationsEnabled') && !this.justSwitchedMode) {
        this.card3DManager.applyTossAcrossAnimation(false); // false = end face down
      } else {
        // If animations disabled or we just switched modes, immediately position cards
        gameState.allCards.forEach(cardData => {
          const card3D = this.card3DManager.cards.get(cardData.id);
          if (card3D && cardData.position) {
            card3D.x = cardData.position.x;
            card3D.y = cardData.position.y;
            card3D.z = 0;
            card3D.faceUp = 0; // Face down
          }
        });
      }

      this.justSwitchedMode = false; // Reset flag after match mode initialization
      debugLogger.log('3dCards', '✨ Card3D system initialized for match game', null);
    } else if (mode === 'shop') {
      // For Shop mode, show the shop modal
      this.showShopModal();
    } else if (mode === 'sakura') {
      // For Sakura mode, show round modal
      this.showRoundModal();
    } else if (mode === 'hachihachi') {
      // For Hachi-Hachi mode, show round modal (similar to Koi-Koi/Sakura)
      this.showRoundModal();
    } else {
      // For Koi Koi, show round modal
      this.showRoundModal();
    }
  }

  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    debugLogger.log('gameState', `🖱️ Mouse down at (${x.toFixed(0)}, ${y.toFixed(0)}), mode: ${this.currentGameMode}`, null);

    // Handle match game differently - simple click to flip
    if (this.currentGameMode === 'match') {
      const gameState = this.game.getState();

      // Use 3D hit detection
      const card3D = this.card3DManager.getCardAtPosition(x, y);
      if (card3D) {
        const cardData = card3D.cardData;
        debugLogger.log('gameState', `Match game card clicked: ${cardData.id}`, { x, y });

        // Try to handle the card click in the match game
        const success = this.game.handleCardClick(cardData.id);
        if (success) {
          // Animate card flip to face up
          card3D.tweenTo(
            { faceUp: 1 },  // target: flip to face up
            300,            // duration
            'easeOutQuad',  // easing
            null,           // no control point
            0.5             // flip timing
          );

          // Update card data state
          cardData.state = 'faceup';

          // Check if we need to handle match/mismatch
          const updatedState = this.game.getState();
          if (updatedState.flippedCards.length === 2) {
            // Two cards are flipped, check will happen in game logic
            const [card1, card2] = updatedState.flippedCards;

            if (card1.month === card2.month) {
              // Match! Call handler immediately
              debugLogger.log('gameState', `Match detected, calling handleMatchedCards`, {
                card1: card1.month,
                card2: card2.month
              });
              this.handleMatchedCards(card1, card2);
            } else {
              // No match - flip back after delay
              setTimeout(() => {
                this.flipCardsBack(card1, card2);
              }, 1500);
            }
          }

          this.updateUI();
        }
      }
      return;
    }

    // Handle Hachi-Hachi game
    if (this.currentGameMode === 'hachihachi') {
      const gameState = this.game.getState();
      debugLogger.log('gameState', `🎲 Hachi-Hachi click in phase: ${gameState.phase}`, null);

      // Only allow interactions during playing phases
      if (gameState.phase !== 'select_hand' && gameState.phase !== 'select_field' &&
          gameState.phase !== 'select_drawn_match') {
        return;
      }

      // Get card at click position
      const card3D = this.card3DManager.getCardAtPosition(x, y);
      if (!card3D) {
        debugLogger.log('gameState', `No card at (${x.toFixed(0)}, ${y.toFixed(0)})`, null);
        return;
      }

      debugLogger.log('gameState', `🎯 Hit card: ${card3D.cardData.name} from zone ${card3D.homeZone}`, null);

      // Determine if card is from hand or field
      const isHandCard = card3D.homeZone === 'player0Hand';
      const isFieldCard = card3D.homeZone === 'field';

      // Set up for potential drag-and-drop
      this.draggedCard3D = card3D;
      this.draggedCardData = card3D.cardData;
      this.dragStartX = x;
      this.dragStartY = y;
      this.isDragging = false;
      card3D.isDragging = true;

      // For Hachi-Hachi, DON'T immediately select on mouseDown
      // Let the drag-drop handler in handleMouseUp decide what to do
      // This allows the user to drag to a field card to match or drag to empty space to place

      return;
    }

    // Koi Koi drag and drop logic
    const gameState = this.game.getState();

    // Only allow interactions during select phases
    if (gameState.phase !== 'select_hand' && gameState.phase !== 'select_field' && gameState.phase !== 'select_drawn_match' && gameState.phase !== 'gaji_selection') {
      return;
    }

    // Use 3D hit detection
    const card3D = this.card3DManager.getCardAtPosition(x, y);
    if (card3D) {
      // Allow clicking on both hand cards and field cards
      const isHandCard = card3D.homeZone === 'player0Hand';
      const isFieldCard = card3D.homeZone === 'field';

      if (isHandCard || isFieldCard) {
        // Clear any hover state
        if (this.hoveredCard3D) {
          this.hoveredCard3D.setHovered(false);
          this.hoveredCard3D = null;
        }

        // Register the card for interaction
        this.draggedCard3D = card3D;
        this.draggedCardData = card3D.cardData;
        this.dragStartX = x;
        this.dragStartY = y;
        this.isDragging = false; // Will become true once mouse moves
        card3D.isDragging = true;

        debugLogger.log('gameState', `🔵 Card grabbed: ${card3D.cardData.name} from zone ${card3D.homeZone}`, {
          x, y, zone: card3D.homeZone
        });
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
    if (!card3D || card3D.homeZone !== 'player0Hand') {
      return;
    }

    const card = card3D.cardData;

    // Handle Hachi-Hachi: double-click to place unmatched card on field (only if no matches)
    if (this.currentGameMode === 'hachihachi' && gameState.phase === 'select_hand') {
      // Find matches for this card
      const matches = gameState.field.filter(fc => fc.month === card.month);

      // Only allow double-click placement if there are NO matches
      if (matches.length === 0) {
        debugLogger.log('gameState', `🎴 Hachi-Hachi double-click: ${card.name} (no matches, placing on field)`, {
          phase: gameState.phase,
          matches: 0
        });

        // First select the card (enters select_field phase)
        let success = this.game.selectCard(card, 'player');

        if (success) {
          // Verify we're still in select_field phase with no matches
          const updatedState = this.game.getState();
          if (updatedState.phase === 'select_field' && updatedState.drawnCardMatches.length === 0) {
            // Now place it on field
            success = this.game.placeCardOnField(card);

            if (success) {
              debugLogger.log('gameState', `✅ Card placed on field (no matches available)`, null);
              this.updateUI();
            } else {
              debugLogger.log('gameState', `❌ Failed to place card on field`, null);
            }
          } else {
            debugLogger.log('gameState', `⚠️ Card selection changed state unexpectedly`, {
              phase: updatedState.phase,
              matches: updatedState.drawnCardMatches.length
            });
          }
        } else {
          debugLogger.log('gameState', `❌ Failed to select card`, null);
        }
      } else {
        debugLogger.log('gameState', `🎴 Hachi-Hachi double-click ignored: ${card.name} has ${matches.length} match(es)`, {
          matches: matches.map(m => m.name)
        });
      }
      return;
    }

    // Handle Koi-Koi/Sakura: double-click to auto-match if match exists
    if (gameState.phase === 'select_hand') {
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

    // Handle dragging
    if (this.draggedCard3D) {
      const dragThreshold = 5; // Minimum pixels to move before considering it a drag
      const dx = this.hoverX - this.dragStartX;
      const dy = this.hoverY - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!this.isDragging && distance > dragThreshold) {
        // Start dragging
        this.isDragging = true;
        debugLogger.log('gameState', `Started dragging: ${this.draggedCardData.name}`, null);
      }

      if (this.isDragging) {
        // Update card position to follow mouse
        this.draggedCard3D.x = this.hoverX;
        this.draggedCard3D.y = this.hoverY;
        this.draggedCard3D.z = 50; // Raise card above others

        // Check for valid drop target (matching card on field)
        this.updateDropTarget();
      }
    }
  }

  handleMouseUp(event) {
    if (!this.draggedCard3D) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // If this was a drag (not just a click)
    if (this.isDragging) {
      // Check if we're dropping on a valid target
      if (this.dropTargetCard3D) {
        // Valid drop - play the card
        debugLogger.log('gameState', `Card dropped on match: ${this.draggedCardData.name} → ${this.dropTargetCard3D.cardData.name}`, null);

        // Clear drop target highlight
        if (this.dropTargetCard3D) {
          this.dropTargetCard3D.targetScale = this.dropTargetCard3D.baseScale;
        }

        // Execute the card play via drag-drop
        // For Hachi-Hachi, we need to do a two-step selection:
        // 1. Select hand card (if not already selected)
        // 2. Select field card to match
        // Always do the selection in the proper order
        let success = this.game.selectCard(this.draggedCardData, 'player');

        if (success) {
          // Get UPDATED game state after first selection
          const updatedGameState = this.game.getState();
          if (updatedGameState.phase === 'select_field') {
            // Card just moved to select_field, now match with field card
            success = this.game.selectCard(this.dropTargetCard3D.cardData, 'field');
          }
          this.updateUI();
        }

        // Reset drag state and selection
        this.draggedCard3D.isDragging = false;
        this.draggedCard3D = null;
        this.draggedCardData = null;
        this.isDragging = false;
        this.dropTargetCard3D = null;
        if (this.selectedCard3D) {
          this.selectedCard3D.z = 0;
          this.selectedCard3D = null;
        }
      } else {
        // Not dropping on a card - check if we can place on field
        // Only allow placing from player hand
        if (this.draggedCard3D.homeZone === 'player0Hand') {
          // Check if dropping back over hand area - if so, cancel the drag
          if (this.isPositionInPlayerHandZone(x, y)) {
            debugLogger.log('gameState', `Card dropped over hand area - returning to hand`, null);
            this.cancelDrag();
            return;
          }

          const gameState = this.game.getState();

          // For Hachi-Hachi, only allow placing UNMATCHED cards on field
          if (this.currentGameMode === 'hachihachi') {
            // Check if card has matches BEFORE selecting
            const matches = gameState.field.filter(fc => fc.month === this.draggedCardData.month);

            if (matches.length > 0) {
              // Has matches - cannot place on field via drag, must click to match
              debugLogger.log('gameState', `Hachi-Hachi drag to field failed: ${this.draggedCardData.name} has ${matches.length} match(es)`, {
                matches: matches.map(m => m.name)
              });
              this.cancelDrag();
            } else {
              // No matches - allow placing unmatched card on field
              debugLogger.log('gameState', `Hachi-Hachi: Card dragged to field (no matches): ${this.draggedCardData.name}`, null);

              // First select the hand card
              let success = this.game.selectCard(this.draggedCardData, 'player');

              if (success) {
                // Place the card on field
                success = this.game.placeCardOnField(this.draggedCardData);
                debugLogger.log('gameState', success ? `✅ Card placed on field` : `❌ Failed to place card`, null);
                this.updateUI();
              } else {
                this.cancelDrag();
              }
            }

            // Reset drag state
            this.draggedCard3D.isDragging = false;
            this.draggedCard3D = null;
            this.draggedCardData = null;
            this.isDragging = false;
            this.dropTargetCard3D = null;
          } else {
            // Koi Koi/Sakura logic: allow placing on field directly
            debugLogger.log('gameState', `Card dragged to field: ${this.draggedCardData.name}`, null);

            // For Koi-Koi/Sakura, drag-to-empty-field attempts placement directly
            let success = this.game.placeCardOnField(this.draggedCardData);

            if (success) {
              debugLogger.log('gameState', `✅ Card placed on field via drag`, null);
              this.updateUI();
            } else {
              debugLogger.log('gameState', `❌ Failed to place card on field`, null);
              this.cancelDrag();
            }

            // Reset drag state
            this.draggedCard3D.isDragging = false;
            this.draggedCard3D = null;
            this.draggedCardData = null;
            this.isDragging = false;
            this.dropTargetCard3D = null;
            if (this.selectedCard3D) {
              this.selectedCard3D.z = 0;
              this.selectedCard3D = null;
            }
          }
        } else {
          // Invalid drop - return card to hand
          this.cancelDrag();
        }
      }
    } else {
      // This was just a click (no drag), treat it as a regular card selection
      const clickedCard3D = this.draggedCard3D;
      const clickedCardData = this.draggedCardData;
      const clickedZone = clickedCard3D.homeZone;

      debugLogger.log('gameState', `Card clicked (no drag): ${clickedCardData.name} from ${clickedZone}`, null);

      // Reset drag state first
      this.draggedCard3D.isDragging = false;
      this.draggedCard3D = null;
      this.draggedCardData = null;

      // Handle click based on zone
      if (clickedZone === 'player0Hand') {
        // Get current game state before the action
        const gameState = this.game.getState();
        const wasInSelectField = gameState.phase === 'select_field';
        const isClickingSameCard = wasInSelectField &&
          gameState.selectedCards.length > 0 &&
          gameState.selectedCards[0].id === clickedCardData.id;

        // Clicking a hand card - select it or place it
        const success = this.game.selectCard(clickedCardData, 'player');

        if (success) {
          const newGameState = this.game.getState();

          // Check if we're still in select_field (meaning card is still in hand, waiting to be matched)
          if (newGameState.phase === 'select_field') {
            // Clear previous selection if switching cards
            if (this.selectedCard3D && this.selectedCard3D !== clickedCard3D) {
              this.selectedCard3D.z = 0;
            }

            // Keep this card raised and selected
            this.selectedCard3D = clickedCard3D;
            this.selectedCard3D.z = 30; // Raise selected card

            debugLogger.log('gameState', `Hand card selected, waiting for field card click`, null);
          } else {
            // Phase changed (card was placed) - clear selection
            if (this.selectedCard3D) {
              this.selectedCard3D.z = 0;
              this.selectedCard3D = null;
            }
            debugLogger.log('gameState', `Card placed on field, proceeding to next phase`, null);
          }

          this.updateUI();
        } else {
          debugLogger.log('gameState', `Hand card selection failed - ${this.game.getState().message}`, null);
        }
      } else if (clickedZone === 'field') {
        // Clicking a field card - try to match with selected hand card
        debugLogger.log('gameState', `🔴 FIELD CARD CLICKED: ${clickedCardData.name}`, {
          clickedCardId: clickedCardData.id,
          zone: clickedZone
        });

        const success = this.game.selectCard(clickedCardData, 'field');

        debugLogger.log('gameState', `📊 selectCard result for field: ${success}`, {
          newPhase: this.game.getState().phase,
          message: this.game.getState().message
        });

        if (success) {
          // Match successful - clear selection
          if (this.selectedCard3D) {
            this.selectedCard3D.z = 0;
            this.selectedCard3D = null;
          }
          debugLogger.log('gameState', `✅ Field card matched successfully`, null);
          this.updateUI();
        } else {
          debugLogger.log('gameState', `❌ Field card match failed - ${this.game.getState().message}`, null);
        }
      }
    }
  }

  /**
   * Cancel drag and return card to hand
   */
  /**
   * Check if a screen position is over the player hand zone
   */
  isPositionInPlayerHandZone(x, y) {
    // Player hand is at the bottom of the screen
    // Based on LayoutManager: anchorPoint.y = viewportHeight - 170
    const handY = this.renderer.displayHeight - 170;
    const cardHeight = 140;
    const cardWidth = 100;

    // Check if y is in the hand area (with some tolerance)
    const handMinY = handY - cardHeight / 2 - 20; // Add some tolerance above
    const handMaxY = this.renderer.displayHeight; // Bottom of screen

    return y >= handMinY && y <= handMaxY;
  }

  cancelDrag() {
    if (!this.draggedCard3D) {
      return;
    }

    debugLogger.log('gameState', `Drag cancelled, returning card to hand`, null);

    // Clear drop target highlight
    if (this.dropTargetCard3D) {
      this.dropTargetCard3D.targetScale = this.dropTargetCard3D.baseScale;
      this.dropTargetCard3D = null;
    }

    // Animate card back to home position
    this.draggedCard3D.tweenTo({
      x: this.draggedCard3D.homePosition.x,
      y: this.draggedCard3D.homePosition.y,
      z: 0
    }, 300, 'easeOutCubic');

    this.draggedCard3D.isDragging = false;
    this.draggedCard3D = null;
    this.draggedCardData = null;
    this.isDragging = false;
  }

  /**
   * Handle matched cards in match game - show floating text
   */
  handleMatchedCards(card1, card2) {
    debugLogger.log('gameState', `Match found: ${card1.month}`, {
      card1Id: card1.id,
      card2Id: card2.id
    });

    // Get Card3D objects
    const card3D1 = this.card3DManager.cards.get(card1.id);
    const card3D2 = this.card3DManager.cards.get(card2.id);

    if (!card3D1) {
      debugLogger.logError('Card3D not found for card1', { id: card1.id });
      return;
    }
    if (!card3D2) {
      debugLogger.logError('Card3D not found for card2', { id: card2.id });
      return;
    }

    debugLogger.log('gameState', `Match found!`, {
      card1: card3D1.cardData.name,
      card2: card3D2.cardData.name
    });

    // Add floating text celebration at the top of the field
    this.addFloatingMatchText(card1.month);

    // Update UI immediately (cards stay visible)
    this.updateUI();

    // Check if game is complete
    const gameState = this.game.getState();
    if (gameState.gameOver) {
      this.statusElement.textContent = gameState.message;
      this.statusElement.classList.add('show');
    }
  }

  /**
   * Flip cards back face down after mismatch
   */
  flipCardsBack(card1, card2) {
    debugLogger.log('gameState', `No match, flipping cards back`, null);

    // Get Card3D objects
    const card3D1 = this.card3DManager.cards.get(card1.id);
    const card3D2 = this.card3DManager.cards.get(card2.id);

    if (!card3D1 || !card3D2) return;

    // Animate flip back to face down
    card3D1.tweenTo(
      { faceUp: 0 },  // target: flip to face down
      300,            // duration
      'easeOutQuad',  // easing
      null,           // no control point
      0.5             // flip timing
    );

    card3D2.tweenTo(
      { faceUp: 0 },  // target: flip to face down
      300,            // duration
      'easeOutQuad',  // easing
      null,           // no control point
      0.5             // flip timing
    );

    // Update card data state
    card1.state = 'facedown';
    card2.state = 'facedown';
  }

  /**
   * Add floating text for a match celebration
   */
  addFloatingMatchText(month) {
    const centerX = this.renderer.displayWidth / 2;
    const topY = 100; // Starting position at top of field

    debugLogger.log('gameState', `Adding floating match text: "${month} Match!"`, {
      x: centerX,
      y: topY,
      floatingTextsCount: this.floatingTexts.length
    });

    this.floatingTexts.push({
      text: `${month} Match!`,
      x: centerX,
      y: topY,
      opacity: 1.0,
      age: 0,
      maxAge: 3000 // Display for 3 seconds
    });

    debugLogger.log('gameState', `Floating texts array now has ${this.floatingTexts.length} items`, null);
  }

  /**
   * Update all floating texts (aging and fading)
   */
  updateFloatingTexts(deltaTime) {
    // Update each floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const floatingText = this.floatingTexts[i];
      floatingText.age += deltaTime * 1000; // Convert to milliseconds

      // Fade out in the last second
      if (floatingText.age > floatingText.maxAge - 1000) {
        const fadeProgress = (floatingText.age - (floatingText.maxAge - 1000)) / 1000;
        floatingText.opacity = 1.0 - fadeProgress;
      }

      // Remove expired texts
      if (floatingText.age >= floatingText.maxAge) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /**
   * Render all floating texts
   */
  renderFloatingTexts() {
    if (this.floatingTexts.length === 0) return;

    debugLogger.log('render', `Rendering ${this.floatingTexts.length} floating texts`, null);

    const ctx = this.renderer.ctx;
    ctx.save();

    this.floatingTexts.forEach((floatingText, index) => {
      debugLogger.log('render', `Drawing floating text ${index}: "${floatingText.text}"`, {
        x: floatingText.x,
        y: floatingText.y,
        opacity: floatingText.opacity
      });

      ctx.globalAlpha = floatingText.opacity;
      ctx.fillStyle = '#FFD700'; // Gold color
      ctx.strokeStyle = '#FF6347'; // Tomato red for outline
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;

      // Draw text outline
      ctx.strokeText(floatingText.text, floatingText.x, floatingText.y);
      // Draw text fill
      ctx.fillText(floatingText.text, floatingText.x, floatingText.y);
    });

    ctx.restore();
  }

  /**
   * Update drop target based on current mouse position
   */
  updateDropTarget() {
    if (!this.draggedCard3D || !this.isDragging) {
      return;
    }

    // Get all field cards and check if we're hovering over a matching one
    const gameState = this.game.getState();
    let newDropTarget = null;

    // Check each field card
    for (const fieldCard of gameState.field) {
      // Check if cards match (same month)
      if (this.cardsMatch(this.draggedCardData, fieldCard)) {
        // Get the Card3D for this field card
        const fieldCard3D = this.card3DManager.cards.get(fieldCard.id);
        if (!fieldCard3D) {
          continue;
        }

        // Check if mouse is near this card
        const dx = this.hoverX - fieldCard3D.x;
        const dy = this.hoverY - fieldCard3D.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const threshold = 80; // Distance threshold for "hovering over"

        if (distance < threshold) {
          newDropTarget = fieldCard3D;
          break;
        }
      }
    }

    // Update drop target highlighting
    if (newDropTarget !== this.dropTargetCard3D) {
      // Clear old target
      if (this.dropTargetCard3D) {
        this.dropTargetCard3D.targetScale = this.dropTargetCard3D.baseScale;
      }

      // Set new target
      this.dropTargetCard3D = newDropTarget;
      if (this.dropTargetCard3D) {
        this.dropTargetCard3D.targetScale = this.dropTargetCard3D.baseScale * 1.2;
      }
    }
  }

  /**
   * Check if two cards match (same month)
   */
  cardsMatch(card1, card2) {
    return card1.month === card2.month;
  }

  /**
   * Update hover state for Card3D objects based on mouse position
   */
  updateCardHoverState() {
    // Don't update hover state while dragging
    if (this.isDragging) {
      // Clear any existing hover state
      if (this.hoveredCard3D) {
        this.hoveredCard3D.setHovered(false);
        this.hoveredCard3D = null;
      }
      return;
    }

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

    // Check if this card is hoverable
    // When a hand card is selected, only allow hovering over field cards or the selected card itself
    // Don't hover over cards that are being used as drop targets
    const isHoverable = card3D &&
      (card3D.homeZone === 'player0Hand' || card3D.homeZone === 'field') &&
      card3D !== this.dropTargetCard3D &&
      // If a hand card is selected, don't hover other hand cards
      !(this.selectedCard3D && card3D.homeZone === 'player0Hand' && card3D !== this.selectedCard3D);

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
    this.helpButton.classList.toggle('active');
    if (this.helpButton.classList.contains('active')) {
      // Dismiss tutorial bubble when help is activated
      this.hideTutorial();
    }
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
    // Hide all other modals before showing this one
    this.hideAllModals();

    // Populate current values
    const options = this.gameOptions.getAll();
    const isSakura = this.currentGameMode === 'sakura';

    // Show/hide variations based on game mode
    document.querySelectorAll('.koikoi-variation').forEach(el => {
      el.style.display = isSakura ? 'none' : 'block';
    });
    document.querySelectorAll('.sakura-variation').forEach(el => {
      el.style.display = isSakura ? 'block' : 'none';
    });

    // Populate Koi-Koi variations
    document.getElementById('bomb-variation-enabled').checked = options.bombVariationEnabled;

    // Populate Sakura variations
    if (isSakura) {
      document.getElementById('chitsiobiki-enabled').checked = options.chitsiobikiEnabled || false;
      document.getElementById('victory-scoring-enabled').checked = options.victoryScoringEnabled || false;
      document.getElementById('basa-chu-enabled').checked = options.basaChuEnabled || false;
      document.getElementById('both-players-score-enabled').checked = options.bothPlayersScoreEnabled || false;
      document.getElementById('oibana-enabled').checked = options.oibanaEnabled || false;
    }

    this.variationsModal.classList.add('show');
  }

  /**
   * Hide variations modal
   */
  hideVariationsModal() {
    this.variationsModal.classList.remove('show');
  }

  /**
   * Show card back selection modal
   */
  showCardBackModal() {
    // Hide all other modals before showing this one
    this.hideAllModals();

    const grid = document.getElementById('card-back-grid');
    grid.innerHTML = ''; // Clear existing content

    const currentCardBack = getSelectedCardBack();

    // Map available card back images (only those that exist in public/assets/card-backs/)
    const availableCardBacks = [
      { id: 'sakura', name: 'Sakura', image: 'assets/card-backs/carback-flower.png', unlocked: true },
      { id: 'koi', name: 'Koi', image: 'assets/card-backs/cardback-wave.png', unlocked: true },
      { id: 'crane', name: 'Crane', image: 'assets/card-backs/carback-fan.png', unlocked: true }
    ];

    // Create card back items
    availableCardBacks.forEach(cardBack => {
      const item = document.createElement('div');
      item.className = 'card-back-item';

      if (currentCardBack === cardBack.id) {
        item.classList.add('selected');
      }

      if (!cardBack.unlocked) {
        item.classList.add('locked');
      }

      // Create preview container with flip effect
      const preview = document.createElement('div');
      preview.className = 'card-back-preview';

      // Front of card (card back image)
      const front = document.createElement('div');
      front.className = 'card-back-front';

      // Try to load the card back image
      const img = document.createElement('img');
      img.src = cardBack.image;
      img.alt = cardBack.name;

      // Fallback to placeholder if image fails to load
      img.onerror = () => {
        img.style.display = 'none';
        front.classList.add('placeholder');
        front.textContent = '🃏';
      };

      img.onload = () => {
        front.classList.remove('placeholder');
      };

      front.appendChild(img);
      preview.appendChild(front);

      // Back of card (random hanafuda card)
      const back = document.createElement('div');
      back.className = 'card-back-back';

      // Get a random hanafuda card to display
      const randomCard = HANAFUDA_DECK[Math.floor(Math.random() * HANAFUDA_DECK.length)];
      const cardImg = document.createElement('img');
      cardImg.src = randomCard.image;
      cardImg.alt = randomCard.name;
      back.appendChild(cardImg);
      preview.appendChild(back);

      // Add lock icon if locked
      if (!cardBack.unlocked) {
        const lockIcon = document.createElement('div');
        lockIcon.className = 'lock-icon';
        lockIcon.textContent = '🔒';
        preview.appendChild(lockIcon);
      }

      item.appendChild(preview);

      // Create name
      const name = document.createElement('div');
      name.className = 'card-back-name';
      name.textContent = cardBack.name;
      item.appendChild(name);

      // Add unlock condition if locked
      if (!cardBack.unlocked) {
        const condition = document.createElement('div');
        condition.className = 'unlock-condition';
        condition.textContent = cardBack.unlockCondition;
        item.appendChild(condition);
      }

      // Add click handler
      if (cardBack.unlocked) {
        item.addEventListener('click', () => {
          // Update selection
          setSelectedCardBack(cardBack.id);

          // Update renderer with new card back
          this.renderer.cardRenderer.setCardBack(cardBack.id);

          // Update UI
          document.querySelectorAll('.card-back-item').forEach(el => {
            el.classList.remove('selected');
          });
          item.classList.add('selected');

          debugLogger.log('cardBack', `Card back changed to: ${cardBack.name}`, null);
        });
      }

      grid.appendChild(item);
    });

    this.cardBackModal.classList.add('show');
  }

  /**
   * Hide card back modal
   */
  hideCardBackModal() {
    this.cardBackModal.classList.remove('show');
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
    // Hide all other modals before showing this one
    this.hideAllModals();

    // Show different options based on game mode
    if (this.currentGameMode === 'match') {
      this.showMatchOptionsModal();
    } else {
      // Koi Koi options
      // Populate current values
      const options = this.gameOptions.getAll();
      document.getElementById('koikoi-enabled').checked = options.koikoiEnabled;
      document.getElementById('multiplier-mode').value = options.multiplierMode;
      document.getElementById('auto-double').checked = options.autoDouble7Plus;
      document.getElementById('both-players-score').checked = options.bothPlayersScore;
      document.getElementById('viewing-sake').value = options.viewingSakeMode;
      document.getElementById('moon-viewing-sake').value = options.moonViewingSakeMode;
      document.getElementById('ai-difficulty').value = options.aiDifficulty;
      document.getElementById('animations-enabled').checked = options.animationsEnabled;
      document.getElementById('audio-enabled').checked = options.audioEnabled;

      this.optionsModal.classList.add('show');
    }
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
      aiDifficulty: document.getElementById('ai-difficulty').value,
      animationsEnabled: document.getElementById('animations-enabled').checked,
      audioEnabled: document.getElementById('audio-enabled').checked
    };

    this.gameOptions.update(newOptions);

    // Update game options
    this.game.updateOptions(this.gameOptions);

    // Update Card3DManager animation settings
    if (this.card3DManager) {
      this.card3DManager.setAnimationsEnabled(newOptions.animationsEnabled);
    }

    // Update AudioManager settings
    if (this.audioManager) {
      this.audioManager.setEnabled(newOptions.audioEnabled);
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
      // Update AudioManager
      if (this.audioManager) {
        this.audioManager.setEnabled(this.gameOptions.get('audioEnabled'));
      }
      // Reload the form
      this.showOptionsModal();
    }
  }

  /**
   * Show koi-koi decision modal with yaku information
   */
  showKoikoiDecision(yaku, totalScore) {
    // Hide all other modals before showing this one
    this.hideAllModals();

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
    // If game over, play animation first, then show modal after delay
    if (data.isGameOver) {
      // Play appropriate animation and music based on outcome
      if (data.playerTotalScore > data.opponentTotalScore) {
        // Player wins - play random showcase animation and win music
        this.playRandomShowcaseAnimation();
        this.audioManager.playWinMusic();
      } else if (data.playerTotalScore < data.opponentTotalScore) {
        // Player loses - play losing animation and lose music
        this.playLosingAnimation();
        this.audioManager.playLoseMusic();
      } else {
        // Tie - play random showcase animation (no music)
        this.playRandomShowcaseAnimation();
      }

      // Delay showing modal to let animation play
      // Losing animation: ~1700ms, Showcase animations: ~2000-3000ms
      // Using 2500ms to ensure animation is visible before modal appears
      setTimeout(() => {
        this.displayRoundSummaryModal(data);
      }, 2500);
    } else {
      // Round complete (not game over) - show immediately
      this.displayRoundSummaryModal(data);
    }
  }

  /**
   * Display the round summary modal with unified score display (2P, 3P, 4P)
   */
  displayRoundSummaryModal(data) {
    // Hide all other modals before showing this one
    this.hideAllModals();

    // Hide bonus chance display when showing round summary
    this.hideActiveWinCondition();

    // Update title
    const title = document.getElementById('round-summary-title');
    if (data.shopMode) {
      // Shop mode - show custom message
      const victory = data.playerTotalScore > data.opponentTotalScore;
      title.textContent = victory ? '🎉 Victory!' : '💀 Defeat';
    } else if (data.isGameOver) {
      // Determine winner for multi-player games
      let winner;
      if (data.playerScores && data.playerScores.length > 2) {
        // Multi-player: Find highest total score among all players
        const maxScore = Math.max(...data.playerScores.map(p => p.matchScore));
        const winners = data.playerScores.filter(p => p.matchScore === maxScore);

        if (winners.length === 1) {
          const winnerIndex = data.playerScores.indexOf(winners[0]);
          if (winnerIndex === 0) {
            winner = 'You Win!';
          } else {
            winner = `Opponent ${winnerIndex} Win!`;
          }
        } else {
          winner = 'Tie Game!';
        }
      } else {
        // 2-player: Use legacy comparison
        winner = data.playerTotalScore > data.opponentTotalScore ? 'You Win!' :
                 data.opponentTotalScore > data.playerTotalScore ? 'Opponent Win!' : 'Tie Game!';
      }
      title.textContent = `Game Over - ${winner}`;
    } else {
      title.textContent = `Round ${data.currentRound} Complete!`;
    }

    // Determine player count and update data attribute
    const playerCount = data.playerCount || 2;
    const isTeamsMode = data.isTeamsMode || false;
    const roundScoreDisplay = document.getElementById('round-score-display');
    const scoreGrid = document.getElementById('round-score-grid');

    // Set player count and teams mode for CSS responsive layout
    roundScoreDisplay.setAttribute('data-player-count', playerCount);
    roundScoreDisplay.setAttribute('data-teams-mode', isTeamsMode && playerCount === 4);
    scoreGrid.innerHTML = '';

    // Build playerScores array if not provided (backward compatibility for Koi-Koi)
    let playerScores = data.playerScores;
    if (!playerScores || playerScores.length === 0) {
      // Construct from individual player score fields (Koi-Koi 2P format)
      playerScores = [
        { roundScore: data.playerRoundScore || 0 },
        { roundScore: data.opponentRoundScore || 0 }
      ];
    }

    // For 4P teams mode: organize players into teams
    // Team 1: Player 0 (You) + Player 2 (Ally)
    // Team 2: Player 1 (Opponent 1) + Player 3 (Opponent 2)
    if (isTeamsMode && playerCount === 4 && playerScores && playerScores.length === 4) {
      const teams = [
        { name: 'Team 1: You & Ally', players: [0, 2] },
        { name: 'Team 2: Opponents', players: [1, 3] }
      ];

      teams.forEach(team => {
        const teamGroup = document.createElement('div');
        teamGroup.className = 'team-group';

        const teamHeader = document.createElement('h4');
        teamHeader.textContent = team.name;
        teamGroup.appendChild(teamHeader);

        team.players.forEach(playerIndex => {
          const playerScore = playerScores[playerIndex];
          let playerLabel;
          if (playerIndex === 0) {
            playerLabel = 'You';
          } else if (playerIndex === 2) {
            playerLabel = 'Ally';
          } else {
            playerLabel = `Opponent ${playerIndex === 1 ? 1 : 2}`;
          }
          const isYou = playerIndex === 0;

          // Get total score from playerScores data
          let totalScore = 0;
          if (playerScore && playerScore.matchScore !== undefined) {
            totalScore = playerScore.matchScore;
          } else if (this.currentGameMode === 'sakura' && this.sakuraGame?.players[playerIndex]) {
            totalScore = this.sakuraGame.players[playerIndex].matchScore || 0;
          }

          const scoreCard = document.createElement('div');
          scoreCard.className = `player-score-card ${isYou ? 'player-you' : ''}`;
          scoreCard.innerHTML = `
            <span class="score-card-label">${playerLabel}</span>
            <div class="score-row">
              <span class="score-label-small">Round</span>
              <span class="score-value">${playerScore.roundScore || 0}</span>
            </div>
            <div class="score-row">
              <span class="score-label-small">Total</span>
              <span class="score-value">${totalScore}</span>
            </div>
          `;
          teamGroup.appendChild(scoreCard);
        });

        scoreGrid.appendChild(teamGroup);
      });
    } else {
      // Standard display for 2P, 3P, or 4P competitive mode
      if (playerScores && playerScores.length > 0) {
        playerScores.forEach((playerScore, index) => {
          let playerLabel;
          if (index === 0) {
            playerLabel = 'You';
          } else {
            playerLabel = `Opponent ${index}`;
          }
          const isYou = index === 0;

          // Get total score based on game mode
          let totalScore = 0;
          if (playerScore && playerScore.matchScore !== undefined) {
            totalScore = playerScore.matchScore;
          } else if (this.currentGameMode === 'sakura' && this.sakuraGame?.players[index]) {
            totalScore = this.sakuraGame.players[index].matchScore || 0;
          } else if (this.currentGameMode === 'koikoi' || this.currentGameMode === 'shop') {
            // For 2P Koi-Koi/Shop, use the provided totals
            totalScore = isYou ? data.playerTotalScore : data.opponentTotalScore;
          }

          const scoreCard = document.createElement('div');
          scoreCard.className = `player-score-card ${isYou ? 'player-you' : ''}`;
          scoreCard.innerHTML = `
            <span class="score-card-label">${playerLabel}</span>
            <div class="score-row">
              <span class="score-label-small">Round</span>
              <span class="score-value">${playerScore.roundScore || 0}</span>
            </div>
            <div class="score-row">
              <span class="score-label-small">Total</span>
              <span class="score-value">${totalScore}</span>
            </div>
          `;
          scoreGrid.appendChild(scoreCard);
        });
      }
    }

    // Update yaku/tricks display with column layout
    const yakuDisplay = document.getElementById('round-yaku-display');
    const yakuGrid = document.getElementById('yaku-grid');

    yakuDisplay.setAttribute('data-player-count', playerCount);
    yakuDisplay.setAttribute('data-teams-mode', isTeamsMode && playerCount === 4);
    yakuGrid.innerHTML = '';

    // Helper function to create a yaku card for a player
    const createYakuCard = (playerScore, playerIndex, playerLabel) => {
      const isYou = playerIndex === 0;
      const yakuCard = document.createElement('div');
      yakuCard.className = `yaku-card ${isYou ? 'player-you' : ''}`;

      let yakuCardHTML = `<div class="yaku-card-header">${playerLabel}</div>`;

      // Get yaku list - from playerScore.yaku (Sakura) or from data.playerYaku/data.opponentYaku (Koi-Koi/Shop)
      let yakuList = playerScore.yaku || [];
      if (yakuList.length === 0 && (this.currentGameMode === 'koikoi' || this.currentGameMode === 'shop')) {
        yakuList = isYou ? (data.playerYaku || []) : (data.opponentYaku || []);
      }

      if (yakuList.length > 0) {
        yakuList.forEach(y => {
          const yakuName = y.name || y.displayName;
          yakuCardHTML += `<div class="yaku-item">• <strong>${yakuName}</strong></div>`;
        });
      } else {
        yakuCardHTML += `<div class="yaku-item" style="color: #888; font-style: italic;">No yaku</div>`;
      }

      // Add score breakdown for Koi-Koi if available
      let breakdown = isYou ? data.playerScoreBreakdown : data.opponentScoreBreakdown;
      if (breakdown) {
        yakuCardHTML += `<div class="yaku-label"><strong>Score Breakdown:</strong></div>`;
        if (breakdown.koikoiPenalty) {
          yakuCardHTML += `<div class="yaku-item">Koi-Koi penalty (no improve)</div>`;
        } else {
          yakuCardHTML += `<div class="yaku-item">Base: <strong>${breakdown.baseScore}</strong> pts</div>`;
          if (breakdown.bonusPoints && breakdown.bonusPoints > 0) {
            yakuCardHTML += `<div class="yaku-item">Bonus: <strong>+${breakdown.bonusPoints}</strong> pts</div>`;
          }
          if (breakdown.autoDouble) {
            yakuCardHTML += `<div class="yaku-item">×2 (7+ pts)</div>`;
          }
          if (breakdown.koikoiMultiplier > 0) {
            yakuCardHTML += `<div class="yaku-item">×${breakdown.koikoiMultiplier} (opponent koi-koi)</div>`;
          }
          if (breakdown.finalScore !== breakdown.baseScore) {
            yakuCardHTML += `<div class="yaku-item"><strong>Final: ${breakdown.finalScore}</strong> pts</div>`;
          }
        }
      }

      yakuCard.innerHTML = yakuCardHTML;
      return yakuCard;
    };

    // For all modes: display yaku cards as individual columns
    // (Teams mode still uses individual columns for yaku to maximize horizontal space)
    if (playerScores && playerScores.length > 0) {
      playerScores.forEach((playerScore, index) => {
        let playerLabel;
        if (playerCount === 4 && isTeamsMode) {
          // 4P teams: label as "You" or "AI X"
          playerLabel = index === 0 ? 'You' : `AI ${index}`;
        } else if (playerCount === 4) {
          // 4P competitive: label as "You" or "Opponent X"
          playerLabel = index === 0 ? 'You' : `Opponent ${index}`;
        } else {
          // 2P, 3P: label as "You" or "Opponent X"
          playerLabel = index === 0 ? 'You' : `Opponent ${index}`;
        }
        const yakuCard = createYakuCard(playerScore, index, playerLabel);
        yakuGrid.appendChild(yakuCard);
      });
    }

    // Update button text
    const continueBtn = document.getElementById('continue-next-round');
    if (data.isGameOver) {
      continueBtn.textContent = 'Start New Game';
    } else {
      continueBtn.textContent = `Continue to Round ${data.currentRound + 1}`;
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
      // Game is over - start a new game
      this.showRoundModal();
    } else {
      // Continue to next round
      this.game.startNextRound();
      this.updateUI();

      // Reinitialize Card3D system for the new round to reset positions
      this.card3DManager.initializeFromGameState(this.game.getState(), true);
      debugLogger.log('3dCards', '✨ Card3D system reinitialized for next round', null);
    }
  }

  /**
   * Show Sakura round summary modal (custom for Sakura mode)
   */
  showSakuraRoundSummary(data) {
    // Determine if game is over
    const isGameOver = data.currentRound >= data.totalRounds;

    // If game over, play animation first
    if (isGameOver) {
      if (data.playerMatchScore > data.opponentMatchScore) {
        this.playRandomShowcaseAnimation();
        this.audioManager.playWinMusic();
      } else if (data.playerMatchScore < data.opponentMatchScore) {
        this.playLosingAnimation();
        this.audioManager.playLoseMusic();
      } else {
        this.playRandomShowcaseAnimation();
      }

      setTimeout(() => {
        this.displaySakuraRoundSummaryModal(data, isGameOver);
      }, 2500);
    } else {
      this.displaySakuraRoundSummaryModal(data, isGameOver);
    }
  }

  /**
   * Display Sakura round summary modal
   */
  displaySakuraRoundSummaryModal(data, isGameOver) {
    const playerCount = data.playerCount || data.playerScores?.length || 2;

    // Build data structure for unified display function
    const displayData = {
      playerCount: playerCount,
      currentRound: data.currentRound,
      isGameOver: isGameOver,
      playerTotalScore: data.playerMatchScore,
      opponentTotalScore: data.opponentMatchScore,
      playerScores: data.playerScores,
      isTeamsMode: this.isTeamsMode // Pass teams mode info
    };

    // Use unified display function for score display
    this.displayRoundSummaryModal(displayData);

    // Update yaku grid with Sakura-specific details (multi-column layout)
    const yakuGrid = document.getElementById('yaku-grid');
    yakuGrid.innerHTML = '';

    // Generate yaku cards for each player (Sakura edition with detailed info)
    if (data.playerScores && data.playerScores.length > 0) {
      data.playerScores.forEach((playerScore, index) => {
        const isYou = index === 0;

        // Determine player label based on player count and teams mode
        let playerLabel;
        if (index === 0) {
          playerLabel = 'You';
        } else if (displayData.isTeamsMode && playerCount === 4) {
          // Teams mode: You (0), Opponent 1 (1), Ally (2), Opponent 2 (3)
          if (index === 2) {
            playerLabel = 'Ally';
          } else if (index === 1) {
            playerLabel = 'Opponent 1';
          } else {
            playerLabel = 'Opponent 2';
          }
        } else {
          // Non-teams mode: You (0), Opponent 1 (1), Opponent 2 (2), Opponent 3 (3)
          playerLabel = `Opponent ${index}`;
        }

        const yakuCard = document.createElement('div');
        yakuCard.className = `yaku-card ${isYou ? 'player-you' : ''}`;

        let yakuCardHTML = `<div class="yaku-card-header">${playerLabel}</div>`;

        // Base points
        yakuCardHTML += `<div class="yaku-item"><strong>Base:</strong> ${playerScore.basePoints} pts</div>`;

        // Yaku list
        if (playerScore.yaku.length > 0) {
          yakuCardHTML += `<div class="yaku-label"><strong>Yaku (${playerScore.yaku.length}):</strong></div>`;
          playerScore.yaku.forEach(y => {
            // Determine penalty recipients based on game mode
            let penaltyLabel;
            if (playerCount === 2) {
              penaltyLabel = isYou ? '→ opponent' : '→ you';
            } else if (displayData.isTeamsMode && playerCount === 4) {
              // Teams mode: penalty goes to the other team
              if (index === 0 || index === 2) {
                penaltyLabel = '→ opponents';
              } else {
                penaltyLabel = '→ you & ally';
              }
            } else {
              // 3P or 4P non-teams: penalty goes to all other players
              penaltyLabel = isYou ? '→ opponents' : '→ all';
            }
            yakuCardHTML += `<div class="yaku-item">• ${y.displayName} ${penaltyLabel}</div>`;
          });
        } else {
          yakuCardHTML += `<div class="yaku-item" style="color: #888; font-style: italic;">No yaku</div>`;
        }

        // Calculate penalty this player RECEIVES from other players' yaku
        let penaltyReceived = 0;
        data.playerScores.forEach((otherScore, otherIndex) => {
          if (otherIndex !== index) {
            penaltyReceived += otherScore.yakuPenalty;
          }
        });

        // Show penalty received (not the penalty this player's yaku imposes)
        if (penaltyReceived > 0) {
          yakuCardHTML += `<div class="yaku-label"><strong>Penalty:</strong></div>`;
          yakuCardHTML += `<div class="yaku-item">-${penaltyReceived} pts</div>`;
        }

        // Round total
        yakuCardHTML += `<div class="yaku-label" style="margin-top: 0.5rem;"><strong>Round Total:</strong></div>`;
        yakuCardHTML += `<div class="yaku-item"><strong>${playerScore.roundScore}</strong> pts</div>`;

        yakuCard.innerHTML = yakuCardHTML;
        yakuGrid.appendChild(yakuCard);
      });
    }

    // Update button text
    const continueBtn = document.getElementById('continue-next-round');
    if (isGameOver) {
      continueBtn.textContent = 'Start New Game';
    } else {
      continueBtn.textContent = `Continue to Round ${data.currentRound + 1}`;
    }

    // Show modal
    this.roundSummaryModal.classList.add('show');
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

  /**
   * Dynamically update score display for 2P, 3P, and 4P modes
   */
  updateScoreDisplay(state) {
    const roundText = state.totalRounds > 1 ? ` (Round ${state.currentRound}/${state.totalRounds})` : '';

    // Determine player count and teams mode from state or game instance
    const playerCount = state.playerCount || this.selectedPlayerCount || 2;
    const isTeamsMode = state.isTeamsMode || this.isTeamsMode || false;

    // Update data attributes
    this.scoreContainer.setAttribute('data-player-count', playerCount);
    this.scoreContainer.setAttribute('data-teams-mode', isTeamsMode);

    // Clear existing score elements
    this.scoreDisplayElement.innerHTML = '';

    if (this.currentGameMode === 'sakura') {
      // Sakura: Use players array and calculate totals
      if (state.players && state.players.length > 0) {
        if (isTeamsMode && playerCount === 4) {
          // Teams mode: Group players into Team 1 and Team 2
          // Team 1: Players 0 + 2 (You + Ally), Team 2: Players 1 + 3 (Opponents)
          // Use matchScore only (already includes this round's contribution)
          const team1Score = (state.players[0].matchScore || 0) + (state.players[2].matchScore || 0);
          const team2Score = (state.players[1].matchScore || 0) + (state.players[3].matchScore || 0);

          const team1Span = document.createElement('span');
          team1Span.innerHTML = `Team 1: <strong>${team1Score + roundText}</strong>`;
          this.scoreDisplayElement.appendChild(team1Span);

          const team2Span = document.createElement('span');
          team2Span.innerHTML = `Team 2: <strong>${team2Score}</strong>`;
          this.scoreDisplayElement.appendChild(team2Span);
        } else {
          // Individual players: 2P, 3P, or 4P Competitive
          state.players.forEach((player, index) => {
            // Use matchScore only (already includes this round's contribution)
            const total = player.matchScore || 0;
            const label = this.getPlayerLabel(index, playerCount, false);
            const scoreText = index === 0 ? total + roundText : total.toString();
            const span = document.createElement('span');
            span.innerHTML = `${label}: <strong>${scoreText}</strong>`;
            this.scoreDisplayElement.appendChild(span);
          });
        }
      }
    } else if (this.currentGameMode === 'hachihachi') {
      // Hachi-Hachi: Use players array with gameScore (cumulative) and roundScore
      if (state.players && state.players.length > 0) {
        state.players.forEach((player, index) => {
          const label = this.getPlayerLabel(index, 3, false);
          const total = player.gameScore || 0;
          const scoreText = index === 0 ? total + roundText : total.toString();
          const span = document.createElement('span');
          span.innerHTML = `${label}: <strong>${scoreText}</strong>`;
          this.scoreDisplayElement.appendChild(span);
        });
      }
    } else {
      // Koi-Koi: Use legacy 2-player score fields (only valid for 2P)
      const playerScore = (state.playerScore || 0) + roundText;
      const opponentScore = (state.opponentScore || 0);

      const playerSpan = document.createElement('span');
      playerSpan.innerHTML = `Player: <strong>${playerScore}</strong>`;
      this.scoreDisplayElement.appendChild(playerSpan);

      const opponentSpan = document.createElement('span');
      opponentSpan.innerHTML = `Opponent: <strong>${opponentScore}</strong>`;
      this.scoreDisplayElement.appendChild(opponentSpan);
    }
  }

  /**
   * Get player label based on player index (for non-teams mode)
   */
  getPlayerLabel(index, playerCount, isTeamsMode) {
    if (index === 0) return 'Player';
    if (playerCount === 2) return 'Opponent';
    return `Opponent ${index}`;
  }

  updateUI() {
    // For Match Game, pass current viewport dimensions for position scaling
    const state = this.currentGameMode === 'match'
      ? this.game.getState(this.renderer.displayWidth, this.renderer.displayHeight)
      : this.game.getState();

    // Handle match game UI differently
    if (this.currentGameMode === 'match') {
      // Update instructions with timer, matches, and score
      const matchText = `Matches: ${state.matchCount / 2} / 24`;
      const timerText = `Time: ${state.formattedTime}`;

      let displayText = `${state.message} | ${matchText} | ${timerText}`;

      if (state.bonusMultiplierEnabled) {
        const scoreText = `Score: ${state.score}`;
        const comboText = state.consecutiveMatches > 0 ? ` | Combo: ${state.consecutiveMatches}x` : '';
        displayText = `${state.message} | ${matchText} | ${scoreText}${comboText} | ${timerText}`;
      }

      this.instructionsElement.textContent = displayText;

      // Log message changes
      if (this.lastMessage !== state.message) {
        debugLogger.logMessage(state.message);
        this.lastMessage = state.message;
      }
      return;
    }

    // Clear selected card if we're no longer in select_field phase
    if (this.selectedCard3D && state.phase !== 'select_field') {
      this.selectedCard3D.z = 0;
      this.selectedCard3D = null;
    }

    // Update scores - different calculation for Sakura vs Koi-Koi
    // Scores always displayed; trick progress text only shown when Help is active
    this.updateScoreDisplay(state);

    // Update instructions and log if message changed
    if (this.lastMessage !== state.message) {
      debugLogger.logMessage(state.message);
      this.lastMessage = state.message;
    }
    this.instructionsElement.textContent = state.message;

    // Update bonus chance progress for shop mode
    if (this.currentGameMode === 'shop') {
      this.updateWinConditionProgress();
    }

    // Game over status popup removed per user request
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
    const hasRotationAnims = configs.some(config => config.rotation !== undefined);

    configs.forEach(config => {
      // Check if this animation includes rotation (requires Card3D tweenTo)
      if (config.rotation !== undefined) {
        // Use Card3D tweenTo for animations with rotation
        const card3D = this.card3DManager.cards.get(config.card.id);
        if (card3D) {
          card3D.tweenTo({
            x: config.endX,
            y: config.endY,
            z: config.endZ || 0,
            rotation: config.rotation,
            faceUp: config.faceUp !== undefined ? config.faceUp : 1
          }, config.duration || 500, 'easeInOutQuad');

          // Use setTimeout to track completion since tweenTo doesn't have callback
          setTimeout(() => {
            completedCount++;
            if (completedCount === configs.length) {
              onComplete();
            }
          }, config.duration || 500);
        } else {
          // Fallback if Card3D not found
          completedCount++;
          if (completedCount === configs.length) {
            onComplete();
          }
        }
      } else {
        // Use simple animation for non-rotating cards
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
      }
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

    // Stage 1: All cards fly to celebration positions simultaneously with spin animation
    sequence.addParallelStage(cards.map((card, index) => {
      const startX = card._renderX !== undefined ? card._renderX : celebrationPositions[index].x;
      const startY = card._renderY !== undefined ? card._renderY : celebrationPositions[index].y;

      debugLogger.log('animation', `Card ${index + 1}/4 for celebration`, {
        card: card.name,
        start: `(${Math.round(startX)}, ${Math.round(startY)})`,
        end: `(${Math.round(celebrationPositions[index].x)}, ${Math.round(celebrationPositions[index].y)})`
      });

      // Add ease-in-out spin animation (1 full rotation per card)
      return {
        card: card,
        startX: startX,
        startY: startY,
        endX: celebrationPositions[index].x,
        endY: celebrationPositions[index].y,
        endZ: 20,
        rotation: Math.PI * 2, // One full 360° spin with ease-in-out
        faceUp: 1,
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
      endZ: 0,
      rotation: 0, // Reset rotation back to normal
      faceUp: 1,
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
      endZ: 0,
      rotation: 0, // Ensure rotation stays at 0
      faceUp: 1,
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

      // For Match Game, pass current viewport dimensions for position scaling
      const state = this.currentGameMode === 'match'
        ? this.game.getState(this.renderer.displayWidth, this.renderer.displayHeight)
        : this.game.getState();

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

          // Handle hover detection for 3D cards (always enabled)
          this.updateCardHoverState();
        } catch (err) {
          debugLogger.logError('Error in Card3D system update', err);
        }

        // Update floating texts (match game only)
        if (this.currentGameMode === 'match') {
          try {
            this.updateFloatingTexts(deltaTime);
          } catch (err) {
            debugLogger.logError('Error updating floating texts', err);
          }
        }

        // Update game state (for AI turns, timers, etc.)
        if (this.game && typeof this.game.update === 'function') {
          try {
            this.game.update(deltaTime);
          } catch (err) {
            debugLogger.logError('Error in game update', err);
          }
        }

        // Render
        try {
          const renderOptions = {
            helpMode: this.helpButton.classList.contains('active'),
            hoverX: this.hoverX,
            hoverY: this.hoverY,
            isModalVisible: this.koikoiModal.classList.contains('show'),
            isGameOver: state.gameOver || false,
            card3DManager: this.card3DManager
          };

          this.renderer.render(state, [], renderOptions);

          // Render floating texts on top (match game only)
          if (this.currentGameMode === 'match') {
            this.renderFloatingTexts();
          }
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
          const originalFaceUp = (card3D._showcaseOriginalZone === 'player1Hand' || card3D._showcaseOriginalZone === 'deck') ? 0 : 1;

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
   * Play a random showcase animation (never the same twice in a row)
   */
  playRandomShowcaseAnimation() {
    const animations = [
      () => this.startWaveAnimation(),
      () => this.startSpiralAnimation(),
      () => this.startGridAnimation(),
      () => this.startRippleAnimation(),
      () => this.startColumnsAnimation(),
      () => this.startScatterAnimation()
    ];

    // Select a random animation that's different from the last one
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * animations.length);
    } while (randomIndex === this.lastShowcaseAnimation && animations.length > 1);

    this.lastShowcaseAnimation = randomIndex;
    animations[randomIndex]();
  }

  /**
   * Showcase animation 2: Spiral formation
   */
  startSpiralAnimation() {
    if (!this.card3DManager) {
      debugLogger.logError('Card3DManager not initialized', null);
      return;
    }

    debugLogger.log('animation', '🌀 Starting spiral animation', null);

    const allCard3Ds = [];
    this.card3DManager.cards.forEach(card3D => {
      allCard3Ds.push(card3D);
    });

    if (allCard3Ds.length === 0) return;

    // Store original positions
    allCard3Ds.forEach(card3D => {
      card3D._showcaseOriginalZone = card3D.homeZone;
      card3D._showcaseOriginalX = card3D.homePosition.x;
      card3D._showcaseOriginalY = card3D.homePosition.y;
    });

    const centerX = this.renderer.displayWidth / 2;
    const centerY = this.renderer.displayHeight / 2;

    // Animate cards into spiral formation
    allCard3Ds.forEach((card3D, index) => {
      const angle = (index / allCard3Ds.length) * Math.PI * 6; // 3 full rotations
      const radius = (index / allCard3Ds.length) * Math.min(this.renderer.displayWidth, this.renderer.displayHeight) * 0.4;

      const targetX = centerX + Math.cos(angle) * radius;
      const targetY = centerY + Math.sin(angle) * radius;
      const targetZ = 20 + (index / allCard3Ds.length) * 40;

      const delay = index * 25;

      setTimeout(() => {
        card3D.tweenTo({
          x: targetX,
          y: targetY,
          z: targetZ,
          faceUp: 1,
          rotation: angle
        }, 700, 'easeOutCubic');
      }, delay);
    });

    // Return cards to original positions
    const showcaseDuration = allCard3Ds.length * 25 + 700 + 2000;
    setTimeout(() => {
      allCard3Ds.forEach((card3D, index) => {
        const delay = index * 20;
        setTimeout(() => {
          const originalFaceUp = (card3D._showcaseOriginalZone === 'player1Hand' || card3D._showcaseOriginalZone === 'deck') ? 0 : 1;
          card3D.tweenTo({
            x: card3D._showcaseOriginalX,
            y: card3D._showcaseOriginalY,
            z: 0,
            faceUp: originalFaceUp,
            rotation: 0
          }, 500, 'easeInOutQuad');
        }, delay);
      });
    }, showcaseDuration);
  }

  /**
   * Showcase animation 3: Grid/Matrix formation
   */
  startGridAnimation() {
    if (!this.card3DManager) {
      debugLogger.logError('Card3DManager not initialized', null);
      return;
    }

    debugLogger.log('animation', '📊 Starting grid animation', null);

    const allCard3Ds = [];
    this.card3DManager.cards.forEach(card3D => {
      allCard3Ds.push(card3D);
    });

    if (allCard3Ds.length === 0) return;

    // Store original positions
    allCard3Ds.forEach(card3D => {
      card3D._showcaseOriginalZone = card3D.homeZone;
      card3D._showcaseOriginalX = card3D.homePosition.x;
      card3D._showcaseOriginalY = card3D.homePosition.y;
    });

    const cols = 8;
    const rows = Math.ceil(allCard3Ds.length / cols);
    const { width: cardWidth, height: cardHeight } = this.renderer.cardRenderer.getCardDimensions();
    const spacingX = cardWidth * 1.2;
    const spacingY = cardHeight * 1.2;
    const gridWidth = cols * spacingX;
    const gridHeight = rows * spacingY;
    const startX = (this.renderer.displayWidth - gridWidth) / 2 + spacingX / 2;
    const startY = (this.renderer.displayHeight - gridHeight) / 2 + spacingY / 2;

    // Animate cards into grid formation
    allCard3Ds.forEach((card3D, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const targetX = startX + col * spacingX;
      const targetY = startY + row * spacingY;
      const targetZ = 15;

      const delay = (row * cols + col) * 30; // Animate row by row

      setTimeout(() => {
        card3D.tweenTo({
          x: targetX,
          y: targetY,
          z: targetZ,
          faceUp: 1,
          rotation: 0
        }, 600, 'easeOutCubic');
      }, delay);
    });

    // Return cards to original positions
    const showcaseDuration = (rows * cols) * 30 + 600 + 2000;
    setTimeout(() => {
      allCard3Ds.forEach((card3D, index) => {
        const delay = index * 15;
        setTimeout(() => {
          const originalFaceUp = (card3D._showcaseOriginalZone === 'player1Hand' || card3D._showcaseOriginalZone === 'deck') ? 0 : 1;
          card3D.tweenTo({
            x: card3D._showcaseOriginalX,
            y: card3D._showcaseOriginalY,
            z: 0,
            faceUp: originalFaceUp,
            rotation: 0
          }, 500, 'easeInOutQuad');
        }, delay);
      });
    }, showcaseDuration);
  }

  /**
   * Showcase animation 4: Ripple/Wave formation
   */
  startRippleAnimation() {
    if (!this.card3DManager) {
      debugLogger.logError('Card3DManager not initialized', null);
      return;
    }

    debugLogger.log('animation', '〰️ Starting ripple animation', null);

    const allCard3Ds = [];
    this.card3DManager.cards.forEach(card3D => {
      allCard3Ds.push(card3D);
    });

    if (allCard3Ds.length === 0) return;

    // Store original positions
    allCard3Ds.forEach(card3D => {
      card3D._showcaseOriginalZone = card3D.homeZone;
      card3D._showcaseOriginalX = card3D.homePosition.x;
      card3D._showcaseOriginalY = card3D.homePosition.y;
    });

    const centerX = this.renderer.displayWidth / 2;
    const centerY = this.renderer.displayHeight / 2;
    const numRings = 6;

    // Animate cards in concentric circles (ripple effect)
    allCard3Ds.forEach((card3D, index) => {
      const ringIndex = Math.floor((index / allCard3Ds.length) * numRings);
      const cardsInRing = Math.max(6, ringIndex * 3 + 6);
      const angleOffset = (index % cardsInRing) / cardsInRing;
      const angle = angleOffset * Math.PI * 2;
      const radius = (ringIndex + 1) * (Math.min(this.renderer.displayWidth, this.renderer.displayHeight) / (numRings + 2));

      const targetX = centerX + Math.cos(angle) * radius;
      const targetY = centerY + Math.sin(angle) * radius;
      const targetZ = 20 + ringIndex * 5;

      const delay = ringIndex * 150; // Ripple outward

      setTimeout(() => {
        card3D.tweenTo({
          x: targetX,
          y: targetY,
          z: targetZ,
          faceUp: 1,
          rotation: angle + Math.PI / 2
        }, 600, 'easeOutCubic');
      }, delay);
    });

    // Return cards to original positions
    const showcaseDuration = numRings * 150 + 600 + 2000;
    setTimeout(() => {
      allCard3Ds.forEach((card3D, index) => {
        const delay = index * 18;
        setTimeout(() => {
          const originalFaceUp = (card3D._showcaseOriginalZone === 'player1Hand' || card3D._showcaseOriginalZone === 'deck') ? 0 : 1;
          card3D.tweenTo({
            x: card3D._showcaseOriginalX,
            y: card3D._showcaseOriginalY,
            z: 0,
            faceUp: originalFaceUp,
            rotation: 0
          }, 500, 'easeInOutQuad');
        }, delay);
      });
    }, showcaseDuration);
  }

  /**
   * Showcase animation 5: Vertical columns
   */
  startColumnsAnimation() {
    if (!this.card3DManager) {
      debugLogger.logError('Card3DManager not initialized', null);
      return;
    }

    debugLogger.log('animation', '📊 Starting columns animation', null);

    const allCard3Ds = [];
    this.card3DManager.cards.forEach(card3D => {
      allCard3Ds.push(card3D);
    });

    if (allCard3Ds.length === 0) return;

    // Store original positions
    allCard3Ds.forEach(card3D => {
      card3D._showcaseOriginalZone = card3D.homeZone;
      card3D._showcaseOriginalX = card3D.homePosition.x;
      card3D._showcaseOriginalY = card3D.homePosition.y;
    });

    const numColumns = 6;
    const { width: cardWidth, height: cardHeight } = this.renderer.cardRenderer.getCardDimensions();
    const columnSpacing = this.renderer.displayWidth / (numColumns + 1);

    // Animate cards into vertical columns
    allCard3Ds.forEach((card3D, index) => {
      const colIndex = index % numColumns;
      const rowIndex = Math.floor(index / numColumns);

      const targetX = columnSpacing * (colIndex + 1);
      const targetY = 80 + rowIndex * (cardHeight * 0.5);
      const targetZ = 15 + Math.sin((colIndex / numColumns) * Math.PI) * 20;

      const delay = colIndex * 100 + rowIndex * 40; // Columns appear one by one

      setTimeout(() => {
        card3D.tweenTo({
          x: targetX,
          y: targetY,
          z: targetZ,
          faceUp: 1,
          rotation: 0
        }, 650, 'easeOutCubic');
      }, delay);
    });

    // Return cards to original positions
    const maxRows = Math.ceil(allCard3Ds.length / numColumns);
    const showcaseDuration = (numColumns * 100 + maxRows * 40) + 650 + 2000;
    setTimeout(() => {
      allCard3Ds.forEach((card3D, index) => {
        const delay = index * 18;
        setTimeout(() => {
          const originalFaceUp = (card3D._showcaseOriginalZone === 'player1Hand' || card3D._showcaseOriginalZone === 'deck') ? 0 : 1;
          card3D.tweenTo({
            x: card3D._showcaseOriginalX,
            y: card3D._showcaseOriginalY,
            z: 0,
            faceUp: originalFaceUp,
            rotation: 0
          }, 500, 'easeInOutQuad');
        }, delay);
      });
    }, showcaseDuration);
  }

  /**
   * Showcase animation 6: Scatter then organize
   */
  startScatterAnimation() {
    if (!this.card3DManager) {
      debugLogger.logError('Card3DManager not initialized', null);
      return;
    }

    debugLogger.log('animation', '✨ Starting scatter animation', null);

    const allCard3Ds = [];
    this.card3DManager.cards.forEach(card3D => {
      allCard3Ds.push(card3D);
    });

    if (allCard3Ds.length === 0) return;

    // Store original positions
    allCard3Ds.forEach(card3D => {
      card3D._showcaseOriginalZone = card3D.homeZone;
      card3D._showcaseOriginalX = card3D.homePosition.x;
      card3D._showcaseOriginalY = card3D.homePosition.y;
    });

    const centerX = this.renderer.displayWidth / 2;
    const centerY = this.renderer.displayHeight / 2;

    // Phase 1: Scatter randomly
    allCard3Ds.forEach((card3D, index) => {
      const randomAngle = Math.random() * Math.PI * 2;
      const randomRadius = Math.random() * 150 + 100;
      const scatterX = centerX + Math.cos(randomAngle) * randomRadius;
      const scatterY = centerY + Math.sin(randomAngle) * randomRadius;
      const scatterZ = Math.random() * 40 + 10;

      const delay = index * 20;

      setTimeout(() => {
        card3D.tweenTo({
          x: scatterX,
          y: scatterY,
          z: scatterZ,
          faceUp: 1,
          rotation: Math.random() * Math.PI * 2
        }, 600, 'easeOutCubic');
      }, delay);
    });

    // Phase 2: Organize into neat formation
    const phase2Start = allCard3Ds.length * 20 + 600 + 800;
    setTimeout(() => {
      const radius = Math.min(this.renderer.displayWidth, this.renderer.displayHeight) * 0.35;

      allCard3Ds.forEach((card3D, index) => {
        const progress = allCard3Ds.length > 1 ? index / (allCard3Ds.length - 1) : 0.5;
        const angle = progress * Math.PI * 2;

        const targetX = centerX + Math.cos(angle) * radius;
        const targetY = centerY + Math.sin(angle) * radius;
        const targetZ = 15;

        const delay = index * 25;

        setTimeout(() => {
          card3D.tweenTo({
            x: targetX,
            y: targetY,
            z: targetZ,
            faceUp: 1,
            rotation: angle + Math.PI / 2
          }, 700, 'easeInOutQuad');
        }, delay);
      });
    }, phase2Start);

    // Return cards to original positions
    const showcaseDuration = phase2Start + allCard3Ds.length * 25 + 700 + 1500;
    setTimeout(() => {
      allCard3Ds.forEach((card3D, index) => {
        const delay = index * 20;
        setTimeout(() => {
          const originalFaceUp = (card3D._showcaseOriginalZone === 'player1Hand' || card3D._showcaseOriginalZone === 'deck') ? 0 : 1;
          card3D.tweenTo({
            x: card3D._showcaseOriginalX,
            y: card3D._showcaseOriginalY,
            z: 0,
            faceUp: originalFaceUp,
            rotation: 0
          }, 500, 'easeInOutQuad');
        }, delay);
      });
    }, showcaseDuration);
  }

  /**
   * Play losing animation - cards scatter in frustration
   */
  playLosingAnimation() {
    if (!this.card3DManager) {
      debugLogger.logError('Card3DManager not initialized', null);
      return;
    }

    debugLogger.log('animation', '😢 Starting losing animation', null);

    const allCard3Ds = [];
    this.card3DManager.cards.forEach(card3D => {
      allCard3Ds.push(card3D);
    });

    if (allCard3Ds.length === 0) return;

    const centerX = this.renderer.displayWidth / 2;
    const centerY = this.renderer.displayHeight / 2;

    // Phase 1: Move all cards to random positions near center, elevated
    allCard3Ds.forEach((card3D, index) => {
      const randomOffsetX = (Math.random() - 0.5) * 100;
      const randomOffsetY = (Math.random() - 0.5) * 100;

      card3D.tweenTo({
        x: centerX + randomOffsetX,
        y: centerY + randomOffsetY,
        z: 200, // High up
        faceUp: 1,
        rotation: Math.random() * Math.PI * 2
      }, 500, 'easeInQuad');
    });

    // Phase 2: All cards fall and scatter dramatically
    setTimeout(() => {
      allCard3Ds.forEach((card3D, index) => {
        const scatterX = centerX + (Math.random() - 0.5) * 400; // -200 to 200
        const scatterY = centerY + (Math.random() - 0.5) * 400; // -200 to 200
        const finalRotation = Math.random() * Math.PI * 4; // Multiple spins

        card3D.tweenTo({
          x: scatterX,
          y: scatterY,
          z: 0,
          faceUp: Math.random() > 0.5 ? 1 : 0, // Random face orientation
          rotation: finalRotation
        }, 1200, 'easeOutBounce'); // Bounce for extra drama
      });
    }, 500);
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
    this.animationTester.initialize(this.renderer.displayWidth, this.renderer.displayHeight, this.canvas);
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

    // Copy settings button
    document.getElementById('copy-settings').addEventListener('click', () => {
      const settingsText = this.animationTester.getParametersAsString();
      navigator.clipboard.writeText(settingsText).then(() => {
        // Show temporary feedback
        const btn = document.getElementById('copy-settings');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy settings:', err);
        alert('Failed to copy to clipboard. Please try again.');
      });
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
    this.setupRangeControl('peakScale');

    // Variance controls
    document.getElementById('varianceEnabled').addEventListener('change', (e) => {
      this.animationTester.updateParam('varianceEnabled', e.target.checked);
    });
    this.setupRangeControl('rotationVariance', (value) => value * Math.PI / 180); // Convert to radians
    this.setupRangeControl('positionXVariance');
    this.setupRangeControl('positionYVariance');
    this.setupRangeControl('positionZVariance');

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
      'peakScale',
      'flipTiming',
      'endOpacity',
      'positionXVariance', 'positionYVariance', 'positionZVariance'
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

    // Update rotation variance (convert from radians to degrees)
    const rotVarianceInput = document.getElementById('rotationVariance');
    const rotVarianceDisplay = document.getElementById('rotationVariance-value');
    if (rotVarianceInput && rotVarianceDisplay) {
      const degrees = Math.round(params.rotationVariance * 180 / Math.PI);
      rotVarianceInput.value = degrees;
      rotVarianceDisplay.textContent = degrees;
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

    const varianceEnabledCheckbox = document.getElementById('varianceEnabled');
    if (varianceEnabledCheckbox) {
      varianceEnabledCheckbox.checked = params.varianceEnabled === true;
    }

    // Update easing select
    document.getElementById('easing').value = params.easing;
  }

  /**
   * Show Hachi-Hachi Teyaku Payment Grid
   * Teaching moment for payment/money mechanic
   */
  async showTeyakuPaymentGrid(params) {
    await HachiHachiModals.showTeyakuPaymentGrid({
      roundNumber: params.roundNumber,
      playerTeyaku: params.playerTeyaku,
      opponent1Teyaku: params.opponent1Teyaku,
      opponent2Teyaku: params.opponent2Teyaku,
      fieldMultiplier: params.fieldMultiplier,
      onContinue: params.onContinue
    });
  }

  /**
   * Show Hachi-Hachi Sage/Shoubu decision modal
   */
  async showHachihachiDecision(decision, params) {
    if (decision === 'sage') {
      // Player needs to make Sage/Shoubu/Cancel decision
      await HachiHachiModals.showSageDecision({
        dekiyakuList: params.dekiyakuList,
        playerScore: params.playerScore,
        opponent1Score: params.opponent1Score,
        opponent2Score: params.opponent2Score,
        roundNumber: params.roundNumber,
        onSage: () => this.game.callSage(params.playerKey),
        onShoubu: () => this.game.callShoubu(params.playerKey),
        onCancel: () => this.game.callCancel(params.playerKey)
      });
    }
  }

  /**
   * Show Hachi-Hachi round summary
   */
  async showHachihachiRoundSummary(data) {
    await HachiHachiModals.showRoundSummary({
      roundNumber: data.roundNumber,
      winner: data.winner,
      fieldMultiplier: data.fieldMultiplier,
      teyaku: data.teyaku,
      dekiyaku: data.dekiyaku,
      cardBreakdown: data.cardBreakdown,
      scoreBreakdown: data.scoreBreakdown,
      allScores: data.allScores,
      stats: data.stats
    });

    // Continue to next round or end game
    if (data.isGameOver) {
      await HachiHachiModals.showGameEnd({
        winner: data.winner,
        finalScores: data.allScores.gameScores,
        totalRounds: data.totalRounds,
        stats: data.stats
      });
      this.switchGameMode('hachihachi'); // Start new game
    } else {
      this.game.nextRound();
      this.updateUI();

      // Reinitialize Card3D system for the new round to reset positions
      this.card3DManager.initializeFromGameState(this.game.getState(), true);
      debugLogger.log('3dCards', '✨ Card3D system reinitialized for Hachi-Hachi next round', null);
    }
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log(`Hanafuda Koi-Koi starting (v${APP_VERSION})`);

  // Display build ID in header
  const buildIdElement = document.getElementById('build-id');
  if (buildIdElement) {
    buildIdElement.textContent = `v${APP_VERSION}`;
  }

  // Register service worker for intelligent caching
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/hanafuda/sw.js', {
        scope: '/hanafuda/'
      });

      console.log('[SW] Service Worker registered successfully:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] New version found, updating...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is ready, notify user to refresh
            console.log('[SW] New version ready. Refresh to update.');

            // Automatically activate new service worker
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Refresh page when new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] New version activated, reloading page...');
        window.location.reload();
      });

    } catch (error) {
      console.warn('[SW] Service Worker registration failed:', error);
    }
  }

  const game = new Game();

  // Run async initialization with loading screen
  await game.initialize();

  // Example: Load background if available
  // game.loadBackground('./assets/backgrounds/texture.jpg');

  console.log(`Hanafuda Koi-Koi ready (v${APP_VERSION})`);

  // Expose testing utilities to console
  window.gameTestUtils = {
    game,
    card3DManager: game.card3DManager,
    gameState: () => game.game.getState(),
    validateGameState: () => {
      const playerCount = game.selectedPlayerCount;
      const results = GameStateValidator.validateCardAllocation(
        game.game.getState(),
        game.card3DManager,
        playerCount
      );
      GameStateValidator.printResults(results);
      return results;
    },
    validateZones: () => {
      const results = GameStateValidator.validateZoneStructure(
        game.card3DManager,
        game.selectedPlayerCount
      );
      console.group('🧪 Zone Structure Validation');
      results.forEach(r => console.log(r.message));
      console.groupEnd();
      return results;
    },
    logZoneCards: () => {
      console.group('🎴 Cards in Each Zone');
      if (game.card3DManager && game.card3DManager.zoneCards) {
        Object.entries(game.card3DManager.zoneCards).forEach(([zoneName, cardSet]) => {
          console.log(`${zoneName}: ${cardSet.size} cards`);
        });
      }
      console.groupEnd();
    },
    logPlayerCounts: () => {
      const state = game.game.getState();
      console.group('👥 Player Counts');
      if (state.players && Array.isArray(state.players)) {
        state.players.forEach((player, index) => {
          console.log(`Player ${index}: hand=${player.hand?.length || 0}, trick=${player.trick?.length || 0}`);
        });
      }
      console.log(`Field: ${state.field?.length || 0} cards`);
      console.log(`Deck: ${state.deck?.length || 0} cards`);
      console.groupEnd();
    }
  };

  console.log('🧪 Testing utilities available at window.gameTestUtils');
  console.log('  - gameTestUtils.validateGameState() - Full validation');
  console.log('  - gameTestUtils.validateZones() - Zone structure check');
  console.log('  - gameTestUtils.logZoneCards() - Show all zone contents');
  console.log('  - gameTestUtils.logPlayerCounts() - Show player hand/trick counts');
});
