/**
 * Sakura.js
 *
 * Sakura (Hawaiian Hanafuda) Game Logic
 *
 * Key differences from Koi-Koi:
 * - No koi-koi continuation mechanic
 * - Different card point values (Brights=20, Ribbons=10, Animals=5, Chaff=0)
 * - Hiki (suit capture) rule
 * - Gaji (Lightning wild card) system
 * - Yaku subtract 50 points from opponents (instead of adding to player)
 * - Two-phase turn structure (hand card → draw card)
 * - Variable player count (2-4 players, currently extended to support multi-player)
 */

import { Deck } from './Deck.js';
import { SakuraYaku } from './SakuraYaku.js';
import { CARD_TYPES } from '../data/cards.js';
import { debugLogger } from '../utils/DebugLogger.js';

export class Sakura {
  constructor(gameOptions = null, card3DManager = null) {
    this.deck = new Deck();
    this.yakuChecker = new SakuraYaku();
    this.gameOptions = gameOptions;
    this.card3DManager = card3DManager;

    // Game configuration
    this.totalRounds = 6; // Standard Sakura match is 6 rounds
    this.currentRound = 0;
    this.playerCount = 2; // Default to 2 players, can be set via startNewGame

    // Card values in Sakura (different from Koi-Koi)
    this.SAKURA_CARD_VALUES = {
      [CARD_TYPES.BRIGHT]: 20,  // All brights = 20 points
      [CARD_TYPES.RIBBON]: 10,  // All ribbons = 10 points (corrected from 5)
      [CARD_TYPES.ANIMAL]: 5,   // All animals = 5 points (corrected from 1)
      [CARD_TYPES.CHAFF]: 0     // All chaff = 0 points
    };

    // Gaji (Lightning wild card) - November 4th card
    this.GAJI_CARD_ID = 44; // November - chaff

    // Variant tracking - loaded from gameOptions
    this.variants = {
      chitsiobiki: false,         // Three-of-a-kind trade
      victoryScoring: false,      // Count wins instead of cumulative points
      basaChu: false,             // Basa & Chu multipliers
      bothPlayersScore: false,    // Both players score (no penalties)
      oibana: false               // Auction variant
    };

    // Animation queue
    this.animationQueue = [];
    this.isAnimating = false;

    // Callbacks for UI
    this.roundSummaryCallback = null;
    this.hikiAnnouncementCallback = null;
    this.gajiSelectionCallback = null;

    // Initialize game state before reset
    this.dealerIndex = 0;

    this.reset();
  }

  // ============================================================
  // INITIALIZATION & SETUP
  // ============================================================

  /**
   * Update game options (called when variants are changed)
   */
  updateOptions(gameOptions) {
    this.gameOptions = gameOptions;
    // Load variant options
    if (gameOptions) {
      this.variants.chitsiobiki = gameOptions.get('chitsiobikiEnabled') || false;
      this.variants.victoryScoring = gameOptions.get('victoryScoringEnabled') || false;
      this.variants.basaChu = gameOptions.get('basaChuEnabled') || false;
      this.variants.bothPlayersScore = gameOptions.get('bothPlayersScoreEnabled') || false;
      this.variants.oibana = gameOptions.get('oibanaEnabled') || false;
    }
  }

  /**
   * Start a new Sakura game
   * @param {number} rounds - Number of rounds to play (default 6)
   * @param {number} playerCount - Number of players (2, 3, or 4)
   */
  startNewGame(rounds = 6, playerCount = 2) {
    debugLogger.log('sakura', `🌸 Starting new Sakura game`, {
      rounds,
      playerCount,
      gajiCardId: this.GAJI_CARD_ID,
      variants: this.variants
    });

    // Validate playerCount
    if (![2, 3, 4].includes(playerCount)) {
      console.warn(`Invalid player count ${playerCount}, defaulting to 2`);
      playerCount = 2;
    }

    this.totalRounds = rounds;
    this.playerCount = playerCount;
    this.currentRound = 1;
    this.dealerIndex = 0; // Player 0 (dealer) starts the game
    this.currentPlayerIndex = 0; // Dealer plays first

    // Load variants from gameOptions if available
    if (this.gameOptions) {
      this.variants.chitsiobiki = this.gameOptions.get('chitsiobikiEnabled') || false;
      this.variants.victoryScoring = this.gameOptions.get('victoryScoringEnabled') || false;
      this.variants.basaChu = this.gameOptions.get('basaChuEnabled') || false;
      this.variants.bothPlayersScore = this.gameOptions.get('bothPlayersScoreEnabled') || false;
      this.variants.oibana = this.gameOptions.get('oibanaEnabled') || false;
    }

    this.reset();
  }

  /**
   * Reset state for new round
   */
  reset() {
    this.deck.reset();

    // Initialize player array (if not already initialized)
    if (!this.players || this.players.length !== this.playerCount) {
      this.players = [];
      for (let i = 0; i < this.playerCount; i++) {
        this.players[i] = {
          hand: [],
          captured: [],
          yaku: null,
          matchScore: 0,
          roundWins: 0,
          isHuman: (i === 0), // Player 0 is always the human
          difficulty: 'normal'  // AI difficulty for non-human players
        };
      }
    }

    // Card zones
    this.field = [];

    // Reset player hands and captured
    for (let i = 0; i < this.playerCount; i++) {
      this.players[i].hand = [];
      this.players[i].captured = [];
      this.players[i].yaku = null;
    }

    // Hiki tracking - one array per player
    this.completedHikis = [];
    for (let i = 0; i < this.playerCount; i++) {
      this.completedHikis[i] = [];
    }

    // Gaji tracking
    this.gajiState = {
      location: null, // 'deck', 'player_X_hand', 'field', 'player_X_captured'
      pairedWithMonth: null, // If captured with Gaji, which month was paired
      isWildCard: false // Is Gaji currently acting as a wild card?
    };

    // Turn state
    this.currentPlayerIndex = this.dealerIndex; // Dealer plays first
    this.phase = (this.currentPlayerIndex === 0) ? 'select_hand' : 'opponent_turn';
    this.turnPhase = 1; // Phase 1: play from hand, Phase 2: draw from deck
    this.selectedCards = [];
    this.drawnCard = null;
    this.drawnCardMatches = [];
    this.lastPlayedCard = null; // Last card played by current player

    // Game flow
    this.gameOver = false;
    this.message = '';
    this.roundEnded = false;

    this.deal();
  }

  /**
   * Deal cards based on player count
   * 2 players: 10 cards each, 8 field cards
   * 3 players: 7 cards each, 6 field cards
   * 4 players: 5 cards each, 8 field cards
   */
  deal() {
    const dealingRules = {
      2: { handSize: 10, fieldSize: 8 },
      3: { handSize: 7, fieldSize: 6 },
      4: { handSize: 5, fieldSize: 8 }
    };

    const rules = dealingRules[this.playerCount];

    // Deal half of field cards first
    const halfFieldSize = Math.floor(rules.fieldSize / 2);
    this.field = this.deck.drawMultiple(halfFieldSize);

    // Deal hand cards to each player in turn order (starting with dealer)
    for (let i = 0; i < rules.handSize; i++) {
      for (let p = 0; p < this.playerCount; p++) {
        const playerIndex = (this.dealerIndex + p) % this.playerCount;
        const card = this.deck.draw();
        if (card) {
          this.players[playerIndex].hand.push(card);
        }
      }
    }

    // Deal remaining field cards
    const remainingFieldCards = rules.fieldSize - halfFieldSize;
    this.field.push(...this.deck.drawMultiple(remainingFieldCards));

    // Check for initial field Hiki (dealer advantage)
    this.checkInitialFieldHiki();

    // Check for Chitsiobiki (three-of-a-kind trade)
    this.checkChitsiobiki();

    // Locate Gaji card
    this.locateGaji();

    // Set initial message
    if (this.currentPlayerIndex === 0) {
      this.message = 'Your turn! Select a card from your hand.';
    } else {
      this.message = `Player ${this.currentPlayerIndex + 1}'s turn...`;
    }
  }

