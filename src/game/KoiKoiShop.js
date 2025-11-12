/**
 * KoiKoiShop - Shop mode variant of Koi-Koi with custom win conditions
 * Player selects cards from a shop before the game starts
 * Must achieve their selected win condition to win
 */

import { KoiKoi } from './KoiKoi.js';
import { Deck } from './Deck.js';
import { Yaku } from './Yaku.js';
import { CARD_TYPES } from '../data/cards.js';

/**
 * Available win conditions with difficulty ratings
 */
export const WIN_CONDITIONS = {
  // EASY Win Conditions (★☆☆)
  EASY_ANIMAL_OR_RIBBON: {
    id: 'easy_animal_or_ribbon',
    name: 'Any Animal or Ribbon Yaku',
    description: 'Complete any animal yaku (5+ animals) or ribbon yaku (5+ ribbons)',
    difficulty: 1,
    stars: '★☆☆'
  },
  EASY_FIVE_ANIMALS: {
    id: 'easy_five_animals',
    name: 'Animal Collector',
    description: 'Collect 5 or more animal cards',
    difficulty: 1,
    stars: '★☆☆'
  },
  EASY_FIVE_RIBBONS: {
    id: 'easy_five_ribbons',
    name: 'Ribbon Collector',
    description: 'Collect 5 or more ribbon cards',
    difficulty: 1,
    stars: '★☆☆'
  },
  EASY_ANY_SPECIAL: {
    id: 'easy_any_special',
    name: 'Special Yaku',
    description: 'Complete any special yaku (Poetry Ribbons, Blue Ribbons, or Boar-Deer-Butterfly)',
    difficulty: 1,
    stars: '★☆☆'
  },
  EASY_TEN_CHAFF: {
    id: 'easy_ten_chaff',
    name: 'Chaff Master',
    description: 'Collect 10 or more chaff cards',
    difficulty: 1,
    stars: '★☆☆'
  },
  EASY_ANY_SAKE: {
    id: 'easy_any_sake',
    name: 'Sake Enthusiast',
    description: 'Complete either Viewing Sake or Moon Viewing Sake',
    difficulty: 1,
    stars: '★☆☆'
  },

  // MEDIUM Win Conditions (★★☆)
  MEDIUM_THREE_MONTHS: {
    id: 'medium_three_months',
    name: 'Three Complete Months',
    description: 'Collect all 4 cards for any 3 different months',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_POETRY_RIBBONS: {
    id: 'medium_poetry_ribbons',
    name: 'Poetry Master',
    description: 'Complete the Poetry Ribbons yaku (3 red poetry ribbons)',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_BLUE_RIBBONS: {
    id: 'medium_blue_ribbons',
    name: 'Blue Collector',
    description: 'Complete the Blue Ribbons yaku (3 blue ribbons)',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_BOAR_DEER_BUTTERFLY: {
    id: 'medium_boar_deer_butterfly',
    name: 'Ino-Shika-Cho',
    description: 'Complete the Boar-Deer-Butterfly yaku',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_BOTH_SAKE: {
    id: 'medium_both_sake',
    name: 'Double Sake',
    description: 'Complete both Viewing Sake and Moon Viewing Sake',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_SEVEN_ANIMALS: {
    id: 'medium_seven_animals',
    name: 'Animal Hoarder',
    description: 'Collect 7 or more animal cards',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_SEVEN_RIBBONS: {
    id: 'medium_seven_ribbons',
    name: 'Ribbon Hoarder',
    description: 'Collect 7 or more ribbon cards',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_TWO_BRIGHTS: {
    id: 'medium_two_brights',
    name: 'Double Bright',
    description: 'Collect any 2 bright cards',
    difficulty: 2,
    stars: '★★☆'
  },

  // HARD Win Conditions (★★★)
  HARD_BLOCK_OPPONENT: {
    id: 'hard_block_opponent',
    name: 'Perfect Defense',
    description: 'Do not let the opponent complete any yaku (excluding sake cup yaku)',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_THREE_BRIGHTS: {
    id: 'hard_three_brights',
    name: 'Three Brights',
    description: 'Complete the Three Brights yaku (3 brights excluding rain man)',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_FOUR_MONTHS: {
    id: 'hard_four_months',
    name: 'Four Complete Months',
    description: 'Collect all 4 cards for any 4 different months',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_ALL_RIBBONS: {
    id: 'hard_all_ribbons',
    name: 'Ribbon Monopoly',
    description: 'Collect all 10 ribbon cards',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_NINE_ANIMALS: {
    id: 'hard_nine_animals',
    name: 'Animal Kingdom',
    description: 'Collect 9 or more animal cards',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_TWO_SPECIAL_YAKU: {
    id: 'hard_two_special_yaku',
    name: 'Double Special',
    description: 'Complete any 2 of: Poetry Ribbons, Blue Ribbons, or Boar-Deer-Butterfly',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_FIFTEEN_CHAFF: {
    id: 'hard_fifteen_chaff',
    name: 'Chaff Monopoly',
    description: 'Collect 15 or more chaff cards',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_SPEED_RUN: {
    id: 'hard_speed_run',
    name: 'Speed Demon',
    description: 'Win with any yaku before 10 cards remain in the deck',
    difficulty: 3,
    stars: '★★★'
  }
};

export class KoiKoiShop extends KoiKoi {
  constructor(gameOptions = null) {
    super(gameOptions);

    // Shop-specific state
    this.selectedWinCondition = null;
    this.shopCards = []; // The 4 cards selected from the shop
    this.isShopMode = true;
  }

  /**
   * Start a new shop game with selected cards and bonus chance
   */
  startShopGame(selectedCards, winCondition) {
    this.shopCards = selectedCards;
    this.selectedWinCondition = winCondition;
    this.bonusAwarded = false; // Track if bonus has been awarded

    // Always 1 round in shop mode
    this.totalRounds = 1;
    this.currentRound = 1;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.firstPlayerThisGame = null;

    this.resetWithCustomHand();
  }

  /**
   * Reset game state with custom starting hand
   */
  resetWithCustomHand() {
    this.deck.reset();
    this.field = [];
    this.playerCaptured = [];
    this.opponentCaptured = [];
    this.playerYaku = [];
    this.opponentYaku = [];

    // Reset koi-koi state
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

    this.previousPlayerYaku = [];
    this.previousOpponentYaku = [];
    this.turnStartYaku = {
      player: [],
      opponent: []
    };

    this.selectedCard = null;
    this.fieldMatchingCard = null;
    this.matches = [];
    this.selectedMatch = null;
    this.gameOver = false;
    this.gameOverMessage = '';
    this.playerTurn = true; // Player goes first in shop mode

    this.dealWithCustomHand();
  }

  /**
   * Deal cards with custom player starting hand
   */
  dealWithCustomHand() {
    // IMPORTANT: Remove shop cards from deck FIRST before dealing anything
    // This prevents the shop cards from appearing in the field or opponent's hand
    this.shopCards.forEach(shopCard => {
      const index = this.deck.cards.findIndex(c => c.id === shopCard.id);
      if (index !== -1) {
        this.deck.cards.splice(index, 1);
      }
    });

    // Create player hand FIRST: 4 shop cards + 4 random cards
    this.playerHand = [...this.shopCards];
    const randomCards = this.deck.drawMultiple(4);
    this.playerHand.push(...randomCards);

    // Deal 8 cards to opponent hand
    this.opponentHand = this.deck.drawMultiple(8);

    // Deal 8 cards to field LAST (traditional Hanafuda order)
    this.field = this.deck.drawMultiple(8);

    // Debug: verify player hand size
    console.log(`[SHOP] Player hand initialized with ${this.playerHand.length} cards:`,
                this.playerHand.map(c => c.name));

    // Check for Four of a Kind (instant win condition)
    this.checkFourOfAKind();

    // Set initial phase
    this.phase = this.playerTurn ? 'select_hand' : 'opponentTurn';
  }

  /**
   * Check if a card type exists in a list
   */
  checkFourOfAKind() {
    const fieldMonths = this.field.map(c => c.month);
    const monthCounts = {};

    fieldMonths.forEach(month => {
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    // If any month appears 4 times on the field, it's a lucky hand
    for (const month in monthCounts) {
      if (monthCounts[month] === 4) {
        this.gameOver = true;
        this.gameOverMessage = `Four of a Kind! Automatic draw.`;
        return true;
      }
    }
    return false;
  }

  /**
   * Check if player has achieved their win condition
   */
  checkPlayerWinCondition() {
    if (!this.selectedWinCondition) {
      console.log('[WIN CONDITION] No win condition selected');
      return false;
    }

    const id = this.selectedWinCondition.id;
    console.log(`[WIN CONDITION] Checking: ${this.selectedWinCondition.name} (${id})`);

    let result = false;

    // Easy conditions
    if (id === 'easy_animal_or_ribbon') {
      result = this.checkAnimalOrRibbonYaku();
      console.log(`[WIN CONDITION] easy_animal_or_ribbon: ${result}`);
    } else if (id === 'easy_five_animals') {
      const count = this.countCardsByType(CARD_TYPES.ANIMAL);
      result = count >= 5;
      console.log(`[WIN CONDITION] easy_five_animals: ${count}/5 - ${result}`);
    } else if (id === 'easy_five_ribbons') {
      const count = this.countCardsByType(CARD_TYPES.RIBBON);
      result = count >= 5;
      console.log(`[WIN CONDITION] easy_five_ribbons: ${count}/5 - ${result}`);
    } else if (id === 'easy_any_special') {
      result = this.checkAnySpecialYaku();
      console.log(`[WIN CONDITION] easy_any_special: ${result}`);
    } else if (id === 'easy_ten_chaff') {
      const count = this.countCardsByType(CARD_TYPES.CHAFF);
      result = count >= 10;
      console.log(`[WIN CONDITION] easy_ten_chaff: ${count}/10 - ${result}`);
    } else if (id === 'easy_any_sake') {
      result = this.checkAnySakeYaku();
      console.log(`[WIN CONDITION] easy_any_sake: ${result}`);
    }
    // Medium conditions
    else if (id === 'medium_three_months') {
      result = this.checkCompleteMonths(3);
    } else if (id === 'medium_poetry_ribbons') {
      result = this.checkSpecificYaku('Poetry Ribbons');
      console.log(`[WIN CONDITION] medium_poetry_ribbons: ${result}`);
    } else if (id === 'medium_blue_ribbons') {
      result = this.checkSpecificYaku('Blue Ribbons');
      console.log(`[WIN CONDITION] medium_blue_ribbons: ${result}`);
    } else if (id === 'medium_boar_deer_butterfly') {
      result = this.checkSpecificYaku('Boar-Deer-Butterfly');
      console.log(`[WIN CONDITION] medium_boar_deer_butterfly: ${result}`);
    } else if (id === 'medium_both_sake') {
      result = this.checkBothSakeYaku();
      console.log(`[WIN CONDITION] medium_both_sake: ${result}`);
    } else if (id === 'medium_seven_animals') {
      const count = this.countCardsByType(CARD_TYPES.ANIMAL);
      result = count >= 7;
      console.log(`[WIN CONDITION] medium_seven_animals: ${count}/7 - ${result}`);
    } else if (id === 'medium_seven_ribbons') {
      const count = this.countCardsByType(CARD_TYPES.RIBBON);
      result = count >= 7;
      console.log(`[WIN CONDITION] medium_seven_ribbons: ${count}/7 - ${result}`);
    } else if (id === 'medium_two_brights') {
      const count = this.countCardsByType(CARD_TYPES.BRIGHT);
      result = count >= 2;
      console.log(`[WIN CONDITION] medium_two_brights: ${count}/2 - ${result}`);
    }
    // Hard conditions
    else if (id === 'hard_block_opponent') {
      result = this.checkOpponentBlocked();
      console.log(`[WIN CONDITION] hard_block_opponent: ${result}`);
    } else if (id === 'hard_three_brights') {
      result = this.checkSpecificYaku('Three Brights');
      console.log(`[WIN CONDITION] hard_three_brights: ${result}`);
    } else if (id === 'hard_four_months') {
      result = this.checkCompleteMonths(4);
    } else if (id === 'hard_all_ribbons') {
      const count = this.countCardsByType(CARD_TYPES.RIBBON);
      result = count >= 10;
      console.log(`[WIN CONDITION] hard_all_ribbons: ${count}/10 - ${result}`);
    } else if (id === 'hard_nine_animals') {
      const count = this.countCardsByType(CARD_TYPES.ANIMAL);
      result = count >= 9;
      console.log(`[WIN CONDITION] hard_nine_animals: ${count}/9 - ${result}`);
    } else if (id === 'hard_two_special_yaku') {
      result = this.checkTwoSpecialYaku();
      console.log(`[WIN CONDITION] hard_two_special_yaku: ${result}`);
    } else if (id === 'hard_fifteen_chaff') {
      const count = this.countCardsByType(CARD_TYPES.CHAFF);
      result = count >= 15;
      console.log(`[WIN CONDITION] hard_fifteen_chaff: ${count}/15 - ${result}`);
    } else if (id === 'hard_speed_run') {
      result = this.checkSpeedRun();
      console.log(`[WIN CONDITION] hard_speed_run: ${result}, deck size: ${this.deck.cards.length}`);
    }

    console.log(`[WIN CONDITION] Final result: ${result}`);
    return result;
  }

  /**
   * Count player's captured cards by type
   */
  countCardsByType(type) {
    return this.playerCaptured.filter(card => card.type === type).length;
  }

  /**
   * Check if player has any animal or ribbon yaku
   */
  checkAnimalOrRibbonYaku() {
    const yaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);

    // Check for animal yaku (5+ animals)
    const animalYaku = yaku.find(y => y.name === 'Animals');
    if (animalYaku) return true;

    // Check for ribbon yaku (5+ ribbons)
    const ribbonYaku = yaku.find(y => y.name === 'Ribbons');
    if (ribbonYaku) return true;

    // Also check special ribbon yaku
    const poetryRibbons = yaku.find(y => y.name === 'Poetry Ribbons');
    if (poetryRibbons) return true;

    const blueRibbons = yaku.find(y => y.name === 'Blue Ribbons');
    if (blueRibbons) return true;

    return false;
  }

  /**
   * Check if player has all 4 cards for N different months
   */
  checkCompleteMonths(requiredMonths) {
    const monthCounts = {};

    this.playerCaptured.forEach(card => {
      monthCounts[card.month] = (monthCounts[card.month] || 0) + 1;
    });

    // Count how many months have all 4 cards
    let completeMonths = 0;
    const completeMonthsList = [];
    for (const month in monthCounts) {
      if (monthCounts[month] === 4) {
        completeMonths++;
        completeMonthsList.push(month);
      }
    }

    console.log(`[WIN CONDITION] checkCompleteMonths(${requiredMonths}): ${completeMonths} complete months found`);
    console.log('[WIN CONDITION] Month counts:', monthCounts);
    console.log('[WIN CONDITION] Complete months:', completeMonthsList);
    console.log('[WIN CONDITION] Player captured cards:', this.playerCaptured.map(c => `${c.name} (${c.month})`).join(', '));

    const result = completeMonths >= requiredMonths;
    console.log(`[WIN CONDITION] ${completeMonths}/${requiredMonths} complete months - ${result}`);
    return result;
  }

  /**
   * Check if player has a specific yaku by name
   */
  checkSpecificYaku(yakuName) {
    const yaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    return yaku.some(y => y.name === yakuName);
  }

  /**
   * Check if player has any special yaku
   */
  checkAnySpecialYaku() {
    const yaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    const specialYaku = ['Poetry Ribbons', 'Blue Ribbons', 'Boar-Deer-Butterfly'];
    return yaku.some(y => specialYaku.includes(y.name));
  }

  /**
   * Check if player has any sake yaku
   */
  checkAnySakeYaku() {
    const yaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    return yaku.some(y => y.name === 'Viewing Sake' || y.name === 'Moon Viewing Sake');
  }

  /**
   * Check if player has both sake yaku
   */
  checkBothSakeYaku() {
    const yaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    const hasViewingSake = yaku.some(y => y.name === 'Viewing Sake');
    const hasMoonViewingSake = yaku.some(y => y.name === 'Moon Viewing Sake');
    return hasViewingSake && hasMoonViewingSake;
  }

  /**
   * Check if player has two special yaku
   */
  checkTwoSpecialYaku() {
    const yaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    const specialYaku = ['Poetry Ribbons', 'Blue Ribbons', 'Boar-Deer-Butterfly'];
    const completedSpecial = yaku.filter(y => specialYaku.includes(y.name));
    return completedSpecial.length >= 2;
  }

  /**
   * Check if player won with any yaku before 10 cards remain in deck
   */
  checkSpeedRun() {
    // Must complete BEFORE 10 cards remain (i.e., when deck has < 10 cards)
    if (this.deck.cards.length < 10) {
      const yaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
      return yaku.length > 0;
    }
    return false;
  }

  /**
   * Check if opponent has been blocked from all yaku (except sake cup)
   */
  checkOpponentBlocked() {
    const yaku = Yaku.checkYaku(this.opponentCaptured, this.gameOptions);

    // Filter out sake cup yaku (Viewing Sake and Moon Viewing Sake)
    const nonSakeYaku = yaku.filter(y =>
      y.name !== 'Viewing Sake' && y.name !== 'Moon Viewing Sake'
    );

    // If opponent has any non-sake yaku, player fails this condition
    return nonSakeYaku.length === 0;
  }

  /**
   * Override end of turn to check bonus chances and award bonus points
   */
  endTurn() {
    console.log('[SHOP] endTurn() called - checking bonus chance');

    // Check if player achieved their bonus chance and hasn't been awarded yet
    if (!this.bonusAwarded && this.checkPlayerWinCondition()) {
      this.bonusAwarded = true;

      // Award bonus points based on difficulty
      const bonusPoints = this.selectedWinCondition.difficulty === 1 ? 3 :
                         this.selectedWinCondition.difficulty === 2 ? 6 : 10;

      this.playerScore += bonusPoints;
      this.message = `Bonus achieved! +${bonusPoints} points for: ${this.selectedWinCondition.name}`;
      console.log(`[SHOP] BONUS ACHIEVED! Awarded ${bonusPoints} points. New score: ${this.playerScore}`);
    }

    // Check if deck is empty and both hands are empty (game over)
    if (this.deck.cards.length === 0 && this.playerHand.length === 0 && this.opponentHand.length === 0) {
      console.log('[SHOP] Game over - deck and hands empty');
      this.endShopGame();
      return;
    }

    // Continue with normal turn logic (no koi-koi decisions in shop mode)
    super.endTurn();
  }

  /**
   * End the shop game and trigger round summary with score comparison
   */
  endShopGame() {
    console.log(`[SHOP] endShopGame called`);
    console.log(`[SHOP] Final scores - Player: ${this.playerScore}, Opponent: ${this.opponentScore}`);
    console.log(`[SHOP] Bonus achieved: ${this.bonusAwarded}`);

    const playerYaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    const opponentYaku = Yaku.checkYaku(this.opponentCaptured, this.gameOptions);

    // Calculate round scores from yaku
    const playerYakuScore = Yaku.calculateScore(playerYaku);
    const opponentYakuScore = Yaku.calculateScore(opponentYaku);

    // Determine message
    let shopMessage = '';
    if (this.bonusAwarded) {
      const bonusPoints = this.selectedWinCondition.difficulty === 1 ? 3 :
                         this.selectedWinCondition.difficulty === 2 ? 6 : 10;
      shopMessage = `Bonus achieved! +${bonusPoints} points for: ${this.selectedWinCondition.name}`;
    } else {
      shopMessage = `Bonus chance not achieved: ${this.selectedWinCondition.name}`;
    }

    // Create round summary data for shop mode
    const roundSummaryData = {
      roundNumber: 1,
      playerRoundScore: playerYakuScore,
      opponentRoundScore: opponentYakuScore,
      playerTotalScore: this.playerScore,
      opponentTotalScore: this.opponentScore,
      playerYaku: playerYaku,
      opponentYaku: opponentYaku,
      playerScoreBreakdown: {
        baseScore: playerYakuScore,
        koikoiPenalty: false,
        autoDouble: false,
        koikoiMultiplier: 0,
        finalScore: this.playerScore
      },
      opponentScoreBreakdown: {
        baseScore: opponentYakuScore,
        koikoiPenalty: false,
        autoDouble: false,
        koikoiMultiplier: 0,
        finalScore: this.opponentScore
      },
      isGameOver: true,
      totalRounds: 1,
      shopMode: true,
      bonusChance: this.selectedWinCondition,
      bonusAwarded: this.bonusAwarded,
      shopMessage: shopMessage
    };

    // Call the round summary callback
    if (this.roundSummaryCallback) {
      console.log('[SHOP] Calling roundSummaryCallback');
      this.roundSummaryCallback(roundSummaryData);
    } else {
      console.warn('[SHOP] No roundSummaryCallback set!');
    }
  }

  /**
   * Override to skip yaku messages and koi-koi decisions in shop mode
   */
  updateYaku(player, deferDecision = false) {
    // In shop mode, silently update yaku without showing traditional messages
    const captured = player === 'player' ? this.playerCaptured : this.opponentCaptured;
    const yaku = Yaku.checkYaku(captured, this.gameOptions);

    if (player === 'player') {
      this.playerYaku = yaku;
    } else {
      this.opponentYaku = yaku;
    }

    // Don't show traditional yaku messages - only win condition progress matters
    // Don't trigger koi-koi decisions
    return;
  }

  /**
   * Override to skip koi-koi decisions in shop mode
   */
  checkForKoikoiDecision(player) {
    // In shop mode, we don't use the koi-koi system
    // Just continue playing until win condition is met or deck runs out
    // Still update yaku for tracking purposes
    const captured = player === 'player' ? this.playerCaptured : this.opponentCaptured;
    const currentYaku = Yaku.checkYaku(captured, this.gameOptions);

    if (player === 'player') {
      this.playerYaku = currentYaku;
    } else {
      this.opponentYaku = currentYaku;
    }

    // Don't set waitingForDecision - just continue playing
    return;
  }

  /**
   * Get game state with shop-specific data
   */
  getState() {
    const state = super.getState();

    return {
      ...state,
      isShopMode: true,
      selectedWinCondition: this.selectedWinCondition,
      shopCards: this.shopCards
    };
  }
}
