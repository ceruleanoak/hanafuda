/**
 * Complete hanafuda deck - 48 cards across 12 months
 * Each card has: month, type (bright/animal/ribbon/chaff), points, and name
 */

export const CARD_TYPES = {
  BRIGHT: 'bright',      // 光 (hikari) - 20 points
  ANIMAL: 'animal',      // 種 (tane) - 10 points
  RIBBON: 'ribbon',      // 短 (tan) - 5 points
  CHAFF: 'chaff',        // カス (kasu) - 1 point
  BOMB: 'bomb'           // 💣 Bomb card (special pass card for bomb variation)
};

export const MONTHS = {
  JANUARY: 'January',
  FEBRUARY: 'February',
  MARCH: 'March',
  APRIL: 'April',
  MAY: 'May',
  JUNE: 'June',
  JULY: 'July',
  AUGUST: 'August',
  SEPTEMBER: 'September',
  OCTOBER: 'October',
  NOVEMBER: 'November',
  DECEMBER: 'December'
};

export const HANAFUDA_DECK = [
  // January - Pine (松)
  { id: 1, month: MONTHS.JANUARY, type: CARD_TYPES.BRIGHT, name: 'January - bright - crane', points: 20, isSpecial: true, image: 'assets/cards/Jan-bright.png' },
  { id: 2, month: MONTHS.JANUARY, type: CARD_TYPES.RIBBON, name: 'January - ribbon - poetry', points: 5, ribbonColor: 'red', image: 'assets/cards/Jan-poetry.png' },
  { id: 3, month: MONTHS.JANUARY, type: CARD_TYPES.CHAFF, name: 'January - chaff', points: 1, image: 'assets/cards/Jan-chaff-1.png' },
  { id: 4, month: MONTHS.JANUARY, type: CARD_TYPES.CHAFF, name: 'January - chaff', points: 1, image: 'assets/cards/Jan-chaff-2.png' },

  // February - Plum (梅)
  { id: 5, month: MONTHS.FEBRUARY, type: CARD_TYPES.ANIMAL, name: 'February - animal - bush warbler', points: 10, image: 'assets/cards/Feb-animal.png' },
  { id: 6, month: MONTHS.FEBRUARY, type: CARD_TYPES.RIBBON, name: 'February - ribbon - poetry', points: 5, ribbonColor: 'red', image: 'assets/cards/Feb-poetry.png' },
  { id: 7, month: MONTHS.FEBRUARY, type: CARD_TYPES.CHAFF, name: 'February - chaff', points: 1, image: 'assets/cards/Feb-chaff-1.png' },
  { id: 8, month: MONTHS.FEBRUARY, type: CARD_TYPES.CHAFF, name: 'February - chaff', points: 1, image: 'assets/cards/Feb-chaff-2.png' },

  // March - Cherry Blossom (桜)
  { id: 9, month: MONTHS.MARCH, type: CARD_TYPES.BRIGHT, name: 'March - bright - curtain', points: 20, isSpecial: true, image: 'assets/cards/Mar-bright.png' },
  { id: 10, month: MONTHS.MARCH, type: CARD_TYPES.RIBBON, name: 'March - ribbon - poetry', points: 5, ribbonColor: 'red', image: 'assets/cards/Mar-poetry.png' },
  { id: 11, month: MONTHS.MARCH, type: CARD_TYPES.CHAFF, name: 'March - chaff', points: 1, image: 'assets/cards/Mar-chaff-1.png' },
  { id: 12, month: MONTHS.MARCH, type: CARD_TYPES.CHAFF, name: 'March - chaff', points: 1, image: 'assets/cards/Mar-chaff-2.png' },

  // April - Wisteria (藤)
  { id: 13, month: MONTHS.APRIL, type: CARD_TYPES.ANIMAL, name: 'April - animal - cuckoo', points: 10, image: 'assets/cards/Apr-animal.png' },
  { id: 14, month: MONTHS.APRIL, type: CARD_TYPES.RIBBON, name: 'April - ribbon', points: 5, ribbonColor: 'red', image: 'assets/cards/Apr-ribbon.png' },
  { id: 15, month: MONTHS.APRIL, type: CARD_TYPES.CHAFF, name: 'April - chaff', points: 1, image: 'assets/cards/Apr-chaff-1.png' },
  { id: 16, month: MONTHS.APRIL, type: CARD_TYPES.CHAFF, name: 'April - chaff', points: 1, image: 'assets/cards/Apr-chaff-2.png' },

  // May - Iris (菖蒲)
  { id: 17, month: MONTHS.MAY, type: CARD_TYPES.ANIMAL, name: 'May - animal - bridge', points: 10, image: 'assets/cards/May-animal.png' },
  { id: 18, month: MONTHS.MAY, type: CARD_TYPES.RIBBON, name: 'May - ribbon', points: 5, ribbonColor: 'red', image: 'assets/cards/May-ribbon.png' },
  { id: 19, month: MONTHS.MAY, type: CARD_TYPES.CHAFF, name: 'May - chaff', points: 1, image: 'assets/cards/May-chaff-1.png' },
  { id: 20, month: MONTHS.MAY, type: CARD_TYPES.CHAFF, name: 'May - chaff', points: 1, image: 'assets/cards/May-chaff-2.png' },

  // June - Peony (牡丹)
  { id: 21, month: MONTHS.JUNE, type: CARD_TYPES.ANIMAL, name: 'June - animal - butterflies', points: 10, image: 'assets/cards/June-animal.png' },
  { id: 22, month: MONTHS.JUNE, type: CARD_TYPES.RIBBON, name: 'June - ribbon - blue', points: 5, ribbonColor: 'blue', image: 'assets/cards/June-blue.png' },
  { id: 23, month: MONTHS.JUNE, type: CARD_TYPES.CHAFF, name: 'June - chaff', points: 1, image: 'assets/cards/June-chaff-1.png' },
  { id: 24, month: MONTHS.JUNE, type: CARD_TYPES.CHAFF, name: 'June - chaff', points: 1, image: 'assets/cards/June-chaff-2.png' },

  // July - Bush Clover (萩)
  { id: 25, month: MONTHS.JULY, type: CARD_TYPES.ANIMAL, name: 'July - animal - boar', points: 10, image: 'assets/cards/July-animal.png' },
  { id: 26, month: MONTHS.JULY, type: CARD_TYPES.RIBBON, name: 'July - ribbon', points: 5, ribbonColor: 'red', image: 'assets/cards/July-ribbon.png' },
  { id: 27, month: MONTHS.JULY, type: CARD_TYPES.CHAFF, name: 'July - chaff', points: 1, image: 'assets/cards/July-chaff-1.png' },
  { id: 28, month: MONTHS.JULY, type: CARD_TYPES.CHAFF, name: 'July - chaff', points: 1, image: 'assets/cards/July-chaff-2.png' },

  // August - Susuki Grass (芒)
  { id: 29, month: MONTHS.AUGUST, type: CARD_TYPES.BRIGHT, name: 'August - bright - moon', points: 20, isSpecial: true, image: 'assets/cards/Aug-bright.png' },
  { id: 30, month: MONTHS.AUGUST, type: CARD_TYPES.ANIMAL, name: 'August - animal - geese', points: 10, image: 'assets/cards/Aug-animal.png' },
  { id: 31, month: MONTHS.AUGUST, type: CARD_TYPES.CHAFF, name: 'August - chaff', points: 1, image: 'assets/cards/Aug-chaff-1.png' },
  { id: 32, month: MONTHS.AUGUST, type: CARD_TYPES.CHAFF, name: 'August - chaff', points: 1, image: 'assets/cards/Aug-chaff-2.png' },

  // September - Chrysanthemum (菊)
  { id: 33, month: MONTHS.SEPTEMBER, type: CARD_TYPES.ANIMAL, name: 'September - animal - sake cup', points: 10, image: 'assets/cards/Sept-animal.png' },
  { id: 34, month: MONTHS.SEPTEMBER, type: CARD_TYPES.RIBBON, name: 'September - ribbon - blue', points: 5, ribbonColor: 'blue', image: 'assets/cards/Sept-blue.png' },
  { id: 35, month: MONTHS.SEPTEMBER, type: CARD_TYPES.CHAFF, name: 'September - chaff', points: 1, image: 'assets/cards/Sept-chaff-1.png' },
  { id: 36, month: MONTHS.SEPTEMBER, type: CARD_TYPES.CHAFF, name: 'September - chaff', points: 1, image: 'assets/cards/Sept-chaff-2.png' },

  // October - Maple (紅葉)
  { id: 37, month: MONTHS.OCTOBER, type: CARD_TYPES.ANIMAL, name: 'October - animal - deer', points: 10, image: 'assets/cards/Oct-animal.png' },
  { id: 38, month: MONTHS.OCTOBER, type: CARD_TYPES.RIBBON, name: 'October - ribbon - blue', points: 5, ribbonColor: 'blue', image: 'assets/cards/Oct-blue.png' },
  { id: 39, month: MONTHS.OCTOBER, type: CARD_TYPES.CHAFF, name: 'October - chaff', points: 1, image: 'assets/cards/Oct-chaff-1.png' },
  { id: 40, month: MONTHS.OCTOBER, type: CARD_TYPES.CHAFF, name: 'October - chaff', points: 1, image: 'assets/cards/Oct-chaff-2.png' },

  // November - Willow (柳)
  { id: 41, month: MONTHS.NOVEMBER, type: CARD_TYPES.BRIGHT, name: 'November - bright - rain man', points: 20, isSpecial: true, image: 'assets/cards/Nov-bright.png' },
  { id: 42, month: MONTHS.NOVEMBER, type: CARD_TYPES.ANIMAL, name: 'November - animal - swallow', points: 10, image: 'assets/cards/Nov-animal.png' },
  { id: 43, month: MONTHS.NOVEMBER, type: CARD_TYPES.RIBBON, name: 'November - ribbon - red', points: 5, ribbonColor: 'red', image: 'assets/cards/Nov-ribbon.png' },
  { id: 44, month: MONTHS.NOVEMBER, type: CARD_TYPES.CHAFF, name: 'November - chaff - lightning', points: 1, image: 'assets/cards/Nov-chaff.png' },

  // December - Paulownia (桐)
  { id: 45, month: MONTHS.DECEMBER, type: CARD_TYPES.BRIGHT, name: 'December - bright - phoenix', points: 20, isSpecial: true, image: 'assets/cards/Dec-bright.png' },
  { id: 46, month: MONTHS.DECEMBER, type: CARD_TYPES.CHAFF, name: 'December - chaff', points: 1, image: 'assets/cards/Dec-chaff-1.png' },
  { id: 47, month: MONTHS.DECEMBER, type: CARD_TYPES.CHAFF, name: 'December - chaff', points: 1, image: 'assets/cards/Dec-chaff-2.png' },
  { id: 48, month: MONTHS.DECEMBER, type: CARD_TYPES.CHAFF, name: 'December - chaff', points: 1, image: 'assets/cards/Dec-chaff-3.png' }
];
