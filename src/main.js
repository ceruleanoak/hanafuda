/**
 * Main entry point for Hanafuda Koi-Koi game
 */

import { KoiKoi } from './game/KoiKoi.js';
import { Renderer } from './rendering/Renderer.js';
import { debugLogger } from './utils/DebugLogger.js';
import { AnimationSequence } from './utils/AnimationSequence.js';
import { GameOptions } from './game/GameOptions.js';
import { Animation3DManager } from './utils/Animation3D.js';

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
    this.roundModal = document.getElementById('round-modal');
    this.variationsModal = document.getElementById('variations-modal');
    this.optionsModal = document.getElementById('options-modal');
    this.koikoiModal = document.getElementById('koikoi-modal');
    this.roundSummaryModal = document.getElementById('round-summary-modal');
    this.tutorialBubble = document.getElementById('tutorial-bubble');

    // Initialize game options
    this.gameOptions = new GameOptions();

    this.game = new KoiKoi(this.gameOptions);
    this.game.setUICallback((yaku, score) => this.showKoikoiDecision(yaku, score));
    this.game.setRoundSummaryCallback((data) => this.showRoundSummary(data));
    this.game.setOpponentKoikoiCallback(() => this.showOpponentKoikoiNotification());
    this.renderer = new Renderer(this.canvas);

    // Initialize card hue shift from saved options
    this.renderer.setCardHueShift(this.gameOptions.get('cardHueShift'));

    // Initialize 3D animation system
    this.animation3DManager = new Animation3DManager();
    this.is3DAnimationActive = false; // Track if 3D animation demo is running

    this.animatingCards = [];
    this.currentSequence = null;  // Current animation sequence playing
    this.isAnimating = false;     // Block input during animations
    this.lastMessage = '';
    this.lastGameOverMessage = '';
    this.frameCount = 0;

    // New features state
    this.helpMode = this.gameOptions.get('helpMode'); // Load from saved options
    this.hoverX = -1;             // Mouse hover X position
    this.hoverY = -1;             // Mouse hover Y position

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

    debugLogger.log('gameState', 'Game initializing...', {
      canvasSize: `${this.canvas.width}x${this.canvas.height}`,
      displaySize: `${this.renderer.displayWidth}x${this.renderer.displayHeight}`
    });

    this.setupEventListeners();

    // Initialize help button state
    if (this.helpMode) {
      this.helpButton.classList.add('active');
    }

    // Initialize variations button state
    this.updateVariationsButtonState();

    // Show tutorial bubble if first time user
    if (this.gameOptions.isFirstTime()) {
      setTimeout(() => this.showTutorial(), 1000);
    }

    this.showRoundModal(); // Show modal on startup
    this.gameLoop();

    debugLogger.log('gameState', 'Game initialized successfully', null);
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

    // Hue shift slider - live preview as you drag
    document.getElementById('card-hue-shift').addEventListener('input', (e) => {
      const hueValue = parseInt(e.target.value);
      document.getElementById('hue-shift-value').textContent = hueValue;
      // Apply immediately for live preview
      this.renderer.setCardHueShift(hueValue);
    });

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
  }

  handleClick(event) {
    // Block input during animations
    if (this.isAnimating) {
      debugLogger.log('gameState', '🚫 Click blocked - animation playing', null);
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gameState = this.game.getState();
    const result = this.renderer.getCardAtPosition(x, y, gameState);

    if (result) {
      const { card, owner } = result;

      debugLogger.log('gameState', `Card clicked: ${card.name}`, {
        owner,
        hasRenderPosition: card._renderX !== undefined,
        renderPosition: card._renderX !== undefined ?
          `(${Math.round(card._renderX)}, ${Math.round(card._renderY)})` :
          'not set'
      });

      // Store card position before state changes
      if (card._renderX !== undefined && card._renderY !== undefined) {
        card._lastRenderX = card._renderX;
        card._lastRenderY = card._renderY;
        debugLogger.log('animation', 'Captured card position for animation', {
          card: card.name,
          position: `(${Math.round(card._renderX)}, ${Math.round(card._renderY)})`
        });
      } else {
        debugLogger.logAnimationWarning('Card clicked but has no render position', {
          card: card.name,
          owner
        });
      }

      // Capture state LENGTHS before action (getState() returns references, not copies!)
      const state = this.game.getState();
      const beforeLengths = {
        playerCaptured: state.playerCaptured.length,
        opponentCaptured: state.opponentCaptured.length,
        field: state.field.length,
        playerHand: state.playerHand.length
      };

      debugLogger.log('gameState', `BEFORE selectCard - lengths captured`, {
        playerCaptured: beforeLengths.playerCaptured,
        opponentCaptured: beforeLengths.opponentCaptured,
        field: beforeLengths.field
      });

      const success = this.game.selectCard(card, owner);

      if (success) {
        // Check if we should animate by comparing actual changes
        const afterState = this.game.getState();

        debugLogger.log('gameState', `AFTER selectCard - checking lengths`, {
          playerCapturedBefore: beforeLengths.playerCaptured,
          playerCapturedAfter: afterState.playerCaptured.length,
          willTriggerAnimation: afterState.playerCaptured.length > beforeLengths.playerCaptured
        });

        this.handleGameStateChange(beforeLengths, afterState, card);
        this.updateUI();
      }
    }
  }

  handleDoubleClick(event) {
    // Block input during animations
    if (this.isAnimating) {
      debugLogger.log('gameState', '🚫 Double-click blocked - animation playing', null);
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gameState = this.game.getState();
    const result = this.renderer.getCardAtPosition(x, y, gameState);

    if (result && result.owner === 'player' && gameState.phase === 'select_hand') {
      const { card } = result;

      debugLogger.log('gameState', `Card double-clicked (auto-match): ${card.name}`, {
        owner: result.owner,
        phase: gameState.phase
      });

      // Store card position before state changes
      if (card._renderX !== undefined && card._renderY !== undefined) {
        card._lastRenderX = card._renderX;
        card._lastRenderY = card._renderY;
        debugLogger.log('animation', 'Captured card position for auto-match animation', {
          card: card.name,
          position: `(${Math.round(card._renderX)}, ${Math.round(card._renderY)})`
        });
      }

      // Capture state LENGTHS before action (getState() returns references, not copies!)
      const state = this.game.getState();
      const beforeLengths = {
        playerCaptured: state.playerCaptured.length,
        opponentCaptured: state.opponentCaptured.length,
        field: state.field.length,
        playerHand: state.playerHand.length
      };

      // Auto-match if match exists
      const success = this.game.autoMatchCard(card);

      if (success) {
        const afterState = this.game.getState();
        this.handleGameStateChange(beforeLengths, afterState, card);
        this.updateUI();
      }
    }
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.hoverX = event.clientX - rect.left;
    this.hoverY = event.clientY - rect.top;
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
    document.getElementById('card-hue-shift').value = options.cardHueShift;
    document.getElementById('hue-shift-value').textContent = options.cardHueShift;

    // Store original hue shift for cancel functionality
    this.originalHueShift = options.cardHueShift;

    this.optionsModal.classList.add('show');
  }

  /**
   * Hide options modal (cancel)
   */
  hideOptionsModal() {
    // Restore original hue shift if user cancelled
    if (this.originalHueShift !== undefined) {
      this.renderer.setCardHueShift(this.originalHueShift);
    }
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
      animationsEnabled: document.getElementById('animations-enabled').checked,
      cardHueShift: parseInt(document.getElementById('card-hue-shift').value)
    };

    this.gameOptions.update(newOptions);

    // Update game options
    this.game.updateOptions(this.gameOptions);

    // Update card renderer hue shift
    this.renderer.setCardHueShift(newOptions.cardHueShift);

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
      // Update renderer with default values
      this.renderer.setCardHueShift(0);
      // Update game options
      this.game.updateOptions(this.gameOptions);
      // Update help mode
      this.helpMode = this.gameOptions.get('helpMode');
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
   * Stage 1: Moving card → target card position
   * Stage 2: Match event fires
   * Stage 3: Brief delay
   * Stage 4: Both cards → trick pile together
   */
  createMatchSequence(movingCard, targetCard, capturedZone, player) {
    const sequence = new AnimationSequence(`${player} Match`);

    // Use _renderX/Y which is set during last render (before cards moved to captured)
    const movingStartPos = {
      x: movingCard._renderX !== undefined ? movingCard._renderX : 0,
      y: movingCard._renderY !== undefined ? movingCard._renderY : 0
    };

    const targetPos = {
      x: targetCard._renderX !== undefined ? targetCard._renderX : 0,
      y: targetCard._renderY !== undefined ? targetCard._renderY : 0
    };

    const pilePos = this.getZonePosition(capturedZone, this.game.getState());

    debugLogger.log('animation', `Creating match sequence`, {
      movingCard: movingCard.name,
      movingStart: `(${Math.round(movingStartPos.x)}, ${Math.round(movingStartPos.y)})`,
      targetCard: targetCard.name,
      targetPos: `(${Math.round(targetPos.x)}, ${Math.round(targetPos.y)})`,
      pilePos: `(${Math.round(pilePos.x)}, ${Math.round(pilePos.y)})`
    });

    // Stage 1: Moving card animates to target card
    sequence.addParallelStage([{
      card: movingCard,
      startX: movingStartPos.x,
      startY: movingStartPos.y,
      endX: targetPos.x,
      endY: targetPos.y,
      duration: 400
    }], 'Card arrives at match');

    // Stage 2: Fire match event
    sequence.addEvent('card_match', {
      movingCard: movingCard.name,
      targetCard: targetCard.name,
      player: player
    });

    // Stage 3: Brief delay to show the match
    sequence.addDelay(200);

    // Stage 4: Both cards to pile together from the same position
    sequence.addParallelStage([
      {
        card: movingCard,
        startX: targetPos.x,
        startY: targetPos.y,
        endX: pilePos.x,
        endY: pilePos.y,
        duration: 500
      },
      {
        card: targetCard,
        startX: targetPos.x,
        startY: targetPos.y,
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
      const deltaTime = this.lastTime ? now - this.lastTime : 0;
      this.lastTime = now;

      const state = this.game.getState();

      // Check for state changes and trigger animations (only when not already animating)
      if (!this.isAnimating) {
        this.checkForStateChanges(state);
      }

      // Update animations
      try {
        this.updateAnimations(deltaTime);
      } catch (err) {
        debugLogger.logError('Error in updateAnimations', err);
      }

      // Update 3D animations
      if (this.is3DAnimationActive) {
        try {
          this.animation3DManager.update(now);
        } catch (err) {
          debugLogger.logError('Error in 3D animation update', err);
        }
      }

      // Render
      try {
        this.renderer.render(state, this.animatingCards, {
          helpMode: this.helpMode,
          hoverX: this.hoverX,
          hoverY: this.hoverY,
          animation3DManager: this.is3DAnimationActive ? this.animation3DManager : null
        });
      } catch (err) {
        debugLogger.logError('Error in render', err);
      }

      // Update UI
      try {
        this.updateUI();
      } catch (err) {
        debugLogger.logError('Error in updateUI', err);
      }

      // Log game loop status periodically (every 300 frames ~5 seconds at 60fps)
      this.frameCount++;
      if (this.frameCount === 1) {
        debugLogger.log('gameState', '🎮 Game loop started', null);
      } else if (this.frameCount % 300 === 0) {
        debugLogger.log('gameState', `Game loop running (frame ${this.frameCount})`, {
          animatingCards: this.animatingCards.length,
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
      // Normal match - determine which card came from hand and which from field
      // The card from hand/opponent hand should move TO the field card
      const fieldCard = cards.find(c => c._owner === 'field');
      const handCard = cards.find(c => c._owner === 'player' || c._owner === 'opponent');

      // If we can't determine by owner, use Y position (hand cards are higher/lower than field)
      let movingCard, targetCard;
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

      debugLogger.log('animation', `Determined animation direction`, {
        movingCard: `${movingCard.name} (owner: ${movingCard._owner})`,
        targetCard: `${targetCard.name} (owner: ${targetCard._owner})`
      });

      const sequence = this.createMatchSequence(movingCard, targetCard, capturedZone, player);
      this.playSequence(sequence);
    } else {
      // Unexpected count, use fallback
      this.fallbackSimpleAnimation(cards, capturedZone);
    }
  }

  /**
   * Start the 3D wave animation demo
   */
  startWaveAnimation() {
    // Clear existing 3D cards
    this.animation3DManager.clear();

    // Get all cards from the current game state
    const state = this.game.getState();
    const allCards = [
      ...state.field,
      ...state.playerHand,
      ...state.opponentHand
    ];

    // If no cards, use a test deck
    if (allCards.length === 0) {
      console.log('No cards in game, creating test deck for wave animation');
      // Import cards data to create a test deck
      import('./data/cards.js').then(({ CARDS }) => {
        this.createWaveFromCards(CARDS.slice(0, 12)); // Use first 12 cards for demo
      });
      return;
    }

    this.createWaveFromCards(allCards);
  }

  /**
   * Create wave animation from a set of cards
   */
  createWaveFromCards(cards) {
    // Get canvas dimensions
    const canvasWidth = this.renderer.displayWidth;
    const canvasHeight = this.renderer.displayHeight;

    // Calculate grid layout for cards
    const cardsPerRow = Math.ceil(Math.sqrt(cards.length));
    const rows = Math.ceil(cards.length / cardsPerRow);
    const cardWidth = this.renderer.cardRenderer.cardWidth;
    const cardHeight = this.renderer.cardRenderer.cardHeight;

    // Spacing between cards
    const spacingX = (canvasWidth - (cardsPerRow * cardWidth)) / (cardsPerRow + 1);
    const spacingY = (canvasHeight - (rows * cardHeight)) / (rows + 1);

    // Get deck position (draw pile)
    const margin = 30;
    const centerY = this.renderer.displayHeight / 2;
    const deckX = margin + cardWidth / 2;
    const deckY = centerY;

    // Activate 3D animation system
    this.is3DAnimationActive = true;

    // PHASE 1: Create all cards at deck position and move to grid positions
    const card3DArray = cards.map((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;

      // Calculate target grid position
      const targetX = spacingX + col * (cardWidth + spacingX) + cardWidth / 2;
      const targetY = spacingY + row * (cardHeight + spacingY) + cardHeight / 2;
      const targetZ = 0;

      // Start all cards at deck position, face down
      const card3D = this.animation3DManager.addCard(card, deckX, deckY, 0);
      card3D.faceUp = 0;
      card3D.targetFaceUp = 0;

      // Store target position for later
      card3D._gridX = targetX;
      card3D._gridY = targetY;
      card3D._gridZ = targetZ;
      card3D._gridIndex = index;

      // Delay based on position for staggered movement
      const moveDelay = (col + row) * 100; // milliseconds

      setTimeout(() => {
        // Move to grid position
        card3D.setTarget(targetX, targetY, targetZ, 400); // 400 pixels/second
      }, moveDelay);

      return card3D;
    });

    // PHASE 2: Wait for all cards to reach position, then flip and start wave
    const totalMoveTime = ((cardsPerRow - 1) + (rows - 1)) * 100 + 1000; // Last card delay + travel time

    setTimeout(() => {
      console.log('All cards in position, starting wave animation');

      card3DArray.forEach((card3D, index) => {
        // Stop any residual movement
        card3D.vx = 0;
        card3D.vy = 0;
        card3D.vz = 0;

        // Ensure at exact grid position
        card3D.x = card3D._gridX;
        card3D.y = card3D._gridY;
        card3D.z = card3D._gridZ;

        const row = Math.floor(index / cardsPerRow);
        const col = index % cardsPerRow;
        const flipDelay = (col + row) * 50;

        setTimeout(() => {
          // Flip face up
          card3D.setFaceUp(1);
        }, flipDelay);
      });

      // Start wave motion after flip animations
      const waveStartDelay = ((cardsPerRow - 1) + (rows - 1)) * 50 + 500;

      setTimeout(() => {
        console.log('Starting wave motion');

        card3DArray.forEach(card3D => {
          const frequency = 2.0;
          const amplitudeZ = 50;
          const amplitudeXY = 20;
          const startTime = performance.now();
          const homeX = card3D._gridX;
          const homeY = card3D._gridY;
          const homeZ = card3D._gridZ;

          const animateWave = () => {
            if (!this.is3DAnimationActive) return;

            const elapsed = (performance.now() - startTime) / 1000;
            const angle = elapsed * frequency * Math.PI * 2;

            // Circular motion + vertical bounce
            const wave = Math.sin(angle);
            card3D.z = Math.max(0, homeZ + amplitudeZ * (wave + 1) / 2);
            card3D.x = homeX + amplitudeXY * Math.cos(angle);
            card3D.y = homeY + amplitudeXY * Math.sin(angle);

            requestAnimationFrame(animateWave);
          };

          animateWave();
        });

        // PHASE 3: After wave, send cards back to deck asynchronously
        setTimeout(() => {
          console.log('Wave complete, returning cards to deck');

          card3DArray.forEach((card3D, index) => {
            // Random delay for async return
            const returnDelay = Math.random() * 2000;

            setTimeout(() => {
              // Flip back face down first
              card3D.setFaceUp(0);

              // After flip completes, move to deck
              setTimeout(() => {
                card3D.setTarget(deckX, deckY, 0, 300);
              }, 400);
            }, returnDelay);
          });

          // Clean up after all cards have returned
          setTimeout(() => {
            this.is3DAnimationActive = false;
            this.animation3DManager.clear();
            console.log('Wave animation sequence complete');
          }, 4000); // Give time for cards to return

        }, 3000); // Wave duration
      }, waveStartDelay);

    }, totalMoveTime);

    console.log(`Wave animation sequence started with ${cards.length} cards`);
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
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();

  // Example: Load background if available
  // game.loadBackground('./assets/backgrounds/texture.jpg');

  console.log('Hanafuda Koi-Koi initialized');
});
