/**
 * KoiKoi - Main game logic for Koi-Koi hanafuda game
 */

import { Deck } from './Deck.js';
import { Yaku } from './Yaku.js';

export class KoiKoi {
  constructor(gameOptions = null) {
    this.deck = new Deck();
    this.totalRounds = 1;
    this.currentRound = 0;
    this.animationQueue = [];
    this.isAnimating = false;
    this.gameOptions = gameOptions;
    this.uiCallback = null; // Will be set by main.js to show koi-koi modal

    // Koi-koi state tracking
    this.koikoiState = {
      playerCalled: false,
      opponentCalled: false,
      playerCount: 0,      // How many times player called koi-koi
      opponentCount: 0,    // How many times opponent called koi-koi
      roundActive: true,   // Is the round still going after koi-koi?
      waitingForDecision: false,
      decisionPlayer: null, // Who needs to make a decision
      roundWinner: null    // Who won this round (for winner-take-all scoring)
    };

    // Track previous yaku to detect new yaku
    this.previousPlayerYaku = [];
    this.previousOpponentYaku = [];

    this.reset();
  }

  /**
   * Set UI callback for showing koi-koi decision modal
   */
  setUICallback(callback) {
    this.uiCallback = callback;
  }

  /**
   * Update game options
   */
  updateOptions(gameOptions) {
    this.gameOptions = gameOptions;
  }

  startNewGame(rounds) {
    this.totalRounds = rounds;
    this.currentRound = 1;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.reset();
  }

  reset() {
    this.deck.reset();
    this.field = [];
    this.playerHand = [];
    this.opponentHand = [];
    this.playerCaptured = [];
    this.opponentCaptured = [];
    this.playerYaku = [];
    this.opponentYaku = [];
    this.previousPlayerYaku = [];
    this.previousOpponentYaku = [];
    this.currentPlayer = 'player'; // 'player' or 'opponent'
    this.selectedCards = [];
    this.phase = 'select_hand'; // 'select_hand', 'select_field', 'draw_phase', 'select_drawn_match', 'opponent_playing'
    this.drawnCard = null;
    this.drawnCardMatches = [];
    this.opponentPlayedCard = null; // Card opponent is currently playing
    this.gameOver = false;
    this.message = '';

    // Reset koi-koi state for new round
    this.koikoiState = {
      playerCalled: false,
      opponentCalled: false,
      playerCount: 0,
      opponentCount: 0,
      roundActive: true,
      waitingForDecision: false,
      decisionPlayer: null,
      roundWinner: null
    };

    this.deal();
  }

  /**
   * Initial deal - 8 cards to field, 8 to each player
   */
  deal() {
    // Deal 8 cards to field
    this.field = this.deck.drawMultiple(8);

    // Deal 8 cards to each player
    this.playerHand = this.deck.drawMultiple(8);
    this.opponentHand = this.deck.drawMultiple(8);

    // Check if player has a card that would complete a 4-card capture
    const celebrateMonth = this.checkHandForFourCardCapture('player');
    if (celebrateMonth) {
      this.message = `Celebrate month of ${celebrateMonth}! You can capture all 4 cards!`;
    } else {
      this.message = 'Select a card from your hand';
    }
  }

  /**
   * Get current game state
   */
  getState() {
    const playerProgress = Yaku.checkYakuProgress(this.playerCaptured, this.opponentCaptured);
    const opponentProgress = Yaku.checkYakuProgress(this.opponentCaptured, this.playerCaptured);

    return {
      field: this.field,
      playerHand: this.playerHand,
      opponentHand: this.opponentHand,
      playerCaptured: this.playerCaptured,
      opponentCaptured: this.opponentCaptured,
      playerYaku: this.playerYaku,
      opponentYaku: this.opponentYaku,
      playerYakuProgress: playerProgress,
      opponentYakuProgress: opponentProgress,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      deckCount: this.deck.count,
      currentPlayer: this.currentPlayer,
      selectedCards: this.selectedCards,
      phase: this.phase,
      drawnCard: this.drawnCard,
      drawnCardMatches: this.drawnCardMatches,
      opponentPlayedCard: this.opponentPlayedCard,
      message: this.message,
      gameOver: this.gameOver,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      animationQueue: this.animationQueue,
      isAnimating: this.isAnimating
    };
  }