  /**
   * Check for initial field Hiki (dealer captures all 4 cards of a suit on field)
   */
  checkInitialFieldHiki() {
    const suitCounts = {};

    // Count cards by month (suit)
    this.field.forEach(card => {
      suitCounts[card.month] = (suitCounts[card.month] || 0) + 1;
    });

    // Check for complete suits (all 4 cards on field)
    for (let month in suitCounts) {
      if (suitCounts[month] === 4) {
        // Dealer captures all 4 cards
        const capturedCards = this.field.filter(c => c.month === month);
        this.players[this.dealerIndex].captured.push(...capturedCards);
        this.completedHikis[this.dealerIndex].push(month);

        if (this.dealerIndex === 0) {
          this.message = `Initial Hiki! You captured all 4 ${month} cards!`;
        } else {
          this.message = `Initial Hiki! Player ${this.dealerIndex + 1} captured all 4 ${month} cards!`;
        }

        // Remove captured cards from field
        this.field = this.field.filter(c => c.month !== month);
      }
    }
  }

  /**
   * Check for Chitsiobiki (three-of-a-kind trade)
   * If a player has 3 cards of same suit in starting hand, they can trade one
   */
  checkChitsiobiki() {
    // Check each player's hand for Chitsiobiki
    for (let playerIndex = 0; playerIndex < this.playerCount; playerIndex++) {
      const hand = this.players[playerIndex].hand;
      const suitCounts = {};

      // Count cards by suit
      hand.forEach(card => {
        suitCounts[card.month] = (suitCounts[card.month] || []);
        suitCounts[card.month].push(card);
      });

      // Check for 3-of-a-kind suits
      for (let month in suitCounts) {
        if (suitCounts[month].length === 3) {
          // Trade the lowest value card
          const cards = suitCounts[month];
          cards.sort((a, b) => this.getCardValue(b) - this.getCardValue(a));
          const cardToTrade = cards[2]; // Lowest value

          // Trade card with deck
          const newCard = this.deck.draw();
          this.players[playerIndex].hand = hand.filter(c => c.id !== cardToTrade.id);
          this.players[playerIndex].hand.push(newCard);
          this.deck.cards.push(cardToTrade);
          this.deck.shuffle();

          if (playerIndex === 0) {
            this.message = `Chitsiobiki! You traded a ${month} card for a new card.`;
          } else {
            this.message = `Chitsiobiki! Player ${playerIndex + 1} traded a card.`;
          }
        }
      }
    }
  }

  /**
   * Locate Gaji card in the game
   */
  locateGaji() {
    const gajiCard = this.findGajiCard();

    if (!gajiCard) {
      this.gajiState.location = 'unknown';
      return;
    }

    // Check where Gaji is located (check hands first)
    for (let i = 0; i < this.playerCount; i++) {
      if (this.players[i].hand.find(c => c.id === this.GAJI_CARD_ID)) {
        this.gajiState.location = `player_${i}_hand`;
        this.gajiState.isWildCard = true;
        return;
      }
    }

    // Check field
    if (this.field.find(c => c.id === this.GAJI_CARD_ID)) {
      this.gajiState.location = 'field';
      this.gajiState.isWildCard = false; // Not wild when on field
      return;
    }

    // Check deck
    if (this.deck.cards.find(c => c.id === this.GAJI_CARD_ID)) {
      this.gajiState.location = 'deck';
      this.gajiState.isWildCard = false; // Will become wild when drawn
      return;
    }

    // Check captured cards
    for (let i = 0; i < this.playerCount; i++) {
      if (this.players[i].captured.find(c => c.id === this.GAJI_CARD_ID)) {
        this.gajiState.location = `player_${i}_captured`;
        this.gajiState.isWildCard = false;
        return;
      }
    }
  }

  /**
   * Find the Gaji card object
   */
  findGajiCard() {
    // Search all player hands
    for (let i = 0; i < this.playerCount; i++) {
      const card = this.players[i].hand.find(c => c.id === this.GAJI_CARD_ID);
      if (card) return card;
    }

    // Search field
    const fieldCard = this.field.find(c => c.id === this.GAJI_CARD_ID);
    if (fieldCard) return fieldCard;

    // Search deck
    const deckCard = this.deck.cards.find(c => c.id === this.GAJI_CARD_ID);
    if (deckCard) return deckCard;

    // Search all captured cards
    for (let i = 0; i < this.playerCount; i++) {
      const card = this.players[i].captured.find(c => c.id === this.GAJI_CARD_ID);
      if (card) return card;
    }

    return null;
  }

  /**
   * Check if a card is the Gaji card
   */
  isGaji(card) {
    return card && card.id === this.GAJI_CARD_ID;
  }

  // ============================================================
  // CARD VALUE SYSTEM (Sakura-specific)
  // ============================================================

  /**
   * Get point value of a card in Sakura
   */
  getCardValue(card) {
    return this.SAKURA_CARD_VALUES[card.type] || 0;
  }

  /**
   * Calculate total points from captured cards
   */
  calculateBasePoints(capturedCards) {
    return capturedCards.reduce((total, card) => {
      return total + this.getCardValue(card);
    }, 0);
  }

  // ============================================================
  // HELPER METHODS FOR MULTI-PLAYER
  // ============================================================

  /**
   * Get current player object
   */
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * Get current player's hand
   */
  getCurrentPlayerHand() {
    return this.getCurrentPlayer().hand;
  }

  /**
   * Get current player's captured cards
   */
  getCurrentPlayerCaptured() {
    return this.getCurrentPlayer().captured;
  }

  /**
   * Check if current player is human
   */
  isCurrentPlayerHuman() {
    return this.getCurrentPlayer().isHuman;
  }

  // ============================================================
  // BACKWARD COMPATIBILITY ACCESSORS
  // These map old playerHand/opponentHand naming to player array
  // ============================================================

  /**
   * Get player 0 (human) hand - backward compatibility
   */
  get playerHand() {
    return this.players[0]?.hand || [];
  }

  set playerHand(value) {
    if (this.players[0]) {
      this.players[0].hand = value;
    }
  }

  /**
   * Get player 1 (opponent) hand - backward compatibility
   */
  get opponentHand() {
    return this.players[1]?.hand || [];
  }

  set opponentHand(value) {
    if (this.players[1]) {
      this.players[1].hand = value;
    }
  }

  /**
   * Get player 0 (human) captured - backward compatibility
   */
  get playerCaptured() {
    return this.players[0]?.captured || [];
  }

  set playerCaptured(value) {
    if (this.players[0]) {
      this.players[0].captured = value;
    }
  }

  /**
   * Get player 1 (opponent) captured - backward compatibility
   */
  get opponentCaptured() {
    return this.players[1]?.captured || [];
  }

  set opponentCaptured(value) {
    if (this.players[1]) {
      this.players[1].captured = value;
    }
  }

  /**
   * Get player 0 yaku - backward compatibility
   */
  get playerYaku() {
    return this.players[0]?.yaku || null;
  }

  set playerYaku(value) {
    if (this.players[0]) {
      this.players[0].yaku = value;
    }
  }

  /**
   * Get player 1 yaku - backward compatibility
   */
  get opponentYaku() {
    return this.players[1]?.yaku || null;
  }

  set opponentYaku(value) {
    if (this.players[1]) {
      this.players[1].yaku = value;
    }
  }

  /**
   * Get player 0 match score - backward compatibility
   */
  get playerMatchScore() {
    return this.players[0]?.matchScore || 0;
  }

  set playerMatchScore(value) {
    if (this.players[0]) {
      this.players[0].matchScore = value;
    }
  }

  /**
   * Get player 1 match score - backward compatibility
   */
  get opponentMatchScore() {
    return this.players[1]?.matchScore || 0;
  }

  set opponentMatchScore(value) {
    if (this.players[1]) {
      this.players[1].matchScore = value;
    }
  }

