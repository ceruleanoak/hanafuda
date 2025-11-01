/**
 * KoiKoi - Main game logic for Koi-Koi hanafuda game
 */

import { Deck } from './Deck.js';
import { Yaku } from './Yaku.js';

export class KoiKoi {
  constructor() {
    this.deck = new Deck();
    this.totalRounds = 1;
    this.currentRound = 0;
    this.animationQueue = [];
    this.isAnimating = false;
    this.reset();
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
    this.currentPlayer = 'player'; // 'player' or 'opponent'
    this.selectedCards = [];
    this.phase = 'select_hand'; // 'select_hand', 'select_field', 'draw_phase', 'select_drawn_match'
    this.drawnCard = null;
    this.drawnCardMatches = [];
    this.gameOver = false;
    this.message = '';

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

    this.message = 'Select a card from your hand';
  }

  /**
   * Get current game state
   */
  getState() {
    const playerProgress = Yaku.checkYakuProgress(this.playerCaptured);
    const opponentProgress = Yaku.checkYakuProgress(this.opponentCaptured);

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
      // If clicking same card again, just place it on field
      if (owner === 'player' && this.selectedCards[0].id === card.id) {
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
    // Remove from hand and field
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
      } else {
        // No match - show drawn card briefly before placing
        this.phase = 'show_drawn';
        this.message = `Drew ${drawnCard.name} - No match, adding to field...`;

        setTimeout(() => {
          // Check for 4-card same-month capture
          if (!this.checkFourCardCapture(drawnCard, 'player')) {
            this.field.push(drawnCard);
          }
          this.drawnCard = null;
          this.endTurn();
        }, 1800);
      }
    }, 300);
  }

  /**
   * Update yaku for a player
   */
  updateYaku(player) {
    const captured = player === 'player' ? this.playerCaptured : this.opponentCaptured;
    const yaku = Yaku.checkYaku(captured);

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
      this.message = 'Your turn - select a card from your hand';
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

    if (selectedMatch) {
      // Capture with the selected match
      const fieldIndex = this.field.findIndex(c => c.id === selectedMatch.id);
      this.opponentHand.splice(selectedCardIndex, 1);
      this.field.splice(fieldIndex, 1);
      this.opponentCaptured.push(handCard, selectedMatch);
      this.updateYaku('opponent');
    } else {
      // Place on field
      this.opponentHand.splice(selectedCardIndex, 1);

      // Check for 4-card same-month capture
      if (!this.checkFourCardCapture(handCard, 'opponent')) {
        this.field.push(handCard);
      }
    }

    // Draw phase for opponent with visual feedback
    this.opponentDrawPhase();
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
        // Show drawn card before matching
        this.phase = 'opponent_drawn';
        this.message = `Opponent drew ${drawnCard.name} - Matching...`;

        setTimeout(() => {
          // Prioritize high-value matches
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
      } else {
        // Show drawn card before placing
        this.phase = 'opponent_drawn';
        this.message = `Opponent drew ${drawnCard.name} - No match`;

        setTimeout(() => {
          // Check for 4-card same-month capture
          if (!this.checkFourCardCapture(drawnCard, 'opponent')) {
            this.field.push(drawnCard);
          }
          this.drawnCard = null;
          this.endTurn();
        }, 1800);
      }
    }, 300);
  }

  /**
   * End round and calculate scores
   */
  endRound() {
    const playerYaku = Yaku.checkYaku(this.playerCaptured);
    const opponentYaku = Yaku.checkYaku(this.opponentCaptured);

    const playerRoundScore = Yaku.calculateScore(playerYaku);
    const opponentRoundScore = Yaku.calculateScore(opponentYaku);

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
   * Start new round
   */
  newRound() {
    if (this.currentRound < this.totalRounds) {
      this.currentRound++;
      this.reset();
    }
  }
}