  /**
   * Queue an animation
   */
  queueAnimation(animation) {
    this.animationQueue.push(animation);
  }

  /**
   * Clear animation queue
   */
  clearAnimations() {
    this.animationQueue = [];
    this.isAnimating = false;
  }

  /**
   * Auto-match card on double-click - automatically find and capture match or place card
   */
  autoMatchCard(card) {
    if (this.gameOver || this.currentPlayer !== 'player' || this.phase !== 'select_hand') {
      return false;
    }

    const fieldMatches = this.field.filter(fc => this.cardsMatch(card, fc));

    if (fieldMatches.length > 0) {
      // Auto-match with first (or best) match
      const bestMatch = fieldMatches.reduce((best, current) =>
        current.points > best.points ? current : best
      );
      this.captureCards(card, bestMatch);
      return true;
    } else {
      // No match - auto-place on field
      const cardIndex = this.playerHand.findIndex(c => c.id === card.id);
      if (cardIndex >= 0) {
        const playedCard = this.playerHand.splice(cardIndex, 1)[0];

        // Check for 4-card same-month capture
        if (this.checkFourCardCapture(playedCard, 'player')) {
          this.drawPhase();
          return true;
        }

        this.field.push(playedCard);
        this.drawPhase();
        return true;
      }
    }

    return false;
  }

  /**
   * Handle card click
   */
  selectCard(card, owner) {
    if (this.gameOver || this.currentPlayer !== 'player') {
      return false;
    }

    // Select card from hand
    if (this.phase === 'select_hand' && owner === 'player') {
      this.selectedCards = [{ id: card.id, owner }];
      this.phase = 'select_field';
      this.message = 'Select a matching card from the field (or click again to place)';
      return true;
    }

    // Select field card to match with hand card
    if (this.phase === 'select_field') {
      // If clicking a different card from hand, switch selection
      if (owner === 'player' && this.selectedCards[0].id !== card.id) {
        this.selectedCards = [{ id: card.id, owner }];
        this.message = 'Select a matching card from the field (or click again to place)';
        return true;
      }

      // If clicking same card again, check if matches exist
      if (owner === 'player' && this.selectedCards[0].id === card.id) {
        const handCard = this.playerHand.find(c => c.id === this.selectedCards[0].id);
        const matches = this.field.filter(fc => this.cardsMatch(handCard, fc));

        if (matches.length > 0) {
          // Matches exist - cannot place on field, must match
          this.message = 'You must match with a card on the field (matches available)';
          return false;
        }

        // No matches - allow placing on field
        this.placeCardOnField();
        return true;
      }

      // If clicking field card, try to match
      if (owner === 'field') {
        const handCard = this.playerHand.find(c => c.id === this.selectedCards[0].id);
        if (this.cardsMatch(handCard, card)) {
          this.captureCards(handCard, card);
          return true;
        } else {
          this.message = 'Cards must be from the same month';
          return false;
        }
      }
    }

    // Select field card to match with drawn card
    if (this.phase === 'select_drawn_match' && owner === 'field') {
      const isMatch = this.drawnCardMatches.some(m => m.id === card.id);
      if (isMatch) {
        this.captureDrawnCard(card);
        return true;
      } else {
        this.message = 'Select one of the matching cards';
        return false;
      }
    }

    return false;
  }

  /**
   * Check if two cards match (same month)
   */
  cardsMatch(card1, card2) {
    return card1.month === card2.month;
  }

  /**
   * Check for 4-card same-month capture
   * If 3 cards of same month on field and 4th is played/drawn, capture all 4
   */
  checkFourCardCapture(playedCard, player) {
    const sameMonthOnField = this.field.filter(c => c.month === playedCard.month);

    if (sameMonthOnField.length === 3) {
      // Capture all 4 cards (3 from field + 1 played)
      const captured = player === 'player' ? this.playerCaptured : this.opponentCaptured;

      // Remove all matching cards from field
      this.field = this.field.filter(c => c.month !== playedCard.month);

      // Add all 4 cards to captured
      captured.push(playedCard, ...sameMonthOnField);

      this.updateYaku(player);
      return true;
    }

    return false;
  }

  /**
   * Check if player has a card in hand that would complete a 4-card capture
   * Returns the month name if found, null otherwise
   */
  checkHandForFourCardCapture(player) {
    const hand = player === 'player' ? this.playerHand : this.opponentHand;

    for (const handCard of hand) {
      const sameMonthOnField = this.field.filter(c => c.month === handCard.month);
      if (sameMonthOnField.length === 3) {
        return handCard.month;
      }
    }

    return null;
  }

