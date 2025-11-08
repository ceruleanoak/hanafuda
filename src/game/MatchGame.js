/**
 * MatchGame - A solitaire matching game for Hanafuda cards
 * Players flip cards two at a time to find matching months
 */

import { Deck } from './Deck.js';

export class MatchGame {
  constructor(gameOptions = null) {
    this.deck = new Deck();
    this.gameOptions = gameOptions;
    this.animationQueue = [];
    this.isAnimating = false;

    // Game state
    this.allCards = [];           // All 48 cards with their positions
    this.flippedCards = [];       // Currently flipped cards (max 2)
    this.matchedCards = [];       // Cards that have been matched
    this.isProcessing = false;    // Prevent clicks while processing match/mismatch

    this.reset();
  }

  /**
   * Start a new match game
   */
  startNewGame() {
    this.reset();
  }

  /**
   * Reset the game state
   */
  reset() {
    this.deck.reset();

    // Get all 48 cards from the deck
    this.allCards = [];
    const cards = this.deck.cards;

    // Create card objects with random positions
    // We'll spread them across the screen in a grid-like pattern with randomness
    const canvasWidth = 2000;  // Approximate canvas width
    const canvasHeight = 1000; // Approximate canvas height
    const margin = 100;

    // Calculate grid dimensions (8 rows x 6 columns for 48 cards)
    const cols = 8;
    const rows = 6;
    const cellWidth = (canvasWidth - margin * 2) / cols;
    const cellHeight = (canvasHeight - margin * 2) / rows;

    // Shuffle cards for random distribution
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);

    shuffledCards.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      // Base position in grid
      const baseX = margin + col * cellWidth + cellWidth / 2;
      const baseY = margin + row * cellHeight + cellHeight / 2;

      // Add randomness (variance) to position
      const variance = 30;
      const x = baseX + (Math.random() - 0.5) * variance;
      const y = baseY + (Math.random() - 0.5) * variance;

      this.allCards.push({
        ...card,
        position: { x, y },
        state: 'facedown', // 'facedown', 'faceup', 'matched'
        id: `${card.month}-${card.type}-${index}` // Unique identifier
      });
    });

    this.flippedCards = [];
    this.matchedCards = [];
    this.isProcessing = false;
    this.gameOver = false;
    this.winner = null;
    this.message = 'Select a card to flip!';
  }

  /**
   * Handle card click - flip card and check for matches
   */
  handleCardClick(cardId) {
    if (this.isProcessing || this.gameOver) {
      return false;
    }

    const card = this.allCards.find(c => c.id === cardId);

    // Can't click matched or already flipped cards
    if (!card || card.state === 'matched' || card.state === 'faceup') {
      return false;
    }

    // Can't flip more than 2 cards
    if (this.flippedCards.length >= 2) {
      return false;
    }

    // Flip the card
    card.state = 'faceup';
    this.flippedCards.push(card);

    // If this is the second card, check for match
    if (this.flippedCards.length === 2) {
      this.isProcessing = true;
      this.checkMatch();
    } else {
      this.message = 'Select another card!';
    }

    return true;
  }

  /**
   * Check if the two flipped cards match
   */
  checkMatch() {
    const [card1, card2] = this.flippedCards;

    if (card1.month === card2.month) {
      // Match! Move cards to matched pile
      this.message = `Match found! ${card1.month}`;

      card1.state = 'matched';
      card2.state = 'matched';

      this.matchedCards.push(card1, card2);
      this.flippedCards = [];

      // Check if game is complete
      if (this.matchedCards.length === 48) {
        this.gameOver = true;
        this.winner = 'player';
        this.message = 'Congratulations! All cards matched!';
      } else {
        this.message = `${this.matchedCards.length} / 48 cards matched`;
      }

      this.isProcessing = false;
    } else {
      // No match - flip cards back after a delay
      this.message = 'No match - cards will flip back';

      // In the real implementation, we'll use a timeout
      // For now, we'll set a flag that the renderer should handle
      setTimeout(() => {
        card1.state = 'facedown';
        card2.state = 'facedown';
        this.flippedCards = [];
        this.isProcessing = false;
        this.message = 'Select a card to flip!';
      }, 1500); // Wait 1.5 seconds before flipping back
    }
  }

  /**
   * Get the current game state (compatible with Card3DManager)
   */
  getState() {
    // Filter cards by state for Card3DManager compatibility
    const boardCards = this.allCards.filter(c => c.state !== 'matched');
    const capturedCards = this.matchedCards;

    return {
      // For match game rendering
      allCards: this.allCards,
      flippedCards: this.flippedCards,
      matchedCards: this.matchedCards,
      isProcessing: this.isProcessing,
      gameOver: this.gameOver,
      winner: this.winner,
      message: this.message,
      matchCount: this.matchedCards.length,
      totalCards: 48,

      // For Card3DManager compatibility
      field: boardCards,
      playerCaptured: capturedCards,
      opponentCaptured: [],
      playerHand: [],
      opponentHand: [],
      deckCount: 0,
      phase: 'match_game' // Special phase for match game
    };
  }

  /**
   * Find card at position (for click detection)
   */
  findCardAt(x, y, cardWidth = 120, cardHeight = 160) {
    // Check cards in reverse order (top cards first)
    for (let i = this.allCards.length - 1; i >= 0; i--) {
      const card = this.allCards[i];

      // Skip matched cards (they're not on the board)
      if (card.state === 'matched') {
        continue;
      }

      const cardX = card.position.x - cardWidth / 2;
      const cardY = card.position.y - cardHeight / 2;

      if (x >= cardX && x <= cardX + cardWidth &&
          y >= cardY && y <= cardY + cardHeight) {
        return card;
      }
    }

    return null;
  }

  /**
   * Animation queue methods (for compatibility with KoiKoi interface)
   */
  queueAnimation(animation) {
    this.animationQueue.push(animation);
  }

  processAnimationQueue() {
    if (this.isAnimating || this.animationQueue.length === 0) {
      return null;
    }

    this.isAnimating = true;
    return this.animationQueue.shift();
  }

  clearAnimationFlag() {
    this.isAnimating = false;
  }

  /**
   * Helper method to check if animations are enabled
   */
  areAnimationsEnabled() {
    return this.gameOptions ? this.gameOptions.get('animationsEnabled', true) : true;
  }
}