  /**
   * Get player round wins - backward compatibility
   */
  get playerRoundWins() {
    return this.players[0]?.roundWins || 0;
  }

  set playerRoundWins(value) {
    if (this.players[0]) {
      this.players[0].roundWins = value;
    }
  }

  /**
   * Get opponent round wins - backward compatibility
   */
  get opponentRoundWins() {
    return this.players[1]?.roundWins || 0;
  }

  set opponentRoundWins(value) {
    if (this.players[1]) {
      this.players[1].roundWins = value;
    }
  }

  /**
   * Get dealer string for backward compatibility
   */
  get dealer() {
    return this.dealerIndex === 0 ? 'player' : 'opponent';
  }

  set dealer(value) {
    this.dealerIndex = (value === 'player') ? 0 : 1;
  }

  /**
   * Get currentPlayer string for backward compatibility
   */
  get currentPlayer() {
    return this.currentPlayerIndex === 0 ? 'player' : 'opponent';
  }

  set currentPlayer(value) {
    this.currentPlayerIndex = (value === 'player') ? 0 : 1;
  }

  // ============================================================
  // TURN LOGIC
  // ============================================================

  /**
   * Player selects a card
   * Implements standard two-click flow like KoiKoi:
   * 1. Click hand card in select_hand phase → select it, move to select_field phase
   * 2. Click field card in select_field phase → match and capture
   * 3. Click same hand card again in select_field phase → place on field (if no matches)
   * 4. Click different hand card in select_field phase → switch selection
   *
   * @param {Object} card - The card being selected
   * @param {string} owner - The owner/zone of the card ('player', 'field', etc.)
   */
  selectCard(card, owner = 'player') {
    debugLogger.log('sakura', `🌸 selectCard called`, {
      cardId: card.id,
      cardName: card.name,
      owner: owner,
      phase: this.phase,
      isGaji: this.isGaji(card)
    });

    // Handle field card clicks
    if (owner === 'field' && (this.phase === 'select_field' || this.phase === 'gaji_selection')) {
      return this.selectFieldCard(card);
    }

    // Handle hand card selection in select_hand phase
    if (this.phase === 'select_hand' && owner === 'player') {
      // Check if card is Gaji (wild card) - only wild when IN HAND
      if (this.isGaji(card)) {
        debugLogger.log('sakura', `⚡ Gaji played from hand - wild card mode`);
        this.handleGajiFromHand(card);
        return true;
      }

      // Find matching cards on field
      const matches = this.field.filter(fc => fc.month === card.month);

      debugLogger.log('sakura', `🎴 Card ${card.name} matches found:`, {
        matchCount: matches.length,
        matches: matches.map(m => m.name)
      });

      // Store selected card and matches info
      this.selectedCards = [card];
      this.drawnCardMatches = matches;
      this.phase = 'select_field';

      // Set appropriate message based on matches
      if (matches.length === 0) {
        this.message = 'Click the card again to place on field, or click a different card';
      } else if (matches.length === 1) {
        this.message = `Click the ${matches[0].month} card to capture (or click again to place)`;
      } else if (matches.length === 2) {
        this.message = 'Choose which matching card to capture';
      } else if (matches.length === 3) {
        this.message = 'HIKI! Click any matching card to capture all 4';
      }

      return true;
    }

    // Handle selections in select_field phase
    if (this.phase === 'select_field' && owner === 'player') {
      // Check if clicking a different hand card - switch selection
      if (this.selectedCards[0].id !== card.id) {
        debugLogger.log('sakura', `🔄 Switching selection from ${this.selectedCards[0].name} to ${card.name}`);

        // Check if new card is Gaji
        if (this.isGaji(card)) {
          debugLogger.log('sakura', `⚡ Gaji selected from hand - wild card mode`);
          this.handleGajiFromHand(card);
          return true;
        }

        // Find matches for new card
        const matches = this.field.filter(fc => fc.month === card.month);

        // Update selection
        this.selectedCards = [card];
        this.drawnCardMatches = matches;

        // Update message
        if (matches.length === 0) {
          this.message = 'Click the card again to place on field, or click a different card';
        } else if (matches.length === 1) {
          this.message = `Click the ${matches[0].month} card to capture (or click again to place)`;
        } else if (matches.length === 2) {
          this.message = 'Choose which matching card to capture';
        } else if (matches.length === 3) {
          this.message = 'HIKI! Click any matching card to capture all 4';
        }

        return true;
      }

      // Clicking same card again - place on field or show message if matches exist
      const matches = this.drawnCardMatches;

      if (matches.length === 3) {
        // HIKI! Auto-capture all 4 cards
        debugLogger.log('sakura', `🎊 HIKI! All 4 ${card.month} cards captured`);
        const selectedCard = this.selectedCards[0];
        this.playerHand = this.playerHand.filter(c => c.id !== selectedCard.id);
        this.announceHiki(selectedCard, matches);
        this.playerCaptured.push(selectedCard, ...matches);
        this.field = this.field.filter(c => !matches.includes(c));
        this.completedHikis[0].push(selectedCard.month);
        this.message = `HIKI! Captured all 4 ${selectedCard.month} cards!`;

        // Update Gaji state if Hiki included Gaji
        if (matches.some(m => this.isGaji(m))) {
          debugLogger.log('sakura', `⚡ Hiki included Gaji`);
          this.gajiState.location = 'player_captured';
          this.gajiState.isWildCard = false;
        }

        this.selectedCards = [];
        this.drawnCardMatches = [];
        this.proceedToDrawPhase();
        return true;
      } else if (matches.length > 0) {
        // Matches exist - cannot place on field
        this.message = 'You must match with a card on the field (matches available)';
        return false;
      } else {
        // No matches - place card on field
        debugLogger.log('sakura', `➕ No match - placing ${card.name} on field`);
        const selectedCard = this.selectedCards[0];
        this.playerHand = this.playerHand.filter(c => c.id !== selectedCard.id);
        this.field.push(selectedCard);
        this.message = 'Card placed on field.';
        this.selectedCards = [];
        this.drawnCardMatches = [];
        this.proceedToDrawPhase();
        return true;
      }
    }

    debugLogger.log('sakura', `⚠️ selectCard: Invalid state - phase=${this.phase}, owner=${owner}`);
    return false;
  }

  /**
   * Player selects a field card (when multiple matches exist or using Gaji)
   */
  selectFieldCard(fieldCard) {
    debugLogger.log('sakura', `🎯 selectFieldCard called`, {
      fieldCardId: fieldCard.id,
      fieldCardName: fieldCard.name,
      phase: this.phase,
      selectedCardsCount: this.selectedCards?.length || 0
    });

    if (this.phase !== 'select_field' && this.phase !== 'gaji_selection') {
      debugLogger.log('sakura', `⚠️ Wrong phase for selectFieldCard: ${this.phase}`);
      return false;
    }

    // Need a selected card (hand card or Gaji) to match
    if (!this.selectedCards || this.selectedCards.length === 0) {
      debugLogger.log('sakura', `⚠️ No selected card for field match`);
      this.message = 'No card selected for matching';
      return false;
    }

    const handCard = this.selectedCards[0];

    // Check if this is a Gaji selection
    if (this.phase === 'gaji_selection') {
      debugLogger.log('sakura', `⚡ Player chose ${fieldCard.name} to capture with Gaji`);

      // Verify this is a valid target
      if (!this.drawnCardMatches.some(c => c.id === fieldCard.id)) {
        debugLogger.log('sakura', `⚠️ Invalid Gaji target selected`);
        return false;
      }

      // Check if Gaji was drawn (vs played from hand) - if drawn, need to clear drawnCard
      const wasDrawn = this.drawnCard && this.drawnCard.id === handCard.id;
      if (wasDrawn) {
        this.drawnCard = null; // Clear before capture for Card3D sync
        this.captureWithGaji(handCard, fieldCard);
        this.endTurn(); // Drawn Gaji ends the turn
      } else {
        this.captureWithGaji(handCard, fieldCard);
        this.proceedToDrawPhase(); // Hand Gaji proceeds to draw phase
      }
      return true;
    }

    // Regular field card selection (2 matches or 1 match confirmation)
    debugLogger.log('sakura', `✅ Player chose ${fieldCard.name} to capture with ${handCard.name}`);

    // Remove hand card from hand
    this.playerHand = this.playerHand.filter(c => c.id !== handCard.id);

    // Capture both cards
    this.playerCaptured.push(handCard, fieldCard);
    this.field = this.field.filter(c => c.id !== fieldCard.id);

    // Update Gaji state if we captured Gaji
    if (this.isGaji(fieldCard)) {
      debugLogger.log('sakura', `⚡ Gaji captured from field (player choice)`);
      this.gajiState.location = 'player_captured';
      this.gajiState.isWildCard = false;
    }

    this.selectedCards = [];
    this.drawnCardMatches = [];
    this.message = `Captured ${fieldCard.month}!`;

    this.proceedToDrawPhase();
    return true;
  }

