# Hanafuda Koi-Koi

A JavaScript-based hanafuda koi-koi card game with HTML5 Canvas rendering.

🎮 **[Play Live Demo](https://ceruleanoak.github.io/hanafuda/)** (available after GitHub Pages is enabled)

## About

Hanafuda (花札) are traditional Japanese playing cards used for various games. This implementation features **Koi-Koi**, one of the most popular hanafuda games, where players compete to form scoring combinations called "yaku."

## Features

- ✅ Complete 48-card hanafuda deck (12 months × 4 cards)
- ✅ HTML5 Canvas rendering with placeholder cards
- ✅ Click-to-select card interaction
- ✅ Koi-koi game logic with yaku scoring
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
5. **Round End**: The round ends when all cards are played

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
- **N key**: Start new game
- **New Game button**: Reset the game

## Development

Built with:
- Vanilla JavaScript (ES6+ modules)
- HTML5 Canvas
- Vite (development server & bundler)

No external frameworks or libraries required!

## License

MIT

## TODO / Future Enhancements

- [ ] Implement full AI opponent
- [ ] Add "koi-koi" decision (continue or cash out)
- [ ] Multiple rounds with cumulative scoring
- [ ] Sound effects
- [ ] Animation for card captures
- [ ] Multiplayer support
- [ ] Mobile touch controls optimization
- [ ] Card image loading system
- [ ] Save/load game state

## Contributing

Feel free to open issues or submit pull requests!