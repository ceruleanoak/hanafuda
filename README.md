# Hanafuda Koi-Koi

A JavaScript-based hanafuda koi-koi card game with HTML5 Canvas rendering.

🎮 **[Play Live Demo](https://ceruleanoak.github.io/hanafuda/)** (available after GitHub Pages is enabled)

## About

Hanafuda (花札) are traditional Japanese playing cards used for various games. This implementation features **Koi-Koi**, one of the most popular hanafuda games, where players compete to form scoring combinations called "yaku."

## Features

- ✅ Complete 48-card hanafuda deck (12 months × 4 cards)
- ✅ HTML5 Canvas rendering with placeholder cards
- ✅ Click-to-select card interaction
- ✅ **Koi-Koi decision mechanic** - Choose to end round or continue playing for higher scores
- ✅ **Configurable rule variations** - Customize multipliers, viewing yaku, and more
- ✅ **Options menu** with persistent settings (localStorage)
- ✅ Koi-koi game logic with yaku scoring
- ✅ Multiple rounds (1, 3, 6, or 12 rounds)
- ✅ Help mode with card matching highlights
- ✅ Tutorial bubble for new players
- ✅ Support for high-resolution background textures
- 🎴 Ready for custom card images (PNG format recommended)

## Card Structure

Each card belongs to one of 12 months and has a type:
- **Bright (光)** - 20 points - 5 special cards
- **Animal (種)** - 10 points - 9 cards
- **Ribbon (短)** - 5 points - 10 cards
- **Chaff (カス)** - 1 point - 24 cards

## Yaku (Scoring Combinations)

| Yaku | Points | Description |
|------|--------|-------------|
| Five Brights | 15 | All 5 bright cards |
| Four Brights | 10 | 4 bright cards (excluding rain man) |
| Rainy Four Brights | 8 | 4 bright cards (including rain man) |
| Three Brights | 6 | 3 bright cards (excluding rain man) |
| Poetry Ribbons | 6 | 3 red poetry ribbons |
| Blue Ribbons | 6 | 3 blue ribbons |
| Boar-Deer-Butterfly | 6 | Special animal combination |
| Ribbons | 5+ | 5+ ribbon cards (+1 per extra) |
| Animals | 5+ | 5+ animal cards (+1 per extra) |
| Viewing Sake | 3 | Curtain + Sake cup |
| Moon Viewing Sake | 3 | Moon + Sake cup |
| Chaff | 1+ | 10+ chaff cards (+1 per extra) |

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The game will open automatically at `http://localhost:3000`

### Deploying to GitHub Pages

This project includes a GitHub Actions workflow that automatically deploys to GitHub Pages when you push to the `main` branch.

**Setup Steps:**

1. Go to your repository settings on GitHub
2. Navigate to **Pages** (under "Code and automation")
3. Under **Source**, select **GitHub Actions**
4. Push your changes to the `main` branch
5. The game will be automatically deployed to: `https://ceruleanoak.github.io/hanafuda/`

The deployment workflow is defined in `.github/workflows/deploy.yml`

## How to Play

1. **Your Turn**: Click a card from your hand (bottom row)
2. **Match or Place**:
   - Click a matching field card (same month) to capture both
   - Or click your selected card again to place it on the field
3. **Draw Phase**: A card is automatically drawn from the deck
   - If it matches a field card, both are captured automatically
   - Otherwise, it's placed on the field
4. **Scoring**: Form yaku (combinations) to earn points
5. **Koi-Koi Decision**: When you form a yaku, choose:
   - **Shobu** - End the round immediately and win with your points (safe)
   - **Koi-Koi** - Continue playing to improve your score (risky!)
6. **Round End**: The round ends when all cards are played or someone calls Shobu

### Koi-Koi Scoring Rules

**Winner Determination** (Winner-Take-All Mode):
- Scoring is like a **footrace** - only ONE player scores per round
- Round winner is determined by:
  1. **Shobu caller**: If you call shobu, you win immediately with your points
  2. **Koi-koi success**: If you call koi-koi and then capture more cards to improve your yaku, you win
  3. **Punish opponent's koi-koi**: If opponent calls koi-koi and you capture cards to form/improve a yaku, you win with 2× multiplier
  4. **Deck exhaustion**: If the deck runs out, the player with yaku wins (or both score if both have yaku)
- **NEVER score comparison**: The winner is determined by who ends the round, not by comparing yaku scores

**2× Multiplier Bonus**:
- You get the 2× multiplier ONLY if:
  - Opponent calls koi-koi
  - You capture a new card that improves your yaku
- You do NOT get the 2× multiplier if you call koi-koi yourself (even if you improve)

**Koi-Koi Risk**:
- If you call koi-koi but don't improve your score (via new captures), you lose all your points for that round

## Game Options

Click the **Options** button to customize your game:

### Koi-Koi Rules
- **Enable Koi-Koi Decision**: Toggle the koi-koi decision mechanic (default: ON)
- **Multiplier Mode**:
  - **2x (Single Double)** - Any koi-koi call results in 2x multiplier (default)
  - **2x→3x→4x (Cumulative)** - Multiple koi-koi calls stack multipliers
- **Auto-double 7+ Points**: Automatically double scores of 7 or more points (default: ON)
- **Both Players Score**: When OFF (default), uses traditional winner-take-all scoring where only the round winner gets points. When ON, both players score their yaku points.

### Yaku Rules
- **Viewing Sake (Hanami)**: Curtain + Sake Cup = 3 points
  - Always Enabled (default) / Always Disabled / Require Other Yaku
- **Moon Viewing Sake (Tsukimi)**: Moon + Sake Cup = 3 points
  - Always Enabled (default) / Always Disabled / Require Other Yaku

### Game Settings
- **Default Rounds**: 1, 3, 6, or 12 rounds (default: 6)

All settings are automatically saved to your browser's localStorage.

## Card Images

To use custom card images instead of placeholders:

1. **Recommended format**: PNG with transparency
2. **Recommended size**: 200-400px width, 300-600px height
3. **File naming**: Use the card names from `src/data/cards.js`
4. **Location**: Place images in `assets/cards/`

Example: `January - bright - crane.png`

## Background Textures

To add a custom background:

1. **Recommended formats**: JPEG or WebP for large textures
2. **Location**: Place in `assets/backgrounds/`
3. **Usage**: Uncomment and modify in `src/main.js`:

```javascript
game.loadBackground('./assets/backgrounds/your-texture.jpg');
```

## Project Structure

```
hanafuda/
├── src/
│   ├── index.html          # Main HTML
│   ├── styles.css          # Styling
│   ├── main.js             # Game initialization
│   ├── data/
│   │   └── cards.js        # 48-card deck data
│   ├── game/
│   │   ├── Deck.js         # Deck management
│   │   ├── KoiKoi.js       # Game logic
│   │   └── Yaku.js         # Scoring combinations
│   └── rendering/
│       ├── Renderer.js     # Canvas rendering
│       └── CardRenderer.js # Card drawing
├── assets/
│   ├── cards/              # Card images (add your own)
│   └── backgrounds/        # Background textures (add your own)
├── package.json
├── vite.config.js
└── README.md
```

## Controls

- **Mouse**: Click to select cards
- **H key** or **Help button**: Toggle help mode (highlights matching cards)
- **N key** or **New Game button**: Start new game
- **Options button**: Open game settings

## Development

Built with:
- Vanilla JavaScript (ES6+ modules)
- HTML5 Canvas
- Vite (development server & bundler)

No external frameworks or libraries required!

## License

MIT

## TODO / Future Enhancements

- [x] Implement full AI opponent
- [x] Add "koi-koi" decision (continue or cash out)
- [x] Multiple rounds with cumulative scoring
- [x] Rule variations and options menu
- [ ] Sound effects
- [x] Animation for card captures
- [ ] Multiplayer support
- [ ] Mobile touch controls optimization
- [ ] Card image loading system
- [ ] Advanced AI strategy for koi-koi decisions
- [ ] Statistics tracking and game history

## Contributing

Feel free to open issues or submit pull requests!