  /**
   * Proceed to draw phase (Phase 2)
   */
  proceedToDrawPhase() {
    debugLogger.log('sakura', `📥 Proceeding to draw phase`, {
      deckSize: this.deck.cards.length,
      phase: this.phase
    });

    this.turnPhase = 2;
    this.phase = 'drawing';

    if (this.deck.cards.length === 0) {
      debugLogger.log('sakura', `⚠️ No cards in deck - skipping draw phase`);
      // No cards left in deck - skip draw phase
      this.endTurn();
      return;
    }

    this.message = 'Drawing card from deck...';

    // Brief delay to show the drawing action
    setTimeout(() => {
      // Draw card
      this.drawnCard = this.deck.draw();
      debugLogger.log('sakura', `🎴 Drew card: ${this.drawnCard.name} (ID: ${this.drawnCard.id})`);
      this.message = `Drew ${this.drawnCard.month}...`;

      // Check if drawn card is Gaji
      if (this.isGaji(this.drawnCard)) {
        debugLogger.log('sakura', `⚡ Drew Gaji - wild card mode`);
        this.handleGajiDrawn();
        return;
      }

      // Find matches for drawn card
      const matches = this.field.filter(fc => fc.month === this.drawnCard.month);

      debugLogger.log('sakura', `🎴 Drawn card ${this.drawnCard.name} matches:`, {
        matchCount: matches.length,
        matches: matches.map(m => m.name)
      });

      if (matches.length === 0) {
        // No match - add to field
        this.phase = 'show_drawn';
        this.message = `Drew ${this.drawnCard.month} - No match, adding to field...`;
        debugLogger.log('sakura', `➕ No match - adding drawn card to field`);

        setTimeout(() => {
          const cardToAdd = this.drawnCard;
          this.drawnCard = null; // Clear after animation completes
          this.field.push(cardToAdd);
          this.message = 'No match. Card added to field.';
          this.endTurn();
        }, 900);
      } else if (matches.length === 1) {
        // Single match - auto capture
        this.phase = 'show_drawn';
        const capturedCard = matches[0];
        this.message = `Drew ${this.drawnCard.month} - Matching automatically...`;

        debugLogger.log('sakura', `✅ Auto-capturing ${capturedCard.name} with drawn card`);

        // Animate drawn card to field card position, then capture
        if (this.card3DManager) {
          const drawnCard3D = this.card3DManager.getCard(this.drawnCard);
          const fieldCard3D = this.card3DManager.getCard(capturedCard);

          if (drawnCard3D && fieldCard3D) {
            // Wait a moment to show the drawn card, then animate to field card
            setTimeout(() => {
              drawnCard3D.tweenTo(
                {
                  x: fieldCard3D.homePosition.x,
                  y: fieldCard3D.homePosition.y,
                  z: fieldCard3D.homePosition.z + 5 // Slightly above
                },
                400,
                'easeInOutQuad'
              );

              // After animation, update game state
              drawnCard3D.onAnimationComplete = () => {
                const drawnCardRef = this.drawnCard;
                this.drawnCard = null; // Clear after animation

                this.playerCaptured.push(drawnCardRef, capturedCard);
                this.field = this.field.filter(c => c.id !== capturedCard.id);
                this.message = `Captured ${capturedCard.month}!`;

                // Update Gaji state if we captured Gaji
                if (this.isGaji(capturedCard)) {
                  debugLogger.log('sakura', `⚡ Gaji captured from field by drawn card`);
                  this.gajiState.location = 'player_captured';
                  this.gajiState.isWildCard = false;
                }

                // Wait for trick pile animation to complete
                setTimeout(() => this.endTurn(), 500);
              };
            }, 400);
          } else {
            // Fallback if card3D not found
            setTimeout(() => {
              const drawnCardRef = this.drawnCard;
              this.drawnCard = null;
              this.playerCaptured.push(drawnCardRef, capturedCard);
              this.field = this.field.filter(c => c.id !== capturedCard.id);
              this.message = `Captured ${capturedCard.month}!`;
              if (this.isGaji(capturedCard)) {
                this.gajiState.location = 'player_captured';
                this.gajiState.isWildCard = false;
              }
              this.endTurn();
            }, 900);
          }
        } else {
          // Fallback if card3DManager not available
          setTimeout(() => {
            const drawnCardRef = this.drawnCard;
            this.drawnCard = null;
            this.playerCaptured.push(drawnCardRef, capturedCard);
            this.field = this.field.filter(c => c.id !== capturedCard.id);
            this.message = `Captured ${capturedCard.month}!`;
            if (this.isGaji(capturedCard)) {
              this.gajiState.location = 'player_captured';
              this.gajiState.isWildCard = false;
            }
            this.endTurn();
          }, 900);
        }
      } else if (matches.length >= 2) {
        // Multiple matches - auto capture first match (standard rule)
        this.phase = 'show_drawn';
        const chosen = matches[0];
        this.message = `Drew ${this.drawnCard.month} - Multiple matches, capturing first...`;

        debugLogger.log('sakura', `✅ Multiple matches - auto-capturing first: ${chosen.name}`);

        // Animate drawn card to field card position, then capture
        if (this.card3DManager) {
          const drawnCard3D = this.card3DManager.getCard(this.drawnCard);
          const fieldCard3D = this.card3DManager.getCard(chosen);

          if (drawnCard3D && fieldCard3D) {
            // Wait a moment to show the drawn card, then animate to field card
            setTimeout(() => {
              drawnCard3D.tweenTo(
                {
                  x: fieldCard3D.homePosition.x,
                  y: fieldCard3D.homePosition.y,
                  z: fieldCard3D.homePosition.z + 5
                },
                400,
                'easeInOutQuad'
              );

              drawnCard3D.onAnimationComplete = () => {
                const drawnCardRef = this.drawnCard;
                this.drawnCard = null;

                this.playerCaptured.push(drawnCardRef, chosen);
                this.field = this.field.filter(c => c.id !== chosen.id);
                this.message = `Captured ${chosen.month}!`;

                if (this.isGaji(chosen)) {
                  debugLogger.log('sakura', `⚡ Gaji captured from field by drawn card (multi-match)`);
                  this.gajiState.location = 'player_captured';
                  this.gajiState.isWildCard = false;
                }

                setTimeout(() => this.endTurn(), 500);
              };
            }, 400);
          } else {
            // Fallback
            setTimeout(() => {
              const drawnCardRef = this.drawnCard;
              this.drawnCard = null;
              this.playerCaptured.push(drawnCardRef, chosen);
              this.field = this.field.filter(c => c.id !== chosen.id);
              this.message = `Captured ${chosen.month}!`;
              if (this.isGaji(chosen)) {
                this.gajiState.location = 'player_captured';
                this.gajiState.isWildCard = false;
              }
              this.endTurn();
            }, 900);
          }
        } else {
          // Fallback
          setTimeout(() => {
            const drawnCardRef = this.drawnCard;
            this.drawnCard = null;
            this.playerCaptured.push(drawnCardRef, chosen);
            this.field = this.field.filter(c => c.id !== chosen.id);
            this.message = `Captured ${chosen.month}!`;
            if (this.isGaji(chosen)) {
              this.gajiState.location = 'player_captured';
              this.gajiState.isWildCard = false;
            }
            this.endTurn();
          }, 900);
        }
      }
    }, 150);

    // Check for Hiki from drawn card
    // (This would happen if player captured 3 cards in Phase 1, then drew 4th)
    this.checkHikiAfterDraw();
  }

