/**
 * Teyaku (Hand Combinations) for Hachi-Hachi
 *
 * Teyaku are scoring combinations evaluated in a player's hand at the start of
 * a Hachi-Hachi round. Players score points for teyaku as compensation for having
 * hands that are generally poor for capturing cards.
 *
 * Teyaku fall into two groups:
 * - Group A: Set teyaku (combinations of same-month cards)
 * - Group B: Chaff teyaku (combinations of chaff/ribbon cards)
 *
 * Each player scores for ONE teyaku from Group A and ONE from Group B,
 * choosing the most valuable combination in each group.
 */
export class Teyaku {
  /**
   * Detect all teyaku in a hand
   * Returns the best teyaku from Group A and Group B
   * @param {Array} hand - Array of card objects
   * @returns {Array} Array of claimed teyaku objects
   */
  static detectTeyaku(hand) {
    const groupATeyaku = this.findGroupATeyaku(hand);
    const groupBTeyaku = this.findGroupBTeyaku(hand);

    const claimed = [];

    if (groupATeyaku) {
      claimed.push(groupATeyaku);
    }
    if (groupBTeyaku) {
      claimed.push(groupBTeyaku);
    }

    return claimed;
  }

  /**
   * Find the best Group A teyaku (set combinations)
   * @param {Array} hand - Player's hand
   * @returns {Object|null} Best Group A teyaku or null
   */
  static findGroupATeyaku(hand) {
    const candidates = [];

    // Check for each type in order of value (highest first)
    // This ensures we return the most valuable one

    // Four-Three (7.5 kan) - Four of a kind + Triplet
    const fourThree = this.checkFourThree(hand);
    if (fourThree) candidates.push({ ...fourThree, priority: 0 });

    // One-Two-Four (8 kan) - 4 of a kind, pair, singleton
    const oneTwoFour = this.checkOneTwoFour(hand);
    if (oneTwoFour) candidates.push({ ...oneTwoFour, priority: 1 });

    // Two Standing Triplets (8 kan)
    const twoStanding = this.checkTwoStandingTriplets(hand);
    if (twoStanding) candidates.push({ ...twoStanding, priority: 2 });

    // Triplet and Two Pairs (7 kan)
    const tripletTwoPairs = this.checkTripletAndTwoPairs(hand);
    if (tripletTwoPairs) candidates.push({ ...tripletTwoPairs, priority: 3 });

    // Two Triplets (6 kan)
    const twoTriplets = this.checkTwoTriplets(hand);
    if (twoTriplets) candidates.push({ ...twoTriplets, priority: 4 });

    // Four of a Kind (6 kan)
    const fourOfAKind = this.checkFourOfAKind(hand);
    if (fourOfAKind) candidates.push({ ...fourOfAKind, priority: 5 });

    // Three Pairs (4 kan)
    const threePairs = this.checkThreePairs(hand);
    if (threePairs) candidates.push({ ...threePairs, priority: 6 });

    // Triplet and Standing Triplet (7 kan)
    const tripletStanding = this.checkTripletAndStandingTriplet(hand);
    if (tripletStanding) candidates.push({ ...tripletStanding, priority: 7 });

    // Standing Triplet (3 kan)
    const standing = this.checkStandingTriplet(hand);
    if (standing) candidates.push({ ...standing, priority: 8 });

    // Regular Triplet (2 kan)
    const triplet = this.checkTriplet(hand);
    if (triplet) candidates.push({ ...triplet, priority: 9 });

    // Return highest value candidate
    if (candidates.length === 0) return null;

    // Sort by value descending, then priority ascending
    candidates.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.priority - b.priority;
    });

    return candidates[0];
  }

  /**
   * Find the best Group B teyaku (chaff combinations)
   * @param {Array} hand - Player's hand
   * @returns {Object|null} Best Group B teyaku or null
   */
  static findGroupBTeyaku(hand) {
    const candidates = [];

    // Empty Hand (4 kan) - 7 chaff cards
    const emptyHand = this.checkEmptyHand(hand);
    if (emptyHand) candidates.push({ ...emptyHand, priority: 0 });

    // One Bright (4 kan) - 1 bright, 6 chaff
    const oneBright = this.checkOneBright(hand);
    if (oneBright) candidates.push({ ...oneBright, priority: 1 });

    // One Animal (3 kan) - 1 animal, 6 chaff
    const oneAnimal = this.checkOneAnimal(hand);
    if (oneAnimal) candidates.push({ ...oneAnimal, priority: 2 });

    // One Ribbon (3 kan) - 1 ribbon, 6 chaff
    const oneRibbon = this.checkOneRibbon(hand);
    if (oneRibbon) candidates.push({ ...oneRibbon, priority: 3 });

    // Red (2 kan) - 2+ ribbons, rest chaff
    const red = this.checkRed(hand);
    if (red) candidates.push({ ...red, priority: 4 });

    // Return highest value candidate
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.priority - b.priority;
    });

    return candidates[0];
  }

  /**
   * GROUP A CHECKERS - Set Teyaku
   */

  static checkTriplet(hand) {
    const monthCounts = this.countByMonth(hand);
    for (const [month, count] of Object.entries(monthCounts)) {
      if (count >= 3) {
        return {
          name: 'Triplet',
          japName: 'Sanbon',
          value: 2,
          type: 'groupA',
          cardsInvolved: this.getCardsOfMonth(hand, month).slice(0, 3)
        };
      }
    }
    return null;
  }

  static checkStandingTriplet(hand) {
    // Standing triplets: Wisteria, Iris, Bush Clover (4,5,7) OR all three Paulownia chaff (12)
    const standingMonths = [4, 5, 7, 12];
    const monthCounts = this.countByMonth(hand);

    for (const month of standingMonths) {
      if (monthCounts[month] >= 3) {
        return {
          name: 'Standing Triplet',
          japName: 'Tatesanbon',
          value: 3,
          type: 'groupA',
          cardsInvolved: this.getCardsOfMonth(hand, month).slice(0, 3)
        };
      }
    }
    return null;
  }

  static checkTwoTriplets(hand) {
    const monthCounts = this.countByMonth(hand);
    let tripletCount = 0;
    const tripletMonths = [];

    for (const [month, count] of Object.entries(monthCounts)) {
      if (count >= 3) {
        tripletCount++;
        tripletMonths.push(month);
      }
    }

    if (tripletCount >= 2) {
      return {
        name: 'Two Triplets',
        japName: 'Futasanbon',
        value: 6,
        type: 'groupA',
        cardsInvolved: this.getTripletCards(hand, tripletMonths.slice(0, 2))
      };
    }
    return null;
  }

  static checkTwoStandingTriplets(hand) {
    const standingMonths = [4, 5, 7, 12];
    const monthCounts = this.countByMonth(hand);
    let standingCount = 0;
    const standingMonthsFound = [];

    for (const month of standingMonths) {
      if (monthCounts[month] >= 3) {
        standingCount++;
        standingMonthsFound.push(month);
      }
    }

    if (standingCount >= 2) {
      return {
        name: 'Two Standing Triplets',
        japName: 'Futatatesanbon',
        value: 8,
        type: 'groupA',
        cardsInvolved: this.getTripletCards(hand, standingMonthsFound.slice(0, 2))
      };
    }
    return null;
  }

  static checkTripletAndStandingTriplet(hand) {
    const monthCounts = this.countByMonth(hand);
    const standingMonths = [4, 5, 7, 12];
    let regularTriplet = null;
    let standingTriplet = null;

    for (const [month, count] of Object.entries(monthCounts)) {
      if (count >= 3) {
        if (standingMonths.includes(parseInt(month))) {
          standingTriplet = month;
        } else if (!regularTriplet) {
          regularTriplet = month;
        }
      }
    }

    if (regularTriplet && standingTriplet) {
      return {
        name: 'Triplet and Standing Triplet',
        japName: 'Sanbon tatesanbon',
        value: 7,
        type: 'groupA',
        cardsInvolved: this.getTripletCards(hand, [regularTriplet, standingTriplet])
      };
    }
    return null;
  }

  static checkThreePairs(hand) {
    const monthCounts = this.countByMonth(hand);
    let pairCount = 0;
    const pairMonths = [];

    for (const [month, count] of Object.entries(monthCounts)) {
      if (count >= 2) {
        pairCount++;
        pairMonths.push(month);
      }
    }

    if (pairCount >= 3) {
      return {
        name: 'Three Pairs',
        japName: 'Kuttsuki',
        value: 4,
        type: 'groupA',
        cardsInvolved: this.getPairCards(hand, pairMonths.slice(0, 3))
      };
    }
    return null;
  }

  static checkFourOfAKind(hand) {
    const monthCounts = this.countByMonth(hand);
    for (const [month, count] of Object.entries(monthCounts)) {
      if (count === 4) {
        return {
          name: 'Four of a Kind',
          japName: 'Teshi',
          value: 6,
          type: 'groupA',
          cardsInvolved: this.getCardsOfMonth(hand, month)
        };
      }
    }
    return null;
  }

  static checkTripletAndTwoPairs(hand) {
    const monthCounts = this.countByMonth(hand);
    let triplet = null;
    let pairCount = 0;
    const pairMonths = [];

    for (const [month, count] of Object.entries(monthCounts)) {
      if (count === 3) {
        triplet = month;
      } else if (count === 2) {
        pairCount++;
        pairMonths.push(month);
      }
    }

    if (triplet && pairCount >= 2) {
      return {
        name: 'Triplet and Two Pairs',
        japName: 'Haneken',
        value: 7,
        type: 'groupA',
        cardsInvolved: [
          ...this.getCardsOfMonth(hand, triplet).slice(0, 3),
          ...this.getPairCards(hand, pairMonths.slice(0, 2))
        ]
      };
    }
    return null;
  }

  static checkOneTwoFour(hand) {
    const monthCounts = this.countByMonth(hand);
    let fourOfAKind = null;
    let pair = null;
    let singleton = null;

    for (const [month, count] of Object.entries(monthCounts)) {
      if (count === 4) {
        fourOfAKind = month;
      } else if (count === 2) {
        pair = month;
      } else if (count === 1) {
        singleton = month;
      }
    }

    if (fourOfAKind && pair && singleton) {
      return {
        name: 'One-Two-Four',
        japName: 'Ichinishi',
        value: 8,
        type: 'groupA',
        cardsInvolved: hand // Must show all 7 cards
      };
    }
    return null;
  }

  static checkFourThree(hand) {
    const monthCounts = this.countByMonth(hand);
    let fourOfAKind = null;
    let triplet = null;

    for (const [month, count] of Object.entries(monthCounts)) {
      if (count === 4) {
        fourOfAKind = month;
      } else if (count === 3) {
        triplet = month;
      }
    }

    if (fourOfAKind && triplet) {
      return {
        name: 'Four-Three',
        japName: 'Shisou',
        value: 20, // Note: highest value single teyaku
        type: 'groupA',
        cardsInvolved: [
          ...this.getCardsOfMonth(hand, fourOfAKind),
          ...this.getCardsOfMonth(hand, triplet).slice(0, 3)
        ]
      };
    }
    return null;
  }

  /**
   * GROUP B CHECKERS - Chaff Teyaku
   * Note: For these purposes, Willow cards count as Chaff
   */

  static checkEmptyHand(hand) {
    const chaffCount = hand.filter(c => this.isChaffOrWillow(c)).length;
    if (chaffCount === 7) {
      return {
        name: 'Empty Hand',
        japName: 'Karasu',
        value: 4,
        type: 'groupB',
        cardsInvolved: hand
      };
    }
    return null;
  }

  static checkOneBright(hand) {
    const brights = hand.filter(c => c.type === 'bright');
    const chaffAndWillow = hand.filter(c => this.isChaffOrWillow(c));

    if (brights.length === 1 && chaffAndWillow.length === 6) {
      return {
        name: 'One Bright',
        japName: 'Pikaichi',
        value: 4,
        type: 'groupB',
        cardsInvolved: chaffAndWillow
      };
    }
    return null;
  }

  static checkOneAnimal(hand) {
    const animals = hand.filter(c => c.type === 'animal');
    const chaffAndWillow = hand.filter(c => this.isChaffOrWillow(c));

    if (animals.length === 1 && chaffAndWillow.length === 6) {
      return {
        name: 'One Animal',
        japName: 'Toichi',
        value: 3,
        type: 'groupB',
        cardsInvolved: chaffAndWillow
      };
    }
    return null;
  }

  static checkOneRibbon(hand) {
    const ribbons = hand.filter(c => c.type === 'ribbon');
    const chaffAndWillow = hand.filter(c => this.isChaffOrWillow(c));

    if (ribbons.length === 1 && chaffAndWillow.length === 6) {
      return {
        name: 'One Ribbon',
        japName: "Tan'ichi",
        value: 3,
        type: 'groupB',
        cardsInvolved: chaffAndWillow
      };
    }
    return null;
  }

  static checkRed(hand) {
    const ribbons = hand.filter(c => c.type === 'ribbon');
    const chaffAndWillow = hand.filter(c => this.isChaffOrWillow(c));

    // Red: 2+ ribbons with chaff in remainder
    if (ribbons.length >= 2 && chaffAndWillow.length > 0) {
      return {
        name: 'Red',
        japName: 'Aka',
        value: 2,
        type: 'groupB',
        cardsInvolved: chaffAndWillow
      };
    }
    return null;
  }

  /**
   * HELPER FUNCTIONS
   */

  static countByMonth(hand) {
    const counts = {};
    hand.forEach(card => {
      counts[card.month] = (counts[card.month] || 0) + 1;
    });
    return counts;
  }

  static getCardsOfMonth(hand, month) {
    return hand.filter(c => c.month === parseInt(month));
  }

  static getTripletCards(hand, months) {
    const cards = [];
    for (const month of months) {
      const cardsOfMonth = this.getCardsOfMonth(hand, month);
      cards.push(...cardsOfMonth.slice(0, 3));
    }
    return cards;
  }

  static getPairCards(hand, months) {
    const cards = [];
    for (const month of months) {
      const cardsOfMonth = this.getCardsOfMonth(hand, month);
      cards.push(...cardsOfMonth.slice(0, 2));
    }
    return cards;
  }

  static isChaffOrWillow(card) {
    // Willow cards count as chaff for Group B teyaku
    return card.type === 'chaff' || card.month === 11;
  }
}
