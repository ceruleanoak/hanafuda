/**
 * KoiKoi - Main game logic for Koi-Koi hanafuda game
 */

import { Deck } from './Deck.js';
import { Yaku } from './Yaku.js';
import { CARD_TYPES } from '../data/cards.js';
import { AdvancedAI } from './AdvancedAI.js';

export class KoiKoi {
  constructor(gameOptions = null) {
    this.deck = new Deck();
    this.totalRounds = 1;
    this.currentRound = 0;
    this.animationQueue = [];
    this.isAnimating = false;
    this.gameOptions = gameOptions;
    this.uiCallback = null; // Will be set by main.js to show koi-koi modal
    this.roundSummaryCallback = null; // Will be set by main.js to show round summary modal
    this.opponentKoikoiCallback = null; // Will be set by main.js to show opponent koi-koi notification
    this.bombCardCounter = 0; // Counter for unique bomb card IDs
    this.firstPlayerThisGame = null; // Track who went first in round 1 for alternating

    // Koi-koi state tracking
    this.koikoiState = {
      playerCalled: false,
      opponentCalled: false,
      playerCount: 0,      // How many times player called koi-koi
      opponentCount: 0,    // How many times opponent called koi-koi
      roundActive: true,   // Is the round still going after koi-koi?
      waitingForDecision: false,
      decisionPlayer: null, // Who needs to make a decision
      roundWinner: null,   // Who won this round (for winner-take-all scoring)
      shobuCaller: null,   // Who called shobu to end the round
      resumeAction: null,  // What action to resume after decision ('drawPhase', 'endTurn', 'opponentDrawPhase')
      playerScoreAtKoikoi: 0,    // Player's score when they called koi-koi
      opponentScoreAtKoikoi: 0,   // Opponent's score when they called koi-koi
      playerGetsMultiplier: false,  // Player gets 2× multiplier (scored after opponent's koi-koi)
      opponentGetsMultiplier: false // Opponent gets 2× multiplier (scored after player's koi-koi)
    };

    // Track previous yaku to detect new yaku
    this.previousPlayerYaku = [];
    this.previousOpponentYaku = [];

    // Track yaku at start of turn for end-of-turn comparison
    this.turnStartYaku = {
      player: [],
      opponent: []
    };

    this.reset();
  }

  /**
   * Set UI callback for showing koi-koi decision modal
   */
  setUICallback(callback) {
    this.uiCallback = callback;
  }

  /**
   * Set UI callback for showing round summary modal
   */
  setRoundSummaryCallback(callback) {
    this.roundSummaryCallback = callback;
  }

  /**
   * Set UI callback for showing opponent koi-koi notification
   */
  setOpponentKoikoiCallback(callback) {
    this.opponentKoikoiCallback = callback;
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
    this.firstPlayerThisGame = null; // Reset for new game
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

    // Determine who goes first
    if (this.currentRound === 1) {
      // First round: randomly choose (50/50)
      this.firstPlayerThisGame = Math.random() < 0.5 ? 'player' : 'opponent';
      this.currentPlayer = this.firstPlayerThisGame;
    } else {
      // Subsequent rounds: alternate who goes first
      if (this.currentRound % 2 === 1) {
        // Odd rounds: same as first round
        this.currentPlayer = this.firstPlayerThisGame;
      } else {
        // Even rounds: opposite of first round
        this.currentPlayer = (this.firstPlayerThisGame === 'player') ? 'opponent' : 'player';
      }
    }

    this.selectedCards = [];
    // Set initial phase based on who goes first
    this.phase = (this.currentPlayer === 'player') ? 'select_hand' : 'opponent_turn';
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
      roundWinner: null,
      shobuCaller: null,
      resumeAction: null,
      playerScoreAtKoikoi: 0,
      opponentScoreAtKoikoi: 0,
      playerGetsMultiplier: false,
      opponentGetsMultiplier: false
    };

    // Reset turn start yaku tracking
    this.turnStartYaku = {
      player: [],
      opponent: []
    };

