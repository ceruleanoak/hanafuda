/**
 * Advanced AI Strategy for Hanafuda Koi-Koi
 * Implements strategic decision-making including:
 * - Threat detection (blocking player yaku)
 * - Value-based yaku prioritization
 * - Smart card selection
 */

import { CARD_TYPES } from '../data/cards.js';
import { Yaku } from './Yaku.js';

export class AdvancedAI {
  /**
   * Analyze which yaku a player is threatening to complete
   * @param {Array} capturedCards - Player's captured cards
   * @param {Array} opponentCards - Opponent's captured cards
   * @returns {Array} Array of threat objects with yaku info and priority
   */
  static analyzeThreats(capturedCards, opponentCards) {
    const threats = [];

    // Check each yaku type and determine threat level

    // Brights threat (high value: 6-15 points)
    const brights = capturedCards.filter(c => c.type === CARD_TYPES.BRIGHT);
    const opponentBrights = opponentCards.filter(c => c.type === CARD_TYPES.BRIGHT);
    if (brights.length >= 2) {
      const hasRainMan = brights.some(c => c.name.includes('rain man'));
      const opponentHasRainMan = opponentBrights.some(c => c.name.includes('rain man'));
      const remaining = 5 - brights.length - opponentBrights.length;

      let targetYaku = 'Three Brights';
      let points = 6;
      let needed = 3 - brights.length;

      if (brights.length === 4) {
        targetYaku = hasRainMan ? 'Rainy Four Brights' : 'Four Brights';
        points = hasRainMan ? 8 : 10;
        needed = 1;
      } else if (brights.length === 3) {
        targetYaku = hasRainMan ? 'Rainy Four Brights' : 'Four Brights';
        points = hasRainMan ? 8 : 10;
        needed = 1;
      }

      if (remaining >= needed) {
        threats.push({
          type: 'brights',
          name: targetYaku,
          current: brights.length,
          needed: needed,
          points: points,
          priority: points * (1 / needed), // Higher priority if closer to completion
          cards: brights
        });
      }
    }

    // Poetry Ribbons threat (6 points)
    const poetryRibbons = capturedCards.filter(c =>
      c.type === CARD_TYPES.RIBBON &&
      c.name.includes('poetry') &&
      c.ribbonColor === 'red'
    );
    if (poetryRibbons.length >= 2) {
      const opponentPoetry = opponentCards.filter(c =>
        c.type === CARD_TYPES.RIBBON &&
        c.name.includes('poetry') &&
        c.ribbonColor === 'red'
      ).length;
      const remaining = 3 - poetryRibbons.length - opponentPoetry;
      const needed = 3 - poetryRibbons.length;

      if (remaining >= needed) {
        threats.push({
          type: 'poetry',
          name: 'Poetry Ribbons',
          current: poetryRibbons.length,
          needed: needed,
          points: 6,
          priority: 6 * (1 / needed),
          cards: poetryRibbons
        });
      }
    }

    // Blue Ribbons threat (6 points)
    const blueRibbons = capturedCards.filter(c =>
      c.type === CARD_TYPES.RIBBON &&
      c.ribbonColor === 'blue'
    );
    if (blueRibbons.length >= 2) {
      const opponentBlue = opponentCards.filter(c =>
        c.type === CARD_TYPES.RIBBON &&
        c.ribbonColor === 'blue'
      ).length;
      const remaining = 3 - blueRibbons.length - opponentBlue;
      const needed = 3 - blueRibbons.length;

      if (remaining >= needed) {
        threats.push({
          type: 'blue',
          name: 'Blue Ribbons',
          current: blueRibbons.length,
          needed: needed,
          points: 6,
          priority: 6 * (1 / needed),
          cards: blueRibbons
        });
      }
    }

    // Boar-Deer-Butterfly threat (6 points)
    const boar = capturedCards.find(c => c.name.includes('boar'));
    const deer = capturedCards.find(c => c.name.includes('deer'));
    const butterflies = capturedCards.find(c => c.name.includes('butterflies'));
    const inoShikaChoCount = [boar, deer, butterflies].filter(Boolean).length;

    if (inoShikaChoCount >= 2) {
      const opponentBoar = opponentCards.find(c => c.name.includes('boar'));
      const opponentDeer = opponentCards.find(c => c.name.includes('deer'));
      const opponentButterflies = opponentCards.find(c => c.name.includes('butterflies'));
      const opponentCount = [opponentBoar, opponentDeer, opponentButterflies].filter(Boolean).length;
      const needed = 3 - inoShikaChoCount;
      const remaining = 3 - inoShikaChoCount - opponentCount;

      if (remaining >= needed) {
        threats.push({
          type: 'inoshikacho',
          name: 'Boar-Deer-Butterfly',
          current: inoShikaChoCount,
          needed: needed,
          points: 6,
          priority: 6 * (1 / needed),
          cards: [boar, deer, butterflies].filter(Boolean),
          missingCards: {
            boar: !boar,
            deer: !deer,
            butterflies: !butterflies
          }
        });
      }
    }

    // Ribbons threat (5+ points)
    const ribbons = capturedCards.filter(c => c.type === CARD_TYPES.RIBBON);
    if (ribbons.length >= 4) {
      const opponentRibbons = opponentCards.filter(c => c.type === CARD_TYPES.RIBBON).length;
      const remaining = 10 - ribbons.length - opponentRibbons;
      const needed = 5 - ribbons.length;

      if (remaining >= needed) {
        threats.push({
          type: 'ribbons',
          name: 'Ribbons',
          current: ribbons.length,
          needed: needed,
          points: 5,
          priority: 5 * (1 / needed),
          cards: ribbons
        });
      }
    }

    // Animals threat (5+ points)
    const animals = capturedCards.filter(c => c.type === CARD_TYPES.ANIMAL);
    if (animals.length >= 4) {
      const opponentAnimals = opponentCards.filter(c => c.type === CARD_TYPES.ANIMAL).length;
      const remaining = 9 - animals.length - opponentAnimals;
      const needed = 5 - animals.length;

      if (remaining >= needed) {
        threats.push({
          type: 'animals',
          name: 'Animals',
          current: animals.length,
          needed: needed,
          points: 5,
          priority: 5 * (1 / needed),
          cards: animals
        });
      }
    }

    // Chaff threat (10+ points, 1+ point yaku)
    const chaff = capturedCards.filter(c => c.type === CARD_TYPES.CHAFF);
    if (chaff.length >= 7) {
      const opponentChaff = opponentCards.filter(c => c.type === CARD_TYPES.CHAFF).length;
      const remaining = 24 - chaff.length - opponentChaff; // 24 total chaff cards
      const needed = 10 - chaff.length;

      if (remaining >= needed) {
        // Points: 1 for 10 chaff, +1 for each additional
        const points = Math.max(1, chaff.length - 9);
        threats.push({
          type: 'chaff',
          name: 'Chaff',
          current: chaff.length,
          needed: needed,
          points: points,
          priority: points * (1 / needed) * (chaff.length >= 9 ? 3 : 1), // Higher priority when very close
          cards: chaff
        });
      }
    }

    // Viewing Sake threats (3 points each)
    const curtain = capturedCards.find(c => c.name.includes('curtain'));
    const moon = capturedCards.find(c => c.name.includes('moon'));
    const sakeCup = capturedCards.find(c => c.name.includes('sake cup'));

    if ((curtain || moon) && !sakeCup) {
      const opponentSakeCup = opponentCards.find(c => c.name.includes('sake cup'));
      if (!opponentSakeCup) {
        threats.push({
          type: 'viewing',
          name: curtain ? 'Viewing Sake' : 'Moon Viewing Sake',
          current: 1,
          needed: 1,
          points: 3,
          priority: 3,
          cards: [curtain || moon].filter(Boolean),
          missingCards: { sakeCup: true }
        });
      }
    }

    if (sakeCup && !curtain && !moon) {
      const opponentCurtain = opponentCards.find(c => c.name.includes('curtain'));
      const opponentMoon = opponentCards.find(c => c.name.includes('moon'));
      if (!opponentCurtain || !opponentMoon) {
        threats.push({
          type: 'viewing',
          name: !opponentCurtain ? 'Viewing Sake' : 'Moon Viewing Sake',
          current: 1,
          needed: 1,
          points: 3,
          priority: 3,
          cards: [sakeCup],
          missingCards: {
            curtain: !opponentCurtain,
            moon: !opponentMoon
          }
        });
      }
    }

    // Sort by priority (higher priority = more urgent threat)
    threats.sort((a, b) => b.priority - a.priority);

    return threats;
  }

