/**
 * Deck - Manages the hanafuda deck
 */

import { HANAFUDA_DECK } from '../data/cards.js';

export class Deck {
  constructor() {
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
   */
  draw() {
    return this.cards.pop();
  }

  /**
   * Draw multiple cards
   */
  drawMultiple(count) {
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