    this.deal();
  }

  /**
   * Initial deal - 8 cards to field, 8 to each player (10 each if bomb variation)
   */
  deal() {
    // Determine hand size based on bomb variation
    const handSize = (this.gameOptions && this.gameOptions.get('bombVariationEnabled')) ? 10 : 8;

    // Deal cards to each player first (8 or 10 depending on variation)
    this.playerHand = this.deck.drawMultiple(handSize);
    this.opponentHand = this.deck.drawMultiple(handSize);

    // Deal 8 cards to field LAST (traditional Hanafuda order)
    this.field = this.deck.drawMultiple(8);

    // Check for Four of a Kind lucky hand (instant win with 6 points)
    const fourOfAKind = this.checkFourOfAKindInStartingHand();

    if (fourOfAKind.both) {
      // Both players have Four of a Kind - draw (both get 6 points)
      this.message = `Lucky Hand! Both players have Four of a Kind (${fourOfAKind.player} and ${fourOfAKind.opponent})! Draw - both get 6 points!`;
      this.playerScore += 6;
      this.opponentScore += 6;
      this.phase = 'round_over';
      setTimeout(() => this.endRound(), 3000);
      return;
    } else if (fourOfAKind.player) {
      // Player has Four of a Kind - instant win
      this.message = `Lucky Hand! You have Four of a Kind (${fourOfAKind.player})! You win 6 points!`;
      this.playerScore += 6;
      this.koikoiState.roundWinner = 'player';
      this.phase = 'round_over';
      setTimeout(() => this.endRound(), 3000);
      return;
    } else if (fourOfAKind.opponent) {
      // Opponent has Four of a Kind - instant win
      this.message = `Lucky Hand! Opponent has Four of a Kind (${fourOfAKind.opponent})! Opponent wins 6 points!`;
      this.opponentScore += 6;
      this.koikoiState.roundWinner = 'opponent';
      this.phase = 'round_over';
      setTimeout(() => this.endRound(), 3000);
      return;
    }

    // Set message and trigger first turn based on who goes first
    if (this.currentPlayer === 'player') {
      // Check if player has a card that would complete a 4-card capture
      const celebrateMonth = this.checkHandForFourCardCapture('player');
      if (celebrateMonth) {
        this.message = `Celebrate month of ${celebrateMonth}! You can capture all 4 cards!`;
      } else {
        this.message = 'Select a card from your hand';
      }
    } else {
      // Opponent goes first - trigger opponent turn after short delay
      this.message = 'Opponent goes first...';
      setTimeout(() => this.opponentTurn(), 400);
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
      deck: this.deck,
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

    // Check for bomb variation automatic multi-play (4 cards total)
    if (this.gameOptions && this.gameOptions.get('bombVariationEnabled')) {
      const bombResult = this.checkAndExecuteBombPlay(card, 'player');
      if (bombResult) {
        return true;
      }
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
      // Check if this is a bomb card
      if (this.isBombCard(card)) {
        // Bomb card - discard it and go to draw phase
        const cardIndex = this.playerHand.findIndex(c => c.id === card.id);
        if (cardIndex >= 0) {
          this.playerHand.splice(cardIndex, 1);
          this.message = '💣 Bomb card played - discarded';
          this.drawPhase();
          return true;
        }
        return false;
      }

      // Check for bomb variation automatic multi-play (4 cards total)
      if (this.gameOptions && this.gameOptions.get('bombVariationEnabled')) {
        const bombResult = this.checkAndExecuteBombPlay(card, 'player');
        if (bombResult) {
          return true;
        }
      }

      // Standard single-card selection
      this.selectedCards = [{ id: card.id, owner }];
      this.phase = 'select_field';
      this.message = 'Select a matching card from the field (or click again to place)';
      return true;
    }

    // Select field card to match with hand card
    if (this.phase === 'select_field') {
      // Standard single-card selection behavior
      // If clicking a different card from hand, switch selection
      if (owner === 'player' && this.selectedCards[0].id !== card.id) {
        // Check for bomb play with the new card
        if (this.gameOptions && this.gameOptions.get('bombVariationEnabled')) {
          const bombResult = this.checkAndExecuteBombPlay(card, 'player');
          if (bombResult) {
            return true;
          }
        }
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
   * Check if bomb play conditions are met and execute automatically
   * Bomb play requires exactly 4 cards of same month (hand + field)
   * Returns true if bomb play was executed, false otherwise
   */
  checkAndExecuteBombPlay(card, player) {
    const hand = player === 'player' ? this.playerHand : this.opponentHand;
    const month = card.month;

    // Count cards of this month in hand and field
    const handCards = hand.filter(c => c.month === month);
    const fieldCards = this.field.filter(c => c.month === month);

    const totalCards = handCards.length + fieldCards.length;

    // Bomb play only happens with exactly 4 cards
    if (totalCards !== 4) {
      return false;
    }

    // Determine scenario
    const handCount = handCards.length;
    const fieldCount = fieldCards.length;

    // 1 hand + 3 field = celebrate the month (NOT a bomb, handled by existing logic)
    if (handCount === 1 && fieldCount === 3) {
      return false; // Let normal celebrate logic handle this
    }

    // 2 hand + 2 field = 1 bomb OR 3 hand + 1 field = 2 bombs
    if ((handCount === 2 && fieldCount === 2) || (handCount === 3 && fieldCount === 1)) {
      this.executeAutoBombPlay(handCards, fieldCards, player);
      return true;
    }

    return false;
  }

  /**
   * Execute automatic bomb play
   */
  executeAutoBombPlay(handCards, fieldCards, player) {
    const month = handCards[0].month;
    const bombsToReturn = handCards.length - 1; // 2 cards = 1 bomb, 3 cards = 2 bombs

    if (player === 'player') {
      // Remove hand cards
      handCards.forEach(hc => {
        const idx = this.playerHand.findIndex(c => c.id === hc.id);
        if (idx >= 0) this.playerHand.splice(idx, 1);
      });

      // Remove field cards
      this.field = this.field.filter(c => c.month !== month);

      // Add all 4 cards to captured
      this.playerCaptured.push(...handCards, ...fieldCards);

      // Add bomb cards back to hand
      for (let i = 0; i < bombsToReturn; i++) {
        this.playerHand.push(this.createBombCard());
      }

      this.message = `💣 Automatic Bomb! Captured ${handCards.length + fieldCards.length} ${month} cards, received ${bombsToReturn} bomb card${bombsToReturn > 1 ? 's' : ''}`;

      // Clear selection
      this.selectedCards = [];

      // Update yaku and continue
      this.updateYaku('player', true);
      this.drawPhase();
    } else {
      // Opponent logic - show phase for visual feedback
      this.phase = 'opponent_bomb';

      // Store first card for display (represents the bomb play)
      this.opponentPlayedCard = handCards[0];

      this.message = `💣 Opponent Bomb! Playing ${handCards.length} ${month} cards...`;

      // Brief delay to show the bomb play
      setTimeout(() => {
        // Remove hand cards
        handCards.forEach(hc => {
          const idx = this.opponentHand.findIndex(c => c.id === hc.id);
          if (idx >= 0) this.opponentHand.splice(idx, 1);
        });

        // Remove field cards
        this.field = this.field.filter(c => c.month !== month);

        // Add all 4 cards to captured
        this.opponentCaptured.push(...handCards, ...fieldCards);

        // Add bomb cards back to hand
        for (let i = 0; i < bombsToReturn; i++) {
          this.opponentHand.push(this.createBombCard());
        }

        this.message = `💣 Opponent Bomb! Captured ${handCards.length + fieldCards.length} ${month} cards`;

        // Clear played card display
        this.opponentPlayedCard = null;

        // Update yaku
        this.updateYaku('opponent', true);
      }, 600);
    }
  }

  /**
   * Create a bomb card (special pass card for bomb variation)
   */
  createBombCard() {
    this.bombCardCounter++;
    return {
      id: `bomb_${this.bombCardCounter}_${Date.now()}`,
      month: null,
      type: CARD_TYPES.BOMB,
      name: 'Bomb Card 💣',
      points: 0,
      isBomb: true,
      image: null // Will render as special card
    };
  }

  /**
   * Check if a card is a bomb card
   */
  isBombCard(card) {
    return card && card.type === CARD_TYPES.BOMB;
  }

  /**
   * Check if two cards match (same month)
   * Bomb cards never match anything
   */
  cardsMatch(card1, card2) {
    if (this.isBombCard(card1) || this.isBombCard(card2)) {
      return false;
    }
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

      // Defer decision for player during hand phase
      const deferDecision = player === 'player' && this.phase === 'select_field';
      this.updateYaku(player, deferDecision);
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
   * Check for Four of a Kind lucky hand (all 4 cards of same month in starting hand)
   * Returns { player: month|null, opponent: month|null, both: boolean }
   */
  checkFourOfAKindInStartingHand() {
    const checkHand = (hand) => {
      const monthCounts = {};
      for (const card of hand) {
        monthCounts[card.month] = (monthCounts[card.month] || 0) + 1;
      }

      for (const month in monthCounts) {
        if (monthCounts[month] === 4) {
          return month;
        }
      }
      return null;
    };

    const playerMonth = checkHand(this.playerHand);
    const opponentMonth = checkHand(this.opponentHand);

    return {
      player: playerMonth,
      opponent: opponentMonth,
      both: playerMonth !== null && opponentMonth !== null
    };
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
        this.updateYaku('player', true); // Defer decision during hand phase
        this.drawPhase();
      }, 1800); // Twice as long as regular draw (900ms * 2)
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
    this.updateYaku('player', true); // Defer decision during hand phase

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

      // Check for koi-koi decision after drawn card capture
      this.checkForKoikoiDecision('player');

      // Don't continue if waiting for koi-koi decision or if round has ended
      if (this.koikoiState.waitingForDecision) {
        this.koikoiState.resumeAction = 'endTurn';
        return;
      }

      if (!this.koikoiState.roundActive) {
        return; // Round has ended, stop execution
      }

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

    // Check for koi-koi decision after drawn card capture
    this.checkForKoikoiDecision('player');

    // Don't continue if waiting for koi-koi decision or if round has ended
    if (this.koikoiState.waitingForDecision) {
      this.koikoiState.resumeAction = 'endTurn';
      return;
    }

    if (!this.koikoiState.roundActive) {
      return; // Round has ended, stop execution
    }

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

      // Check for 4-card capture (celebrate scenario) FIRST - takes priority over multiple matches
      const sameMonthOnField = this.field.filter(c => c.month === drawnCard.month);

      if (sameMonthOnField.length === 3) {
        // Celebrate! Show special message with longer pause
        this.phase = 'celebrate';
        this.message = `🎉 Celebrate! Drew ${drawnCard.name} - All 4 ${drawnCard.month} cards captured!`;

        // Delay state update so both drawn card AND field cards are visible together
        setTimeout(() => {
          // Update captures after showing both cards
          this.field = this.field.filter(c => c.month !== drawnCard.month);
          this.playerCaptured.push(drawnCard, ...sameMonthOnField);
          this.checkForKoikoiDecision('player');

          // Don't continue if waiting for koi-koi decision or if round has ended
          if (this.koikoiState.waitingForDecision) {
            this.koikoiState.resumeAction = () => {
              this.drawnCard = null;
              this.endTurn();
            };
            return;
          }

          if (!this.koikoiState.roundActive) {
            return; // Round has ended, stop execution
          }

          this.drawnCard = null;
          this.endTurn();
        }, 1800); // Twice as long as regular draw
      } else if (matches.length > 1) {
        // Multiple matches - player must choose
        this.drawnCardMatches = matches;
        this.phase = 'select_drawn_match';
        this.message = `Drew ${drawnCard.name} - Select which card to match`;
      } else if (matches.length === 1) {
        // Single match - show drawn card briefly before auto-capturing
        const sameMonthOnField = this.field.filter(c => c.month === drawnCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! Show special message with longer pause
          this.phase = 'celebrate';
          this.message = `🎉 Celebrate! Drew ${drawnCard.name} - All 4 ${drawnCard.month} cards captured!`;

          // Delay state update so both drawn card AND field cards are visible together
          setTimeout(() => {
            // Update captures after showing both cards
            this.field = this.field.filter(c => c.month !== drawnCard.month);
            this.playerCaptured.push(drawnCard, ...sameMonthOnField);
            this.checkForKoikoiDecision('player');

            // Don't continue if waiting for koi-koi decision or if round has ended
            if (this.koikoiState.waitingForDecision) {
              this.koikoiState.resumeAction = () => {
                this.drawnCard = null;
                this.endTurn();
              };
              return;
            }

            if (!this.koikoiState.roundActive) {
              return; // Round has ended, stop execution
            }

            this.drawnCard = null;
            this.endTurn();
          }, 900); // Twice as long as regular draw
        } else {
          // Normal single match
          this.phase = 'show_drawn';
          this.message = `Drew ${drawnCard.name} - Matching automatically...`;

          const fieldCard = matches[0];

          // Delay state update so both drawn card AND field card are visible together
          setTimeout(() => {
            // Update captures after showing both cards
            const fieldIndex = this.field.findIndex(c => c.id === fieldCard.id);
            this.field.splice(fieldIndex, 1);
            this.playerCaptured.push(drawnCard, fieldCard);
            this.checkForKoikoiDecision('player');

            // Don't continue if waiting for koi-koi decision or if round has ended
            if (this.koikoiState.waitingForDecision) {
              this.koikoiState.resumeAction = () => {
                this.drawnCard = null;
                this.endTurn();
              };
              return;
            }

            if (!this.koikoiState.roundActive) {
              return; // Round has ended, stop execution
            }

            this.drawnCard = null;
            this.endTurn();
          }, 900);
        }
      } else {
        // No match - check for celebrate when placing on field
        const sameMonthOnField = this.field.filter(c => c.month === drawnCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! This drawn card completes 4 of same month
          this.phase = 'celebrate';
          this.message = `🎉 Celebrate! Drew ${drawnCard.name} - All 4 ${drawnCard.month} cards captured!`;

          // Delay state update so both drawn card AND field cards are visible together
          setTimeout(() => {
            // Update captures after showing all cards
            this.field = this.field.filter(c => c.month !== drawnCard.month);
            this.playerCaptured.push(drawnCard, ...sameMonthOnField);
            this.checkForKoikoiDecision('player');

            // Don't continue if waiting for koi-koi decision or if round has ended
            if (this.koikoiState.waitingForDecision) {
              this.koikoiState.resumeAction = () => {
                this.drawnCard = null;
                this.endTurn();
              };
              return;
            }

            if (!this.koikoiState.roundActive) {
              return; // Round has ended, stop execution
            }

            this.drawnCard = null;
            this.endTurn();
          }, 900);
        } else {
          // Normal no match - place on field
          this.phase = 'show_drawn';
          this.message = `Drew ${drawnCard.name} - No match, adding to field...`;

          setTimeout(() => {
            this.field.push(drawnCard);
            this.checkForKoikoiDecision('player');

            // Don't continue if waiting for koi-koi decision or if round has ended
            if (this.koikoiState.waitingForDecision) {
              this.koikoiState.resumeAction = () => {
                this.drawnCard = null;
                this.endTurn();
              };
              return;
            }

            if (!this.koikoiState.roundActive) {
              return; // Round has ended, stop execution
            }

            this.drawnCard = null;
            this.endTurn();
          }, 900);
        }
      }
    }, 150);
  }

  /**
   * Update yaku for a player
   * @param {string} player - 'player' or 'opponent'
   * @param {boolean} deferDecision - If true, don't trigger koi-koi modal (for mid-turn updates)
   */
  updateYaku(player, deferDecision = false) {
    const captured = player === 'player' ? this.playerCaptured : this.opponentCaptured;
    const yaku = Yaku.checkYaku(captured, this.gameOptions);

    const previousYaku = player === 'player' ? this.previousPlayerYaku : this.previousOpponentYaku;

    if (player === 'player') {
      this.playerYaku = yaku;
    } else {
      this.opponentYaku = yaku;
    }

    if (yaku.length > 0) {
      let score = Yaku.calculateScore(yaku);
      const yakuNames = yaku.map(y => y.name).join(', ');

      // Apply auto-double for display (if enabled)
      let displayScore = score;
      if (this.gameOptions && this.gameOptions.get('autoDouble7Plus') && score >= 7) {
        displayScore = score * 2;
      }

      if (player === 'player' && this.currentPlayer === 'player') {
        this.message = `Yaku! ${yakuNames} (${displayScore} points)`;
      }

      // Check if this is a new yaku (koi-koi decision point)
      const isNewYaku = this.hasNewYaku(previousYaku, yaku);

      if (isNewYaku && this.gameOptions && this.gameOptions.get('koikoiEnabled') && !deferDecision) {
        // Check if this is the last card - if so, skip koi-koi decision
        const playerHand = player === 'player' ? this.playerHand : this.opponentHand;
        const isLastCard = playerHand.length === 0 && this.deck.isEmpty();
        const bothHandsEmpty = this.playerHand.length === 0 && this.opponentHand.length === 0;

        if (isLastCard || bothHandsEmpty) {
          console.log(`[KOIKOI] Last card in updateYaku - no koi-koi decision for ${player} (hand empty: ${playerHand.length === 0}, deck empty: ${this.deck.isEmpty()}, both hands empty: ${bothHandsEmpty})`);
          return; // No point in koi-koi on last card - round will end anyway
        }

        // Update previous yaku
        if (player === 'player') {
          this.previousPlayerYaku = [...yaku];
        } else {
          this.previousOpponentYaku = [...yaku];
        }

        // Check if someone already called koi-koi and we're in 2x mode
        const multiplierMode = this.gameOptions.get('multiplierMode');
        const alreadyCalledKoikoi = this.koikoiState.playerCalled || this.koikoiState.opponentCalled;

        if (alreadyCalledKoikoi && multiplierMode === '2x') {
          // In 2x mode, round ends automatically after the next score
          this.koikoiState.roundWinner = player;
          this.message = player === 'player' ?
            `Yaku! ${yakuNames} (${displayScore} points) - Round ends!` :
            `Opponent scored ${yakuNames} (${displayScore} points) - Round ends!`;
          console.log(`[KOIKOI] Round ending immediately - ${player} scored after opponent koi-koi`);
          this.endRound();
          return; // Stop execution here
        } else {
          // Check if player has cards remaining before offering koi-koi
          const playerHand = player === 'player' ? this.playerHand : this.opponentHand;
          const hasCardsRemaining = playerHand.length > 0;

          if (!hasCardsRemaining) {
            // No cards remaining - automatically end round (shobu)
            this.koikoiState.roundWinner = player;
            this.message = player === 'player' ?
              `Yaku! ${yakuNames} (${displayScore} points) - Round ends!` :
              `Opponent scored ${yakuNames} (${displayScore} points) - Round ends!`;
            console.log(`[KOIKOI] Round ending automatically - ${player} has no cards remaining`);
            this.endRound();
            return;
          }

          // Trigger koi-koi decision
          if (player === 'player' && this.currentPlayer === 'player') {
            // Show koi-koi decision modal for human player
            this.koikoiState.waitingForDecision = true;
            this.koikoiState.decisionPlayer = 'player';

            if (this.uiCallback) {
              this.uiCallback(yaku, displayScore);
            }
          } else if (player === 'opponent' && this.currentPlayer === 'opponent') {
            // Opponent AI makes decision
            this.opponentKoikoiDecision(yaku, displayScore);
          }
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
   * Check for koi-koi decision at end of turn
   * Compares current yaku to turn start yaku
   */
  checkForKoikoiDecision(player) {
    // Update current yaku first
    const captured = player === 'player' ? this.playerCaptured : this.opponentCaptured;
    const currentYaku = Yaku.checkYaku(captured, this.gameOptions);

    if (player === 'player') {
      this.playerYaku = currentYaku;
    } else {
      this.opponentYaku = currentYaku;
    }

    // Get turn start yaku
    const turnStartYaku = this.turnStartYaku[player];

    // Check if yaku improved during this turn
    const yakuImproved = this.hasNewYaku(turnStartYaku, currentYaku);

    // Log yaku detection
    let yakuNames = currentYaku.map(y => y.name).join(', ');
    let score = Yaku.calculateScore(currentYaku);
    const turnStartScore = Yaku.calculateScore(turnStartYaku);
    const turnStartNames = turnStartYaku.map(y => y.name).join(', ');

    console.log(`[YAKU] ${player} current: ${yakuNames} (${score} pts), turn start: ${turnStartNames || 'none'} (${turnStartScore} pts), improved: ${yakuImproved}`);

    if (!yakuImproved || !this.gameOptions || !this.gameOptions.get('koikoiEnabled')) {
      if (!yakuImproved) {
        console.log(`[KOIKOI] No koi-koi decision - yaku did not improve for ${player}`);
      } else if (!this.gameOptions || !this.gameOptions.get('koikoiEnabled')) {
        console.log(`[KOIKOI] No koi-koi decision - koi-koi is disabled`);
      }
      return; // No new yaku or koi-koi disabled
    }

    // Check if this is the last card (no more hand cards and no more deck cards)
    const playerHand = player === 'player' ? this.playerHand : this.opponentHand;
    const isLastCard = playerHand.length === 0 && this.deck.isEmpty();
    const bothHandsEmpty = this.playerHand.length === 0 && this.opponentHand.length === 0;

    if (isLastCard || bothHandsEmpty) {
      console.log(`[KOIKOI] Last card - no koi-koi decision for ${player} (hand empty: ${playerHand.length === 0}, deck empty: ${this.deck.isEmpty()}, both hands empty: ${bothHandsEmpty})`);
      return; // No point in koi-koi on last card - round will end anyway
    }

    // Update previous yaku for future comparisons
    if (player === 'player') {
      this.previousPlayerYaku = [...currentYaku];
    } else {
      this.previousOpponentYaku = [...currentYaku];
    }

    // Calculate score for display
    score = Yaku.calculateScore(currentYaku);
    let displayScore = score;
    if (this.gameOptions.get('autoDouble7Plus') && score >= 7) {
      displayScore = score * 2;
    }

    yakuNames = currentYaku.map(y => y.name).join(', ');

    // Update message
    if (player === 'player' && this.currentPlayer === 'player') {
      this.message = `Yaku! ${yakuNames} (${displayScore} points)`;
    }

    // Check if someone already called koi-koi
    const multiplierMode = this.gameOptions.get('multiplierMode');

    // Check if this player or opponent called koi-koi
    const thisPlayerCalledKoikoi = (player === 'player' && this.koikoiState.playerCalled) ||
                                   (player === 'opponent' && this.koikoiState.opponentCalled);
    const opponentCalledKoikoi = (player === 'player' && this.koikoiState.opponentCalled) ||
                                 (player === 'opponent' && this.koikoiState.playerCalled);

    if ((thisPlayerCalledKoikoi || opponentCalledKoikoi) && multiplierMode === '2x') {
      // Someone called koi-koi and this player just scored - round ends automatically
      this.koikoiState.roundWinner = player;

      // Track who gets the multiplier bonus (only if opponent called koi-koi, not self)
      if (opponentCalledKoikoi) {
        // This player scored after opponent called koi-koi - gets 2× multiplier
        if (player === 'player') {
          this.koikoiState.playerGetsMultiplier = true;
        } else {
          this.koikoiState.opponentGetsMultiplier = true;
        }
      }

      this.message = player === 'player' ?
        `Yaku! ${yakuNames} (${displayScore} points) - Round ends!` :
        `Opponent scored ${yakuNames} (${displayScore} points) - Round ends!`;
      console.log(`[KOIKOI] Round ending - ${player} scored after koi-koi (self: ${thisPlayerCalledKoikoi}, opponent: ${opponentCalledKoikoi})`);
      this.endRound();
      return; // Stop execution here
    } else {
      // Trigger koi-koi decision
      if (player === 'player' && this.currentPlayer === 'player') {
        // Show koi-koi decision modal for human player
        this.koikoiState.waitingForDecision = true;
        this.koikoiState.decisionPlayer = 'player';

        if (this.uiCallback) {
          this.uiCallback(currentYaku, displayScore);
        }
      } else if (player === 'opponent' && this.currentPlayer === 'opponent') {
        // Opponent AI makes decision
        // Set waiting flag to pause game flow until decision is made
        this.koikoiState.waitingForDecision = true;
        this.koikoiState.decisionPlayer = 'opponent';
        this.opponentKoikoiDecision(currentYaku, displayScore);
      }
    }
  }

  /**
   * Opponent AI makes koi-koi decision
   */
  opponentKoikoiDecision(yaku, score) {
    // Check if advanced AI is enabled
    const useAdvancedAI = this.gameOptions && this.gameOptions.get('aiDifficulty') === 'advanced';
    let decision;

    if (useAdvancedAI) {
      // Use advanced AI for koi-koi decision
      const shouldKoikoi = AdvancedAI.makeKoikoiDecision(
        yaku,
        score,
        this.opponentCaptured,
        this.playerCaptured,
        this.deck.cards.length,
        this.opponentScore,  // AI's current total game score
        this.playerScore     // Player's current total game score
      );
      decision = shouldKoikoi ? 'koikoi' : 'shobu';
      console.log(`Advanced AI koi-koi decision: ${decision} (round score: ${score}, game score: AI ${this.opponentScore} vs Player ${this.playerScore})`);
    } else {
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

      decision = Math.random() < koikoiProbability ? 'koikoi' : 'shobu';
    }

    // Short delay to make it feel natural
    setTimeout(() => {
      this.resolveKoikoiDecision(decision, 'opponent');
    }, 750);
  }

  /**
   * Resolve koi-koi decision (called by UI or opponent AI)
   */
  resolveKoikoiDecision(decision, player = 'player') {
    this.koikoiState.waitingForDecision = false;
    this.koikoiState.decisionPlayer = null;

    console.log(`[KOIKOI] ${player} chose: ${decision}`);

    if (decision === 'shobu') {
      // End the round immediately
      // Track who called shobu for bonus calculation
      this.koikoiState.shobuCaller = player;
      console.log(`[KOIKOI] ${player} called shobu - will determine bonus eligibility`);
      if (player === 'player') {
        this.message = 'You called Shobu! Round ends.';
      } else {
        this.message = 'Opponent called Shobu! Round ends.';
      }
      setTimeout(() => this.endRound(), 750);
    } else {
      // Continue playing (koi-koi)
      if (player === 'player') {
        this.koikoiState.playerCalled = true;
        this.koikoiState.playerCount++;
        // Store current score for penalty check later
        const playerYaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
        this.koikoiState.playerScoreAtKoikoi = Yaku.calculateScore(playerYaku);
        console.log(`[KOIKOI] Player called koi-koi with score: ${this.koikoiState.playerScoreAtKoikoi}`);
        this.message = 'Koi-Koi! Playing continues...';
      } else {
        this.koikoiState.opponentCalled = true;
        this.koikoiState.opponentCount++;
        // Store current score for penalty check later
        const opponentYaku = Yaku.checkYaku(this.opponentCaptured, this.gameOptions);
        this.koikoiState.opponentScoreAtKoikoi = Yaku.calculateScore(opponentYaku);
        console.log(`[KOIKOI] Opponent called koi-koi with score: ${this.koikoiState.opponentScoreAtKoikoi}`);
        this.message = 'Opponent called Koi-Koi! Playing continues...';

        // Show opponent koi-koi notification
        if (this.opponentKoikoiCallback) {
          this.opponentKoikoiCallback();
        }
      }

      // Resume the game flow that was paused
      const resumeAction = this.koikoiState.resumeAction;
      this.koikoiState.resumeAction = null;

      if (typeof resumeAction === 'function') {
        // New format: resumeAction is a function
        resumeAction();
      } else if (resumeAction === 'drawPhase') {
        this.drawPhase();
      } else if (resumeAction === 'endTurn') {
        this.endTurn();
      } else if (resumeAction === 'opponentDrawPhase') {
        this.opponentDrawPhase();
      }
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

      // Capture yaku state at start of opponent's turn
      this.turnStartYaku.opponent = [...this.opponentYaku];

      // Trigger opponent AI after short delay
      setTimeout(() => this.opponentTurn(), 400);
    } else {
      this.currentPlayer = 'player';
      this.phase = 'select_hand';

      // Capture yaku state at start of player's turn
      this.turnStartYaku.player = [...this.playerYaku];

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
   * Opponent AI turn - prioritizes matches and automatic bomb play
   */
  opponentTurn() {
    console.log('[OPPONENT] opponentTurn() called');
    console.log(`[OPPONENT] Hand size: ${this.opponentHand.length}, Deck size: ${this.deck.cards.length}`);

    if (this.opponentHand.length === 0 || this.deck.isEmpty()) {
      console.log('[OPPONENT] Game over - hand or deck empty');
      this.endRound();
      return;
    }

    // Check for bomb cards first - play them immediately
    const bombCardIndex = this.opponentHand.findIndex(c => this.isBombCard(c));
    if (bombCardIndex >= 0) {
      const bombCard = this.opponentHand[bombCardIndex];
      this.phase = 'opponent_playing';
      this.opponentPlayedCard = bombCard;
      this.message = `Opponent plays bomb card...`;

      setTimeout(() => {
        this.opponentHand.splice(bombCardIndex, 1);
        this.message = '💣 Opponent played bomb card - discarded';
        this.opponentPlayedCard = null;
        this.opponentDrawPhase();
      }, 600);
      return;
    }

    // Check for automatic bomb play (4 cards total) if bomb variation enabled
    if (this.gameOptions && this.gameOptions.get('bombVariationEnabled')) {
      for (let i = 0; i < this.opponentHand.length; i++) {
        const handCard = this.opponentHand[i];
        const bombResult = this.checkAndExecuteBombPlay(handCard, 'opponent');
        if (bombResult) {
          // Bomb play was executed, now continue to draw phase
          setTimeout(() => {
            this.opponentDrawPhase();
          }, 600);
          return;
        }
      }
    }

    // Smart AI: Look for cards that have matches first
    let selectedCardIndex = -1;
    let selectedMatch = null;

    // Check if advanced AI is enabled
    const useAdvancedAI = this.gameOptions && this.gameOptions.get('aiDifficulty') === 'advanced';

    if (useAdvancedAI) {
      // Use advanced AI to select card
      const aiDecision = AdvancedAI.selectCard(
        this.opponentHand,
        this.opponentCaptured,
        this.field,
        this.playerCaptured,
        this.gameOptions
      );

      if (aiDecision) {
        selectedCardIndex = this.opponentHand.findIndex(c => c.id === aiDecision.card.id);
        if (aiDecision.matches && aiDecision.matches.length > 0) {
          // AI selected a match - use the highest priority one
          selectedMatch = aiDecision.matches.reduce((best, current) =>
            current.points > best.points ? current : best
          );
        }
        // Log AI reasoning for debugging (can be removed in production)
        if (aiDecision.reasoning) {
          console.log(`Advanced AI: Playing ${aiDecision.card.name} - ${aiDecision.reasoning}`);
        }
      }
    } else {
      // Use normal AI logic
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
    }

    const handCard = this.opponentHand[selectedCardIndex];
    console.log(`[OPPONENT] Selected card: ${handCard.name} (index ${selectedCardIndex})`);
    console.log(`[OPPONENT] Has match: ${selectedMatch ? selectedMatch.name : 'none'}`);

    // Show the opponent's card before processing
    this.phase = 'opponent_playing';
    this.opponentPlayedCard = handCard; // Store for display
    this.message = `Opponent plays ${handCard.name}...`;

    setTimeout(() => {
      console.log('[OPPONENT] Processing card play after timeout');
      // Remove from opponent's hand
      this.opponentHand.splice(selectedCardIndex, 1);
      console.log(`[OPPONENT] Removed card from hand, new hand size: ${this.opponentHand.length}`);

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
            this.updateYaku('opponent', true); // Defer decision during hand phase
            this.opponentPlayedCard = null;

            this.opponentDrawPhase();
          }, 900);
          return;
        } else {
          // Normal 2-card capture - show played card before matching
          this.message = `Opponent plays ${handCard.name} - Matching...`;

          // Delay state update so both played card AND field card are visible together
          setTimeout(() => {
            // Update captures after showing both cards
            const fieldIndex = this.field.findIndex(c => c.id === selectedMatch.id);
            this.field.splice(fieldIndex, 1);
            this.opponentCaptured.push(handCard, selectedMatch);
            this.updateYaku('opponent', true); // Defer decision during hand phase
            this.opponentPlayedCard = null;

            // Draw phase for opponent with visual feedback
            this.opponentDrawPhase();
          }, 600);
          return;
        }
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
            this.updateYaku('opponent', true); // Defer decision during hand phase
            this.opponentPlayedCard = null;

            this.opponentDrawPhase();
          }, 900);
          return;
        } else {
          this.field.push(handCard);
        }
      }

      this.opponentPlayedCard = null;

      // Draw phase for opponent with visual feedback
      this.opponentDrawPhase();
    }, 600);
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

          // Delay state update so both drawn card AND field cards are visible together
          setTimeout(() => {
            // Update captures after showing both cards
            this.field = this.field.filter(c => c.month !== drawnCard.month);
            this.opponentCaptured.push(drawnCard, ...sameMonthOnField);
            this.checkForKoikoiDecision('opponent');

            // Don't continue if waiting for koi-koi decision or if round has ended
            if (this.koikoiState.waitingForDecision) {
              this.koikoiState.resumeAction = () => {
                this.drawnCard = null;
                this.endTurn();
              };
              return;
            }

            if (!this.koikoiState.roundActive) {
              return; // Round has ended, stop execution
            }

            this.drawnCard = null;
            this.endTurn();
          }, 900);
        } else {
          // Normal match - show drawn card before matching
          this.phase = 'opponent_drawn';
          this.message = `Opponent drew ${drawnCard.name} - Matching...`;

          const bestMatch = drawnMatches.reduce((best, current) =>
            current.points > best.points ? current : best
          );

          // Delay state update so both drawn card AND field card are visible together
          setTimeout(() => {
            // Update captures after showing both cards
            const fieldIndex = this.field.findIndex(c => c.id === bestMatch.id);
            this.field.splice(fieldIndex, 1);
            this.opponentCaptured.push(drawnCard, bestMatch);
            this.checkForKoikoiDecision('opponent');

            // Don't continue if waiting for koi-koi decision or if round has ended
            if (this.koikoiState.waitingForDecision) {
              this.koikoiState.resumeAction = () => {
                this.drawnCard = null;
                this.endTurn();
              };
              return;
            }

            if (!this.koikoiState.roundActive) {
              return; // Round has ended, stop execution
            }

            this.drawnCard = null;
            this.endTurn();
          }, 900);
        }
      } else {
        // No match - check for celebrate when placing
        const sameMonthOnField = this.field.filter(c => c.month === drawnCard.month);

        if (sameMonthOnField.length === 3) {
          // Celebrate! Show special message with longer pause
          this.phase = 'opponent_celebrate';
          this.message = `🎉 Opponent Celebrates! Drew ${drawnCard.name} - All 4 ${drawnCard.month} cards captured!`;

          // Delay state update so both drawn card AND field cards are visible together
          setTimeout(() => {
            // Update captures after showing all cards
            this.field = this.field.filter(c => c.month !== drawnCard.month);
            this.opponentCaptured.push(drawnCard, ...sameMonthOnField);
            this.checkForKoikoiDecision('opponent');

            // Don't continue if waiting for koi-koi decision or if round has ended
            if (this.koikoiState.waitingForDecision) {
              this.koikoiState.resumeAction = () => {
                this.drawnCard = null;
                this.endTurn();
              };
              return;
            }

            if (!this.koikoiState.roundActive) {
              return; // Round has ended, stop execution
            }

            this.drawnCard = null;
            this.endTurn();
          }, 900);
        } else {
          // Normal no match - show drawn card before placing
          this.phase = 'opponent_drawn';
          this.message = `Opponent drew ${drawnCard.name} - No match`;

          setTimeout(() => {
            this.field.push(drawnCard);
            this.checkForKoikoiDecision('opponent');

            // Don't continue if waiting for koi-koi decision or if round has ended
            if (this.koikoiState.waitingForDecision) {
              this.koikoiState.resumeAction = () => {
                this.drawnCard = null;
                this.endTurn();
              };
              return;
            }

            if (!this.koikoiState.roundActive) {
              return; // Round has ended, stop execution
            }

            this.drawnCard = null;
            this.endTurn();
          }, 900);
        }
      }
    }, 150);
  }

  /**
   * End round and calculate scores
   */
  endRound() {
    // Mark round as no longer active to prevent further game actions
    this.koikoiState.roundActive = false;

    const playerYaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    const opponentYaku = Yaku.checkYaku(this.opponentCaptured, this.gameOptions);

    let playerRoundScore = Yaku.calculateScore(playerYaku);
    let opponentRoundScore = Yaku.calculateScore(opponentYaku);

    console.log(`[SCORING] Round end - Player: ${playerYaku.map(y => y.name).join(', ')} (${playerRoundScore} pts)`);
    console.log(`[SCORING] Round end - Opponent: ${opponentYaku.map(y => y.name).join(', ')} (${opponentRoundScore} pts)`);

    // Track scoring breakdown for display
    const playerScoreBreakdown = {
      baseScore: playerRoundScore,
      koikoiPenalty: false,
      autoDouble: false,
      koikoiMultiplier: 0,
      finalScore: playerRoundScore
    };

    const opponentScoreBreakdown = {
      baseScore: opponentRoundScore,
      koikoiPenalty: false,
      autoDouble: false,
      koikoiMultiplier: 0,
      finalScore: opponentRoundScore
    };

    // Check for koi-koi penalty: if someone called koi-koi but didn't improve, they get 0 points
    if (this.gameOptions && this.gameOptions.get('koikoiEnabled')) {
      if (this.koikoiState.playerCalled && playerRoundScore <= this.koikoiState.playerScoreAtKoikoi) {
        console.log(`[SCORING] Player called koi-koi but didn't improve (${this.koikoiState.playerScoreAtKoikoi} → ${playerRoundScore}) - penalty applied`);
        playerRoundScore = 0;
        playerScoreBreakdown.koikoiPenalty = true;
        playerScoreBreakdown.finalScore = 0;
      }
      if (this.koikoiState.opponentCalled && opponentRoundScore <= this.koikoiState.opponentScoreAtKoikoi) {
        console.log(`[SCORING] Opponent called koi-koi but didn't improve (${this.koikoiState.opponentScoreAtKoikoi} → ${opponentRoundScore}) - penalty applied`);
        opponentRoundScore = 0;
        opponentScoreBreakdown.koikoiPenalty = true;
        opponentScoreBreakdown.finalScore = 0;
      }
    }

    // Apply koi-koi multipliers if enabled
    if (this.gameOptions && this.gameOptions.get('koikoiEnabled')) {
      const playerBeforeMultiplier = playerRoundScore;
      const opponentBeforeMultiplier = opponentRoundScore;

      // Track multipliers in breakdown
      playerRoundScore = this.applyMultiplierWithBreakdown(playerRoundScore, 'player', playerScoreBreakdown);
      opponentRoundScore = this.applyMultiplierWithBreakdown(opponentRoundScore, 'opponent', opponentScoreBreakdown);

      if (playerRoundScore !== playerBeforeMultiplier) {
        console.log(`[SCORING] Player multiplier applied: ${playerBeforeMultiplier} → ${playerRoundScore}`);
      }
      if (opponentRoundScore !== opponentBeforeMultiplier) {
        console.log(`[SCORING] Opponent multiplier applied: ${opponentBeforeMultiplier} → ${opponentRoundScore}`);
      }
    }

    // Winner-take-all logic (traditional koi-koi)
    if (this.gameOptions && !this.gameOptions.get('bothPlayersScore')) {
      // Determine round winner
      let roundWinner = this.koikoiState.roundWinner || this.koikoiState.shobuCaller;

      // IMPORTANT: In koi-koi, there is NO score comparison to determine winner!
      // Winner is only determined by:
      // 1. Who called shobu (ends round immediately and wins)
      // 2. Who scored after someone called koi-koi (auto-end in 2x mode)
      // 3. If deck runs out with no winner: only players with yaku score
      //    (if both have yaku, it's like "both players score" even in winner-take-all mode)

      if (!roundWinner) {
        // Deck ran out with no explicit winner
        // Both players with yaku score their points (exception to winner-take-all)
        if (playerRoundScore > 0 && opponentRoundScore > 0) {
          console.log(`[SCORING] Deck exhausted - both players have yaku, both score`);
          // Don't set a winner - both score
        } else if (playerRoundScore > 0) {
          roundWinner = 'player';
        } else if (opponentRoundScore > 0) {
          roundWinner = 'opponent';
        }
        // If neither has yaku, both get 0
      }

      console.log(`[SCORING] Round winner: ${roundWinner || 'both (deck exhausted with both having yaku)'}`);

      // Apply winner-take-all: only winner gets points (unless both have yaku on deck exhaustion)
      if (roundWinner === 'player') {
        opponentRoundScore = 0;
        opponentScoreBreakdown.finalScore = 0;
      } else if (roundWinner === 'opponent') {
        playerRoundScore = 0;
        playerScoreBreakdown.finalScore = 0;
      } else if (playerRoundScore === 0 && opponentRoundScore === 0) {
        // No winner and no yaku - both get 0
        console.log(`[SCORING] No winner and no yaku - both get 0`);
      }
      // else: both have yaku from deck exhaustion, both keep their scores
    }

    console.log(`[SCORING] Final round scores - Player: ${playerRoundScore}, Opponent: ${opponentRoundScore}`);

    this.playerScore += playerRoundScore;
    this.opponentScore += opponentRoundScore;

    // Prepare round summary data
    const roundSummaryData = {
      roundNumber: this.currentRound,
      playerRoundScore: playerRoundScore,
      opponentRoundScore: opponentRoundScore,
      playerTotalScore: this.playerScore,
      opponentTotalScore: this.opponentScore,
      playerYaku: playerYaku,
      opponentYaku: opponentYaku,
      playerScoreBreakdown: playerScoreBreakdown,
      opponentScoreBreakdown: opponentScoreBreakdown,
      isGameOver: this.currentRound >= this.totalRounds,
      totalRounds: this.totalRounds
    };

    // Set gameOver flag if this is the last round
    if (this.currentRound >= this.totalRounds) {
      this.gameOver = true;
    }

    // Show round summary modal
    if (this.roundSummaryCallback) {
      this.roundSummaryCallback(roundSummaryData);
    } else {
      // Fallback if no callback set (for backwards compatibility)
      if (this.currentRound >= this.totalRounds) {
        const winner = this.playerScore > this.opponentScore ? 'Player' :
                       this.opponentScore > this.playerScore ? 'Opponent' : 'Tie';
        this.message = `Game Over! ${winner} wins! Final: Player ${this.playerScore} - Opponent ${this.opponentScore}`;
      } else {
        this.message = `Round ${this.currentRound} complete! Player: ${playerRoundScore}pts, Opponent: ${opponentRoundScore}pts - Starting round ${this.currentRound + 1}...`;
        setTimeout(() => this.startNextRound(), 3000);
      }
    }
  }

  /**
   * Start next round (called from round summary modal)
   */
  startNextRound() {
    if (this.currentRound >= this.totalRounds) {
      this.gameOver = true;
      const winner = this.playerScore > this.opponentScore ? 'Player' :
                     this.opponentScore > this.playerScore ? 'Opponent' : 'Tie';
      this.message = `Game Over! ${winner} wins! Final: Player ${this.playerScore} - Opponent ${this.opponentScore}`;
    } else {
      this.currentRound++;
      this.reset();
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
    // Rule: Only the opponent who scores after a koi-koi call gets doubled
    const multiplierMode = this.gameOptions.get('multiplierMode');

    if (player === 'player') {
      // Player only gets multiplier if opponent called koi-koi
      if (this.koikoiState.opponentCalled) {
        if (multiplierMode === 'cumulative') {
          const multiplier = Math.min(this.koikoiState.opponentCount + 1, 4);
          finalScore *= multiplier;
        } else if (multiplierMode === '2x') {
          finalScore *= 2;
        }
      }
    } else {
      // Opponent only gets multiplier if player called koi-koi
      if (this.koikoiState.playerCalled) {
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
   * Apply multiplier with breakdown tracking for display
   */
  applyMultiplierWithBreakdown(score, player, breakdown) {
    let finalScore = score;

    // Apply auto-double for 7+ points
    if (this.gameOptions.get('autoDouble7Plus') && score >= 7) {
      finalScore *= 2;
      breakdown.autoDouble = true;
    }

    // Apply koi-koi multipliers
    // IMPORTANT: Only the player who scored AFTER OPPONENT called koi-koi gets the 2× bonus
    // If you call koi-koi yourself and then score, you DO NOT get a multiplier
    // (but you win the round and avoid the penalty)

    const multiplierMode = this.gameOptions.get('multiplierMode');

    if (player === 'player') {
      // Player only gets multiplier if opponent called koi-koi and player scored after
      if (this.koikoiState.playerGetsMultiplier) {
        if (multiplierMode === 'cumulative') {
          const multiplier = Math.min(this.koikoiState.opponentCount + 1, 4);
          finalScore *= multiplier;
          breakdown.koikoiMultiplier = multiplier;
          console.log(`[MULTIPLIER] Player gets ${multiplier}x bonus (scored after opponent's koi-koi)`);
        } else if (multiplierMode === '2x') {
          finalScore *= 2;
          breakdown.koikoiMultiplier = 2;
          console.log(`[MULTIPLIER] Player gets 2x bonus (scored after opponent's koi-koi)`);
        }
      } else if (this.koikoiState.playerCalled && this.koikoiState.roundWinner === 'player') {
        console.log(`[MULTIPLIER] Player does NOT get bonus (scored after own koi-koi call)`);
      }
    } else {
      // Opponent only gets multiplier if player called koi-koi and opponent scored after
      if (this.koikoiState.opponentGetsMultiplier) {
        if (multiplierMode === 'cumulative') {
          const multiplier = Math.min(this.koikoiState.playerCount + 1, 4);
          finalScore *= multiplier;
          breakdown.koikoiMultiplier = multiplier;
          console.log(`[MULTIPLIER] Opponent gets ${multiplier}x bonus (scored after player's koi-koi)`);
        } else if (multiplierMode === '2x') {
          finalScore *= 2;
          breakdown.koikoiMultiplier = 2;
          console.log(`[MULTIPLIER] Opponent gets 2x bonus (scored after player's koi-koi)`);
        }
      } else if (this.koikoiState.opponentCalled && this.koikoiState.roundWinner === 'opponent') {
        console.log(`[MULTIPLIER] Opponent does NOT get bonus (scored after own koi-koi call)`);
      }
    }

    breakdown.finalScore = finalScore;
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