  /**
   * Evaluate which yaku the AI can pursue with current hand and captured cards
   * @param {Array} hand - AI's current hand
   * @param {Array} captured - AI's captured cards
   * @param {Array} field - Cards on the field
   * @param {Array} opponentCards - Opponent's captured cards
   * @returns {Array} Array of opportunity objects
   */
  static evaluateOpportunities(hand, captured, field, opponentCards) {
    const opportunities = [];

    // Create a combined set of cards (captured + what's available from field)
    const availableCards = [...captured];

    // Helper to check if we can get a card type from field
    const canGetFromField = (filterFunc) => {
      return field.some(fieldCard => {
        return filterFunc(fieldCard) && hand.some(h => h.month === fieldCard.month);
      });
    };

    // Helper to check if opponent has card
    const opponentHas = (filterFunc) => {
      return opponentCards.some(filterFunc);
    };

    // Brights opportunities
    const brights = captured.filter(c => c.type === CARD_TYPES.BRIGHT);
    const brightsOnField = field.filter(c => c.type === CARD_TYPES.BRIGHT);
    const brightsInHand = hand.filter(c => c.type === CARD_TYPES.BRIGHT);
    const totalAccessible = brights.length + brightsOnField.length + brightsInHand.length;

    if (totalAccessible >= 3) {
      const hasRainMan = brights.some(c => c.name.includes('rain man')) ||
                        brightsOnField.some(c => c.name.includes('rain man')) ||
                        brightsInHand.some(c => c.name.includes('rain man'));
      const points = totalAccessible >= 5 ? 15 : (totalAccessible >= 4 ? (hasRainMan ? 8 : 10) : 6);

      opportunities.push({
        type: 'brights',
        name: 'Brights',
        current: brights.length,
        accessible: totalAccessible,
        points: points,
        priority: points * (brights.length / 3),
        canMatch: brightsOnField.some(bf => hand.some(h => h.month === bf.month))
      });
    }

    // Boar-Deer-Butterfly opportunities
    const boar = captured.find(c => c.name.includes('boar'));
    const deer = captured.find(c => c.name.includes('deer'));
    const butterflies = captured.find(c => c.name.includes('butterflies'));
    const inoShikaChoCount = [boar, deer, butterflies].filter(Boolean).length;

    const boarAvailable = boar || canGetFromField(c => c.name.includes('boar'));
    const deerAvailable = deer || canGetFromField(c => c.name.includes('deer'));
    const butterfliesAvailable = butterflies || canGetFromField(c => c.name.includes('butterflies'));
    const totalInoShikaCho = [boarAvailable, deerAvailable, butterfliesAvailable].filter(Boolean).length;

    if (totalInoShikaCho >= 2 && inoShikaChoCount >= 1) {
      const opponentHasBoar = opponentHas(c => c.name.includes('boar'));
      const opponentHasDeer = opponentHas(c => c.name.includes('deer'));
      const opponentHasButterflies = opponentHas(c => c.name.includes('butterflies'));
      const opponentCount = [opponentHasBoar, opponentHasDeer, opponentHasButterflies].filter(Boolean).length;

      if (3 - opponentCount >= 3) { // Still possible
        opportunities.push({
          type: 'inoshikacho',
          name: 'Boar-Deer-Butterfly',
          current: inoShikaChoCount,
          accessible: totalInoShikaCho,
          points: 6,
          priority: 6 * (inoShikaChoCount / 3),
          canMatch: field.some(f =>
            (f.name.includes('boar') || f.name.includes('deer') || f.name.includes('butterflies')) &&
            hand.some(h => h.month === f.month)
          )
        });
      }
    }

    // Poetry Ribbons opportunities
    const poetry = captured.filter(c =>
      c.type === CARD_TYPES.RIBBON && c.name.includes('poetry') && c.ribbonColor === 'red'
    );
    const poetryOnField = field.filter(c =>
      c.type === CARD_TYPES.RIBBON && c.name.includes('poetry') && c.ribbonColor === 'red'
    );
    const poetryInHand = hand.filter(c =>
      c.type === CARD_TYPES.RIBBON && c.name.includes('poetry') && c.ribbonColor === 'red'
    );
    const totalPoetry = poetry.length + poetryOnField.length + poetryInHand.length;

    if (totalPoetry >= 2 && poetry.length >= 1) {
      opportunities.push({
        type: 'poetry',
        name: 'Poetry Ribbons',
        current: poetry.length,
        accessible: totalPoetry,
        points: 6,
        priority: 6 * (poetry.length / 3),
        canMatch: poetryOnField.some(pf => hand.some(h => h.month === pf.month))
      });
    }

    // Blue Ribbons opportunities
    const blue = captured.filter(c => c.type === CARD_TYPES.RIBBON && c.ribbonColor === 'blue');
    const blueOnField = field.filter(c => c.type === CARD_TYPES.RIBBON && c.ribbonColor === 'blue');
    const blueInHand = hand.filter(c => c.type === CARD_TYPES.RIBBON && c.ribbonColor === 'blue');
    const totalBlue = blue.length + blueOnField.length + blueInHand.length;

    if (totalBlue >= 2 && blue.length >= 1) {
      opportunities.push({
        type: 'blue',
        name: 'Blue Ribbons',
        current: blue.length,
        accessible: totalBlue,
        points: 6,
        priority: 6 * (blue.length / 3),
        canMatch: blueOnField.some(bf => hand.some(h => h.month === bf.month))
      });
    }

    // Ribbons opportunities (generic)
    const ribbons = captured.filter(c => c.type === CARD_TYPES.RIBBON);
    if (ribbons.length >= 3) {
      const ribbonsOnField = field.filter(c => c.type === CARD_TYPES.RIBBON);
      const basePoints = 5 + Math.max(0, ribbons.length - 5);

      opportunities.push({
        type: 'ribbons',
        name: 'Ribbons',
        current: ribbons.length,
        accessible: ribbons.length + ribbonsOnField.length,
        points: basePoints,
        priority: basePoints * (ribbons.length / 5),
        canMatch: ribbonsOnField.some(rf => hand.some(h => h.month === rf.month))
      });
    }

    // Animals opportunities
    const animals = captured.filter(c => c.type === CARD_TYPES.ANIMAL);
    if (animals.length >= 3) {
      const animalsOnField = field.filter(c => c.type === CARD_TYPES.ANIMAL);
      const basePoints = 5 + Math.max(0, animals.length - 5);

      opportunities.push({
        type: 'animals',
        name: 'Animals',
        current: animals.length,
        accessible: animals.length + animalsOnField.length,
        points: basePoints,
        priority: basePoints * (animals.length / 5),
        canMatch: animalsOnField.some(af => hand.some(h => h.month === af.month))
      });
    }

    // Sort by priority
    opportunities.sort((a, b) => b.priority - a.priority);

    return opportunities;
  }