  /**
   * Check if a Hiki was completed after drawing
   */
  checkHikiAfterDraw() {
    if (!this.drawnCard) return;

    const month = this.drawnCard.month;
    const playerCardsOfMonth = this.playerCaptured.filter(c => c.month === month);

    if (playerCardsOfMonth.length === 4) {
      this.completedHikis[0].push(month);
      this.message = `HIKI! Completed all 4 ${month} cards!`;
    }
  }

  /**
   * End current turn and advance to next player
   */
  endTurn() {
    debugLogger.log('sakura', `🔄 Ending turn for player ${this.currentPlayerIndex}`, {
      currentPlayerIndex: this.currentPlayerIndex,
      handSizes: this.players.map((p, i) => `P${i}: ${p.hand.length}`).join(', '),
      deckSize: this.deck.cards.length
    });

    this.turnPhase = 1;

    // Update yaku for current player
    this.updateYaku();

    // Check if round should end
    if (this.shouldEndRound()) {
      debugLogger.log('sakura', `🏁 Round should end`);
      this.endRound();
      return;
    }

    // Advance to next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;

    debugLogger.log('sakura', `👥 Advanced to player ${this.currentPlayerIndex}`);

    // Check if current player has cards in hand
    if (this.players[this.currentPlayerIndex].hand.length === 0) {
      debugLogger.log('sakura', `⚠️ Player ${this.currentPlayerIndex} has no cards - draw phase only`);
      this.phase = 'drawing';
      this.proceedToDrawPhase();
    } else if (this.players[this.currentPlayerIndex].isHuman) {
      // Human player's turn
      debugLogger.log('sakura', `✋ Player ${this.currentPlayerIndex} (human) - select from hand`);
      this.phase = 'select_hand';
      this.message = 'Your turn! Select a card from your hand.';
    } else {
      // AI player's turn
      debugLogger.log('sakura', `🤖 Player ${this.currentPlayerIndex} (AI) turn starting`);
      this.phase = 'opponent_turn';
      this.message = `Player ${this.currentPlayerIndex + 1}'s turn...`;
      setTimeout(() => this.opponentTurn(), 1000);
    }
  }

  /**
   * Check if round should end
   */
  shouldEndRound() {
    // Round ends when all players' hands are empty and deck is empty
    const allHandsEmpty = this.players.every(p => p.hand.length === 0);
    const deckEmpty = this.deck.cards.length === 0;
    return allHandsEmpty && deckEmpty;
  }

  // ============================================================
  // HIKI LOGIC
  // ============================================================

  /**
   * Announce Hiki (suit capture)
   */
  announceHiki(handCard, fieldCards) {
    if (this.hikiAnnouncementCallback) {
      this.hikiAnnouncementCallback({
        month: handCard.month,
        cards: [handCard, ...fieldCards]
      });
    }
  }

  /**
   * Check if a player can use Gaji to capture a card
   * (Cannot capture from completed Hiki or complete own Hiki with Gaji)
   * @param {Object} targetCard - The card to potentially capture with Gaji
   * @param {number} playerIndex - Index of the player using Gaji
   */
  canGajiCapture(targetCard, playerIndex) {
    const month = targetCard.month;

    // Check if any player has completed this suit (Hiki)
    for (let i = 0; i < this.playerCount; i++) {
      if (this.completedHikis[i].includes(month)) {
        return false; // Cannot capture from completed Hiki
      }
    }

    // Check if using Gaji would complete a Hiki for this player
    const captured = playerIndex === 0 ? this.playerCaptured : (this.opponentCaptured || []);
    const suitCount = captured.filter(c => c.month === month).length;

    if (suitCount === 3) {
      // Gaji cannot be used to complete Hiki
      return false;
    }

    return true;
  }

  // ============================================================
  // GAJI (WILD CARD) LOGIC
  // ============================================================

  /**
   * Handle Gaji played from hand
   */
  handleGajiFromHand(gajiCard) {
    debugLogger.log('sakura', `⚡ handleGajiFromHand called`, {
      gajiId: gajiCard.id,
      fieldCards: this.field.map(c => c.name)
    });

    // Remove Gaji from hand
    this.playerHand = this.playerHand.filter(c => c.id !== gajiCard.id);

    // Get valid targets (cards that Gaji can capture)
    const validTargets = this.field.filter(card =>
      this.canGajiCapture(card, 'player')
    );

    debugLogger.log('sakura', `⚡ Gaji valid targets:`, {
      validTargetCount: validTargets.length,
      validTargets: validTargets.map(t => t.name)
    });

    if (validTargets.length === 0) {
      debugLogger.log('sakura', `⚡ No valid Gaji targets - adding to field`);
      // No valid targets - Gaji goes to field
      this.field.push(gajiCard);
      this.gajiState.location = 'field';
      this.gajiState.isWildCard = false;
      this.message = 'Gaji played but no valid targets. Card added to field.';
      this.proceedToDrawPhase();
      return;
    }

    // Player must choose which card to capture
    this.selectedCards = [gajiCard];
    this.drawnCardMatches = validTargets;
    this.phase = 'gaji_selection';
    this.message = 'Gaji! Choose any card to capture.';

    debugLogger.log('sakura', `⚡ Player can now manually select Gaji target`, {
      validTargetCount: validTargets.length
    });
  }

  /**
   * Handle Gaji drawn from deck
   */
  handleGajiDrawn() {
    const gajiCard = this.drawnCard;

    debugLogger.log('sakura', `⚡ handleGajiDrawn called`, {
      gajiId: gajiCard.id,
      fieldCards: this.field.map(c => c.name)
    });

    // Get valid targets
    const validTargets = this.field.filter(card =>
      this.canGajiCapture(card, 'player')
    );

    debugLogger.log('sakura', `⚡ Drawn Gaji valid targets:`, {
      validTargetCount: validTargets.length,
      validTargets: validTargets.map(t => t.name)
    });

    if (validTargets.length === 0) {
      debugLogger.log('sakura', `⚡ No valid targets for drawn Gaji - adding to field`);
      // No valid targets - Gaji goes to field
      this.phase = 'show_drawn';
      this.message = 'Drew Gaji - No valid targets, adding to field...';

      setTimeout(() => {
        const gajiCardRef = this.drawnCard;
        this.drawnCard = null; // Clear after animation completes
        this.field.push(gajiCardRef);
        this.gajiState.location = 'field';
        this.gajiState.isWildCard = false;
        this.message = 'Drew Gaji but no valid targets. Card added to field.';
        this.endTurn();
      }, 900);
      return;
    }

    // Player must choose which card to capture
    this.selectedCards = [gajiCard]; // Store Gaji card for selectFieldCard
    this.drawnCardMatches = validTargets; // Store valid targets
    this.phase = 'gaji_selection';
    this.message = 'Drew Gaji! Choose any card to capture.';

    debugLogger.log('sakura', `⚡ Player can now manually select target for drawn Gaji`, {
      validTargetCount: validTargets.length
    });
  }

  /**
   * Capture a card with Gaji
   */
  captureWithGaji(gajiCard, targetCard) {
    debugLogger.log('sakura', `⚡ captureWithGaji called`, {
      gajiId: gajiCard.id,
      targetId: targetCard.id,
      targetName: targetCard.name,
      targetMonth: targetCard.month
    });

    this.playerCaptured.push(gajiCard, targetCard);
    this.field = this.field.filter(c => c.id !== targetCard.id);

    // Mark the pairing for end-of-round bonus
    this.gajiState.location = 'player_captured';
    this.gajiState.pairedWithMonth = targetCard.month;
    this.gajiState.isWildCard = false;

    debugLogger.log('sakura', `⚡ Gaji paired with ${targetCard.month} for end-of-round bonus`);

    this.message = `Gaji captured ${targetCard.month}!`;
    this.selectedCards = [];
    this.drawnCardMatches = [];

    debugLogger.log('sakura', `⚡ Gaji capture complete, proceeding to draw phase`);
  }

