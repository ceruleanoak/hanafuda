/**
 * Yaku - Scoring combinations in Koi-Koi
 */

import { CARD_TYPES } from '../data/cards.js';

export class Yaku {
  /**
   * Check all possible yaku in a collection of cards
   * @param {Array} cards - Array of captured cards
   * @returns {Array} Array of yaku objects { name, points, cards }
   */
  static checkYaku(cards) {
    const yaku = [];

    // Five Brights (五光) - 15 points (all 5 bright cards)
    const fiveBrights = this.checkFiveBrights(cards);
    if (fiveBrights) yaku.push(fiveBrights);

    // Four Brights (四光) - 10 points (4 bright cards, excluding rain man)
    const fourBrights = this.checkFourBrights(cards);
    if (fourBrights && !fiveBrights) yaku.push(fourBrights);

    // Rainy Four Brights (雨四光) - 8 points (4 brights including rain man)
    const rainyFourBrights = this.checkRainyFourBrights(cards);
    if (rainyFourBrights && !fiveBrights && !fourBrights) yaku.push(rainyFourBrights);

    // Three Brights (三光) - 6 points (3 bright cards, excluding rain man)
    const threeBrights = this.checkThreeBrights(cards);
    if (threeBrights && !fiveBrights && !fourBrights && !rainyFourBrights) {
      yaku.push(threeBrights);
    }

    // Poetry Ribbons (赤短) - 6 points (3 red poetry ribbons)
    const poetryRibbons = this.checkPoetryRibbons(cards);
    if (poetryRibbons) yaku.push(poetryRibbons);

    // Blue Ribbons (青短) - 6 points (3 blue ribbons)
    const blueRibbons = this.checkBlueRibbons(cards);
    if (blueRibbons) yaku.push(blueRibbons);

    // Ribbons (短冊) - 5 points (5 ribbon cards)
    const ribbons = this.checkRibbons(cards);
    if (ribbons) yaku.push(ribbons);

    // Boar-Deer-Butterfly (猪鹿蝶) - 6 points
    const inoshikacho = this.checkInoShikaCho(cards);
    if (inoshikacho) yaku.push(inoshikacho);

    // Animals (種) - 5 points (5 animal cards)
    const animals = this.checkAnimals(cards);
    if (animals) yaku.push(animals);

    // Chaff (カス) - 1 point (10 chaff cards)
    const chaff = this.checkChaff(cards);
    if (chaff) yaku.push(chaff);

    // Viewing Sake (花見酒) - 3 points
    const hanami = this.checkHanami(cards);
    if (hanami) yaku.push(hanami);

    // Moon Viewing Sake (月見酒) - 3 points
    const tsukimi = this.checkTsukimi(cards);
    if (tsukimi) yaku.push(tsukimi);

    return yaku;
  }

  static checkFiveBrights(cards) {
    const brights = cards.filter(c => c.type === CARD_TYPES.BRIGHT);
    if (brights.length === 5) {
      return { name: 'Five Brights', points: 15, cards: brights };
    }
    return null;
  }

  static checkFourBrights(cards) {
    const brights = cards.filter(c => c.type === CARD_TYPES.BRIGHT);
    const withoutRainMan = brights.filter(c => !c.name.includes('rain man'));
    if (withoutRainMan.length === 4) {
      return { name: 'Four Brights', points: 10, cards: withoutRainMan };
    }
    return null;
  }

  static checkRainyFourBrights(cards) {
    const brights = cards.filter(c => c.type === CARD_TYPES.BRIGHT);
    const hasRainMan = brights.some(c => c.name.includes('rain man'));
    if (brights.length === 4 && hasRainMan) {
      return { name: 'Rainy Four Brights', points: 8, cards: brights };
    }
    return null;
  }

  static checkThreeBrights(cards) {
    const brights = cards.filter(c => c.type === CARD_TYPES.BRIGHT);
    const withoutRainMan = brights.filter(c => !c.name.includes('rain man'));
    if (withoutRainMan.length >= 3) {
      return { name: 'Three Brights', points: 6, cards: withoutRainMan.slice(0, 3) };
    }
    return null;
  }