  /**
   * Place card on field without capturing
   */
  placeCardOnField() {
    const cardIndex = this.playerHand.findIndex(c => c.id === this.selectedCards[0].id);
    if (cardIndex >= 0) {
      const card = this.playerHand.splice(cardIndex, 1)[0];

      // Check for 4-card same-month capture
      if (this.checkFourCardCapture(card, 'player')) {
        this.selectedCards = [];
        this.drawPhase();
        return;
      }

      this.field.push(card);
      this.selectedCards = [];
      this.drawPhase();
    }
  }

  /**
   * Capture matching cards from hand
   */
  captureCards(handCard, fieldCard) {
    // Check for 4-card capture (celebrate scenario)
    const sameMonthOnField = this.field.filter(c => c.month === handCard.month);

    if (sameMonthOnField.length === 3) {
      // Celebrate! Show message and pause (twice as long as draw)
      const handIndex = this.playerHand.findIndex(c => c.id === handCard.id);
      if (handIndex >= 0) this.playerHand.splice(handIndex, 1);

      this.phase = 'celebrate';
      this.message = `🎉 Celebrate! All 4 ${handCard.month} cards captured!`;

      setTimeout(() => {
        // Remove all matching cards from field
        this.field = this.field.filter(c => c.month !== handCard.month);

        // Add all 4 cards to captured
        this.playerCaptured.push(handCard, ...sameMonthOnField);

        this.selectedCards = [];
        this.updateYaku('player');
        this.drawPhase();
      }, 3600); // Twice as long as regular draw (1800ms * 2)
      return;
    }

    // Normal 2-card capture
    const handIndex = this.playerHand.findIndex(c => c.id === handCard.id);
    const fieldIndex = this.field.findIndex(c => c.id === fieldCard.id);

    if (handIndex >= 0) this.playerHand.splice(handIndex, 1);
    if (fieldIndex >= 0) this.field.splice(fieldIndex, 1);

    // Add to captured
    this.playerCaptured.push(handCard, fieldCard);

    this.selectedCards = [];
    this.updateYaku('player');
    this.drawPhase();
  }

  /**
   * Capture drawn card with selected field card
   */
  captureDrawnCard(fieldCard) {
    // Check for 4-card capture (celebrate scenario)
    const sameMonthOnField = this.field.filter(c => c.month === this.drawnCard.month);

    if (sameMonthOnField.length === 3) {
      // Celebrate! Capture all 4 cards
      // Remove all matching cards from field
      this.field = this.field.filter(c => c.month !== this.drawnCard.month);

      // Add all 4 cards to captured
      this.playerCaptured.push(this.drawnCard, ...sameMonthOnField);

      this.drawnCard = null;
      this.drawnCardMatches = [];
      this.updateYaku('player');
      this.endTurn();
      return;
    }

    // Normal 2-card capture
    const fieldIndex = this.field.findIndex(c => c.id === fieldCard.id);
    if (fieldIndex >= 0) this.field.splice(fieldIndex, 1);

    // Add to captured
    this.playerCaptured.push(this.drawnCard, fieldCard);

    this.drawnCard = null;
    this.drawnCardMatches = [];
    this.updateYaku('player');
    this.endTurn();
  }

