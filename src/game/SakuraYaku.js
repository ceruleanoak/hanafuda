/**
 * SakuraYaku.js
 *
 * Sakura (Hawaiian Hanafuda) Yaku System
 *
 * In Sakura, yaku work differently than in Koi-Koi:
 * - Each yaku consists of exactly 3 cards
 * - Cards can count toward multiple yaku simultaneously
 * - Yaku don't add points - they subtract 50 points from each opponent
 * - There are 8 traditional yaku
 */

import { CARD_TYPES } from '../data/cards.js';

export class SakuraYaku {
  constructor() {
    // Define all 8 Sakura yaku (matching official Hawaiian Sakura rules)
    this.YAKU_DEFINITIONS = {
      DRINKING: {
        name: "Drinking",
        displayName: "Drinking (Nomi)",
        description: "Cherry Curtain + Susuki Moon + Chrysanthemum Cup",
        penalty: 50,
        check: (cards) => this.checkDrinking(cards)
      },
      SPRING: {
        name: "Spring",
        displayName: "Spring (Omote Sugawara)",
        description: "Pine Crane + Plum Warbler + Cherry Curtain",
        penalty: 50,
        check: (cards) => this.checkSpring(cards)
      },
      AKATAN: {
        name: "Akatan",
        displayName: "Akatan (Red Poetry Ribbons)",
        description: "Red poetry ribbons from January, February, March",
        penalty: 50,
        check: (cards) => this.checkAkatan(cards)
      },
      AOTAN: {
        name: "Aotan",
        displayName: "Aotan (Blue Ribbons)",
        description: "Blue ribbons from June, September, October",
        penalty: 50,
        check: (cards) => this.checkAotan(cards)
      },
      KUSATAN: {
        name: "Kusatan",
        displayName: "Kusatan (Grass Ribbons)",
        description: "Plain ribbons from April, May, July (excluding Willow)",
        penalty: 50,
        check: (cards) => this.checkKusatan(cards)
      },
      ANIMALS_A: {
        name: "Animals A",
        displayName: "Animals A",
        description: "Peony Butterfly + Chrysanthemum Cup + Maple Deer",
        penalty: 50,
        check: (cards) => this.checkAnimalsA(cards)
      },
      ANIMALS_B: {
        name: "Animals B",
        displayName: "Animals B",
        description: "Wisteria Cuckoo + Iris Bridge + Clover Boar",
        penalty: 50,
        check: (cards) => this.checkAnimalsB(cards)
      },
      INOSHIKAGAN: {
        name: "Inoshikagan",
        displayName: "Inoshikagan (Boar-Geese-Deer)",
        description: "Clover Boar + Susuki Geese + Maple Deer",
        penalty: 50,
        check: (cards) => this.checkInoshikagan(cards)
      }
    };
  }

  /**
   * Check for all yaku in captured cards
   * @param {Array} cards - Array of captured card objects
   * @returns {Array} Array of yaku names that were achieved
   */
  detectYaku(cards) {
    const foundYaku = [];

    for (let yakuKey in this.YAKU_DEFINITIONS) {
      const yaku = this.YAKU_DEFINITIONS[yakuKey];
      if (yaku.check(cards)) {
        foundYaku.push({
          name: yaku.name,
          displayName: yaku.displayName,
          description: yaku.description,
          penalty: yaku.penalty
        });
      }
    }

    return foundYaku;
  }

  /**
   * Calculate total penalty from yaku (for opponents)
   * @param {Array} yaku - Array of yaku objects
   * @returns {number} Total penalty amount
   */
  calculatePenalty(yaku) {
    return yaku.reduce((total, y) => total + y.penalty, 0);
  }

  // ============================================================
  // YAKU CHECK FUNCTIONS
  // ============================================================

  /**
   * Drinking (Nomi) - Cherry Curtain + Susuki Moon + Chrysanthemum Cup
   * Requires: March bright + August bright + September animal
   */
  checkDrinking(cards) {
    const hasCherryCurtain = cards.some(c => c.month === 'March' && c.type === CARD_TYPES.BRIGHT);
    const hasSuskiMoon = cards.some(c => c.month === 'August' && c.type === CARD_TYPES.BRIGHT);
    const hasChrysanthemumCup = cards.some(c => c.month === 'September' && c.type === CARD_TYPES.ANIMAL);
    return hasCherryCurtain && hasSuskiMoon && hasChrysanthemumCup;
  }

  /**
   * Spring (Omote Sugawara) - Pine Crane + Plum Warbler + Cherry Curtain
   * Requires: January bright + February animal + March bright
   */
  checkSpring(cards) {
    const hasPineCrane = cards.some(c => c.month === 'January' && c.type === CARD_TYPES.BRIGHT);
    const hasPlumWarbler = cards.some(c => c.month === 'February' && c.type === CARD_TYPES.ANIMAL);
    const hasCherryCurtain = cards.some(c => c.month === 'March' && c.type === CARD_TYPES.BRIGHT);
    return hasPineCrane && hasPlumWarbler && hasCherryCurtain;
  }