  static checkPoetryRibbons(cards) {
    const poetryRibbons = cards.filter(c =>
      c.type === CARD_TYPES.RIBBON &&
      c.name.includes('poetry') &&
      c.ribbonColor === 'red'
    );
    if (poetryRibbons.length >= 3) {
      return { name: 'Poetry Ribbons', points: 6, cards: poetryRibbons.slice(0, 3) };
    }
    return null;
  }

  static checkBlueRibbons(cards) {
    const blueRibbons = cards.filter(c =>
      c.type === CARD_TYPES.RIBBON &&
      c.ribbonColor === 'blue'
    );
    if (blueRibbons.length >= 3) {
      return { name: 'Blue Ribbons', points: 6, cards: blueRibbons.slice(0, 3) };
    }
    return null;
  }

  static checkRibbons(cards) {
    const ribbons = cards.filter(c => c.type === CARD_TYPES.RIBBON);
    if (ribbons.length >= 5) {
      const points = 5 + (ribbons.length - 5); // +1 for each additional ribbon
      return { name: `Ribbons (${ribbons.length})`, points, cards: ribbons };
    }
    return null;
  }

  static checkInoShikaCho(cards) {
    const boar = cards.find(c => c.name.includes('boar'));
    const deer = cards.find(c => c.name.includes('deer'));
    const butterflies = cards.find(c => c.name.includes('butterflies'));

    if (boar && deer && butterflies) {
      return { name: 'Boar-Deer-Butterfly', points: 6, cards: [boar, deer, butterflies] };
    }
    return null;
  }

  static checkAnimals(cards) {
    const animals = cards.filter(c => c.type === CARD_TYPES.ANIMAL);
    if (animals.length >= 5) {
      const points = 5 + (animals.length - 5); // +1 for each additional animal
      return { name: `Animals (${animals.length})`, points, cards: animals };
    }
    return null;
  }

  static checkChaff(cards) {
    const chaff = cards.filter(c => c.type === CARD_TYPES.CHAFF);
    if (chaff.length >= 10) {
      const points = 1 + (chaff.length - 10); // +1 for each additional chaff
      return { name: `Chaff (${chaff.length})`, points, cards: chaff };
    }
    return null;
  }

  static checkHanami(cards) {
    const curtain = cards.find(c => c.name.includes('curtain'));
    const sakeCup = cards.find(c => c.name.includes('sake cup'));

    if (curtain && sakeCup) {
      return { name: 'Viewing Sake', points: 3, cards: [curtain, sakeCup] };
    }
    return null;
  }

  static checkTsukimi(cards) {
    const moon = cards.find(c => c.name.includes('moon'));
    const sakeCup = cards.find(c => c.name.includes('sake cup'));

    if (moon && sakeCup) {
      return { name: 'Moon Viewing Sake', points: 3, cards: [moon, sakeCup] };
    }
    return null;
  }

  /**
   * Calculate total score from yaku
   */
  static calculateScore(yaku) {
    return yaku.reduce((sum, y) => sum + y.points, 0);
  }

