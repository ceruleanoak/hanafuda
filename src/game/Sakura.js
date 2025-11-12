/**
 * Sakura.js
 *
 * Sakura (Hawaiian Hanafuda) Game Logic
 *
 * Key differences from Koi-Koi:
 * - No koi-koi continuation mechanic
 * - Different card point values (Ribbons=5, Animals=1, Chaff=0, Brights=20)
 * - Hiki (suit capture) rule
 * - Gaji (Lightning wild card) system
 * - Yaku subtract 50 points from opponents (instead of adding to player)
 * - Two-phase turn structure (hand card → draw card)
 * - Variable player count (2-4 players, we implement 2-player)
 */

import { Deck } from './Deck.js';
import { SakuraYaku } from './SakuraYaku.js';
import { CARD_TYPES } from '../data/cards.js';
import { debugLogger } from '../utils/DebugLogger.js';

export class Sakura {
  constructor(gameOptions = null) {
    this.deck = new Deck();
    this.yakuChecker = new SakuraYaku();
    this.gameOptions = gameOptions;

    // Game configuration
    this.totalRounds = 6; // Standard Sakura match is 6 rounds
    this.currentRound = 0;
    this.playerCount = 2; // We implement 2-player mode

    // Card values in Sakura (different from Koi-Koi)
    this.SAKURA_CARD_VALUES = {
      [CARD_TYPES.BRIGHT]: 20,  // All brights = 20 points
      [CARD_TYPES.RIBBON]: 5,   // All ribbons = 5 points
      [CARD_TYPES.ANIMAL]: 1,   // All animals = 1 point
      [CARD_TYPES.CHAFF]: 0     // All chaff = 0 points
    };

    // Gaji (Lightning wild card) - November 4th card
    this.GAJI_CARD_ID = 44; // November - chaff

    // Animation queue
    this.animationQueue = [];
    this.isAnimating = false;

    // Callbacks for UI
    this.roundSummaryCallback = null;
    this.hikiAnnouncementCallback = null;
    this.gajiSelectionCallback = null;

    this.reset();
  }

  // ============================================================
  // INITIALIZATION & SETUP
  // ============================================================

  /**
   * Start a new Sakura game
   */
  startNewGame(rounds = 6, playerCount = 2) {
    debugLogger.log('sakura', `🌸 Starting new Sakura game`, {
      rounds,
      playerCount,
      gajiCardId: this.GAJI_CARD_ID
    });

    this.totalRounds = rounds;
    this.playerCount = playerCount;
    this.currentRound = 1;
    this.playerMatchScore = 0;
    this.opponentMatchScore = 0;
    this.dealer = 'player'; // First game: random dealer (simplified to player)
    this.reset();
  }

  /**
   * Reset state for new round
   */
  reset() {
    this.deck.reset();

    // Card zones
    this.field = [];
    this.playerHand = [];
    this.opponentHand = [];
    this.playerCaptured = [];
    this.opponentCaptured = [];

    // Yaku tracking
    this.playerYaku = [];
    this.opponentYaku = [];

    // Hiki tracking (which suits have been completely captured)
    this.completedHikis = {
      player: [], // Array of month names
      opponent: []
    };

    // Gaji tracking
    this.gajiState = {
      location: null, // 'deck', 'player_hand', 'opponent_hand', 'field', 'player_captured', 'opponent_captured'
      pairedWithMonth: null, // If captured with Gaji, which month was paired
      isWildCard: false // Is Gaji currently acting as a wild card?
    };

    // Turn state
    this.currentPlayer = this.dealer;
    this.phase = (this.dealer === 'player') ? 'select_hand' : 'opponent_turn';
    this.turnPhase = 1; // Phase 1: play from hand, Phase 2: draw from deck
    this.selectedCards = [];
    this.drawnCard = null;
    this.drawnCardMatches = [];
    this.opponentPlayedCard = null;

    // Game flow
    this.gameOver = false;
    this.message = '';
    this.roundEnded = false;

    this.deal();
  }

