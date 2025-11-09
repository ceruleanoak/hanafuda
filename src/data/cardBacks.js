/**
 * Card Back Definitions
 * Each card back has:
 * - id: unique identifier
 * - name: display name
 * - image: path to the card back image
 * - unlocked: whether the card back is unlocked (all true by default for now)
 * - unlockCondition: description of how to unlock (for future use)
 */

export const CARD_BACKS = [
  {
    id: 'default',
    name: 'Classic',
    image: 'assets/card-backs/default.png',
    unlocked: true,
    unlockCondition: 'Default card back'
  },
  {
    id: 'sakura',
    name: 'Sakura',
    image: 'assets/card-backs/sakura.png',
    unlocked: true,
    unlockCondition: 'Win 10 games'
  },
  {
    id: 'koi',
    name: 'Koi',
    image: 'assets/card-backs/koi.png',
    unlocked: true,
    unlockCondition: 'Win with Five Brights'
  },
  {
    id: 'moon',
    name: 'Moon',
    image: 'assets/card-backs/moon.png',
    unlocked: true,
    unlockCondition: 'Win 25 games'
  },
  {
    id: 'crane',
    name: 'Crane',
    image: 'assets/card-backs/crane.png',
    unlocked: true,
    unlockCondition: 'Win 50 games'
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    image: 'assets/card-backs/phoenix.png',
    unlocked: true,
    unlockCondition: 'Complete all Yaku'
  }
];

/**
 * Get the currently selected card back from localStorage
 */
export function getSelectedCardBack() {
  const stored = localStorage.getItem('selectedCardBack');
  return stored || 'default';
}

/**
 * Set the selected card back in localStorage
 */
export function setSelectedCardBack(cardBackId) {
  localStorage.setItem('selectedCardBack', cardBackId);
}

/**
 * Get card back by ID
 */
export function getCardBackById(id) {
  return CARD_BACKS.find(cb => cb.id === id) || CARD_BACKS[0];
}
