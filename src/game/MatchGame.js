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

    // Timer and scoring
    this.startTime = null;        // Game start timestamp
    this.endTime = null;          // Game end timestamp
    this.elapsedTime = 0;         // Elapsed time in seconds
    this.timerInterval = null;    // Timer interval ID

    // Bonus multiplier system
    this.consecutiveMatches = 0;  // Count of consecutive matches
    this.score = 0;               // Total score with multipliers
    this.bonusMultiplierEnabled = false; // Whether bonus multiplier is enabled

    this.reset();
  }

  /**
   * Start a new match game
   * @param {boolean} bonusMultiplierEnabled - Whether to enable bonus multipliers
   */
  startNewGame(bonusMultiplierEnabled = false) {
    this.bonusMultiplierEnabled = bonusMultiplierEnabled;
    this.reset();
    this.startTimer();
  }

  /**
   * Reset the game state
   */
  reset() {
    this.deck.reset();

    // Stop any running timer
    this.stopTimer();

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

    // Reset timer and scoring
    this.startTime = null;
    this.endTime = null;
    this.elapsedTime = 0;
    this.consecutiveMatches = 0;
    this.score = 0;
  }

  /**
   * Start the game timer
   */
  startTimer() {
    this.startTime = Date.now();
    this.elapsedTime = 0;

    // Update timer every 100ms for smooth display
    this.timerInterval = setInterval(() => {
      if (this.startTime && !this.endTime) {
        this.elapsedTime = (Date.now() - this.startTime) / 1000; // Convert to seconds
      }
    }, 100);
  }

  /**
   * Stop the game timer
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.startTime && !this.endTime) {
      this.endTime = Date.now();
      this.elapsedTime = (this.endTime - this.startTime) / 1000;
    }
  }

  /**
   * Get formatted time string (MM:SS.mmm)
   */
  getFormattedTime() {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    const milliseconds = Math.floor((this.elapsedTime % 1) * 1000);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
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
      this.consecutiveMatches++;

      // Calculate score with bonus multiplier
      let matchScore = 100; // Base score for a match
      if (this.bonusMultiplierEnabled) {
        // Bonus multiplier: 1x, 2x, 3x, 4x, etc. for consecutive matches
        matchScore = 100 * this.consecutiveMatches;
        this.message = `Match found! ${card1.month} (+${matchScore} pts | ${this.consecutiveMatches}x combo!)`;
      } else {
        this.message = `Match found! ${card1.month}`;
      }

      this.score += matchScore;

      card1.state = 'matched';
      card2.state = 'matched';

      this.matchedCards.push(card1, card2);
      this.flippedCards = [];

      // Check if game is complete
      if (this.matchedCards.length === 48) {
        this.stopTimer();
        this.gameOver = true;
        this.winner = 'player';
        this.message = `Congratulations! All cards matched in ${this.getFormattedTime()}!`;

        // Save high score
        this.saveHighScore();
      } else {
        this.message = `${this.matchedCards.length} / 48 cards matched`;
      }

      this.isProcessing = false;
    } else {
      // No match - reset consecutive matches and flip cards back after a delay
      this.consecutiveMatches = 0;
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
   * Save high score to localStorage
   */
  saveHighScore() {
    const highScoreKey = this.bonusMultiplierEnabled ? 'matchGameHighScoresBonus' : 'matchGameHighScores';
    const highScores = this.getHighScores();

    const newScore = {
      time: this.elapsedTime,
      formattedTime: this.getFormattedTime(),
      score: this.score,
      date: new Date().toISOString(),
      bonusEnabled: this.bonusMultiplierEnabled
    };

    highScores.push(newScore);

    // Sort by time (fastest first) or by score (highest first) depending on mode
    if (this.bonusMultiplierEnabled) {
      highScores.sort((a, b) => b.score - a.score); // Highest score first
    } else {
      highScores.sort((a, b) => a.time - b.time); // Fastest time first
    }

    // Keep only top 10
    const top10 = highScores.slice(0, 10);

    localStorage.setItem(highScoreKey, JSON.stringify(top10));
  }

  /**
   * Get high scores from localStorage
   */
  getHighScores() {
    const highScoreKey = this.bonusMultiplierEnabled ? 'matchGameHighScoresBonus' : 'matchGameHighScores';
    const stored = localStorage.getItem(highScoreKey);

    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }

  /**
   * Get the current game state (compatible with Card3DManager)
   */
  getState() {
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

      // Timer and scoring
      elapsedTime: this.elapsedTime,
      formattedTime: this.getFormattedTime(),
      score: this.score,
      consecutiveMatches: this.consecutiveMatches,
      bonusMultiplierEnabled: this.bonusMultiplierEnabled,

      // For Card3DManager compatibility - keep ALL cards in field (including matched)
      // This prevents the synchronize() method from triggering zone moves and layout recalculations
      field: this.allCards,
      playerCaptured: [],  // Empty - don't move matched cards here
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
