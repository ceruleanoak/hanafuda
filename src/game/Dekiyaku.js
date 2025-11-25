import { debugLogger } from '../utils/DebugLogger.js';

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
      debugLogger.log('hachihachi', `✅ Found Five Brights (12 kan)`);
    } else if (fourB) {
      dekiyaku.push(fourB);
      debugLogger.log('hachihachi', `✅ Found Four Brights (10 kan)`);
    }

    // All others are cumulative
    if (sevenR) {
      dekiyaku.push(sevenR);
      debugLogger.log('hachihachi', `✅ Found Seven Ribbons (10 kan)`);
    }
    if (poetryR) {
      dekiyaku.push(poetryR);
      debugLogger.log('hachihachi', `✅ Found Poetry Ribbons (7 kan)`);
    }
    if (blueR) {
      dekiyaku.push(blueR);
      debugLogger.log('hachihachi', `✅ Found Blue Ribbons (7 kan)`);
    }
    if (bdb) {
      dekiyaku.push(bdb);
      debugLogger.log('hachihachi', `✅ Found Boar, Deer, Butterfly (7 kan)`);
    }

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
    const brightMonths = ['January', 'March', 'August', 'November', 'December'];
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
    const brightMonths = ['January', 'March', 'August', 'November', 'December'];
    const monthNames = {'January': 'Pine/Jan', 'March': 'Cherry/Mar', 'August': 'Moon/Aug', 'November': 'Willow/Nov', 'December': 'Phoenix/Dec'};
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
    // Get all ribbon cards except Willow ribbon (November)
    const ribbons = captured.filter(c =>
      c.type === 'ribbon' && c.month !== 'November'
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
    const poetryMonths = ['January', 'February', 'March'];
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
   * - Peony with Blue Ribbon (Jun)
   * - Chrysanthemum with Blue Ribbon (Sep)
   * - Maple with Blue Ribbon (Oct)
   */
  static checkBlueRibbons(captured) {
    const blueMonths = ['June', 'September', 'October'];
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
   * - Peony with Butterflies (Jun)
   * Note: This yaku may not be in all versions
   */
  static checkBoarDeerButterfly(captured) {
    const hasBoar = this.hasCardWithName(captured, 'boar', 'July');
    const hasDeer = this.hasCardWithName(captured, 'deer', 'October');
    const hasButterfly = this.hasCardWithName(captured, 'butterflies', 'June');

    if (hasBoar && hasDeer && hasButterfly) {
      return {
        name: 'Boar, Deer, Butterflies',
        japName: 'Inoshikachou',
        value: 7,
        type: 'dekiyaku',
        cardsInvolved: [
          this.getCardWithName(captured, 'boar', 'July'),
          this.getCardWithName(captured, 'deer', 'October'),
          this.getCardWithName(captured, 'butterflies', 'June')
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
    // Poetry ribbons are the red ribbons in months 1, 2, 3 (January, February, March)
    // Card IDs: 2 (Jan), 6 (Feb), 10 (March)
    const poetryRibbonIds = [2, 6, 10];
    return captured.some(c => poetryRibbonIds.includes(c.id) && c.month === month);
  }

  static getPoetryRibbon(captured, month) {
    // Poetry ribbons are the red ribbons in months 1, 2, 3
    const poetryRibbonIds = [2, 6, 10];
    return captured.find(c => poetryRibbonIds.includes(c.id) && c.month === month);
  }

  static hasBlueRibbon(captured, month) {
    // Blue ribbons in months 6 (June), 9 (September), 10 (October)
    // Card IDs: 22 (June), 34 (September), 38 (October)
    const blueRibbonIds = [22, 34, 38];
    return captured.some(c => blueRibbonIds.includes(c.id) && c.month === month);
  }

  static getBlueRibbon(captured, month) {
    // Blue ribbons in months 6, 9, 10
    const blueRibbonIds = [22, 34, 38];
    return captured.find(c => blueRibbonIds.includes(c.id) && c.month === month);
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