  /**
   * Select the best card to play using advanced strategy
   * @param {Array} hand - AI's hand
   * @param {Array} captured - AI's captured cards
   * @param {Array} field - Cards on the field
   * @param {Array} playerCaptured - Player's captured cards
   * @param {Object} gameOptions - Game options
   * @returns {Object} Selected card with reasoning
   */
  static selectCard(hand, captured, field, playerCaptured, gameOptions = null) {
    // Analyze threats from player
    const threats = this.analyzeThreats(playerCaptured, captured);

    // Evaluate AI's own opportunities
    const opportunities = this.evaluateOpportunities(hand, captured, field, playerCaptured);

    // Score each card in hand
    const cardScores = hand.map(card => {
      let score = 0;
      let reasoning = [];

      // Find all matching cards on field
      const matches = field.filter(f => f.month === card.month);

      if (matches.length === 0) {
        // No match - this card will go to field
        // Low priority unless it's strategic to discard
        score = 1;
        reasoning.push('no match - goes to field');
        return { card, score, reasoning: reasoning.join(', '), matches: [] };
      }

      // Evaluate each possible match
      let bestMatch = null;
      let bestMatchScore = -1;

      for (const match of matches) {
        let matchScore = 0;
        let matchReasoning = [];

        // Base value of the card
        matchScore += match.points;
        matchReasoning.push(`${match.points}pt card`);

        // Check if this blocks a player threat
        for (const threat of threats) {
          if (threat.type === 'brights' && match.type === CARD_TYPES.BRIGHT) {
            matchScore += threat.priority * 2; // High value blocking
            matchReasoning.push(`blocks ${threat.name} (priority: ${threat.priority.toFixed(1)})`);
          } else if (threat.type === 'poetry' && match.name.includes('poetry') && match.ribbonColor === 'red') {
            matchScore += threat.priority * 2;
            matchReasoning.push(`blocks ${threat.name}`);
          } else if (threat.type === 'blue' && match.ribbonColor === 'blue') {
            matchScore += threat.priority * 2;
            matchReasoning.push(`blocks ${threat.name}`);
          } else if (threat.type === 'inoshikacho') {
            if ((threat.missingCards?.boar && match.name.includes('boar')) ||
                (threat.missingCards?.deer && match.name.includes('deer')) ||
                (threat.missingCards?.butterflies && match.name.includes('butterflies'))) {
              matchScore += threat.priority * 2;
              matchReasoning.push(`blocks ${threat.name}`);
            }
          } else if (threat.type === 'viewing') {
            if (threat.missingCards?.sakeCup && match.name.includes('sake cup')) {
              matchScore += threat.priority * 2;
              matchReasoning.push(`blocks ${threat.name}`);
            } else if (threat.missingCards?.curtain && match.name.includes('curtain')) {
              matchScore += threat.priority * 2;
              matchReasoning.push(`blocks ${threat.name}`);
            } else if (threat.missingCards?.moon && match.name.includes('moon')) {
              matchScore += threat.priority * 2;
              matchReasoning.push(`blocks ${threat.name}`);
            }
          } else if (threat.type === 'ribbons' && match.type === CARD_TYPES.RIBBON) {
            matchScore += threat.priority * 0.5; // Lower priority for generic ribbons
            matchReasoning.push(`blocks ribbons`);
          } else if (threat.type === 'animals' && match.type === CARD_TYPES.ANIMAL) {
            matchScore += threat.priority * 0.5;
            matchReasoning.push(`blocks animals`);
          }
        }

        // Check if this advances AI's opportunities
        for (const opp of opportunities) {
          if (opp.canMatch) {
            if (opp.type === 'brights' && match.type === CARD_TYPES.BRIGHT) {
              matchScore += opp.priority;
              matchReasoning.push(`advances ${opp.name} (priority: ${opp.priority.toFixed(1)})`);
            } else if (opp.type === 'poetry' && match.name.includes('poetry') && match.ribbonColor === 'red') {
              matchScore += opp.priority;
              matchReasoning.push(`advances ${opp.name}`);
            } else if (opp.type === 'blue' && match.ribbonColor === 'blue') {
              matchScore += opp.priority;
              matchReasoning.push(`advances ${opp.name}`);
            } else if (opp.type === 'inoshikacho') {
              if (match.name.includes('boar') || match.name.includes('deer') || match.name.includes('butterflies')) {
                matchScore += opp.priority;
                matchReasoning.push(`advances ${opp.name}`);
              }
            } else if (opp.type === 'ribbons' && match.type === CARD_TYPES.RIBBON) {
              matchScore += opp.priority * 0.3;
              matchReasoning.push(`advances ribbons`);
            } else if (opp.type === 'animals' && match.type === CARD_TYPES.ANIMAL) {
              matchScore += opp.priority * 0.3;
              matchReasoning.push(`advances animals`);
            }
          }
        }

        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatch = { match, reasoning: matchReasoning };
        }
      }

      score = bestMatchScore;
      if (bestMatch) {
        reasoning.push(...bestMatch.reasoning);
      }

      return { card, score, reasoning: reasoning.join(', '), matches };
    });