  /**
   * Draw phase - draw card from deck
   */
  drawPhase() {
    if (this.deck.isEmpty()) {
      this.endRound();
      return;
    }

    this.phase = 'drawing';
    this.message = 'Drawing card from deck...';

    // Brief delay to show the drawing action
    setTimeout(() => {
      const drawnCard = this.deck.draw();
      this.drawnCard = drawnCard;

      // Check if drawn card matches anything on field
      const matches = this.field.filter(fc => this.cardsMatch(drawnCard, fc));

      if (matches.length > 1) {
        // Multiple matches - player must choose
        this.drawnCardMatches = matches;
        this.phase = 'select_drawn_match';
        this.message = `Drew ${drawnCard.name} - Select which card to match`;
      } else if (matches.length === 1) {
        // Single match - show drawn card briefly before auto-capturing
        // Check for 4-card capture (celebrate scenario) first
        const sameMonthOnField = this.field.filter(c => c.month === drawnCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! Show special message with longer pause
          this.phase = 'celebrate';
          this.message = `🎉 Celebrate! Drew ${drawnCard.name} - All 4 ${drawnCard.month} cards captured!`;

          setTimeout(() => {
            this.field = this.field.filter(c => c.month !== drawnCard.month);
            this.playerCaptured.push(drawnCard, ...sameMonthOnField);
            this.drawnCard = null;
            this.updateYaku('player');
            this.endTurn();
          }, 3600); // Twice as long as regular draw
        } else {
          // Normal single match
          this.phase = 'show_drawn';
          this.message = `Drew ${drawnCard.name} - Matching automatically...`;

          setTimeout(() => {
            const fieldCard = matches[0];
            const fieldIndex = this.field.findIndex(c => c.id === fieldCard.id);
            this.field.splice(fieldIndex, 1);
            this.playerCaptured.push(drawnCard, fieldCard);
            this.drawnCard = null;
            this.updateYaku('player');
            this.endTurn();
          }, 1800);
        }
      } else {
        // No match - check for celebrate when placing on field
        const sameMonthOnField = this.field.filter(c => c.month === drawnCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! This drawn card completes 4 of same month
          this.phase = 'celebrate';
          this.message = `🎉 Celebrate! Drew ${drawnCard.name} - All 4 ${drawnCard.month} cards captured!`;

          setTimeout(() => {
            this.field = this.field.filter(c => c.month !== drawnCard.month);
            this.playerCaptured.push(drawnCard, ...sameMonthOnField);
            this.drawnCard = null;
            this.updateYaku('player');
            this.endTurn();
          }, 3600);
        } else {
          // Normal no match - place on field
          this.phase = 'show_drawn';
          this.message = `Drew ${drawnCard.name} - No match, adding to field...`;

          setTimeout(() => {
            this.field.push(drawnCard);
            this.drawnCard = null;
            this.endTurn();
          }, 1800);
        }
      }
    }, 300);
  }

  /**
   * Update yaku for a player
   */
  updateYaku(player) {
    const captured = player === 'player' ? this.playerCaptured : this.opponentCaptured;
    const yaku = Yaku.checkYaku(captured, this.gameOptions);

    const previousYaku = player === 'player' ? this.previousPlayerYaku : this.previousOpponentYaku;

    if (player === 'player') {
      this.playerYaku = yaku;
    } else {
      this.opponentYaku = yaku;
    }

    if (yaku.length > 0) {
      const score = Yaku.calculateScore(yaku);
      const yakuNames = yaku.map(y => y.name).join(', ');

      if (player === 'player' && this.currentPlayer === 'player') {
        this.message = `Yaku! ${yakuNames} (${score} points)`;
      }

      // Check if this is a new yaku (koi-koi decision point)
      const isNewYaku = this.hasNewYaku(previousYaku, yaku);

      if (isNewYaku && this.gameOptions && this.gameOptions.get('koikoiEnabled')) {
        // Update previous yaku
        if (player === 'player') {
          this.previousPlayerYaku = [...yaku];
        } else {
          this.previousOpponentYaku = [...yaku];
        }

        // Trigger koi-koi decision
        if (player === 'player' && this.currentPlayer === 'player') {
          // Show koi-koi decision modal for human player
          this.koikoiState.waitingForDecision = true;
          this.koikoiState.decisionPlayer = 'player';

          if (this.uiCallback) {
            this.uiCallback(yaku, score);
          }
        } else if (player === 'opponent' && this.currentPlayer === 'opponent') {
          // Opponent AI makes decision
          this.opponentKoikoiDecision(yaku, score);
        }
      }
    }
  }

  /**
   * Check if there's a new yaku compared to previous
   */
  hasNewYaku(previousYaku, currentYaku) {
    // If no previous yaku, this is definitely new
    if (previousYaku.length === 0 && currentYaku.length > 0) {
      return true;
    }

    // Check if current has more yaku or higher score
    const prevScore = Yaku.calculateScore(previousYaku);
    const currScore = Yaku.calculateScore(currentYaku);

    return currScore > prevScore;
  }