  /**
   * Akatan (Red Poetry Ribbons) - January, February, March ribbons
   */
  checkAkatan(cards) {
    const redRibbonMonths = ['January', 'February', 'March'];
    return redRibbonMonths.every(month =>
      cards.some(c => c.month === month && c.type === CARD_TYPES.RIBBON)
    );
  }

  /**
   * Aotan (Blue Ribbons) - June, September, October ribbons
   */
  checkAotan(cards) {
    const blueRibbonMonths = ['June', 'September', 'October'];
    return blueRibbonMonths.every(month =>
      cards.some(c => c.month === month && c.type === CARD_TYPES.RIBBON)
    );
  }

  /**
   * Kusatan (Grass Ribbons) - Plain ribbons from April, May, July (excluding Willow)
   */
  checkKusatan(cards) {
    const plainRibbonMonths = ['April', 'May', 'July']; // NOT November
    const count = plainRibbonMonths.filter(month =>
      cards.some(c => c.month === month && c.type === CARD_TYPES.RIBBON)
    ).length;
    return count === 3; // All 3 required
  }

  /**
   * Animals A - Peony Butterfly + Chrysanthemum Cup + Maple Deer
   * Requires: June animal + September animal + October animal
   */
  checkAnimalsA(cards) {
    const hasPeonyButterfly = cards.some(c => c.month === 'June' && c.type === CARD_TYPES.ANIMAL);
    const hasChrysanthemumCup = cards.some(c => c.month === 'September' && c.type === CARD_TYPES.ANIMAL);
    const hasMapleDeer = cards.some(c => c.month === 'October' && c.type === CARD_TYPES.ANIMAL);
    return hasPeonyButterfly && hasChrysanthemumCup && hasMapleDeer;
  }

  /**
   * Animals B - Wisteria Cuckoo + Iris Bridge + Clover Boar
   * Requires: April animal + May animal + July animal
   */
  checkAnimalsB(cards) {
    const hasWisteriaCuckoo = cards.some(c => c.month === 'April' && c.type === CARD_TYPES.ANIMAL);
    const hasIrisBridge = cards.some(c => c.month === 'May' && c.type === CARD_TYPES.ANIMAL);
    const hasCloverBoar = cards.some(c => c.month === 'July' && c.type === CARD_TYPES.ANIMAL);
    return hasWisteriaCuckoo && hasIrisBridge && hasCloverBoar;
  }

  /**
   * Inoshikagan (Boar-Geese-Deer) - Clover Boar + Susuki Geese + Maple Deer
   * Requires: July animal + August animal + October animal
   */
  checkInoshikagan(cards) {
    const hasCloverBoar = cards.some(c => c.month === 'July' && c.type === CARD_TYPES.ANIMAL);
    const hasSuskiGeese = cards.some(c => c.month === 'August' && c.type === CARD_TYPES.ANIMAL);
    const hasMapleDeer = cards.some(c => c.month === 'October' && c.type === CARD_TYPES.ANIMAL);
    return hasCloverBoar && hasSuskiGeese && hasMapleDeer;
  }

  // ============================================================
  // YAKU PROGRESS TRACKING
  // ============================================================

