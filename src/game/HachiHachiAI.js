/**
 * HachiHachiAI - AI decision making for Hachi-Hachi opponents
 *
 * Handles:
 * - Sage/Shoubu/Cancel decisions based on game state
 * - Card play decisions (which card to play)
 * - Card matching decisions (1v2 matches)
 */

export class HachiHachiAI {
  /**
   * Decide whether to Sage (continue), Shoubu (end), or Cancel
   * @param {Object} params - {dekiyakuValue, playerScore, opponent1Score, opponent2Score, roundNumber, totalRounds, difficulty}
   * @returns {string} 'sage', 'shoubu', or 'cancel'
   */
  static decideSageOrShoubu(params) {
    const {
      dekiyakuValue,
      playerScore,
      opponent1Score,
      opponent2Score,
      roundNumber,
      totalRounds,
      difficulty = 'normal'
    } = params;

    const maxScore = Math.max(opponent1Score, opponent2Score);
    const scoreDifference = playerScore - maxScore;
    const roundsRemaining = totalRounds - roundNumber;

    // Basic thresholds for decision
    if (difficulty === 'advanced') {
      return this.advancedDecision({
        dekiyakuValue,
        playerScore,
        maxScore,
        scoreDifference,
        roundsRemaining
      });
    }

    // Normal difficulty - more conservative
    // If already ahead, take the points (Shoubu)
    if (scoreDifference > 100) {
      return 'shoubu';
    }

    // If significantly behind, be more aggressive (Sage)
    if (scoreDifference < -150) {
      if (dekiyakuValue > 15) {
        return 'sage'; // Try to get more
      }
    }

    // With a decent hand and reasonable score, end it (Shoubu)
    if (dekiyakuValue > 10 && scoreDifference > -50) {
      return 'shoubu';
    }

    // Small dekiyaku score - play it safe with Cancel
    if (dekiyakuValue < 8) {
      return 'cancel';
    }

    // Moderate score - Sage for more points
    if (dekiyakuValue >= 8 && dekiyakuValue <= 10) {
      return 'sage';
    }

    // Default to Shoubu if we have a good score
    return scoreDifference > -30 ? 'shoubu' : 'sage';
  }

  /**
   * Advanced difficulty decision making
   * Uses more sophisticated risk analysis
   */
  static advancedDecision(params) {
    const { dekiyakuValue, playerScore, maxScore, scoreDifference, roundsRemaining } = params;

    // Calculate expected value of continuing
    const sageRiskFactor = 0.6; // 60% chance of improvement
    const expectedGainFromSage = dekiyakuValue * sageRiskFactor;
    const lossIfFail = dekiyakuValue * 0.5; // Lose 50% if koi-koi fails

    // If significantly ahead and few rounds left, secure the win
    if (scoreDifference > 120 && roundsRemaining <= 3) {
      return 'shoubu';
    }

    // If behind and many rounds remain, take bigger risks
    if (scoreDifference < -100 && roundsRemaining > 4) {
      if (dekiyakuValue > 12) {
        return 'sage';
      }
    }

    // Risk-reward analysis
    if (expectedGainFromSage > lossIfFail * 1.5) {
      return 'sage'; // Good risk-reward ratio
    }

    // Safe choice - Shoubu if we're even or ahead
    if (scoreDifference >= 0) {
      return 'shoubu';
    }

    // Use Cancel as a middle ground option
    if (dekiyakuValue < 12) {
      return 'cancel';
    }

    return 'shoubu';
  }