  /**
   * Opponent AI makes koi-koi decision
   */
  opponentKoikoiDecision(yaku, score) {
    // Simple AI strategy:
    // - If score >= 10 points: Always call Shobu (safe)
    // - If score 7-9 points: 70% Shobu, 30% Koi-Koi
    // - If score 4-6 points: 50% Shobu, 50% Koi-Koi
    // - If score <= 3 points: 70% Koi-Koi, 30% Shobu

    let koikoiProbability;
    if (score >= 10) {
      koikoiProbability = 0.1; // Almost always shobu
    } else if (score >= 7) {
      koikoiProbability = 0.3;
    } else if (score >= 4) {
      koikoiProbability = 0.5;
    } else {
      koikoiProbability = 0.7;
    }

    const decision = Math.random() < koikoiProbability ? 'koikoi' : 'shobu';

    // Short delay to make it feel natural
    setTimeout(() => {
      this.resolveKoikoiDecision(decision, 'opponent');
    }, 1500);
  }

  /**
   * Resolve koi-koi decision (called by UI or opponent AI)
   */
  resolveKoikoiDecision(decision, player = 'player') {
    this.koikoiState.waitingForDecision = false;
    this.koikoiState.decisionPlayer = null;

    if (decision === 'shobu') {
      // Mark this player as the round winner (they ended it with yaku)
      this.koikoiState.roundWinner = player;

      // End the round immediately
      if (player === 'player') {
        this.message = 'You called Shobu! Round ends.';
      } else {
        this.message = 'Opponent called Shobu! Round ends.';
      }
      setTimeout(() => this.endRound(), 1500);
    } else {
      // Continue playing (koi-koi)
      if (player === 'player') {
        this.koikoiState.playerCalled = true;
        this.koikoiState.playerCount++;
        this.message = 'Koi-Koi! Playing continues...';
      } else {
        this.koikoiState.opponentCalled = true;
        this.koikoiState.opponentCount++;
        this.message = 'Opponent called Koi-Koi! Playing continues...';
      }
      // Continue playing - don't end turn yet if it's player's turn
      // The game will continue naturally
    }
  }

  /**
   * End current turn and switch players
   */
  endTurn() {
    // Check if hands are empty
    if (this.playerHand.length === 0 && this.opponentHand.length === 0) {
      this.endRound();
      return;
    }

    // Switch players
    if (this.currentPlayer === 'player') {
      this.currentPlayer = 'opponent';
      this.phase = 'opponent_turn';
      this.message = 'Opponent is thinking...';

      // Trigger opponent AI after short delay
      setTimeout(() => this.opponentTurn(), 800);
    } else {
      this.currentPlayer = 'player';
      this.phase = 'select_hand';

      // Check if player has a card that would complete a 4-card capture
      const celebrateMonth = this.checkHandForFourCardCapture('player');
      if (celebrateMonth) {
        this.message = `Celebrate month of ${celebrateMonth}! You can capture all 4 cards!`;
      } else {
        this.message = 'Your turn - select a card from your hand';
      }
    }
  }

