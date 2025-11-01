/**
 * Complete hanafuda deck - 48 cards across 12 months
 * Each card has: month, type (bright/animal/ribbon/chaff), points, and name
 */

export const CARD_TYPES = {
  BRIGHT: 'bright',      // 光 (hikari) - 20 points
  ANIMAL: 'animal',      // 種 (tane) - 10 points
  RIBBON: 'ribbon',      // 短 (tan) - 5 points
  CHAFF: 'chaff'         // カス (kasu) - 1 point
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
  { id: 1, month: MONTHS.JANUARY, type: CARD_TYPES.BRIGHT, name: 'January - bright - crane', points: 20, isSpecial: true, image: '/assets/cards/Jan-bright.png' },
  { id: 2, month: MONTHS.JANUARY, type: CARD_TYPES.RIBBON, name: 'January - ribbon - poetry', points: 5, ribbonColor: 'red', image: '/assets/cards/Jan-poetry.png' },
  { id: 3, month: MONTHS.JANUARY, type: CARD_TYPES.CHAFF, name: 'January - chaff', points: 1, image: '/assets/cards/Jan-chaff-1.png' },
  { id: 4, month: MONTHS.JANUARY, type: CARD_TYPES.CHAFF, name: 'January - chaff', points: 1, image: '/assets/cards/Jan-chaff-2.png' },

  // February - Plum (梅)
  { id: 5, month: MONTHS.FEBRUARY, type: CARD_TYPES.ANIMAL, name: 'February - animal - bush warbler', points: 10 },
  { id: 6, month: MONTHS.FEBRUARY, type: CARD_TYPES.RIBBON, name: 'February - ribbon - poetry', points: 5, ribbonColor: 'red' },
  { id: 7, month: MONTHS.FEBRUARY, type: CARD_TYPES.CHAFF, name: 'February - chaff', points: 1 },
  { id: 8, month: MONTHS.FEBRUARY, type: CARD_TYPES.CHAFF, name: 'February - chaff', points: 1 },

  // March - Cherry Blossom (桜)
  { id: 9, month: MONTHS.MARCH, type: CARD_TYPES.BRIGHT, name: 'March - bright - curtain', points: 20, isSpecial: true },
  { id: 10, month: MONTHS.MARCH, type: CARD_TYPES.RIBBON, name: 'March - ribbon - poetry', points: 5, ribbonColor: 'red' },
  { id: 11, month: MONTHS.MARCH, type: CARD_TYPES.CHAFF, name: 'March - chaff', points: 1 },
  { id: 12, month: MONTHS.MARCH, type: CARD_TYPES.CHAFF, name: 'March - chaff', points: 1 },

  // April - Wisteria (藤)
  { id: 13, month: MONTHS.APRIL, type: CARD_TYPES.ANIMAL, name: 'April - animal - cuckoo', points: 10 },
  { id: 14, month: MONTHS.APRIL, type: CARD_TYPES.RIBBON, name: 'April - ribbon', points: 5, ribbonColor: 'red' },
  { id: 15, month: MONTHS.APRIL, type: CARD_TYPES.CHAFF, name: 'April - chaff', points: 1 },
  { id: 16, month: MONTHS.APRIL, type: CARD_TYPES.CHAFF, name: 'April - chaff', points: 1 },

  // May - Iris (菖蒲)
  { id: 17, month: MONTHS.MAY, type: CARD_TYPES.ANIMAL, name: 'May - animal - bridge', points: 10 },
  { id: 18, month: MONTHS.MAY, type: CARD_TYPES.RIBBON, name: 'May - ribbon', points: 5, ribbonColor: 'red' },
  { id: 19, month: MONTHS.MAY, type: CARD_TYPES.CHAFF, name: 'May - chaff', points: 1 },
  { id: 20, month: MONTHS.MAY, type: CARD_TYPES.CHAFF, name: 'May - chaff', points: 1 },

  // June - Peony (牡丹)
  { id: 21, month: MONTHS.JUNE, type: CARD_TYPES.ANIMAL, name: 'June - animal - butterflies', points: 10 },
  { id: 22, month: MONTHS.JUNE, type: CARD_TYPES.RIBBON, name: 'June - ribbon - blue', points: 5, ribbonColor: 'blue' },
  { id: 23, month: MONTHS.JUNE, type: CARD_TYPES.CHAFF, name: 'June - chaff', points: 1 },
  { id: 24, month: MONTHS.JUNE, type: CARD_TYPES.CHAFF, name: 'June - chaff', points: 1 },

  // July - Bush Clover (萩)
  { id: 25, month: MONTHS.JULY, type: CARD_TYPES.ANIMAL, name: 'July - animal - boar', points: 10 },
  { id: 26, month: MONTHS.JULY, type: CARD_TYPES.RIBBON, name: 'July - ribbon', points: 5, ribbonColor: 'red' },
  { id: 27, month: MONTHS.JULY, type: CARD_TYPES.CHAFF, name: 'July - chaff', points: 1 },
  { id: 28, month: MONTHS.JULY, type: CARD_TYPES.CHAFF, name: 'July - chaff', points: 1 },

  // August - Susuki Grass (芒)
  { id: 29, month: MONTHS.AUGUST, type: CARD_TYPES.BRIGHT, name: 'August - bright - moon', points: 20, isSpecial: true },
  { id: 30, month: MONTHS.AUGUST, type: CARD_TYPES.ANIMAL, name: 'August - animal - geese', points: 10 },
  { id: 31, month: MONTHS.AUGUST, type: CARD_TYPES.CHAFF, name: 'August - chaff', points: 1 },
  { id: 32, month: MONTHS.AUGUST, type: CARD_TYPES.CHAFF, name: 'August - chaff', points: 1 },

  // September - Chrysanthemum (菊)
  { id: 33, month: MONTHS.SEPTEMBER, type: CARD_TYPES.ANIMAL, name: 'September - animal - sake cup', points: 10 },
  { id: 34, month: MONTHS.SEPTEMBER, type: CARD_TYPES.RIBBON, name: 'September - ribbon - blue', points: 5, ribbonColor: 'blue' },
  { id: 35, month: MONTHS.SEPTEMBER, type: CARD_TYPES.CHAFF, name: 'September - chaff', points: 1 },
  { id: 36, month: MONTHS.SEPTEMBER, type: CARD_TYPES.CHAFF, name: 'September - chaff', points: 1 },

  // October - Maple (紅葉)
  { id: 37, month: MONTHS.OCTOBER, type: CARD_TYPES.ANIMAL, name: 'October - animal - deer', points: 10 },
  { id: 38, month: MONTHS.OCTOBER, type: CARD_TYPES.RIBBON, name: 'October - ribbon - blue', points: 5, ribbonColor: 'blue' },
  { id: 39, month: MONTHS.OCTOBER, type: CARD_TYPES.CHAFF, name: 'October - chaff', points: 1 },
  { id: 40, month: MONTHS.OCTOBER, type: CARD_TYPES.CHAFF, name: 'October - chaff', points: 1 },

  // November - Willow (柳)
  { id: 41, month: MONTHS.NOVEMBER, type: CARD_TYPES.BRIGHT, name: 'November - bright - rain man', points: 20, isSpecial: true },
  { id: 42, month: MONTHS.NOVEMBER, type: CARD_TYPES.ANIMAL, name: 'November - animal - swallow', points: 10 },
  { id: 43, month: MONTHS.NOVEMBER, type: CARD_TYPES.RIBBON, name: 'November - ribbon - red', points: 5, ribbonColor: 'red' },
  { id: 44, month: MONTHS.NOVEMBER, type: CARD_TYPES.CHAFF, name: 'November - chaff - lightning', points: 1 },

  // December - Paulownia (桐)
  { id: 45, month: MONTHS.DECEMBER, type: CARD_TYPES.BRIGHT, name: 'December - bright - phoenix', points: 20, isSpecial: true },
  { id: 46, month: MONTHS.DECEMBER, type: CARD_TYPES.CHAFF, name: 'December - chaff', points: 1 },
  { id: 47, month: MONTHS.DECEMBER, type: CARD_TYPES.CHAFF, name: 'December - chaff', points: 1 },
  { id: 48, month: MONTHS.DECEMBER, type: CARD_TYPES.CHAFF, name: 'December - chaff', points: 1 }
];