  /**
   * Decide which card to play from hand
   * @param {Array} hand - Cards in hand
   * @param {Array} field - Cards on field
   * @param {Object} state - Game state (scores, phase, etc.)
   * @param {string} difficulty - 'normal' or 'advanced'
   * @returns {Object} Card object to play
   */
  static chooseCardToPlay(hand, field, state, difficulty = 'normal') {
    if (!hand || hand.length === 0) return null;

    // Find matching cards on field
    const matchOptions = hand.map(card => ({
      card,
      matches: field.filter(f => f.month === card.month),
      matchCount: field.filter(f => f.month === card.month).length
    })).filter(opt => opt.matches.length > 0);

    if (matchOptions.length === 0) {
      // No matches - play lowest value card
      return this.lowestValueCard(hand);
    }

    if (difficulty === 'advanced') {
      return this.advancedCardSelection(hand, field, matchOptions, state);
    }

    // Normal difficulty - prefer cards with good matches
    // Sort by match count (prefer 1v2 opportunities)
    matchOptions.sort((a, b) => {
      const aScore = this.cardMatchScore(a.card, a.matchCount);
      const bScore = this.cardMatchScore(b.card, b.matchCount);
      return bScore - aScore;
    });

    return matchOptions[0].card;
  }

  /**
   * Calculate how desirable a card is for matching
   */
  static cardMatchScore(card, matchCount) {
    const typeValues = {
      bright: 10,
      animal: 7,
      ribbon: 5,
      chaff: 2
    };

    const typeScore = typeValues[card.type] || 0;
    const matchScore = matchCount; // Prefer 1v2 over 1v1

    return typeScore + (matchScore * 2);
  }

  /**
   * Find lowest value card (to throw away when no matches)
   */
  static lowestValueCard(hand) {
    const typeValues = {
      chaff: 1,
      ribbon: 2,
      animal: 3,
      bright: 4
    };

    return hand.reduce((lowest, card) => {
      const cardValue = typeValues[card.type] || 0;
      const lowestValue = typeValues[lowest.type] || 0;
      return cardValue < lowestValue ? card : lowest;
    });
  }

  /**
   * Advanced card selection strategy
   */
  static advancedCardSelection(hand, field, matchOptions, state) {
    // Consider scoring potential
    const withScoringPotential = matchOptions.filter(opt => {
      // Cards that could form yaku
      return opt.card.type === 'bright' || opt.card.type === 'animal';
    });

    if (withScoringPotential.length > 0) {
      // Prioritize cards that build toward yaku
      withScoringPotential.sort((a, b) => {
        const aScore = this.cardMatchScore(a.card, a.matchCount);
        const bScore = this.cardMatchScore(b.card, b.matchCount);
        return bScore - aScore;
      });
      return withScoringPotential[0].card;
    }

    // Fall back to normal selection
    matchOptions.sort((a, b) => {
      const aScore = this.cardMatchScore(a.card, a.matchCount);
      const bScore = this.cardMatchScore(b.card, b.matchCount);
      return bScore - aScore;
    });

    return matchOptions[0].card;
  }

  /**
   * Decide which field card to match with (for 1v2 decisions)
   * @param {Object} playedCard - Card being played
   * @param {Array} matches - Possible field cards to match with
   * @param {string} difficulty - 'normal' or 'advanced'
   * @returns {Object} Field card to match with
   */
  static chooseFieldMatch(playedCard, matches, difficulty = 'normal') {
    if (!matches || matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // For 1v2, choose which card to take
    const typeValues = {
      bright: 10,
      animal: 7,
      ribbon: 5,
      chaff: 2
    };

    // Prefer taking higher-value cards
    return matches.reduce((best, card) => {
      const cardValue = typeValues[card.type] || 0;
      const bestValue = typeValues[best.type] || 0;
      return cardValue > bestValue ? card : best;
    });
  }

  /**
   * Get AI difficulty settings
   */
  static getDifficultySettings(difficulty = 'normal') {
    return {
      normal: {
        riskTolerance: 0.5,
        aggressiveness: 0.5,
        responseDelay: 800 // ms
      },
      advanced: {
        riskTolerance: 0.7,
        aggressiveness: 0.8,
        responseDelay: 500 // ms - faster decisions
      }
    }[difficulty] || { riskTolerance: 0.5, aggressiveness: 0.5, responseDelay: 800 };
  }

  /**
   * Simulate decision with realistic delay
   * @param {Function} callback - Function to call with decision
   * @param {number} delay - Delay in milliseconds
   */
  static makeDecisionWithDelay(callback, delay = 800) {
    return new Promise((resolve) => {
      setTimeout(() => {
        callback();
        resolve();
      }, delay);
    });
  }
}
