/**
 * KoiKoiShop - Shop mode variant of Koi-Koi with custom bonus chances
 * Player selects cards from a shop before the game starts
 * Must achieve their selected bonus chance to earn bonus points
 */

import { KoiKoi } from './KoiKoi.js';
import { Deck } from './Deck.js';
import { Yaku } from './Yaku.js';
import { CARD_TYPES } from '../data/cards.js';

/**
 * Available bonus chances with difficulty ratings
 * Balanced based on card availability through shop drafting system
 * (48 cards total: 5 brights, 9 animals, 10 ribbons, 24 chaff)
 */
export const WIN_CONDITIONS = {
  // EASY Bonus Chances (★☆☆) - Achievable with 2-3 key cards
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
  EASY_TWO_BRIGHTS: {
    id: 'easy_two_brights',
    name: 'Double Bright',
    description: 'Collect any 2 bright cards',
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
  EASY_FIVE_BIRDS: {
    id: 'easy_five_birds',
    name: 'Five Birds',
    description: 'Collect the cuckoo, geese, and bush warbler',
    difficulty: 1,
    stars: '★☆☆'
  },
  EASY_GRASS_RIBBONS: {
    id: 'easy_grass_ribbons',
    name: 'Grass Ribbons',
    description: 'Collect the ribbons for April, May, and July',
    difficulty: 1,
    stars: '★☆☆'
  },
  EASY_TWO_FOUR_OF_A_KINDS: {
    id: 'easy_two_four_of_a_kinds',
    name: 'Two Four-of-a-Kinds',
    description: 'Collect all 4 cards for any 2 different months',
    difficulty: 1,
    stars: '★☆☆'
  },

  // MEDIUM Bonus Chances (★★☆) - Need some luck in addition to key cards
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
    description: 'Collect 6 or more ribbon cards',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_TWELVE_CHAFF: {
    id: 'medium_twelve_chaff',
    name: 'Chaff Hoarder',
    description: 'Collect 12 or more chaff cards',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_TALES_OF_ISE: {
    id: 'medium_tales_of_ise',
    name: 'Tales of Ise',
    description: 'Collect the May animal (bridge), Rain Man, and sake cup',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_SUGAWARA: {
    id: 'medium_sugawara',
    name: 'Sugawara',
    description: 'Collect the January bright (crane), February animal (bush warbler), and March bright (curtain)',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_FLOWER_ENTHUSIAST: {
    id: 'medium_flower_enthusiast',
    name: 'Flower Enthusiast',
    description: 'Collect chaff from February, April, May, June, July, and December',
    difficulty: 2,
    stars: '★★☆'
  },
  MEDIUM_SIX_NOT_SEVEN: {
    id: 'medium_six_not_seven',
    name: 'Six, Not Seven',
    description: 'End round with exactly 6 points',
    difficulty: 2,
    stars: '★★☆'
  },

  // HARD Bonus Chances (★★★) - Need lots of luck and 3-4 right cards in hand
  HARD_BLOCK_OPPONENT: {
    id: 'hard_block_opponent',
    name: 'Perfect Defense',
    description: 'Do not let the opponent complete any yaku (excluding sake cup yaku)',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_THREE_BRIGHTS: {
    id: 'hard_three_brights',
    name: 'Triple Bright',
    description: 'Collect any 3 bright cards',
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
  HARD_EIGHT_RIBBONS: {
    id: 'hard_eight_ribbons',
    name: 'Ribbon Domination',
    description: 'Collect 7 or more ribbon cards',
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
  HARD_FOURTEEN_CHAFF: {
    id: 'hard_fourteen_chaff',
    name: 'Chaff Domination',
    description: 'Collect 14 or more chaff cards',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_SPEED_RUN: {
    id: 'hard_speed_run',
    name: 'Speed Demon',
    description: 'Win with any yaku before 10 cards remain in the deck',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_SEVEN_RED_RIBBONS: {
    id: 'hard_seven_red_ribbons',
    name: 'Seven Red Ribbons',
    description: 'Collect all poetry ribbons and all 4 plain red ribbons',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_HEART_OF_THE_CARDS: {
    id: 'hard_heart_of_the_cards',
    name: 'Heart of the Cards',
    description: 'Discard 6 cards to the field',
    difficulty: 3,
    stars: '★★★'
  },
  HARD_HITCHCOCK: {
    id: 'hard_hitchcock',
    name: 'Hitchcock',
    description: 'Collect no birds',
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
    this.playerFieldDiscards = 0; // Track cards player discarded to field
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
    this.playerFieldDiscards = 0; // Reset field discard counter

    // Determine who goes first (same logic as regular Koi Koi)
    if (!this.firstPlayerThisGame) {
      // First game: randomly choose (50/50)
      this.firstPlayerThisGame = Math.random() < 0.5 ? 'player' : 'opponent';
    }
    this.currentPlayer = this.firstPlayerThisGame;

    console.log(`[SHOP] ${this.currentPlayer} goes first`);

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

    // Check for Four of a Kind (instant draw)
    this.checkFourOfAKind();

    // Set initial phase and trigger first turn based on who goes first
    if (this.currentPlayer === 'player') {
      this.phase = 'select_hand';
      this.message = 'Select a card from your hand';
      console.log('[SHOP] Player\'s turn - waiting for card selection');
    } else {
      this.phase = 'opponentTurn';
      this.message = 'Opponent goes first...';
      console.log('[SHOP] Opponent goes first - triggering opponentTurn()');
      // Trigger opponent turn after short delay
      setTimeout(() => this.opponentTurn(), 400);
    }
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
   * Check if player has achieved their bonus chance
   */
  checkPlayerWinCondition() {
    if (!this.selectedWinCondition) {
      console.log('[BONUS CHANCE] No bonus chance selected');
      return false;
    }

    const id = this.selectedWinCondition.id;
    console.log(`[BONUS CHANCE] Checking: ${this.selectedWinCondition.name} (${id})`);

    let result = false;

    // Easy conditions
    if (id === 'easy_animal_or_ribbon') {
      result = this.checkAnimalOrRibbonYaku();
      console.log(`[BONUS CHANCE] easy_animal_or_ribbon: ${result}`);
    } else if (id === 'easy_five_animals') {
      const count = this.countCardsByType(CARD_TYPES.ANIMAL);
      result = count >= 5;
      console.log(`[BONUS CHANCE] easy_five_animals: ${count}/5 - ${result}`);
    } else if (id === 'easy_five_ribbons') {
      const count = this.countCardsByType(CARD_TYPES.RIBBON);
      result = count >= 5;
      console.log(`[BONUS CHANCE] easy_five_ribbons: ${count}/5 - ${result}`);
    } else if (id === 'easy_two_brights') {
      const count = this.countCardsByType(CARD_TYPES.BRIGHT);
      result = count >= 2;
      console.log(`[BONUS CHANCE] easy_two_brights: ${count}/2 - ${result}`);
    } else if (id === 'easy_any_special') {
      result = this.checkAnySpecialYaku();
      console.log(`[BONUS CHANCE] easy_any_special: ${result}`);
    } else if (id === 'easy_ten_chaff') {
      const count = this.countCardsByType(CARD_TYPES.CHAFF);
      result = count >= 10;
      console.log(`[BONUS CHANCE] easy_ten_chaff: ${count}/10 - ${result}`);
    } else if (id === 'easy_any_sake') {
      result = this.checkAnySakeYaku();
      console.log(`[BONUS CHANCE] easy_any_sake: ${result}`);
    } else if (id === 'easy_five_birds') {
      result = this.checkFiveBirds();
      console.log(`[BONUS CHANCE] easy_five_birds: ${result}`);
    } else if (id === 'easy_grass_ribbons') {
      result = this.checkGrassRibbons();
      console.log(`[BONUS CHANCE] easy_grass_ribbons: ${result}`);
    } else if (id === 'easy_two_four_of_a_kinds') {
      result = this.checkCompleteMonths(2);
      console.log(`[BONUS CHANCE] easy_two_four_of_a_kinds: ${result}`);
    }
    // Medium conditions
    else if (id === 'medium_three_months') {
      result = this.checkCompleteMonths(3);
    } else if (id === 'medium_poetry_ribbons') {
      result = this.checkSpecificYaku('Poetry Ribbons');
      console.log(`[BONUS CHANCE] medium_poetry_ribbons: ${result}`);
    } else if (id === 'medium_blue_ribbons') {
      result = this.checkSpecificYaku('Blue Ribbons');
      console.log(`[BONUS CHANCE] medium_blue_ribbons: ${result}`);
    } else if (id === 'medium_boar_deer_butterfly') {
      result = this.checkSpecificYaku('Boar-Deer-Butterfly');
      console.log(`[BONUS CHANCE] medium_boar_deer_butterfly: ${result}`);
    } else if (id === 'medium_both_sake') {
      result = this.checkBothSakeYaku();
      console.log(`[BONUS CHANCE] medium_both_sake: ${result}`);
    } else if (id === 'medium_seven_animals') {
      const count = this.countCardsByType(CARD_TYPES.ANIMAL);
      result = count >= 7;
      console.log(`[BONUS CHANCE] medium_seven_animals: ${count}/7 - ${result}`);
    } else if (id === 'medium_seven_ribbons') {
      const count = this.countCardsByType(CARD_TYPES.RIBBON);
      result = count >= 6;
      console.log(`[BONUS CHANCE] medium_seven_ribbons: ${count}/6 - ${result}`);
    } else if (id === 'medium_twelve_chaff') {
      const count = this.countCardsByType(CARD_TYPES.CHAFF);
      result = count >= 12;
      console.log(`[BONUS CHANCE] medium_twelve_chaff: ${count}/12 - ${result}`);
    } else if (id === 'medium_tales_of_ise') {
      result = this.checkTalesOfIse();
      console.log(`[BONUS CHANCE] medium_tales_of_ise: ${result}`);
    } else if (id === 'medium_sugawara') {
      result = this.checkSugawara();
      console.log(`[BONUS CHANCE] medium_sugawara: ${result}`);
    } else if (id === 'medium_flower_enthusiast') {
      result = this.checkFlowerEnthusiast();
      console.log(`[BONUS CHANCE] medium_flower_enthusiast: ${result}`);
    } else if (id === 'medium_six_not_seven') {
      // Six, Not Seven is checked at round end only, not during play
      result = false;
      console.log(`[BONUS CHANCE] medium_six_not_seven: deferred to round end`);
    }
    // Hard conditions
    else if (id === 'hard_block_opponent') {
      result = this.checkOpponentBlocked();
      console.log(`[BONUS CHANCE] hard_block_opponent: ${result}`);
    } else if (id === 'hard_three_brights') {
      const count = this.countCardsByType(CARD_TYPES.BRIGHT);
      result = count >= 3;
      console.log(`[BONUS CHANCE] hard_three_brights: ${count}/3 - ${result}`);
    } else if (id === 'hard_four_months') {
      result = this.checkCompleteMonths(4);
    } else if (id === 'hard_eight_ribbons') {
      const count = this.countCardsByType(CARD_TYPES.RIBBON);
      result = count >= 7;
      console.log(`[BONUS CHANCE] hard_eight_ribbons: ${count}/7 - ${result}`);
    } else if (id === 'hard_two_special_yaku') {
      result = this.checkTwoSpecialYaku();
      console.log(`[BONUS CHANCE] hard_two_special_yaku: ${result}`);
    } else if (id === 'hard_fourteen_chaff') {
      const count = this.countCardsByType(CARD_TYPES.CHAFF);
      result = count >= 14;
      console.log(`[BONUS CHANCE] hard_fourteen_chaff: ${count}/14 - ${result}`);
    } else if (id === 'hard_speed_run') {
      result = this.checkSpeedRun();
      console.log(`[BONUS CHANCE] hard_speed_run: ${result}, deck size: ${this.deck.cards.length}`);
    } else if (id === 'hard_seven_red_ribbons') {
      result = this.checkSevenRedRibbons();
      console.log(`[BONUS CHANCE] hard_seven_red_ribbons: ${result}`);
    } else if (id === 'hard_heart_of_the_cards') {
      result = this.checkHeartOfTheCards();
      console.log(`[BONUS CHANCE] hard_heart_of_the_cards: ${result}`);
    } else if (id === 'hard_hitchcock') {
      // Hitchcock is checked at round end only, not during play
      result = false;
      console.log(`[BONUS CHANCE] hard_hitchcock: deferred to round end`);
    }

    console.log(`[BONUS CHANCE] Final result: ${result}`);
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

    console.log(`[BONUS CHANCE] checkCompleteMonths(${requiredMonths}): ${completeMonths} complete months found`);
    console.log('[BONUS CHANCE] Month counts:', monthCounts);
    console.log('[BONUS CHANCE] Complete months:', completeMonthsList);
    console.log('[BONUS CHANCE] Player captured cards:', this.playerCaptured.map(c => `${c.name} (${c.month})`).join(', '));

    const result = completeMonths >= requiredMonths;
    console.log(`[BONUS CHANCE] ${completeMonths}/${requiredMonths} complete months - ${result}`);
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
   * Check if player has the three bird cards: cuckoo, geese, and bush warbler
   */
  checkFiveBirds() {
    const hasCuckoo = this.playerCaptured.some(card => card.name.includes('cuckoo'));
    const hasGeese = this.playerCaptured.some(card => card.name.includes('geese'));
    const hasBushWarbler = this.playerCaptured.some(card => card.name.includes('bush warbler'));
    return hasCuckoo && hasGeese && hasBushWarbler;
  }

  /**
   * Check if player has the ribbons for April, May, and July
   */
  checkGrassRibbons() {
    const hasAprilRibbon = this.playerCaptured.some(card =>
      card.month === 'April' && card.type === CARD_TYPES.RIBBON
    );
    const hasMayRibbon = this.playerCaptured.some(card =>
      card.month === 'May' && card.type === CARD_TYPES.RIBBON
    );
    const hasJulyRibbon = this.playerCaptured.some(card =>
      card.month === 'July' && card.type === CARD_TYPES.RIBBON
    );
    return hasAprilRibbon && hasMayRibbon && hasJulyRibbon;
  }

  /**
   * Check if player has the May animal (bridge), Rain Man, and sake cup
   */
  checkTalesOfIse() {
    const hasMayAnimal = this.playerCaptured.some(card => card.name.includes('May - animal'));
    const hasRainMan = this.playerCaptured.some(card => card.name.includes('rain man'));
    const hasSakeCup = this.playerCaptured.some(card => card.name.includes('sake cup'));
    return hasMayAnimal && hasRainMan && hasSakeCup;
  }

  /**
   * Check if player has January bright (crane), February animal (bush warbler), and March bright (curtain)
   */
  checkSugawara() {
    const hasJanuaryBright = this.playerCaptured.some(card => card.name.includes('January - bright'));
    const hasFebruaryAnimal = this.playerCaptured.some(card => card.name.includes('February - animal'));
    const hasMarchBright = this.playerCaptured.some(card => card.name.includes('March - bright'));
    return hasJanuaryBright && hasFebruaryAnimal && hasMarchBright;
  }

  /**
   * Check if player has chaff from February, April, May, June, July, and December
   */
  checkFlowerEnthusiast() {
    const requiredMonths = ['February', 'April', 'May', 'June', 'July', 'December'];
    return requiredMonths.every(month =>
      this.playerCaptured.some(card => card.month === month && card.type === CARD_TYPES.CHAFF)
    );
  }

  /**
   * Check if player has all seven red ribbons (3 poetry + 4 plain red)
   */
  checkSevenRedRibbons() {
    const redRibbons = this.playerCaptured.filter(card =>
      card.type === CARD_TYPES.RIBBON && card.ribbonColor === 'red'
    );
    // Need all 7 red ribbons: 3 poetry (Jan, Feb, Mar) + 4 plain (Apr, May, Jul, Nov)
    return redRibbons.length >= 7;
  }

  /**
   * Override autoMatchCard to track field discards
   */
  autoMatchCard(card) {
    const fieldBefore = this.field.length;
    const result = super.autoMatchCard(card);

    // If field grew by 1, player discarded a card to field
    if (result && this.field.length === fieldBefore + 1) {
      this.playerFieldDiscards++;
      console.log(`[SHOP] Player field discards: ${this.playerFieldDiscards}`);
    }

    return result;
  }

  /**
   * Override placeCardOnField to track field discards (manual selection)
   */
  placeCardOnField() {
    const fieldBefore = this.field.length;
    super.placeCardOnField();

    // If field grew by 1, player discarded a card to field
    if (this.field.length === fieldBefore + 1) {
      this.playerFieldDiscards++;
      console.log(`[SHOP] Player field discards: ${this.playerFieldDiscards}`);
    }
  }

  /**
   * Check if player has exactly 6 points from yaku
   */
  checkSixNotSeven() {
    const yaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    const score = Yaku.calculateScore(yaku);
    return score === 6;
  }

  /**
   * Check if player has discarded 6 cards to the field
   */
  checkHeartOfTheCards() {
    // Track number of cards player discarded to field (played from hand without matching)
    // This requires state tracking that is added in the constructor
    return this.playerFieldDiscards >= 6;
  }

  /**
   * Check if player has collected no bird cards
   * Birds: crane, bush warbler, cuckoo, geese, swallow
   */
  checkHitchcock() {
    const birdNames = ['crane', 'bush warbler', 'cuckoo', 'geese', 'swallow'];
    const hasBirds = this.playerCaptured.some(card =>
      birdNames.some(bird => card.name.includes(bird))
    );
    return !hasBirds;
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

    // Check if both hands are empty (game over in shop mode)
    // Note: We check hands only, not deck, because in shop mode the deck may still have cards
    // when hands run out (parent's endTurn would call endRound, but we want endShopGame)
    if (this.playerHand.length === 0 && this.opponentHand.length === 0) {
      console.log('[SHOP] Game over - both hands empty');
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
    this.gameOver = true;
    console.log(`[SHOP] endShopGame called`);
    console.log(`[SHOP] Current scores before yaku - Player: ${this.playerScore}, Opponent: ${this.opponentScore}`);
    console.log(`[SHOP] Bonus achieved: ${this.bonusAwarded}`);

    const playerYaku = Yaku.checkYaku(this.playerCaptured, this.gameOptions);
    const opponentYaku = Yaku.checkYaku(this.opponentCaptured, this.gameOptions);

    // Calculate base round scores from yaku
    let playerRoundScore = Yaku.calculateScore(playerYaku);
    let opponentRoundScore = Yaku.calculateScore(opponentYaku);

    console.log(`[SHOP] Base yaku scores - Player: ${playerRoundScore}, Opponent: ${opponentRoundScore}`);

    // Special checks for bonuses that are only evaluated at round end
    if (!this.bonusAwarded) {
      if (this.selectedWinCondition.id === 'medium_six_not_seven') {
        if (playerRoundScore === 6) {
          this.bonusAwarded = true;
          const bonusPoints = 6;
          this.playerScore += bonusPoints;
          console.log(`[SHOP] Six, Not Seven BONUS ACHIEVED at round end! +${bonusPoints} points`);
        } else {
          console.log(`[SHOP] Six, Not Seven NOT achieved - score is ${playerRoundScore}, not 6`);
        }
      } else if (this.selectedWinCondition.id === 'hard_hitchcock') {
        if (this.checkHitchcock()) {
          this.bonusAwarded = true;
          const bonusPoints = 10;
          this.playerScore += bonusPoints;
          console.log(`[SHOP] Hitchcock BONUS ACHIEVED at round end! +${bonusPoints} points`);
        } else {
          console.log(`[SHOP] Hitchcock NOT achieved - player captured birds`);
        }
      }
    }

    // Calculate bonus points (already added to this.playerScore in endTurn or above)
    const bonusPoints = this.bonusAwarded
      ? (this.selectedWinCondition.difficulty === 1 ? 3 :
         this.selectedWinCondition.difficulty === 2 ? 6 : 10)
      : 0;

    // Apply auto-double if enabled and score >= 7
    const playerScoreBreakdown = {
      baseScore: playerRoundScore,
      bonusPoints: bonusPoints,
      bonusChanceName: this.bonusAwarded ? this.selectedWinCondition.name : null,
      koikoiPenalty: false,
      autoDouble: false,
      koikoiMultiplier: 0,
      finalScore: 0  // Will be set below
    };

    const opponentScoreBreakdown = {
      baseScore: opponentRoundScore,
      koikoiPenalty: false,
      autoDouble: false,
      koikoiMultiplier: 0,
      finalScore: 0  // Will be set below
    };

    // Apply auto-double for 7+ points (matching parent behavior)
    if (this.gameOptions.get('autoDouble7Plus') && playerRoundScore >= 7) {
      playerRoundScore *= 2;
      playerScoreBreakdown.autoDouble = true;
      console.log(`[SHOP] Player auto-double applied: ${playerScoreBreakdown.baseScore} × 2 = ${playerRoundScore}`);
    }

    if (this.gameOptions.get('autoDouble7Plus') && opponentRoundScore >= 7) {
      opponentRoundScore *= 2;
      opponentScoreBreakdown.autoDouble = true;
      console.log(`[SHOP] Opponent auto-double applied: ${opponentScoreBreakdown.baseScore} × 2 = ${opponentRoundScore}`);
    }

    // Add yaku scores to total (bonus already added in endTurn)
    this.playerScore += playerRoundScore;
    this.opponentScore += opponentRoundScore;

    playerScoreBreakdown.finalScore = this.playerScore;
    opponentScoreBreakdown.finalScore = this.opponentScore;

    console.log(`[SHOP] Final scores - Player: ${this.playerScore}, Opponent: ${this.opponentScore}`);

    // Determine message
    let shopMessage = '';
    if (this.bonusAwarded) {
      shopMessage = `Bonus achieved! +${bonusPoints} points for: ${this.selectedWinCondition.name}`;
    } else {
      shopMessage = `Bonus chance not achieved: ${this.selectedWinCondition.name}`;
    }

    // Create round summary data for shop mode
    const roundSummaryData = {
      roundNumber: 1,
      playerRoundScore: playerRoundScore,
      opponentRoundScore: opponentRoundScore,
      playerTotalScore: this.playerScore,
      opponentTotalScore: this.opponentScore,
      playerYaku: playerYaku,
      opponentYaku: opponentYaku,
      playerScoreBreakdown: playerScoreBreakdown,
      opponentScoreBreakdown: opponentScoreBreakdown,
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