  /**
   * Analyze progress toward each yaku
   * @param {Array} cards - Captured cards
   * @returns {Object} Progress information for each yaku
   */
  analyzeYakuProgress(cards) {
    const progress = {};

    // Drinking progress: March bright + August bright + September animal
    const dinkingCards = {
      march: cards.some(c => c.month === 'March' && c.type === CARD_TYPES.BRIGHT),
      august: cards.some(c => c.month === 'August' && c.type === CARD_TYPES.BRIGHT),
      september: cards.some(c => c.month === 'September' && c.type === CARD_TYPES.ANIMAL)
    };
    const drinkingCount = Object.values(dinkingCards).filter(v => v).length;
    if (drinkingCount > 0 && drinkingCount < 3) {
      progress.DRINKING = {
        count: drinkingCount,
        needed: Object.keys(dinkingCards).filter(k => !dinkingCards[k]),
        priority: (drinkingCount / 3) * 100
      };
    }

    // Spring progress: January bright + February animal + March bright
    const springCards = {
      january: cards.some(c => c.month === 'January' && c.type === CARD_TYPES.BRIGHT),
      february: cards.some(c => c.month === 'February' && c.type === CARD_TYPES.ANIMAL),
      march: cards.some(c => c.month === 'March' && c.type === CARD_TYPES.BRIGHT)
    };
    const springCount = Object.values(springCards).filter(v => v).length;
    if (springCount > 0 && springCount < 3) {
      progress.SPRING = {
        count: springCount,
        needed: Object.keys(springCards).filter(k => !springCards[k]),
        priority: (springCount / 3) * 100
      };
    }

    // Akatan progress: Red ribbons (January, February, March)
    const redRibbons = cards.filter(c =>
      ['January', 'February', 'March'].includes(c.month) &&
      c.type === CARD_TYPES.RIBBON
    );
    if (redRibbons.length > 0 && redRibbons.length < 3) {
      progress.AKATAN = {
        count: redRibbons.length,
        needed: ['January', 'February', 'March']
          .filter(m => !redRibbons.some(c => c.month === m)),
        priority: (redRibbons.length / 3) * 100
      };
    }

    // Aotan progress: Blue ribbons (June, September, October)
    const blueRibbons = cards.filter(c =>
      ['June', 'September', 'October'].includes(c.month) &&
      c.type === CARD_TYPES.RIBBON
    );
    if (blueRibbons.length > 0 && blueRibbons.length < 3) {
      progress.AOTAN = {
        count: blueRibbons.length,
        needed: ['June', 'September', 'October']
          .filter(m => !blueRibbons.some(c => c.month === m)),
        priority: (blueRibbons.length / 3) * 100
      };
    }

    // Kusatan progress: Plain ribbons (April, May, July - NOT November)
    const plainRibbons = cards.filter(c =>
      ['April', 'May', 'July'].includes(c.month) &&
      c.type === CARD_TYPES.RIBBON
    );
    if (plainRibbons.length > 0 && plainRibbons.length < 3) {
      progress.KUSATAN = {
        count: plainRibbons.length,
        needed: ['April', 'May', 'July']
          .filter(m => !plainRibbons.some(c => c.month === m)),
        priority: (plainRibbons.length / 3) * 100
      };
    }

    // Animals A progress: June animal + September animal + October animal
    const animalsA = {
      june: cards.some(c => c.month === 'June' && c.type === CARD_TYPES.ANIMAL),
      september: cards.some(c => c.month === 'September' && c.type === CARD_TYPES.ANIMAL),
      october: cards.some(c => c.month === 'October' && c.type === CARD_TYPES.ANIMAL)
    };
    const animalsACount = Object.values(animalsA).filter(v => v).length;
    if (animalsACount > 0 && animalsACount < 3) {
      progress.ANIMALS_A = {
        count: animalsACount,
        needed: Object.keys(animalsA).filter(k => !animalsA[k]),
        priority: (animalsACount / 3) * 100
      };
    }

    // Animals B progress: April animal + May animal + July animal
    const animalsB = {
      april: cards.some(c => c.month === 'April' && c.type === CARD_TYPES.ANIMAL),
      may: cards.some(c => c.month === 'May' && c.type === CARD_TYPES.ANIMAL),
      july: cards.some(c => c.month === 'July' && c.type === CARD_TYPES.ANIMAL)
    };
    const animalsBCount = Object.values(animalsB).filter(v => v).length;
    if (animalsBCount > 0 && animalsBCount < 3) {
      progress.ANIMALS_B = {
        count: animalsBCount,
        needed: Object.keys(animalsB).filter(k => !animalsB[k]),
        priority: (animalsBCount / 3) * 100
      };
    }

    // Inoshikagan progress: July animal + August animal + October animal
    const inoshikagan = {
      july: cards.some(c => c.month === 'July' && c.type === CARD_TYPES.ANIMAL),
      august: cards.some(c => c.month === 'August' && c.type === CARD_TYPES.ANIMAL),
      october: cards.some(c => c.month === 'October' && c.type === CARD_TYPES.ANIMAL)
    };
    const inoshikaganCount = Object.values(inoshikagan).filter(v => v).length;
    if (inoshikaganCount > 0 && inoshikaganCount < 3) {
      progress.INOSHIKAGAN = {
        count: inoshikaganCount,
        needed: Object.keys(inoshikagan).filter(k => !inoshikagan[k]),
        priority: (inoshikaganCount / 3) * 100
      };
    }

    return progress;
  }

  /**
   * Check if a card would complete any yaku
   * @param {Object} card - Card to check
   * @param {Array} currentCards - Currently captured cards
   * @returns {boolean} True if card completes a yaku
   */
  wouldCompleteYaku(card, currentCards) {
    const testCards = [...currentCards, card];
    const currentYaku = this.detectYaku(currentCards);
    const newYaku = this.detectYaku(testCards);
    return newYaku.length > currentYaku.length;
  }

  /**
   * Check if a card would help progress toward any yaku
   * @param {Object} card - Card to check
   * @param {Array} currentCards - Currently captured cards
   * @returns {boolean} True if card helps progress
   */
  wouldHelpYaku(card, currentCards) {
    const progress = this.analyzeYakuProgress(currentCards);

    for (let yakuKey in progress) {
      const yakuProgress = progress[yakuKey];
      if (yakuProgress.needed.includes(card.month)) {
        return true;
      }
    }

    return false;
  }
}
