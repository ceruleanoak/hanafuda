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
    this.playerScore = 0;
    this.opponentScore = 0;
    this.currentPlayer = 'player'; // 'player' or 'opponent'
    this.selectedCards = [];
    this.phase = 'select_hand'; // 'select_hand', 'select_field', 'waiting'
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
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      deckCount: this.deck.count,
      currentPlayer: this.currentPlayer,
      selectedCards: this.selectedCards,
      phase: this.phase,
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

    // Player can only select from their hand or field
    if (this.phase === 'select_hand' && owner === 'player') {
      this.selectedCards = [{ id: card.id, owner }];
      this.phase = 'select_field';
      this.message = 'Select a matching card from the field (or click again to place)';
      return true;
    }

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
   * Capture matching cards
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
    this.checkYaku('player');
    this.drawPhase();
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

    // Check if drawn card matches anything on field
    const matches = this.field.filter(fc => this.cardsMatch(drawnCard, fc));

    if (matches.length > 0) {
      // Auto-capture first match
      const fieldCard = matches[0];
      const fieldIndex = this.field.findIndex(c => c.id === fieldCard.id);
      this.field.splice(fieldIndex, 1);
      this.playerCaptured.push(drawnCard, fieldCard);
      this.checkYaku('player');
    } else {
      // Place drawn card on field
      this.field.push(drawnCard);
    }

    // Switch to opponent turn (for now, just switch back to player)
    this.endTurn();
  }

  /**
   * Check for yaku and update score
   */
  checkYaku(player) {
    const captured = player === 'player' ? this.playerCaptured : this.opponentCaptured;
    const yaku = Yaku.checkYaku(captured);

    if (yaku.length > 0) {
      const score = Yaku.calculateScore(yaku);
      const yakuNames = yaku.map(y => y.name).join(', ');

      if (player === 'player') {
        this.message = `Yaku! ${yakuNames} (${score} points)`;
      }

      // In real koi-koi, player chooses to continue or end
      // For now, we'll just note it
    }
  }

  /**
   * End current turn
   */
  endTurn() {
    // Simple AI: just switch back to player
    // In full implementation, opponent would play here
    this.currentPlayer = 'player';
    this.phase = 'select_hand';
    this.message = 'Your turn - select a card from your hand';

    // Check if hands are empty
    if (this.playerHand.length === 0) {
      this.endRound();
    }
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