  /**
   * Deal cards based on player count
   * For 2 players: 10 cards each, 8 field cards
   */
  deal() {
    const dealingRules = {
      2: { handSize: 10, fieldSize: 8 },
      3: { handSize: 7, fieldSize: 6 },
      4: { handSize: 5, fieldSize: 8 }
    };

    const rules = dealingRules[this.playerCount];

    // Deal half of field cards
    const halfFieldSize = Math.floor(rules.fieldSize / 2);
    this.field = this.deck.drawMultiple(halfFieldSize);

    // Deal hand cards
    this.playerHand = this.deck.drawMultiple(rules.handSize);
    this.opponentHand = this.deck.drawMultiple(rules.handSize);

    // Deal remaining field cards
    const remainingFieldCards = rules.fieldSize - halfFieldSize;
    this.field.push(...this.deck.drawMultiple(remainingFieldCards));

    // Check for initial field Hiki (dealer advantage)
    this.checkInitialFieldHiki();

    // Check for Chitsiobiki (three-of-a-kind trade)
    // For simplicity, we auto-trade if AI has 3 of a kind
    this.checkChitsiobiki();

    // Locate Gaji card
    this.locateGaji();

    // Set initial message
    if (this.currentPlayer === 'player') {
      this.message = 'Your turn! Select a card from your hand.';
    } else {
      this.message = "Opponent's turn...";
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

    // Check for complete suits (all 4 cards)
    for (let month in suitCounts) {
      if (suitCounts[month] === 4) {
        // Dealer captures all 4 cards
        const capturedCards = this.field.filter(c => c.month === month);

        if (this.dealer === 'player') {
          this.playerCaptured.push(...capturedCards);
          this.completedHikis.player.push(month);
          this.message = `Initial Hiki! You captured all 4 ${month} cards!`;
        } else {
          this.opponentCaptured.push(...capturedCards);
          this.completedHikis.opponent.push(month);
          this.message = `Initial Hiki! Opponent captured all 4 ${month} cards!`;
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
    // Check player hand
    const playerSuitCounts = {};
    this.playerHand.forEach(card => {
      playerSuitCounts[card.month] = (playerSuitCounts[card.month] || []);
      playerSuitCounts[card.month].push(card);
    });

    for (let month in playerSuitCounts) {
      if (playerSuitCounts[month].length === 3) {
        // Player has option to trade - for simplicity, we keep highest value card
        // and trade the lowest value card
        const cards = playerSuitCounts[month];
        cards.sort((a, b) => this.getCardValue(b) - this.getCardValue(a));
        const cardToTrade = cards[2]; // Lowest value

        // Trade card with deck
        const newCard = this.deck.draw();
        this.playerHand = this.playerHand.filter(c => c.id !== cardToTrade.id);
        this.playerHand.push(newCard);
        this.deck.cards.push(cardToTrade); // Return card to deck
        this.deck.shuffle();

        this.message = `Chitsiobiki! You traded a ${month} card for a new card.`;
      }
    }

    // Check opponent hand (auto-trade for AI)
    const opponentSuitCounts = {};
    this.opponentHand.forEach(card => {
      opponentSuitCounts[card.month] = (opponentSuitCounts[card.month] || []);
      opponentSuitCounts[card.month].push(card);
    });

    for (let month in opponentSuitCounts) {
      if (opponentSuitCounts[month].length === 3) {
        const cards = opponentSuitCounts[month];
        cards.sort((a, b) => this.getCardValue(b) - this.getCardValue(a));
        const cardToTrade = cards[2];

        const newCard = this.deck.draw();
        this.opponentHand = this.opponentHand.filter(c => c.id !== cardToTrade.id);
        this.opponentHand.push(newCard);
        this.deck.cards.push(cardToTrade);
        this.deck.shuffle();
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

    // Check where Gaji is located
    if (this.playerHand.find(c => c.id === this.GAJI_CARD_ID)) {
      this.gajiState.location = 'player_hand';
      this.gajiState.isWildCard = true;
    } else if (this.opponentHand.find(c => c.id === this.GAJI_CARD_ID)) {
      this.gajiState.location = 'opponent_hand';
      this.gajiState.isWildCard = true;
    } else if (this.field.find(c => c.id === this.GAJI_CARD_ID)) {
      this.gajiState.location = 'field';
      this.gajiState.isWildCard = false; // Not wild when on field
    } else if (this.deck.cards.find(c => c.id === this.GAJI_CARD_ID)) {
      this.gajiState.location = 'deck';
      this.gajiState.isWildCard = false; // Will become wild when drawn
    } else if (this.playerCaptured.find(c => c.id === this.GAJI_CARD_ID)) {
      this.gajiState.location = 'player_captured';
      this.gajiState.isWildCard = false;
    } else if (this.opponentCaptured.find(c => c.id === this.GAJI_CARD_ID)) {
      this.gajiState.location = 'opponent_captured';
      this.gajiState.isWildCard = false;
    }
  }

  /**
   * Find the Gaji card object
   */
  findGajiCard() {
    // Search all locations for Gaji
    const allCards = [
      ...this.playerHand,
      ...this.opponentHand,
      ...this.field,
      ...this.deck.cards,
      ...this.playerCaptured,
      ...this.opponentCaptured
    ];

    return allCards.find(c => c.id === this.GAJI_CARD_ID);
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
  // TURN LOGIC
  // ============================================================

  /**
   * Player selects a card from their hand
   */
  selectCard(card) {
    debugLogger.log('sakura', `🌸 selectCard called`, {
      cardId: card.id,
      cardName: card.name,
      phase: this.phase,
      isGaji: this.isGaji(card)
    });

    if (this.phase !== 'select_hand') {
      debugLogger.log('sakura', `⚠️ Wrong phase for selectCard: ${this.phase}`);
      return false;
    }

    // Check if card is Gaji (wild card) - only wild when IN HAND
    if (this.isGaji(card)) {
      debugLogger.log('sakura', `⚡ Gaji played from hand - wild card mode`);
      this.handleGajiFromHand(card);
      return true;
    }

    // Find matching cards on field (including Gaji if it's November and Gaji is on field)
    const matches = this.field.filter(fc => fc.month === card.month);

    debugLogger.log('sakura', `🎴 Card ${card.name} matches found:`, {
      matchCount: matches.length,
      matches: matches.map(m => m.name),
      fieldCards: this.field.map(f => f.name)
    });

    // Remove card from hand
    this.playerHand = this.playerHand.filter(c => c.id !== card.id);

    if (matches.length === 0) {
      // No match - add card to field
      debugLogger.log('sakura', `➕ No match - adding ${card.name} to field`);
      this.field.push(card);
      this.message = 'No match. Card added to field.';
      this.proceedToDrawPhase();
    } else if (matches.length === 1) {
      // Single match - auto capture
      const capturedCard = matches[0];
      debugLogger.log('sakura', `✅ Single match - capturing ${capturedCard.name}`);
      this.playerCaptured.push(card, capturedCard);
      this.field = this.field.filter(c => c.id !== capturedCard.id);
      this.message = `Captured ${capturedCard.month}!`;

      // Update Gaji state if we captured Gaji from field
      if (this.isGaji(capturedCard)) {
        debugLogger.log('sakura', `⚡ Gaji captured from field by regular card`);
        this.gajiState.location = 'player_captured';
        this.gajiState.isWildCard = false;
      }

      this.proceedToDrawPhase();
    } else if (matches.length === 2) {
      // Two matches - player must choose
      debugLogger.log('sakura', `🎯 Two matches - player must choose`, {
        options: matches.map(m => m.name)
      });
      this.selectedCards = [card];
      this.drawnCardMatches = matches;
      this.phase = 'select_field';
      this.message = 'Choose which card to capture.';
    } else if (matches.length === 3) {
      // HIKI! Capture all 4 cards
      debugLogger.log('sakura', `🎊 HIKI! All 4 ${card.month} cards captured`);
      this.announceHiki(card, matches);
      this.playerCaptured.push(card, ...matches);
      this.field = this.field.filter(c => !matches.includes(c));
      this.completedHikis.player.push(card.month);
      this.message = `HIKI! Captured all 4 ${card.month} cards!`;

      // Update Gaji state if Hiki included Gaji
      if (matches.some(m => this.isGaji(m))) {
        debugLogger.log('sakura', `⚡ Hiki included Gaji`);
        this.gajiState.location = 'player_captured';
        this.gajiState.isWildCard = false;
      }

      this.proceedToDrawPhase();
    }

    return true;
  }

  /**
   * Player selects a field card (when multiple matches exist)
   */
  selectFieldCard(fieldCard) {
    debugLogger.log('sakura', `🎯 selectFieldCard called`, {
      fieldCardId: fieldCard.id,
      fieldCardName: fieldCard.name,
      phase: this.phase
    });

    if (this.phase !== 'select_field') {
      debugLogger.log('sakura', `⚠️ Wrong phase for selectFieldCard: ${this.phase}`);
      return false;
    }

    const handCard = this.selectedCards[0];

    debugLogger.log('sakura', `✅ Player chose ${fieldCard.name} to capture with ${handCard.name}`);

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
      debugLogger.log('sakura', `➕ No match - adding drawn card to field`);
      this.field.push(this.drawnCard);
      this.message = 'No match. Card added to field.';
      this.drawnCard = null;
      this.endTurn();
    } else if (matches.length === 1) {
      // Single match - auto capture
      const capturedCard = matches[0];
      debugLogger.log('sakura', `✅ Auto-capturing ${capturedCard.name} with drawn card`);
      this.playerCaptured.push(this.drawnCard, capturedCard);
      this.field = this.field.filter(c => c.id !== capturedCard.id);
      this.message = `Captured ${capturedCard.month}!`;

      // Update Gaji state if we captured Gaji
      if (this.isGaji(capturedCard)) {
        debugLogger.log('sakura', `⚡ Gaji captured from field by drawn card`);
        this.gajiState.location = 'player_captured';
        this.gajiState.isWildCard = false;
      }

      this.drawnCard = null;
      this.endTurn();
    } else if (matches.length >= 2) {
      // Multiple matches - auto capture first match (standard rule)
      const chosen = matches[0];
      debugLogger.log('sakura', `✅ Multiple matches - auto-capturing first: ${chosen.name}`);
      this.playerCaptured.push(this.drawnCard, chosen);
      this.field = this.field.filter(c => c.id !== chosen.id);
      this.message = `Captured ${chosen.month}!`;

      // Update Gaji state if we captured Gaji
      if (this.isGaji(chosen)) {
        debugLogger.log('sakura', `⚡ Gaji captured from field by drawn card (multi-match)`);
        this.gajiState.location = 'player_captured';
        this.gajiState.isWildCard = false;
      }

      this.drawnCard = null;
      this.endTurn();
    }

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
      this.completedHikis.player.push(month);
      this.message = `HIKI! Completed all 4 ${month} cards!`;
    }
  }

  /**
   * End current turn and switch players
   */
  endTurn() {
    debugLogger.log('sakura', `🔄 Ending turn`, {
      currentPlayer: this.currentPlayer,
      playerHandSize: this.playerHand.length,
      opponentHandSize: this.opponentHand.length,
      deckSize: this.deck.cards.length
    });

    this.turnPhase = 1;

    // Update yaku
    this.updateYaku();

    // Check if round should end
    if (this.shouldEndRound()) {
      debugLogger.log('sakura', `🏁 Round should end`);
      this.endRound();
      return;
    }

    // Switch players
    this.currentPlayer = (this.currentPlayer === 'player') ? 'opponent' : 'player';

    debugLogger.log('sakura', `👥 Switched to ${this.currentPlayer}`);

    if (this.currentPlayer === 'player') {
      // Check if player has any cards left
      if (this.playerHand.length === 0) {
        debugLogger.log('sakura', `⚠️ Player has no cards - draw only`);
        // Player has no cards - skip to draw phase only
        this.phase = 'drawing';
        this.proceedToDrawPhase();
      } else {
        debugLogger.log('sakura', `✋ Player's turn - select from hand`);
        this.phase = 'select_hand';
        this.message = 'Your turn! Select a card from your hand.';
      }
    } else {
      debugLogger.log('sakura', `🤖 Opponent's turn starting`);
      this.phase = 'opponent_turn';
      this.message = "Opponent's turn...";
      setTimeout(() => this.opponentTurn(), 1000);
    }
  }

  /**
   * Check if round should end
   */
  shouldEndRound() {
    // Round ends when all hands are empty and deck is empty
    return (
      this.playerHand.length === 0 &&
      this.opponentHand.length === 0 &&
      this.deck.cards.length === 0
    );
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
   */
  canGajiCapture(targetCard, player) {
    const month = targetCard.month;

    // Check if any player has completed this suit (Hiki)
    if (this.completedHikis.player.includes(month) ||
        this.completedHikis.opponent.includes(month)) {
      return false;
    }

    // Check if using Gaji would complete a Hiki
    const captured = (player === 'player') ? this.playerCaptured : this.opponentCaptured;
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

    debugLogger.log('sakura', `⚡ Auto-selecting best Gaji target`);

    // For now, auto-select highest value card for player
    // (In full implementation, player would choose via UI)
    setTimeout(() => {
      const bestTarget = this.selectBestGajiTarget(validTargets, 'player');
      debugLogger.log('sakura', `⚡ Best target selected: ${bestTarget.name}`);
      this.captureWithGaji(gajiCard, bestTarget);
      // After capturing with Gaji from hand, proceed to draw phase
      this.proceedToDrawPhase();
    }, 500);
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
      this.field.push(gajiCard);
      this.gajiState.location = 'field';
      this.gajiState.isWildCard = false;
      this.message = 'Drew Gaji but no valid targets. Card added to field.';
      this.drawnCard = null;
      this.endTurn();
      return;
    }

    // Player must choose which card to capture
    this.phase = 'gaji_selection';
    this.message = 'Drew Gaji! Choose any card to capture.';

    debugLogger.log('sakura', `⚡ Auto-selecting best target for drawn Gaji`);

    // Auto-select for now
    setTimeout(() => {
      const bestTarget = this.selectBestGajiTarget(validTargets, 'player');
      debugLogger.log('sakura', `⚡ Best target for drawn Gaji: ${bestTarget.name}`);
      this.captureWithGaji(gajiCard, bestTarget);
      this.drawnCard = null;
      this.endTurn();
    }, 500);
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
   */
  selectBestGajiTarget(validTargets, player) {
    // Prioritize completing yaku
    const captured = (player === 'player') ? this.playerCaptured : this.opponentCaptured;

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
   * Execute opponent's turn
   */
  opponentTurn() {
    if (this.phase !== 'opponent_turn') {
      return;
    }

    // Get AI difficulty
    const difficulty = this.gameOptions?.get('aiDifficulty') || 'normal';

    // Phase 1: Play from hand
    if (this.opponentHand.length > 0) {
      const chosenCard = this.selectOpponentCard(difficulty);
      this.opponentPlayedCard = chosenCard;

      // Remove from hand
      this.opponentHand = this.opponentHand.filter(c => c.id !== chosenCard.id);

      // Check if Gaji
      if (this.isGaji(chosenCard)) {
        this.handleOpponentGajiFromHand(chosenCard, difficulty);
        return;
      }

      // Find matches
      const matches = this.field.filter(fc => fc.month === chosenCard.month);

      if (matches.length === 0) {
        this.field.push(chosenCard);
        this.message = `Opponent played ${chosenCard.month}.`;
      } else if (matches.length === 1) {
        this.opponentCaptured.push(chosenCard, matches[0]);
        this.field = this.field.filter(c => c.id !== matches[0].id);
        this.message = `Opponent captured ${matches[0].month}!`;
      } else if (matches.length === 2) {
        // AI chooses highest value card
        const chosen = this.selectBestCapture(matches, 'opponent');
        this.opponentCaptured.push(chosenCard, chosen);
        this.field = this.field.filter(c => c.id !== chosen.id);
        this.message = `Opponent captured ${chosen.month}!`;
      } else if (matches.length === 3) {
        // HIKI!
        this.opponentCaptured.push(chosenCard, ...matches);
        this.field = this.field.filter(c => !matches.includes(c));
        this.completedHikis.opponent.push(chosenCard.month);
        this.message = `Opponent HIKI! Captured all 4 ${chosenCard.month} cards!`;
      }

      this.opponentPlayedCard = null;

      // Delay before draw phase
      setTimeout(() => this.opponentDrawPhase(difficulty), 800);
    } else {
      // No cards in hand - only draw phase
      this.opponentDrawPhase(difficulty);
    }
  }

  /**
   * Opponent draw phase
   */
  opponentDrawPhase(difficulty) {
    if (this.deck.cards.length === 0) {
      this.endTurn();
      return;
    }

    // Draw card
    this.drawnCard = this.deck.draw();
    this.message = `Opponent drew ${this.drawnCard.month}...`;

    // Check if Gaji
    if (this.isGaji(this.drawnCard)) {
      setTimeout(() => {
        this.handleOpponentGajiDrawn(this.drawnCard, difficulty);
        this.drawnCard = null;
        setTimeout(() => this.endTurn(), 500);
      }, 500);
      return;
    }

    // Find matches
    const matches = this.field.filter(fc => fc.month === this.drawnCard.month);

    setTimeout(() => {
      if (matches.length === 0) {
        this.field.push(this.drawnCard);
        this.message = 'Opponent drew - no match.';
      } else {
        const chosen = matches[0]; // Auto-capture first match
        this.opponentCaptured.push(this.drawnCard, chosen);
        this.field = this.field.filter(c => c.id !== chosen.id);
        this.message = `Opponent captured ${chosen.month}!`;
      }

      this.drawnCard = null;
      setTimeout(() => this.endTurn(), 500);
    }, 500);
  }

  /**
   * Select card for opponent to play (AI strategy)
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
    return this.opponentHand[Math.floor(Math.random() * this.opponentHand.length)];
  }

  /**
   * Medium AI: Prioritize matches and high value
   */
  selectOpponentCardMedium() {
    const scoredMoves = this.opponentHand.map(card => {
      let score = 0;
      const matches = this.field.filter(fc => fc.month === card.month);

      if (matches.length === 0) {
        score = -10; // Avoid discarding if possible
      } else if (matches.length === 1) {
        score = this.getCardValue(matches[0]);
        if (this.yakuChecker.wouldHelpYaku(matches[0], this.opponentCaptured)) {
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
    return scoredMoves[0].card;
  }

  /**
   * Hard AI: Full yaku awareness and blocking
   */
  selectOpponentCardHard() {
    // Check for blocking opportunities
    const playerYakuProgress = this.yakuChecker.analyzeYakuProgress(this.playerCaptured);

    // Try to block player's yaku attempts
    for (let card of this.opponentHand) {
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
   */
  selectBestCapture(matches, player) {
    const captured = (player === 'player') ? this.playerCaptured : this.opponentCaptured;

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
   * Handle opponent Gaji from hand
   */
  handleOpponentGajiFromHand(gajiCard, difficulty) {
    const validTargets = this.field.filter(card =>
      this.canGajiCapture(card, 'opponent')
    );

    if (validTargets.length === 0) {
      this.field.push(gajiCard);
      this.gajiState.location = 'field';
      this.gajiState.isWildCard = false;
      this.message = 'Opponent played Gaji - no valid targets.';
      setTimeout(() => this.opponentDrawPhase(difficulty), 800);
      return;
    }

    const bestTarget = this.selectBestGajiTarget(validTargets, 'opponent');
    this.opponentCaptured.push(gajiCard, bestTarget);
    this.field = this.field.filter(c => c.id !== bestTarget.id);

    this.gajiState.location = 'opponent_captured';
    this.gajiState.pairedWithMonth = bestTarget.month;
    this.gajiState.isWildCard = false;

    this.message = `Opponent used Gaji to capture ${bestTarget.month}!`;

    setTimeout(() => this.opponentDrawPhase(difficulty), 800);
  }

  /**
   * Handle opponent Gaji drawn
   */
  handleOpponentGajiDrawn(gajiCard, difficulty) {
    const validTargets = this.field.filter(card =>
      this.canGajiCapture(card, 'opponent')
    );

    if (validTargets.length === 0) {
      this.field.push(gajiCard);
      this.gajiState.location = 'field';
      this.gajiState.isWildCard = false;
      this.message = 'Opponent drew Gaji - no valid targets.';
      return;
    }

    const bestTarget = this.selectBestGajiTarget(validTargets, 'opponent');
    this.opponentCaptured.push(gajiCard, bestTarget);
    this.field = this.field.filter(c => c.id !== bestTarget.id);

    this.gajiState.location = 'opponent_captured';
    this.gajiState.pairedWithMonth = bestTarget.month;
    this.gajiState.isWildCard = false;

    this.message = `Opponent drew Gaji and captured ${bestTarget.month}!`;
  }

  // ============================================================
  // SCORING & YAKU
  // ============================================================

  /**
   * Update yaku for both players
   */
  updateYaku() {
    this.playerYaku = this.yakuChecker.detectYaku(this.playerCaptured);
    this.opponentYaku = this.yakuChecker.detectYaku(this.opponentCaptured);
  }

  /**
   * End the round and calculate scores
   */
  endRound() {
    this.roundEnded = true;
    this.phase = 'round_over';

    // Apply Gaji end-of-round bonus
    this.applyGajiEndOfRoundBonus();

    // Update yaku one final time
    this.updateYaku();

    // Calculate base points
    const playerBasePoints = this.calculateBasePoints(this.playerCaptured);
    const opponentBasePoints = this.calculateBasePoints(this.opponentCaptured);

    // Calculate yaku penalties
    const playerYakuPenalty = this.yakuChecker.calculatePenalty(this.playerYaku);
    const opponentYakuPenalty = this.yakuChecker.calculatePenalty(this.opponentYaku);

    // Apply penalties (each player's yaku subtracts from opponent)
    const playerRoundScore = playerBasePoints - opponentYakuPenalty;
    const opponentRoundScore = opponentBasePoints - playerYakuPenalty;

    // Update match scores
    this.playerMatchScore += playerRoundScore;
    this.opponentMatchScore += opponentRoundScore;

    // Determine round winner
    let roundWinner = null;
    if (playerRoundScore > opponentRoundScore) {
      roundWinner = 'player';
    } else if (opponentRoundScore > playerRoundScore) {
      roundWinner = 'opponent';
    } else {
      // Tie - dealer wins
      roundWinner = this.dealer;
    }

    // Show round summary
    if (this.roundSummaryCallback) {
      this.roundSummaryCallback({
        playerBasePoints,
        opponentBasePoints,
        playerYaku: this.playerYaku,
        opponentYaku: this.opponentYaku,
        playerYakuPenalty,
        opponentYakuPenalty,
        playerRoundScore,
        opponentRoundScore,
        playerMatchScore: this.playerMatchScore,
        opponentMatchScore: this.opponentMatchScore,
        roundWinner,
        currentRound: this.currentRound,
        totalRounds: this.totalRounds
      });
    }

    // Check if match is over
    if (this.currentRound >= this.totalRounds) {
      this.endMatch();
    } else {
      // Next round - loser becomes dealer
      this.dealer = (roundWinner === 'player') ? 'opponent' : 'player';
      this.message = `Round ${this.currentRound} complete. Starting round ${this.currentRound + 1}...`;
    }
  }

  /**
   * End the match and determine winner
   */
  endMatch() {
    this.gameOver = true;
    this.phase = 'game_over';

    if (this.playerMatchScore > this.opponentMatchScore) {
      this.message = `You win the match! Final score: ${this.playerMatchScore} - ${this.opponentMatchScore}`;
    } else if (this.opponentMatchScore > this.playerMatchScore) {
      this.message = `Opponent wins the match! Final score: ${this.opponentMatchScore} - ${this.playerMatchScore}`;
    } else {
      this.message = `Match tied! Final score: ${this.playerMatchScore} - ${this.opponentMatchScore}`;
    }
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
   */
  getState() {
    return {
      // Cards
      field: this.field,
      playerHand: this.playerHand,
      opponentHand: this.opponentHand,
      playerCaptured: this.playerCaptured,
      opponentCaptured: this.opponentCaptured,

      // Scores
      playerBasePoints: this.calculateBasePoints(this.playerCaptured),
      opponentBasePoints: this.calculateBasePoints(this.opponentCaptured),
      playerYaku: this.playerYaku,
      opponentYaku: this.opponentYaku,
      playerMatchScore: this.playerMatchScore,
      opponentMatchScore: this.opponentMatchScore,

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
      completedHikis: this.completedHikis,
      gajiState: this.gajiState,
      drawnCard: this.drawnCard,
      drawnCardMatches: this.drawnCardMatches,
      selectedCards: this.selectedCards,
      opponentPlayedCard: this.opponentPlayedCard,

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
}
