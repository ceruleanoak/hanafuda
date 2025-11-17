/**
 * Dekiyaku (Built Combinations) for Hachi-Hachi
 *
 * Dekiyaku are scoring combinations that players build during a round by capturing cards.
 * Unlike teyaku which are evaluated at the start of the round, dekiyaku are checked after
 * each capture and trigger the sage/shoubu decision.
 *
 * Hachi-Hachi has relatively few dekiyaku compared to other games, but all points are cumulative
 * (except Five Brights and Four Brights which are mutually exclusive).
 */
export class Dekiyaku {
  /**
   * Detect all dekiyaku in a captured card pile
   * @param {Array} captured - Array of captured card objects
   * @returns {Array} Array of dekiyaku objects found
   */
  static detectDekiyaku(captured) {
    const dekiyaku = [];

    // Check each type
    const fiveB = this.checkFiveBrights(captured);
    const fourB = this.checkFourBrights(captured);
    const sevenR = this.checkSevenRibbons(captured);
    const poetryR = this.checkPoetryRibbons(captured);
    const blueR = this.checkBlueRibbons(captured);
    const bdb = this.checkBoarDeerButterfly(captured);

    // Five and Four Brights are mutually exclusive
    if (fiveB) {
      dekiyaku.push(fiveB);
    } else if (fourB) {
      dekiyaku.push(fourB);
    }

    // All others are cumulative
    if (sevenR) dekiyaku.push(sevenR);
    if (poetryR) dekiyaku.push(poetryR);
    if (blueR) dekiyaku.push(blueR);
    if (bdb) dekiyaku.push(bdb);

    return dekiyaku;
  }

  /**
   * Calculate total value of all dekiyaku
   * @param {Array} dekiyakuList - Array of dekiyaku objects
   * @returns {number} Total value in kan
   */
  static calculateValue(dekiyakuList) {
    return dekiyakuList.reduce((sum, d) => sum + d.value, 0);
  }

  /**
   * DEKIYAKU CHECKERS
   */

  /**
   * Five Brights (12 kan)
   * Must have all 5 bright cards:
   * - Pine with Crane (Jan)
   * - Cherry Blossom with Curtain (Mar)
   * - Susuki Grass with Moon (Aug)
   * - Willow with Rain Man (Nov)
   * - Paulownia with Phoenix (Dec)
   */
  static checkFiveBrights(captured) {
    const brightMonths = [1, 3, 8, 11, 12];
    const hasBrights = brightMonths.map(m =>
      this.hasCardOfMonthAndType(captured, m, 'bright')
    );

    if (hasBrights.every(has => has)) {
      const cards = brightMonths.map(m =>
        this.getCardOfMonthAndType(captured, m, 'bright')
      );

      return {
        name: 'Five Brights',
        japName: 'Gokou',
        value: 12,
        type: 'dekiyaku',
        cardsInvolved: cards
      };
    }
    return null;
  }

  /**
   * Four Brights (10 kan)
   * Must have 4 of the 5 bright cards (excluding Willow Rain Man typically,
   * but we check for any 4)
   */
  static checkFourBrights(captured) {
    const brightMonths = [1, 3, 8, 11, 12];
    const foundBrights = [];

    for (const month of brightMonths) {
      if (this.hasCardOfMonthAndType(captured, month, 'bright')) {
        foundBrights.push(month);
      }
    }

    if (foundBrights.length === 4) {
      const cards = foundBrights.map(m =>
        this.getCardOfMonthAndType(captured, m, 'bright')
      );

      return {
        name: 'Four Brights',
        japName: 'Shikou',
        value: 10,
        type: 'dekiyaku',
        cardsInvolved: cards
      };
    }
    return null;
  }

  /**
   * Seven Ribbons (10 kan)
   * Must have 7 ribbon cards (excluding Willow ribbon)
   * Some variants score +1 kan for each additional ribbon beyond 7
   */
  static checkSevenRibbons(captured) {
    // Get all ribbon cards except Willow ribbon (month 11)
    const ribbons = captured.filter(c =>
      c.type === 'ribbon' && c.month !== 11
    );

    if (ribbons.length >= 7) {
      // Base 10 kan, plus 1 per additional ribbon if desired
      const value = 10; // For MVP, no bonus for extras

      return {
        name: 'Seven Ribbons',
        japName: 'Nanatan',
        value: value,
        type: 'dekiyaku',
        cardsInvolved: ribbons.slice(0, 7)
      };
    }
    return null;
  }