  /**
   * Check progress towards incomplete yaku
   * @param {Array} cards - Array of captured cards
   * @param {Array} opponentCards - Array of opponent's captured cards (optional)
   * @returns {Array} Array of progress objects { name, current, needed, isPossible }
   */
  static checkYakuProgress(cards, opponentCards = []) {
    const progress = [];

    // Brights progress (need 3+ for scoring)
    const brights = cards.filter(c => c.type === CARD_TYPES.BRIGHT);
    if (brights.length > 0 && brights.length < 3) {
      const opponentBrights = opponentCards.filter(c => c.type === CARD_TYPES.BRIGHT).length;
      const totalBrights = 5; // There are 5 brights total in the deck
      const remainingBrights = totalBrights - brights.length - opponentBrights;
      const isPossible = brights.length + remainingBrights >= 3;
      progress.push({ name: 'Brights', current: brights.length, needed: 3, isPossible });
    }

    // Poetry Ribbons progress (need 3)
    const poetryRibbons = cards.filter(c =>
      c.type === CARD_TYPES.RIBBON &&
      c.name.includes('poetry') &&
      c.ribbonColor === 'red'
    );
    if (poetryRibbons.length > 0 && poetryRibbons.length < 3) {
      const opponentPoetryRibbons = opponentCards.filter(c =>
        c.type === CARD_TYPES.RIBBON &&
        c.name.includes('poetry') &&
        c.ribbonColor === 'red'
      ).length;
      const totalPoetryRibbons = 3;
      const remainingPoetryRibbons = totalPoetryRibbons - poetryRibbons.length - opponentPoetryRibbons;
      const isPossible = poetryRibbons.length + remainingPoetryRibbons >= 3;
      progress.push({ name: 'Poetry Ribbons', current: poetryRibbons.length, needed: 3, isPossible });
    }

    // Blue Ribbons progress (need 3)
    const blueRibbons = cards.filter(c =>
      c.type === CARD_TYPES.RIBBON &&
      c.ribbonColor === 'blue'
    );
    if (blueRibbons.length > 0 && blueRibbons.length < 3) {
      const opponentBlueRibbons = opponentCards.filter(c =>
        c.type === CARD_TYPES.RIBBON &&
        c.ribbonColor === 'blue'
      ).length;
      const totalBlueRibbons = 3;
      const remainingBlueRibbons = totalBlueRibbons - blueRibbons.length - opponentBlueRibbons;
      const isPossible = blueRibbons.length + remainingBlueRibbons >= 3;
      progress.push({ name: 'Blue Ribbons', current: blueRibbons.length, needed: 3, isPossible });
    }

    // Ribbons progress (need 5)
    const ribbons = cards.filter(c => c.type === CARD_TYPES.RIBBON);
    if (ribbons.length > 0 && ribbons.length < 5) {
      const opponentRibbons = opponentCards.filter(c => c.type === CARD_TYPES.RIBBON).length;
      const totalRibbons = 10; // There are 10 ribbons total
      const remainingRibbons = totalRibbons - ribbons.length - opponentRibbons;
      const isPossible = ribbons.length + remainingRibbons >= 5;
      progress.push({ name: 'Ribbons', current: ribbons.length, needed: 5, isPossible });
    }

    // Animals progress (need 5)
    const animals = cards.filter(c => c.type === CARD_TYPES.ANIMAL);
    if (animals.length > 0 && animals.length < 5) {
      const opponentAnimals = opponentCards.filter(c => c.type === CARD_TYPES.ANIMAL).length;
      const totalAnimals = 9; // There are 9 animals total
      const remainingAnimals = totalAnimals - animals.length - opponentAnimals;
      const isPossible = animals.length + remainingAnimals >= 5;
      progress.push({ name: 'Animals', current: animals.length, needed: 5, isPossible });
    }

    // Chaff progress (need 10)
    const chaff = cards.filter(c => c.type === CARD_TYPES.CHAFF);
    if (chaff.length > 0 && chaff.length < 10) {
      const opponentChaff = opponentCards.filter(c => c.type === CARD_TYPES.CHAFF).length;
      const totalChaff = 24; // There are 24 chaff cards total
      const remainingChaff = totalChaff - chaff.length - opponentChaff;
      const isPossible = chaff.length + remainingChaff >= 10;
      progress.push({ name: 'Chaff', current: chaff.length, needed: 10, isPossible });
    }

    // Boar-Deer-Butterfly progress
    const boar = cards.find(c => c.name.includes('boar'));
    const deer = cards.find(c => c.name.includes('deer'));
    const butterflies = cards.find(c => c.name.includes('butterflies'));
    const inoShikaCho = [boar, deer, butterflies].filter(Boolean).length;
    if (inoShikaCho > 0 && inoShikaCho < 3) {
      const opponentBoar = opponentCards.find(c => c.name.includes('boar'));
      const opponentDeer = opponentCards.find(c => c.name.includes('deer'));
      const opponentButterflies = opponentCards.find(c => c.name.includes('butterflies'));
      const opponentInoShikaCho = [opponentBoar, opponentDeer, opponentButterflies].filter(Boolean).length;
      // Can only complete if opponent doesn't have any of the missing cards
      const isPossible = inoShikaCho + (3 - inoShikaCho - opponentInoShikaCho) >= 3;
      progress.push({ name: 'Boar-Deer-Butterfly', current: inoShikaCho, needed: 3, isPossible });
    }

    return progress;
  }
}
