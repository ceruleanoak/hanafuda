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
    // Define all 8 Sakura yaku
    this.YAKU_DEFINITIONS = {
      SANKO: {
        name: "Sanko",
        displayName: "Sanko (Three Brights)",
        description: "Any 3 of 4 bright cards (excluding Rainman)",
        penalty: 50,
        check: (cards) => this.checkSanko(cards)
      },
      SHIKO: {
        name: "Shiko",
        displayName: "Shiko (Four Brights)",
        description: "All 4 bright cards (excluding Rainman)",
        penalty: 50,
        check: (cards) => this.checkShiko(cards)
      },
      AME_SHIKO: {
        name: "Ame-Shiko",
        displayName: "Ame-Shiko (Rainy Four Brights)",
        description: "Any 3 brights + Rainman",
        penalty: 50,
        check: (cards) => this.checkAmeShiko(cards)
      },
      GOKO: {
        name: "Goko",
        displayName: "Goko (Five Brights)",
        description: "All 5 bright cards",
        penalty: 50,
        check: (cards) => this.checkGoko(cards)
      },
      AKATAN: {
        name: "Akatan",
        displayName: "Akatan (Red Poetry Ribbons)",
        description: "All 3 red ribbons with text",
        penalty: 50,
        check: (cards) => this.checkAkatan(cards)
      },
      AOTAN: {
        name: "Aotan",
        displayName: "Aotan (Blue Ribbons)",
        description: "All 3 blue ribbons",
        penalty: 50,
        check: (cards) => this.checkAotan(cards)
      },
      TANZAKU: {
        name: "Tanzaku",
        displayName: "Tanzaku (Plain Ribbons)",
        description: "Any 3 of 4 plain ribbons",
        penalty: 50,
        check: (cards) => this.checkTanzaku(cards)
      },
      INO_SHIKA_CHO: {
        name: "Ino-Shika-Cho",
        displayName: "Ino-Shika-Cho (Boar-Deer-Butterfly)",
        description: "Bush Clover boar, Maple deer, Peony butterflies",
        penalty: 50,
        check: (cards) => this.checkInoShikaCho(cards)
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
   * Sanko (Three Brights) - Any 3 of 4 brights (excluding Rainman)
   */
  checkSanko(cards) {
    const regularBrights = cards.filter(c =>
      c.type === CARD_TYPES.BRIGHT && c.month !== 'November'
    );
    return regularBrights.length >= 3;
  }

  /**
   * Shiko (Four Brights) - All 4 brights (excluding Rainman)
   */
  checkShiko(cards) {
    const regularBrights = cards.filter(c =>
      c.type === CARD_TYPES.BRIGHT && c.month !== 'November'
    );
    return regularBrights.length === 4;
  }

  /**
   * Ame-Shiko (Rainy Four) - 3 regular brights + Rainman
   */
  checkAmeShiko(cards) {
    const regularBrights = cards.filter(c =>
      c.type === CARD_TYPES.BRIGHT && c.month !== 'November'
    ).length;

    const hasRainman = cards.some(c =>
      c.month === 'November' && c.type === CARD_TYPES.BRIGHT
    );

    return regularBrights >= 3 && hasRainman;
  }

  /**
   * Goko (Five Brights) - All 5 bright cards
   */
  checkGoko(cards) {
    const allBrights = cards.filter(c => c.type === CARD_TYPES.BRIGHT);
    return allBrights.length === 5;
  }

  /**
   * Akatan (Red Poetry Ribbons) - Pine, Plum, Cherry ribbons
   */
  checkAkatan(cards) {
    const redRibbonMonths = ['January', 'February', 'March'];
    return redRibbonMonths.every(month =>
      cards.some(c => c.month === month && c.type === CARD_TYPES.RIBBON)
    );
  }

  /**
   * Aotan (Blue Ribbons) - Peony, Chrysanthemum, Maple ribbons
   */
  checkAotan(cards) {
    const blueRibbonMonths = ['June', 'September', 'October'];
    return blueRibbonMonths.every(month =>
      cards.some(c => c.month === month && c.type === CARD_TYPES.RIBBON)
    );
  }

  /**
   * Tanzaku (Plain Ribbons) - Any 3 of 4: Wisteria, Iris, Bush Clover, Willow
   */
  checkTanzaku(cards) {
    const plainRibbonMonths = ['April', 'May', 'July', 'November'];
    const count = plainRibbonMonths.filter(month =>
      cards.some(c => c.month === month && c.type === CARD_TYPES.RIBBON)
    ).length;
    return count >= 3;
  }

  /**
   * Ino-Shika-Cho (Boar-Deer-Butterfly) - Specific animal cards
   */
  checkInoShikaCho(cards) {
    const requiredAnimals = ['July', 'October', 'June']; // Boar, Deer, Butterflies
    return requiredAnimals.every(month =>
      cards.some(c => c.month === month && c.type === CARD_TYPES.ANIMAL)
    );
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

    // Sanko progress
    const regularBrights = cards.filter(c =>
      c.type === CARD_TYPES.BRIGHT && c.month !== 'November'
    );
    if (regularBrights.length > 0 && regularBrights.length < 3) {
      const haveSuits = regularBrights.map(c => c.month);
      const needed = ['January', 'March', 'August', 'December']
        .filter(m => !haveSuits.includes(m));
      progress.SANKO = {
        count: regularBrights.length,
        needed: needed,
        priority: (regularBrights.length / 3) * 100
      };
    }

    // Shiko progress
    if (regularBrights.length === 3) {
      const haveSuits = regularBrights.map(c => c.month);
      const needed = ['January', 'March', 'August', 'December']
        .filter(m => !haveSuits.includes(m));
      progress.SHIKO = {
        count: regularBrights.length,
        needed: needed,
        priority: (regularBrights.length / 4) * 100
      };
    }

    // Ame-Shiko progress
    const hasRainman = cards.some(c =>
      c.month === 'November' && c.type === CARD_TYPES.BRIGHT
    );
    if (hasRainman && regularBrights.length > 0 && regularBrights.length < 3) {
      progress.AME_SHIKO = {
        count: regularBrights.length + 1,
        needed: ['January', 'March', 'August', 'December']
          .filter(m => !regularBrights.some(c => c.month === m)),
        priority: ((regularBrights.length + 1) / 4) * 100
      };
    }

    // Akatan progress
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

    // Aotan progress
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

    // Tanzaku progress
    const plainRibbons = cards.filter(c =>
      ['April', 'May', 'July', 'November'].includes(c.month) &&
      c.type === CARD_TYPES.RIBBON
    );
    if (plainRibbons.length > 0 && plainRibbons.length < 3) {
      progress.TANZAKU = {
        count: plainRibbons.length,
        needed: ['April', 'May', 'July', 'November']
          .filter(m => !plainRibbons.some(c => c.month === m)),
        priority: (plainRibbons.length / 3) * 100
      };
    }

    // Ino-Shika-Cho progress
    const inoShikaChoAnimals = cards.filter(c =>
      ['July', 'October', 'June'].includes(c.month) &&
      c.type === CARD_TYPES.ANIMAL
    );
    if (inoShikaChoAnimals.length > 0 && inoShikaChoAnimals.length < 3) {
      progress.INO_SHIKA_CHO = {
        count: inoShikaChoAnimals.length,
        needed: ['July', 'October', 'June']
          .filter(m => !inoShikaChoAnimals.some(c => c.month === m)),
        priority: (inoShikaChoAnimals.length / 3) * 100
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