  /**
   * Select best target for Gaji (AI helper)
   * @param {Array} validTargets - Valid cards to capture with Gaji
   * @param {number|string} playerIndex - Player index (0,1,2,3) or legacy 'player'/'opponent'
   */
  selectBestGajiTarget(validTargets, playerIndex) {
    // Support legacy 'player'/'opponent' strings for backward compatibility
    if (playerIndex === 'player') playerIndex = 0;
    if (playerIndex === 'opponent') playerIndex = 1;

    // Prioritize completing yaku
    const captured = this.players[playerIndex].captured;

    for (let target of validTargets) {
      if (this.yakuChecker.wouldCompleteYaku(target, captured)) {
        return target;
      }
    }

    // Prioritize helping yaku progress
    for (let target of validTargets) {
      if (this.yakuChecker.wouldHelpYaku(target, captured)) {
        return target;
      }
    }

    // Otherwise, select highest value card
    validTargets.sort((a, b) => this.getCardValue(b) - this.getCardValue(a));
    return validTargets[0];
  }

  /**
   * Apply Gaji end-of-round bonus
   * Award remaining field cards of the paired month
   */
  applyGajiEndOfRoundBonus() {
    // Check player's Gaji
    if (this.gajiState.location === 'player_captured' &&
        this.gajiState.pairedWithMonth) {
      const bonusCards = this.field.filter(c =>
        c.month === this.gajiState.pairedWithMonth
      );
      this.playerCaptured.push(...bonusCards);
      this.field = this.field.filter(c => c.month !== this.gajiState.pairedWithMonth);
    }

    // Check opponent's Gaji (if we track opponent Gaji separately)
    // For simplicity, we assume only one Gaji per game
  }

  // ============================================================
  // OPPONENT AI LOGIC
  // ============================================================