  /**
   * Opponent AI turn - prioritizes matches
   */
  opponentTurn() {
    if (this.opponentHand.length === 0 || this.deck.isEmpty()) {
      this.endRound();
      return;
    }

    // Smart AI: Look for cards that have matches first
    let selectedCardIndex = -1;
    let selectedMatch = null;

    // First, try to find a card with a match
    for (let i = 0; i < this.opponentHand.length; i++) {
      const handCard = this.opponentHand[i];
      const fieldMatches = this.field.filter(fc => this.cardsMatch(handCard, fc));

      if (fieldMatches.length > 0) {
        selectedCardIndex = i;
        // Prioritize high-value cards in matches
        selectedMatch = fieldMatches.reduce((best, current) =>
          current.points > best.points ? current : best
        );
        break;
      }
    }

    // If no matches found, pick a random card
    if (selectedCardIndex === -1) {
      selectedCardIndex = Math.floor(Math.random() * this.opponentHand.length);
    }

    const handCard = this.opponentHand[selectedCardIndex];

    // Show the opponent's card before processing
    this.phase = 'opponent_playing';
    this.opponentPlayedCard = handCard; // Store for display
    this.message = `Opponent plays ${handCard.name}...`;

    setTimeout(() => {
      // Remove from opponent's hand
      this.opponentHand.splice(selectedCardIndex, 1);

      if (selectedMatch) {
        // Check for 4-card capture (celebrate scenario)
        const sameMonthOnField = this.field.filter(c => c.month === handCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! Show message with longer pause
          this.phase = 'opponent_celebrate';
          this.message = `🎉 Opponent Celebrates! All 4 ${handCard.month} cards captured!`;

          setTimeout(() => {
            this.field = this.field.filter(c => c.month !== handCard.month);
            this.opponentCaptured.push(handCard, ...sameMonthOnField);
            this.updateYaku('opponent');
            this.opponentPlayedCard = null;
            this.opponentDrawPhase();
          }, 3600);
          return;
        } else {
          // Normal 2-card capture
          const fieldIndex = this.field.findIndex(c => c.id === selectedMatch.id);
          this.field.splice(fieldIndex, 1);
          this.opponentCaptured.push(handCard, selectedMatch);
        }
        this.updateYaku('opponent');
      } else {
        // Check for 4-card same-month capture when placing
        const sameMonthOnField = this.field.filter(c => c.month === handCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! Show message with longer pause
          this.phase = 'opponent_celebrate';
          this.message = `🎉 Opponent Celebrates! All 4 ${handCard.month} cards captured!`;

          setTimeout(() => {
            this.field = this.field.filter(c => c.month !== handCard.month);
            this.opponentCaptured.push(handCard, ...sameMonthOnField);
            this.updateYaku('opponent');
            this.opponentPlayedCard = null;
            this.opponentDrawPhase();
          }, 3600);
          return;
        } else {
          this.field.push(handCard);
        }
      }

      this.opponentPlayedCard = null;

      // Draw phase for opponent with visual feedback
      this.opponentDrawPhase();
    }, 1200);
  }

  /**
   * Opponent draw phase with visual feedback
   */
  opponentDrawPhase() {
    if (this.deck.isEmpty()) {
      this.endTurn();
      return;
    }

    this.phase = 'opponent_drawing';
    this.message = 'Opponent drawing card...';

    setTimeout(() => {
      const drawnCard = this.deck.draw();
      this.drawnCard = drawnCard;

      const drawnMatches = this.field.filter(fc => this.cardsMatch(drawnCard, fc));

      if (drawnMatches.length > 0) {
        // Check for 4-card capture (celebrate scenario)
        const sameMonthOnField = this.field.filter(c => c.month === drawnCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! Show special message with longer pause
          this.phase = 'opponent_celebrate';
          this.message = `🎉 Opponent Celebrates! Drew ${drawnCard.name} - All 4 ${drawnCard.month} cards captured!`;

          setTimeout(() => {
            this.field = this.field.filter(c => c.month !== drawnCard.month);
            this.opponentCaptured.push(drawnCard, ...sameMonthOnField);
            this.drawnCard = null;
            this.updateYaku('opponent');
            this.endTurn();
          }, 3600);
        } else {
          // Normal match - show drawn card before matching
          this.phase = 'opponent_drawn';
          this.message = `Opponent drew ${drawnCard.name} - Matching...`;

          setTimeout(() => {
            // Normal 2-card capture - prioritize high-value matches
            const bestMatch = drawnMatches.reduce((best, current) =>
              current.points > best.points ? current : best
            );
            const fieldIndex = this.field.findIndex(c => c.id === bestMatch.id);
            this.field.splice(fieldIndex, 1);
            this.opponentCaptured.push(drawnCard, bestMatch);
            this.drawnCard = null;
            this.updateYaku('opponent');
            this.endTurn();
          }, 1800);
        }
      } else {
        // No match - check for celebrate when placing
        const sameMonthOnField = this.field.filter(c => c.month === drawnCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! Show special message with longer pause
          this.phase = 'opponent_celebrate';
          this.message = `🎉 Opponent Celebrates! Drew ${drawnCard.name} - All 4 ${drawnCard.month} cards captured!`;

          setTimeout(() => {
            this.field = this.field.filter(c => c.month !== drawnCard.month);
            this.opponentCaptured.push(drawnCard, ...sameMonthOnField);
            this.drawnCard = null;
            this.updateYaku('opponent');
            this.endTurn();
          }, 3600);
        } else {
          // Normal no match - show drawn card before placing
          this.phase = 'opponent_drawn';
          this.message = `Opponent drew ${drawnCard.name} - No match`;

          setTimeout(() => {
            this.field.push(drawnCard);
            this.drawnCard = null;
            this.endTurn();
          }, 1800);
        }
      }
    }, 300);
  }

