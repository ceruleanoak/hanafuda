# Card Backs

Place card back images in this folder.

## File Naming Convention
- Each card back should be a PNG file
- Recommended size: 100x140 pixels (matching card dimensions)
- Example names: `default.png`, `sakura.png`, `koi.png`, etc.

## How to Add New Card Backs

### Step 1: Add Your Image
Place your card back image in this folder (`assets/card-backs/`).

### Step 2: Register in Code
Open `src/data/cardBacks.js` and add a new entry to the `CARD_BACKS` array:

```javascript
{
  id: 'your-card-id',           // Unique identifier (lowercase, no spaces)
  name: 'Display Name',          // Name shown in the UI
  image: 'assets/card-backs/your-image.png',  // Path to your image
  unlocked: true,                // Set to false if it needs to be unlocked
  unlockCondition: 'How to unlock this card back'  // Description shown for locked cards
}
```

### Example:
```javascript
{
  id: 'bamboo',
  name: 'Bamboo Forest',
  image: 'assets/card-backs/bamboo.png',
  unlocked: true,
  unlockCondition: 'Win 5 games in a row'
}
```

### Step 3: That's It!
The card back will automatically appear in the selection menu (🃏 button in the menu bar). If the image fails to load, a placeholder emoji (🃏) will be displayed instead.

## Current Card Backs
The following card backs are currently defined:
- **Classic** (default) - Default card back
- **Sakura** - Win 10 games
- **Koi** - Win with Five Brights
- **Moon** - Win 25 games
- **Crane** - Win 50 games
- **Phoenix** - Complete all Yaku

All are currently unlocked by default. To implement unlock logic, see `src/data/cardBacks.js`.