    // Sort by score
    cardScores.sort((a, b) => b.score - a.score);

    // Return the best card
    return cardScores[0];
  }

  /**
   * Make a strategic koi-koi decision
   * @param {Array} yaku - Current yaku
   * @param {number} score - Current round score
   * @param {Array} captured - AI's captured cards
   * @param {Array} playerCaptured - Player's captured cards
   * @param {number} deckCount - Remaining cards in deck
   * @param {number} aiTotalScore - AI's total game score (default 0)
   * @param {number} playerTotalScore - Player's total game score (default 0)
   * @returns {boolean} true = koi-koi, false = shobu
   */
  static makeKoikoiDecision(yaku, score, captured, playerCaptured, deckCount, aiTotalScore = 0, playerTotalScore = 0) {
    // Calculate what the game score would be if we call shobu
    const potentialAIScore = aiTotalScore + score;
    const currentPlayerScore = playerTotalScore;
    const scoreMargin = potentialAIScore - currentPlayerScore;

    // Analyze threats from player
    const threats = this.analyzeThreats(playerCaptured, captured);
    const highestThreat = threats.length > 0 ? threats[0] : null;

    // Calculate threat level based on how close player is to scoring
    let threatLevel = 0;
    if (highestThreat) {
      // Threat level increases significantly when player needs only 1 card
      if (highestThreat.needed === 1) {
        threatLevel = highestThreat.points * 5; // Very dangerous
      } else if (highestThreat.needed === 2) {
        threatLevel = highestThreat.points * 2; // Dangerous
      } else {
        threatLevel = highestThreat.points; // Moderate threat
      }
    }

    // CRITICAL RISK ASSESSMENT: Consider the 2x multiplier penalty
    // If player scores after our koi-koi, they get 2x points and we get 0
    const riskOfContinuing = threatLevel * 2; // Potential points player could get with multiplier

    // Calculate probability that player completes their yaku
    // With each turn, player draws 2 cards (1 from hand, 1 from deck)
    // Remaining turns ≈ deckCount / 2 (rough estimate)
    const remainingTurns = Math.max(1, Math.ceil(deckCount / 2));

    let completionProbability = 0;
    if (highestThreat) {
      // Estimate based on cards needed and remaining turns
      // For chaff: 24 total, very common
      // For other types: fewer cards available
      const isChaff = highestThreat.type === 'chaff';
      const cardsNeeded = highestThreat.needed;

      if (cardsNeeded === 1) {
        // Need only 1 card
        if (isChaff) {
          // With 24 chaff total, very likely to draw one
          completionProbability = remainingTurns >= 4 ? 0.95 : Math.min(0.95, remainingTurns * 0.2);
        } else {
          // For specific cards (brights, animals, etc.), lower but still significant
          completionProbability = remainingTurns >= 3 ? 0.7 : Math.min(0.7, remainingTurns * 0.2);
        }
      } else if (cardsNeeded === 2) {
        // Need 2 cards
        if (isChaff) {
          completionProbability = remainingTurns >= 6 ? 0.8 : Math.min(0.8, remainingTurns * 0.12);
        } else {
          completionProbability = remainingTurns >= 5 ? 0.5 : Math.min(0.5, remainingTurns * 0.1);
        }
      } else {
        // Need 3+ cards - lower probability
        completionProbability = Math.min(0.3, remainingTurns * 0.05);
      }
    }

    // If we're behind in the game score, evaluate whether koi-koi is worth the risk
    if (potentialAIScore <= currentPlayerScore) {
      // We're losing if we call shobu now
      // BUT: if player has a high threat and is likely to complete it, calling koi-koi is very risky

      if (highestThreat && highestThreat.needed <= 2) {
        // Player is close to scoring - evaluate the risk
        const maxPlayerScore = currentPlayerScore + riskOfContinuing;
        const gapIfPlayerScores = maxPlayerScore - potentialAIScore;

        // If completion probability is high (>60%) and the risk is significant, call shobu
        if (completionProbability > 0.6) {
          if (gapIfPlayerScores > 10 || (highestThreat.needed === 1 && highestThreat.points >= 1)) {
            console.log(`Advanced AI: High risk detected - player needs ${highestThreat.needed} for ${highestThreat.name} (${highestThreat.points} pts)`);
            console.log(`Advanced AI: Completion probability: ${(completionProbability * 100).toFixed(0)}% with ${remainingTurns} turns left`);
            console.log(`Advanced AI: Calling shobu to avoid 2x penalty (AI: ${potentialAIScore} vs Player: ${currentPlayerScore})`);
            return false; // Too risky to continue
          }
        }
      }

      // Low/moderate threat - continue playing to try to catch up
      console.log(`Advanced AI: Behind but threat is manageable - koi-koi (AI: ${potentialAIScore} vs Player: ${currentPlayerScore})`);
      return true;
    }

    // We would win by calling shobu - evaluate if it's worth the risk to continue

    // If we have a comfortable lead (5+ points), take the win
    if (scoreMargin >= 5 && score >= 4) {
      console.log(`Advanced AI: Calling shobu with comfortable lead (margin: ${scoreMargin})`);
      return Math.random() < 0.15; // 15% koi-koi, mostly take the win
    }

    // Basic safety: if round score is very high, take the win
    if (score >= 10 && scoreMargin >= 3) {
      return Math.random() < 0.1; // 10% koi-koi
    }

    // If player has a high-priority threat (needs 1-2 cards), consider probability
    if (highestThreat && highestThreat.needed <= 2) {
      // High completion probability (>60%) means we should be very conservative
      if (completionProbability > 0.6) {
        console.log(`Advanced AI: Player close to ${highestThreat.name} (needs ${highestThreat.needed}, ${(completionProbability * 100).toFixed(0)}% likely)`);
        console.log(`Advanced AI: Calling shobu to avoid risk (score: ${score}, margin: ${scoreMargin})`);

        // Only koi-koi if we have a very strong position
        if (score >= 8 && scoreMargin >= 10) {
          return Math.random() < 0.2; // 20% koi-koi with strong position
        }
        return false; // Too risky, call shobu
      } else if (completionProbability > 0.4) {
        // Moderate probability (40-60%) - be conservative with medium scores
        if (score >= 6 && scoreMargin < 10) {
          console.log(`Advanced AI: Moderate threat risk - calling shobu`);
          return Math.random() < 0.3; // 30% koi-koi
        } else if (score >= 3 && scoreMargin < 5) {
          console.log(`Advanced AI: High threat + narrow lead - calling shobu`);
          return false;
        }
      }
    }

    // Check if we have good opportunities
    const hasGoodOpportunity = yaku.some(y =>
      y.name.includes('Ribbons') || y.name.includes('Animals')
    );

    // If deck is running low and we have a lead, take it
    if (deckCount < 10 && score >= 4 && scoreMargin >= 2) {
      return Math.random() < 0.3; // 30% koi-koi
    }

    // If we only have a small lead (1-3 points) and low threat, be more aggressive
    if (scoreMargin <= 3 && score >= 3 && (!highestThreat || highestThreat.needed > 2)) {
      return Math.random() < 0.6; // 60% koi-koi, try to build lead
    }

    // Score-based probability with some strategic adjustments
    if (score >= 7) {
      return Math.random() < 0.25; // 25% koi-koi
    } else if (score >= 4) {
      return hasGoodOpportunity ? Math.random() < 0.6 : Math.random() < 0.4;
    } else {
      // Low score - be aggressive only if threat is low
      const koikoiProbability = highestThreat && highestThreat.needed <= 2 ? 0.4 : 0.8;
      return Math.random() < koikoiProbability;
    }
  }
}