  /**
   * End round and calculate scores
   */
  endRound() {
    const playerYaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    const opponentYaku = Yaku.checkYaku(this.opponentCaptured, this.gameOptions);

    let playerRoundScore = Yaku.calculateScore(playerYaku);
    let opponentRoundScore = Yaku.calculateScore(opponentYaku);

    // Apply koi-koi multipliers if enabled
    if (this.gameOptions && this.gameOptions.get('koikoiEnabled')) {
      playerRoundScore = this.applyMultiplier(playerRoundScore, 'player');
      opponentRoundScore = this.applyMultiplier(opponentRoundScore, 'opponent');
    }

    // Winner-take-all logic (traditional koi-koi)
    if (this.gameOptions && !this.gameOptions.get('bothPlayersScore')) {
      // Determine round winner
      let roundWinner = this.koikoiState.roundWinner;

      // If no explicit winner (shobu wasn't called), determine by yaku scores
      if (!roundWinner) {
        if (playerRoundScore > opponentRoundScore) {
          roundWinner = 'player';
        } else if (opponentRoundScore > playerRoundScore) {
          roundWinner = 'opponent';
        }
        // If tied or both have 0, no one wins (both get 0)
      }

      // Apply winner-take-all: only winner gets points
      if (roundWinner === 'player') {
        opponentRoundScore = 0;
      } else if (roundWinner === 'opponent') {
        playerRoundScore = 0;
      } else {
        // Tie or no yaku - both get 0
        playerRoundScore = 0;
        opponentRoundScore = 0;
      }
    }

    this.playerScore += playerRoundScore;
    this.opponentScore += opponentRoundScore;

    // Check if game is over or continue to next round
    if (this.currentRound >= this.totalRounds) {
      this.gameOver = true;
      const winner = this.playerScore > this.opponentScore ? 'Player' :
                     this.opponentScore > this.playerScore ? 'Opponent' : 'Tie';
      this.message = `Game Over! ${winner} wins! Final: Player ${this.playerScore} - Opponent ${this.opponentScore}`;
    } else {
      this.currentRound++;
      this.message = `Round ${this.currentRound - 1} complete! Player: ${playerRoundScore}pts, Opponent: ${opponentRoundScore}pts - Starting round ${this.currentRound}...`;
      setTimeout(() => this.reset(), 3000);
    }
  }

  /**
   * Apply multiplier based on koi-koi state
   */
  applyMultiplier(score, player) {
    let finalScore = score;

    // Apply auto-double for 7+ points
    if (this.gameOptions.get('autoDouble7Plus') && score >= 7) {
      finalScore *= 2;
    }

    // Apply koi-koi multipliers
    const multiplierMode = this.gameOptions.get('multiplierMode');

    if (player === 'player') {
      // If player called koi-koi and won
      if (this.koikoiState.playerCalled) {
        if (multiplierMode === 'cumulative') {
          // Cumulative: 2x, 3x, 4x based on call count
          const multiplier = Math.min(this.koikoiState.playerCount + 1, 4);
          finalScore *= multiplier;
        } else if (multiplierMode === '2x') {
          // Single 2x
          finalScore *= 2;
        }
      }
      // If opponent called koi-koi but player won
      else if (this.koikoiState.opponentCalled) {
        if (multiplierMode === 'cumulative') {
          const multiplier = Math.min(this.koikoiState.opponentCount + 1, 4);
          finalScore *= multiplier;
        } else if (multiplierMode === '2x') {
          finalScore *= 2;
        }
      }
    } else {
      // Same logic for opponent
      if (this.koikoiState.opponentCalled) {
        if (multiplierMode === 'cumulative') {
          const multiplier = Math.min(this.koikoiState.opponentCount + 1, 4);
          finalScore *= multiplier;
        } else if (multiplierMode === '2x') {
          finalScore *= 2;
        }
      }
      else if (this.koikoiState.playerCalled) {
        if (multiplierMode === 'cumulative') {
          const multiplier = Math.min(this.koikoiState.playerCount + 1, 4);
          finalScore *= multiplier;
        } else if (multiplierMode === '2x') {
          finalScore *= 2;
        }
      }
    }

    return finalScore;
  }

  /**
   * Start new round
   */
  newRound() {
    if (this.currentRound < this.totalRounds) {
      this.currentRound++;
      this.reset();
    }
  }
}
