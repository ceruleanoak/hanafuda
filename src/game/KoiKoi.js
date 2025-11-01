/**
 * KoiKoi - Main game logic for Koi-Koi hanafuda game
 */

import { Deck } from './Deck.js';
import { Yaku } from './Yaku.js';

export class KoiKoi {
  constructor() {
    this.deck = new Deck();
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
    this.playerScore = 0;
    this.opponentScore = 0;
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
    return {
      field: this.field,
      playerHand: this.playerHand,
      opponentHand: this.opponentHand,
      playerCaptured: this.playerCaptured,
      opponentCaptured: this.opponentCaptured,
      playerYaku: this.playerYaku,
      opponentYaku: this.opponentYaku,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      deckCount: this.deck.count,
      currentPlayer: this.currentPlayer,
      selectedCards: this.selectedCards,
      phase: this.phase,
      drawnCard: this.drawnCard,
      drawnCardMatches: this.drawnCardMatches,
      message: this.message,
      gameOver: this.gameOver
    };
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
   * Place card on field without capturing
   */
  placeCardOnField() {
    const cardIndex = this.playerHand.findIndex(c => c.id === this.selectedCards[0].id);
    if (cardIndex >= 0) {
      const card = this.playerHand.splice(cardIndex, 1)[0];
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

    const drawnCard = this.deck.draw();
    this.drawnCard = drawnCard;

    // Check if drawn card matches anything on field
    const matches = this.field.filter(fc => this.cardsMatch(drawnCard, fc));

    if (matches.length > 1) {
      // Multiple matches - player must choose
      this.drawnCardMatches = matches;
      this.phase = 'select_drawn_match';
      this.message = 'Drawn card matches multiple cards - select which one to capture';
    } else if (matches.length === 1) {
      // Single match - auto-capture
      const fieldCard = matches[0];
      const fieldIndex = this.field.findIndex(c => c.id === fieldCard.id);
      this.field.splice(fieldIndex, 1);
      this.playerCaptured.push(drawnCard, fieldCard);
      this.drawnCard = null;
      this.updateYaku('player');
      this.endTurn();
    } else {
      // No match - place on field
      this.field.push(drawnCard);
      this.drawnCard = null;
      this.endTurn();
    }
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
   * Opponent AI turn
   */
  opponentTurn() {
    if (this.opponentHand.length === 0 || this.deck.isEmpty()) {
      this.endRound();
      return;
    }

    // Simple AI: pick random card from hand
    const randomHandIndex = Math.floor(Math.random() * this.opponentHand.length);
    const handCard = this.opponentHand[randomHandIndex];

    // Check for matches in field
    const fieldMatches = this.field.filter(fc => this.cardsMatch(handCard, fc));

    if (fieldMatches.length > 0) {
      // Capture with random match
      const randomMatch = fieldMatches[Math.floor(Math.random() * fieldMatches.length)];
      const fieldIndex = this.field.findIndex(c => c.id === randomMatch.id);

      this.opponentHand.splice(randomHandIndex, 1);
      this.field.splice(fieldIndex, 1);
      this.opponentCaptured.push(handCard, randomMatch);
      this.updateYaku('opponent');
    } else {
      // Place on field
      this.opponentHand.splice(randomHandIndex, 1);
      this.field.push(handCard);
    }

    // Draw phase for opponent
    if (!this.deck.isEmpty()) {
      const drawnCard = this.deck.draw();
      const drawnMatches = this.field.filter(fc => this.cardsMatch(drawnCard, fc));

      if (drawnMatches.length > 0) {
        // Capture with random match
        const randomMatch = drawnMatches[Math.floor(Math.random() * drawnMatches.length)];
        const fieldIndex = this.field.findIndex(c => c.id === randomMatch.id);
        this.field.splice(fieldIndex, 1);
        this.opponentCaptured.push(drawnCard, randomMatch);
        this.updateYaku('opponent');
      } else {
        // Place on field
        this.field.push(drawnCard);
      }
    }

    // End opponent turn
    this.endTurn();
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

    this.gameOver = true;
    this.message = `Round over! Player: ${playerRoundScore}pts, Opponent: ${opponentRoundScore}pts`;
  }

  /**
   * Start new round
   */
  newRound() {
    this.reset();
  }
}
