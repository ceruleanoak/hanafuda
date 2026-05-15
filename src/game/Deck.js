/**
 * Deck - Manages the hanafuda deck
 */

import { HANAFUDA_DECK } from '../data/cards.js';
import { debugLogger } from '../utils/DebugLogger.js';

export class Deck {
  constructor() {
    /** @type {Card[]} Public property — accessed directly by 7+ callsites. Encapsulate in future refactor. */
    this.cards = [];
    this.reset();
  }

  /**
   * Reset deck to full 48 cards
   */
  reset() {
    // Create a fresh copy of the deck
    this.cards = HANAFUDA_DECK.map(card => ({ ...card }));
    this.shuffle();
  }

  /**
   * Shuffle the deck using Fisher-Yates algorithm
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Draw a card from the deck
   * @returns {Card|null} The drawn card, or null if the deck is empty
   */
  draw() {
    if (this.cards.length === 0) {
      debugLogger.log('gameState', 'Deck.draw(): attempted to draw from empty deck');
      return null;
    }
    return this.cards.pop();
  }

  /**
   * Draw multiple cards
   * @param {number} count - Number of cards to draw
   * @returns {Card[]} Array of drawn cards (may be shorter than count if deck runs out)
   */
  drawMultiple(count) {
    if (this.cards.length < count) {
      debugLogger.log('gameState', `Deck.drawMultiple: requested ${count} but only ${this.cards.length} remain`);
    }
    const drawn = [];
    for (let i = 0; i < count && this.cards.length > 0; i++) {
      drawn.push(this.draw());
    }
    return drawn;
  }

  /**
   * Get remaining card count
   */
  get count() {
    return this.cards.length;
  }

  /**
   * Check if deck is empty
   */
  isEmpty() {
    return this.cards.length === 0;
  }
}