  /**
   * Execute opponent's turn (works for any player index via currentPlayerIndex)
   */
  opponentTurn() {
    if (this.phase !== 'opponent_turn') {
      return;
    }

    const currentPlayer = this.getCurrentPlayer();

    // Get AI difficulty
    const difficulty = this.gameOptions?.get('aiDifficulty') || 'normal';

    // Phase 1: Play from hand
    if (currentPlayer.hand.length > 0) {
      const chosenCard = this.selectOpponentCard(difficulty);
      this.lastPlayedCard = chosenCard;

      // Remove from hand
      currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== chosenCard.id);

      // Check if Gaji
      if (this.isGaji(chosenCard)) {
        this.handleOpponentGajiFromHand(chosenCard, difficulty);
        return;
      }

      // Find matches
      const matches = this.field.filter(fc => fc.month === chosenCard.month);

      if (matches.length === 0) {
        this.field.push(chosenCard);
        this.message = `Player ${this.currentPlayerIndex + 1} played ${chosenCard.month}.`;
      } else if (matches.length === 1) {
        currentPlayer.captured.push(chosenCard, matches[0]);
        this.field = this.field.filter(c => c.id !== matches[0].id);
        this.message = `Player ${this.currentPlayerIndex + 1} captured ${matches[0].month}!`;
      } else if (matches.length === 2) {
        // AI chooses highest value card
        const chosen = this.selectBestCapture(matches, this.currentPlayerIndex);
        currentPlayer.captured.push(chosenCard, chosen);
        this.field = this.field.filter(c => c.id !== chosen.id);
        this.message = `Player ${this.currentPlayerIndex + 1} captured ${chosen.month}!`;
      } else if (matches.length === 3) {
        // HIKI!
        currentPlayer.captured.push(chosenCard, ...matches);
        this.field = this.field.filter(c => !matches.includes(c));
        this.completedHikis[this.currentPlayerIndex].push(chosenCard.month);
        this.message = `Player ${this.currentPlayerIndex + 1} HIKI! Captured all 4 ${chosenCard.month} cards!`;
      }

      this.lastPlayedCard = null;

      // Delay before draw phase
      setTimeout(() => this.opponentDrawPhase(difficulty), 800);
    } else {
      // No cards in hand - only draw phase
      this.opponentDrawPhase(difficulty);
    }
  }

  /**
   * Opponent draw phase (works for any player via currentPlayerIndex)
   */
  opponentDrawPhase(difficulty) {
    const currentPlayer = this.getCurrentPlayer();

    if (this.deck.cards.length === 0) {
      this.endTurn();
      return;
    }

    // Draw card
    this.drawnCard = this.deck.draw();
    this.message = `Player ${this.currentPlayerIndex + 1} drew ${this.drawnCard.month}...`;

    // Check if Gaji
    if (this.isGaji(this.drawnCard)) {
      setTimeout(() => {
        const gajiCardRef = this.drawnCard;
        this.drawnCard = null; // Clear after animation delay
        this.handleOpponentGajiDrawn(gajiCardRef, difficulty);
        setTimeout(() => this.endTurn(), 500);
      }, 500);
      return;
    }

    // Find matches
    const matches = this.field.filter(fc => fc.month === this.drawnCard.month);

    if (matches.length === 0) {
      // No match - add to field
      // Wait for draw animation to complete, then move to field
      // Keep card in drawnCard zone until we add it to field so synchronize
      // can properly detect the zone transition and animate it
      setTimeout(() => {
        const drawnCardRef = this.drawnCard;
        // Add to field FIRST, then clear drawnCard so synchronize detects the zone change
        this.field.push(drawnCardRef);
        this.drawnCard = null;
        this.message = `Player ${this.currentPlayerIndex + 1} drew - no match.`;
        setTimeout(() => this.endTurn(), 500);
      }, 500);
    } else {
      // Match found - animate to field card then capture
      const chosen = matches[0];

      if (this.card3DManager) {
        const drawnCard3D = this.card3DManager.getCard(this.drawnCard);
        const fieldCard3D = this.card3DManager.getCard(chosen);

        if (drawnCard3D && fieldCard3D) {
          // Wait to show drawn card, then animate to field card
          setTimeout(() => {
            drawnCard3D.tweenTo(
              {
                x: fieldCard3D.homePosition.x,
                y: fieldCard3D.homePosition.y,
                z: fieldCard3D.homePosition.z + 5
              },
              400,
              'easeInOutQuad'
            );

            drawnCard3D.onAnimationComplete = () => {
              const drawnCardRef = this.drawnCard;
              this.drawnCard = null;

              currentPlayer.captured.push(drawnCardRef, chosen);
              this.field = this.field.filter(c => c.id !== chosen.id);
              this.message = `Player ${this.currentPlayerIndex + 1} captured ${chosen.month}!`;

              setTimeout(() => this.endTurn(), 500);
            };
          }, 300);
        } else {
          // Fallback
          setTimeout(() => {
            const drawnCardRef = this.drawnCard;
            this.drawnCard = null;
            currentPlayer.captured.push(drawnCardRef, chosen);
            this.field = this.field.filter(c => c.id !== chosen.id);
            this.message = `Player ${this.currentPlayerIndex + 1} captured ${chosen.month}!`;
            setTimeout(() => this.endTurn(), 500);
          }, 500);
        }
      } else {
        // Fallback
        setTimeout(() => {
          const drawnCardRef = this.drawnCard;
          this.drawnCard = null;
          currentPlayer.captured.push(drawnCardRef, chosen);
          this.field = this.field.filter(c => c.id !== chosen.id);
          this.message = `Player ${this.currentPlayerIndex + 1} captured ${chosen.month}!`;
          setTimeout(() => this.endTurn(), 500);
        }, 500);
      }
    }
  }

  /**
   * Select card for opponent to play (AI strategy) - works with any player via currentPlayerIndex
   */
  selectOpponentCard(difficulty) {
    if (difficulty === 'easy') {
      return this.selectOpponentCardEasy();
    } else if (difficulty === 'hard' || difficulty === 'advanced') {
      return this.selectOpponentCardHard();
    } else {
      return this.selectOpponentCardMedium();
    }
  }

  /**
   * Easy AI: Random card
   */
  selectOpponentCardEasy() {
    const currentPlayer = this.getCurrentPlayer();
    return currentPlayer.hand[Math.floor(Math.random() * currentPlayer.hand.length)];
  }

  /**
   * Medium AI: Prioritize matches and high value
   */
  selectOpponentCardMedium() {
    const currentPlayer = this.getCurrentPlayer();
    const scoredMoves = currentPlayer.hand.map(card => {
      let score = 0;
      const matches = this.field.filter(fc => fc.month === card.month);

      if (matches.length === 0) {
        score = -10; // Avoid discarding if possible
      } else if (matches.length === 1) {
        score = this.getCardValue(matches[0]);
        if (this.yakuChecker.wouldHelpYaku(matches[0], currentPlayer.captured)) {
          score += 20;
        }
      } else if (matches.length === 2) {
        const bestMatch = matches.reduce((best, curr) =>
          this.getCardValue(curr) > this.getCardValue(best) ? curr : best
        );
        score = this.getCardValue(bestMatch) + 5;
      } else if (matches.length === 3) {
        score = 100; // HIKI! Very high priority
      }

      return { card, score };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves.length > 0 ? scoredMoves[0].card : currentPlayer.hand[0];
  }

  /**
   * Hard AI: Full yaku awareness and blocking
   */
  selectOpponentCardHard() {
    const currentPlayer = this.getCurrentPlayer();

    // For multi-player hard AI, check all players' yaku progress (not just player 0)
    // In 2-player, only player 0 has complex yaku to block
    // In 3+ players, use medium strategy (simplified AI)
    if (this.playerCount > 2) {
      return this.selectOpponentCardMedium();
    }

    // 2-player hard mode: Block player 0's yaku attempts
    const playerYakuProgress = this.yakuChecker.analyzeYakuProgress(this.players[0].captured);

    // Try to block player's yaku attempts
    for (let card of currentPlayer.hand) {
      const matches = this.field.filter(fc => fc.month === card.month);
      for (let match of matches) {
        for (let yakuKey in playerYakuProgress) {
          const progress = playerYakuProgress[yakuKey];
          if (progress.needed.includes(match.month)) {
            // This move blocks player's yaku progress
            return card;
          }
        }
      }
    }

    // Otherwise use medium strategy
    return this.selectOpponentCardMedium();
  }

  /**
   * Select best capture from multiple options
   * @param {Array} matches - Possible cards to capture
   * @param {number|string} playerIndex - Player index (0,1,2,3) or legacy 'player'/'opponent'
   */
  selectBestCapture(matches, playerIndex) {
    // Support legacy 'player'/'opponent' strings for backward compatibility
    if (playerIndex === 'player') playerIndex = 0;
    if (playerIndex === 'opponent') playerIndex = 1;

    const captured = this.players[playerIndex].captured;

    // Prioritize yaku completion
    for (let match of matches) {
      if (this.yakuChecker.wouldCompleteYaku(match, captured)) {
        return match;
      }
    }

    // Prioritize yaku progress
    for (let match of matches) {
      if (this.yakuChecker.wouldHelpYaku(match, captured)) {
        return match;
      }
    }

    // Otherwise highest value
    matches.sort((a, b) => this.getCardValue(b) - this.getCardValue(a));
    return matches[0];
  }

  /**
   * Handle opponent Gaji from hand (works for any player)
   */
  handleOpponentGajiFromHand(gajiCard, difficulty) {
    const currentPlayer = this.getCurrentPlayer();
    const validTargets = this.field.filter(card =>
      this.canGajiCapture(card, this.currentPlayerIndex)
    );

    if (validTargets.length === 0) {
      this.field.push(gajiCard);
      this.gajiState.location = 'field';
      this.gajiState.isWildCard = false;
      this.message = `Player ${this.currentPlayerIndex + 1} played Gaji - no valid targets.`;
      setTimeout(() => this.opponentDrawPhase(difficulty), 800);
      return;
    }

    const bestTarget = this.selectBestGajiTarget(validTargets, this.currentPlayerIndex);
    currentPlayer.captured.push(gajiCard, bestTarget);
    this.field = this.field.filter(c => c.id !== bestTarget.id);

    this.gajiState.location = `player_${this.currentPlayerIndex}_captured`;
    this.gajiState.pairedWithMonth = bestTarget.month;
    this.gajiState.isWildCard = false;

    this.message = `Player ${this.currentPlayerIndex + 1} used Gaji to capture ${bestTarget.month}!`;

    setTimeout(() => this.opponentDrawPhase(difficulty), 800);
  }

  /**
   * Handle opponent Gaji drawn (works for any player)
   */
  handleOpponentGajiDrawn(gajiCard, difficulty) {
    const currentPlayer = this.getCurrentPlayer();
    const validTargets = this.field.filter(card =>
      this.canGajiCapture(card, this.currentPlayerIndex)
    );

    if (validTargets.length === 0) {
      this.field.push(gajiCard);
      this.gajiState.location = 'field';
      this.gajiState.isWildCard = false;
      this.message = `Player ${this.currentPlayerIndex + 1} drew Gaji - no valid targets.`;
      return;
    }

    const bestTarget = this.selectBestGajiTarget(validTargets, this.currentPlayerIndex);
    currentPlayer.captured.push(gajiCard, bestTarget);
    this.field = this.field.filter(c => c.id !== bestTarget.id);

    this.gajiState.location = `player_${this.currentPlayerIndex}_captured`;
    this.gajiState.pairedWithMonth = bestTarget.month;
    this.gajiState.isWildCard = false;

    this.message = `Player ${this.currentPlayerIndex + 1} drew Gaji and captured ${bestTarget.month}!`;
  }

  // ============================================================
  // SCORING & YAKU
  // ============================================================

  /**
   * Update yaku for all players
   */
  updateYaku() {
    for (let i = 0; i < this.playerCount; i++) {
      this.players[i].yaku = this.yakuChecker.detectYaku(this.players[i].captured);
    }
  }

  /**
   * End the round and calculate scores (supports N players)
   */
  endRound() {
    this.roundEnded = true;
    this.phase = 'round_over';

    // Apply Gaji end-of-round bonus
    this.applyGajiEndOfRoundBonus();

    // Update yaku one final time
    this.updateYaku();

    // Calculate scores for all players
    const playerScores = [];
    for (let i = 0; i < this.playerCount; i++) {
      const basePoints = this.calculateBasePoints(this.players[i].captured);
      const yakuPenalty = this.yakuChecker.calculatePenalty(this.players[i].yaku);

      let roundScore;
      if (this.variants.bothPlayersScore) {
        // Both Players Score variant: Yaku awards bonus (50 per yaku)
        const yakuBonus = this.players[i].yaku.length * 50;
        roundScore = basePoints + yakuBonus;
      } else {
        // Standard Sakura: Only subtract opponent penalties
        // Calculate all other players' combined penalties
        let totalOtherPenalties = 0;
        for (let j = 0; j < this.playerCount; j++) {
          if (j !== i) {
            totalOtherPenalties += this.yakuChecker.calculatePenalty(this.players[j].yaku);
          }
        }
        roundScore = basePoints - totalOtherPenalties;
      }

      playerScores.push({
        playerIndex: i,
        basePoints,
        yakuPenalty,
        yaku: this.players[i].yaku,
        roundScore,
        isHuman: this.players[i].isHuman
      });
    }

    // Determine round winner (highest score, dealer wins ties)
    let maxScore = Math.max(...playerScores.map(s => s.roundScore));
    let winners = playerScores.filter(s => s.roundScore === maxScore);

    let roundWinnerIndex;
    if (winners.length === 1) {
      roundWinnerIndex = winners[0].playerIndex;
    } else {
      // Tie - dealer wins among tied players
      roundWinnerIndex = winners.find(w => w.playerIndex === this.dealerIndex)?.playerIndex ?? winners[0].playerIndex;
    }

    // Update match scores
    for (let i = 0; i < this.playerCount; i++) {
      const score = playerScores[i];

      if (this.variants.victoryScoring) {
        // Victory Scoring: Track wins for this player
        let wins = 0;
        if (i === roundWinnerIndex) {
          if (this.variants.basaChu) {
            // Basa (100+ margin): 2 wins, Chu (50+ margin): 2 wins
            const maxOtherScore = Math.max(
              ...playerScores
                .filter((_, idx) => idx !== i)
                .map(s => s.roundScore)
            );
            const margin = score.roundScore - maxOtherScore;
            if (margin >= 100) {
              wins = 2; // Basa
            } else if (margin >= 50) {
              wins = 2; // Chu
            } else {
              wins = 1;
            }
          } else {
            wins = 1;
          }
        }
        this.players[i].roundWins += wins;
      }

      // Standard Cumulative Scoring
      this.players[i].matchScore += score.roundScore;
    }

    // Prepare summary data (backward compatible for 2-player UI)
    const summaryData = {
      // All player scores
      playerScores,
      roundWinnerIndex,

      // Backward compatibility fields (for 2-player UI)
      playerBasePoints: playerScores[0].basePoints,
      opponentBasePoints: playerScores[1]?.basePoints || 0,
      playerYaku: playerScores[0].yaku,
      opponentYaku: playerScores[1]?.yaku || null,
      playerYakuPenalty: playerScores[0].yakuPenalty,
      opponentYakuPenalty: playerScores[1]?.yakuPenalty || 0,
      playerRoundScore: playerScores[0].roundScore,
      opponentRoundScore: playerScores[1]?.roundScore || 0,
      playerMatchScore: this.players[0].matchScore,
      opponentMatchScore: this.players[1]?.matchScore || 0,
      roundWinner: roundWinnerIndex === 0 ? 'player' : (roundWinnerIndex === 1 ? 'opponent' : `player${roundWinnerIndex}`),

      // Round info
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      playerCount: this.playerCount
    };

    // Show round summary
    if (this.roundSummaryCallback) {
      this.roundSummaryCallback(summaryData);
    }

    // Check if match is over
    if (this.currentRound >= this.totalRounds) {
      this.endMatch();
    } else {
      // Next round - loser becomes dealer
      // In 3+ players, dealer rotates to next player (or could be loser in 2-player)
      if (this.playerCount === 2) {
        // 2-player: loser becomes dealer
        this.dealerIndex = roundWinnerIndex === 0 ? 1 : 0;
      } else {
        // 3+ players: dealer rotates to next player
        this.dealerIndex = (this.dealerIndex + 1) % this.playerCount;
      }

      this.message = `Round ${this.currentRound} complete. Starting round ${this.currentRound + 1}...`;
    }
  }

  /**
   * End the match and determine winner (supports N players)
   */
  endMatch() {
    this.gameOver = true;
    this.phase = 'game_over';

    // Determine winner among all players
    let winnerIndex = -1;
    let winMessage = '';

    if (this.variants.victoryScoring) {
      // Victory Scoring: Winner determined by round wins
      const maxWins = Math.max(...this.players.map(p => p.roundWins));
      const winners = this.players
        .map((p, idx) => ({ playerIndex: idx, roundWins: p.roundWins }))
        .filter(p => p.roundWins === maxWins);

      if (winners.length === 1) {
        winnerIndex = winners[0].playerIndex;
        if (winnerIndex === 0) {
          winMessage = `You win the match! Final wins: `;
        } else {
          winMessage = `Player ${winnerIndex + 1} wins the match! Final wins: `;
        }
        // Add all players' win counts
        const winCounts = this.players.map(p => p.roundWins).join(' - ');
        winMessage += winCounts;
      } else {
        winMessage = `Match tied! Final wins: ${this.players.map(p => p.roundWins).join(' - ')}`;
      }
    } else {
      // Standard Cumulative Scoring
      const maxScore = Math.max(...this.players.map(p => p.matchScore));
      const winners = this.players
        .map((p, idx) => ({ playerIndex: idx, matchScore: p.matchScore }))
        .filter(p => p.matchScore === maxScore);

      if (winners.length === 1) {
        winnerIndex = winners[0].playerIndex;
        if (winnerIndex === 0) {
          winMessage = `You win the match! Final score: `;
        } else {
          winMessage = `Player ${winnerIndex + 1} wins the match! Final score: `;
        }
        // Add all players' scores
        const scores = this.players.map(p => p.matchScore).join(' - ');
        winMessage += scores;
      } else {
        winMessage = `Match tied! Final score: ${this.players.map(p => p.matchScore).join(' - ')}`;
      }
    }

    this.message = winMessage;
  }

  /**
   * Start next round
   */
  nextRound() {
    this.currentRound++;
    this.reset();
  }

  /**
   * Start next round (alias for compatibility with main.js)
   */
  startNextRound() {
    this.nextRound();
  }

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  /**
   * Get current game state for rendering
   * Supports both 2-player (backward compatible) and multi-player modes
   */
  getState() {
    // Build multi-player state data
    const playersData = this.players.map((player, index) => ({
      hand: player.hand,
      captured: player.captured,
      yaku: player.yaku,
      basePoints: this.calculateBasePoints(player.captured),
      matchScore: player.matchScore,
      roundWins: player.roundWins,
      isHuman: player.isHuman,
      difficulty: player.difficulty
    }));

    return {
      // Cards
      field: this.field,
      playerHand: this.playerHand,
      opponentHand: this.opponentHand,
      playerCaptured: this.playerCaptured,
      opponentCaptured: this.opponentCaptured,

      // Multi-player data (new)
      players: playersData,
      playerCount: this.playerCount,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,

      // Scores
      playerBasePoints: this.calculateBasePoints(this.playerCaptured),
      opponentBasePoints: this.calculateBasePoints(this.opponentCaptured),
      playerYaku: this.playerYaku,
      opponentYaku: this.opponentYaku,
      playerMatchScore: this.playerMatchScore,
      opponentMatchScore: this.opponentMatchScore,
      playerRoundWins: this.playerRoundWins,
      opponentRoundWins: this.opponentRoundWins,

      // Game state
      currentPlayer: this.currentPlayer,
      phase: this.phase,
      turnPhase: this.turnPhase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      dealer: this.dealer,
      message: this.message,
      gameOver: this.gameOver,
      roundEnded: this.roundEnded,

      // Sakura-specific
      isSakuraMode: true,
      variants: this.variants,
      completedHikis: this.completedHikis,
      gajiState: this.gajiState,
      drawnCard: this.drawnCard,
      drawnCardMatches: this.drawnCardMatches,
      selectedCards: this.selectedCards,
      opponentPlayedCard: this.opponentPlayedCard,
      lastPlayedCard: this.lastPlayedCard,

      // Deck info
      deckSize: this.deck.cards.length,
      deckCount: this.deck.count, // For renderer to display deck counter
      deck: this.deck // Include full deck object for Card3D system
    };
  }

  /**
   * Set round summary callback
   */
  setRoundSummaryCallback(callback) {
    this.roundSummaryCallback = callback;
  }

  /**
   * Set Hiki announcement callback
   */
  setHikiAnnouncementCallback(callback) {
    this.hikiAnnouncementCallback = callback;
  }

  /**
   * Set Gaji selection callback
   */
  setGajiSelectionCallback(callback) {
    this.gajiSelectionCallback = callback;
  }

  /**
   * Set Card3D Manager for custom animations
   */
  setCard3DManager(card3DManager) {
    this.card3DManager = card3DManager;
  }
}