  /**
   * Poetry Ribbons (7 kan)
   * Must have all three red/poetry ribbons:
   * - Pine with Poetry Ribbon (Jan)
   * - Plum Blossom with Poetry Ribbon (Feb)
   * - Cherry Blossom with Poetry Ribbon (Mar)
   */
  static checkPoetryRibbons(captured) {
    const poetryMonths = [1, 2, 3];
    const hasPoetry = poetryMonths.map(m =>
      this.hasPoetryRibbon(captured, m)
    );

    if (hasPoetry.every(has => has)) {
      const cards = poetryMonths.map(m =>
        this.getPoetryRibbon(captured, m)
      );

      return {
        name: 'Poetry Ribbons',
        japName: 'Akatan',
        value: 7,
        type: 'dekiyaku',
        cardsInvolved: cards
      };
    }
    return null;
  }

  /**
   * Blue Ribbons (7 kan)
   * Must have all three blue ribbons:
   * - Peony with Blue Ribbon (May)
   * - Chrysanthemum with Blue Ribbon (Sep)
   * - Maple with Blue Ribbon (Oct)
   */
  static checkBlueRibbons(captured) {
    const blueMonths = [5, 9, 10];
    const hasBlue = blueMonths.map(m =>
      this.hasBlueRibbon(captured, m)
    );

    if (hasBlue.every(has => has)) {
      const cards = blueMonths.map(m =>
        this.getBlueRibbon(captured, m)
      );

      return {
        name: 'Blue Ribbons',
        japName: 'Aotan',
        value: 7,
        type: 'dekiyaku',
        cardsInvolved: cards
      };
    }
    return null;
  }

  /**
   * Boar, Deer, Butterflies (7 kan)
   * Must have:
   * - Bush Clover with Boar (Jul)
   * - Maple with Deer (Oct)
   * - Peony with Butterflies (May)
   * Note: This yaku may not be in all versions
   */
  static checkBoarDeerButterfly(captured) {
    const hasBoar = this.hasCardWithName(captured, 'boar', 7);
    const hasDeer = this.hasCardWithName(captured, 'deer', 10);
    const hasButterfly = this.hasCardWithName(captured, 'butterfly', 5);

    if (hasBoar && hasDeer && hasButterfly) {
      return {
        name: 'Boar, Deer, Butterflies',
        japName: 'Inoshikachou',
        value: 7,
        type: 'dekiyaku',
        cardsInvolved: [
          this.getCardWithName(captured, 'boar', 7),
          this.getCardWithName(captured, 'deer', 10),
          this.getCardWithName(captured, 'butterfly', 5)
        ]
      };
    }
    return null;
  }

  /**
   * HELPER FUNCTIONS
   */

  static hasCardOfMonthAndType(captured, month, type) {
    return captured.some(c => c.month === month && c.type === type);
  }

  static getCardOfMonthAndType(captured, month, type) {
    return captured.find(c => c.month === month && c.type === type);
  }

  static hasPoetryRibbon(captured, month) {
    // Poetry ribbons are specifically the red/poetry ribbons
    // In the card data, these would be marked differently
    // For now, check if it's a ribbon from the poetry months
    return captured.some(c =>
      c.month === month &&
      c.type === 'ribbon' &&
      c.name &&
      c.name.includes('poetry')
    );
  }

  static getPoetryRibbon(captured, month) {
    return captured.find(c =>
      c.month === month &&
      c.type === 'ribbon' &&
      c.name &&
      c.name.includes('poetry')
    );
  }

  static hasBlueRibbon(captured, month) {
    // Blue ribbons are specifically the blue ribbons
    // Months: 5 (Peony), 9 (Chrysanthemum), 10 (Maple)
    return captured.some(c =>
      c.month === month &&
      c.type === 'ribbon' &&
      c.name &&
      c.name.includes('blue')
    );
  }

  static getBlueRibbon(captured, month) {
    return captured.find(c =>
      c.month === month &&
      c.type === 'ribbon' &&
      c.name &&
      c.name.includes('blue')
    );
  }

  static hasCardWithName(captured, name, month) {
    return captured.some(c =>
      c.month === month &&
      c.name &&
      c.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  static getCardWithName(captured, name, month) {
    return captured.find(c =>
      c.month === month &&
      c.name &&
      c.name.toLowerCase().includes(name.toLowerCase())
    );
  }
}
