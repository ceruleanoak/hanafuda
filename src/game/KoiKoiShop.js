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
   * Start a new shop game with selected cards and win condition
   */
  startShopGame(selectedCards, winCondition) {
    this.shopCards = selectedCards;
    this.selectedWinCondition = winCondition;

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
    if (!this.selectedWinCondition) return false;

    const id = this.selectedWinCondition.id;

    // Easy conditions
    if (id === 'easy_animal_or_ribbon') return this.checkAnimalOrRibbonYaku();
    if (id === 'easy_five_animals') return this.countCardsByType(CARD_TYPES.ANIMAL) >= 5;
    if (id === 'easy_five_ribbons') return this.countCardsByType(CARD_TYPES.RIBBON) >= 5;
    if (id === 'easy_any_special') return this.checkAnySpecialYaku();
    if (id === 'easy_ten_chaff') return this.countCardsByType(CARD_TYPES.CHAFF) >= 10;
    if (id === 'easy_any_sake') return this.checkAnySakeYaku();

    // Medium conditions
    if (id === 'medium_three_months') return this.checkCompleteMonths(3);
    if (id === 'medium_poetry_ribbons') return this.checkSpecificYaku('Poetry Ribbons');
    if (id === 'medium_blue_ribbons') return this.checkSpecificYaku('Blue Ribbons');
    if (id === 'medium_boar_deer_butterfly') return this.checkSpecificYaku('Boar-Deer-Butterfly');
    if (id === 'medium_both_sake') return this.checkBothSakeYaku();
    if (id === 'medium_seven_animals') return this.countCardsByType(CARD_TYPES.ANIMAL) >= 7;
    if (id === 'medium_seven_ribbons') return this.countCardsByType(CARD_TYPES.RIBBON) >= 7;
    if (id === 'medium_two_brights') return this.countCardsByType(CARD_TYPES.BRIGHT) >= 2;

    // Hard conditions
    if (id === 'hard_block_opponent') return this.checkOpponentBlocked();
    if (id === 'hard_three_brights') return this.checkSpecificYaku('Three Brights');
    if (id === 'hard_four_months') return this.checkCompleteMonths(4);
    if (id === 'hard_all_ribbons') return this.countCardsByType(CARD_TYPES.RIBBON) >= 10;
    if (id === 'hard_nine_animals') return this.countCardsByType(CARD_TYPES.ANIMAL) >= 9;
    if (id === 'hard_two_special_yaku') return this.checkTwoSpecialYaku();
    if (id === 'hard_fifteen_chaff') return this.countCardsByType(CARD_TYPES.CHAFF) >= 15;
    if (id === 'hard_speed_run') return this.checkSpeedRun();

    return false;
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
    for (const month in monthCounts) {
      if (monthCounts[month] === 4) {
        completeMonths++;
      }
    }

    return completeMonths >= requiredMonths;
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
   * Override end of turn to check win conditions instead of scores
   */
  endTurn() {
    // First check if player achieved their win condition
    if (this.checkPlayerWinCondition()) {
      this.gameOver = true;
      this.gameOverMessage = `Victory! You achieved: ${this.selectedWinCondition.name}`;
      return;
    }

    // For hard mode, check if opponent completed any non-sake yaku (instant loss)
    if (this.selectedWinCondition.id === 'hard_block_opponent') {
      const opponentYaku = Yaku.checkYaku(this.opponentCaptured, this.gameOptions);
      const nonSakeYaku = opponentYaku.filter(y =>
        y.name !== 'Viewing Sake' && y.name !== 'Moon Viewing Sake'
      );

      if (nonSakeYaku.length > 0) {
        this.gameOver = true;
        this.gameOverMessage = `Defeat! Opponent completed a yaku: ${nonSakeYaku[0].name}`;
        return;
      }
    }

    // Check if deck is empty and both hands are empty (game over)
    if (this.deck.cards.length === 0 && this.playerHand.length === 0 && this.opponentHand.length === 0) {
      // Player didn't achieve their win condition
      this.gameOver = true;
      this.gameOverMessage = `Defeat! Failed to achieve: ${this.selectedWinCondition.name}`;
      return;
    }

    // Continue with normal turn logic (no koi-koi decisions in shop mode)
    super.endTurn();
  }

  /**
   * Override to skip koi-koi decisions
   */
  checkForNewYaku(player) {
    // In shop mode, we don't use the koi-koi system
    // Just continue playing until win condition is met or deck runs out
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
