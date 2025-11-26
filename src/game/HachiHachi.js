/**
 * Hachi-Hachi (88) - Three-player hanafuda game
 *
 * Based on Sakura architecture but with Hachi-Hachi-specific rules:
 * - 3-player game (fixed, not variable)
 * - Par value: 88 points per player (264 total)
 * - Teyaku: Hand combinations scored at round start
 * - Dekiyaku: Captured combinations scored during play
 * - Field multipliers: 1×, 2×, 4× based on bright cards on field
 * - Sage/Shoubu decision: Player with highest score decides to continue or end
 * - Zero-sum settlement: All payments balance to zero
 */

import { Deck } from './Deck.js';
import { Teyaku } from './Teyaku.js';
import { Dekiyaku } from './Dekiyaku.js';
import { debugLogger } from '../utils/DebugLogger.js';

export class HachiHachi {
  constructor(gameOptions = {}) {
    this.gameOptions = gameOptions;
    this.audioManager = null;
    this.card3DManager = null;

    // Game configuration
    this.totalRounds = 12;
    this.currentRound = 0;
    this.playerCount = 3; // Fixed 3-player game

    // Par value system
    this.PAR_VALUE = 88; // Each player's base
    this.TOTAL_POINTS = 264; // 88 × 3

    // Card point values (single source of truth)
    this.CARD_VALUES = { 'bright': 20, 'ribbon': 5, 'animal': 10, 'chaff': 1 };

    // Initialization - only set up state variables, don't deal yet
    this.initializeGameState();
  }

  /**
   * Set Card3DManager for animations
   */
  setCard3DManager(card3DManager) {
    this.card3DManager = card3DManager;
  }

  /**
   * Set audio manager
   */
  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }

  /**
   * Set callback for UI decisions
   */
  setUICallback(callback) {
    this.uiCallback = callback;
  }

  /**
   * Trigger UI decision modal for Shoubu/Sage/Cancel
   * @private
   */
  _triggerShoubuSageDecision() {
    if (this.uiCallback && this.currentPlayerIndex === 0) {
      const allPlayers = this.players.map(p => ({
        hand: p.hand,
        captured: p.captured,
        dekiyaku: p.dekiyaku,
        roundScore: p.roundScore || 0,
        isHuman: p.isHuman
      }));

      debugLogger.log('hachihachi', `📞 Invoking UI callback for Shoubu/Sage/Cancel decision`, {
        player: 0,
        dekiyakuList: this.players[0].dekiyaku,
        deckCount: this.deck.count,
        fieldCards: this.field.length
      });

      // Call UI with decision parameters
      this.uiCallback('sage', {
        playerKey: 0,
        dekiyakuList: this.players[0].dekiyaku,
        playerScore: allPlayers[0].roundScore,
        opponent1Score: allPlayers[1].roundScore,
        opponent2Score: allPlayers[2].roundScore,
        roundNumber: this.currentRound,
        // Additional data for enhanced UI
        fieldMultiplier: this.fieldMultiplier,
        deckRemaining: this.deck.count,
        fieldCardCount: this.field.length,
        allPlayers: allPlayers,
        parValue: this.PAR_VALUE
      });
    }
  }

  /**
   * Make AI decision for opponent sage/shoubu choice
   * Aggressive strategy: prefer sage to accumulate more dekiyaku
   */
  _makeOpponentDekiyakuDecision(playerIndex) {
    const player = this.players[playerIndex];
    const currentDekiyakuValue = player.dekiyaku.reduce((sum, d) => sum + d.value, 0);
    const handRemaining = player.hand.length;
    const deckRemaining = this.deck.count;

    // If hand is empty, must choose Shoubu (can't continue playing)
    if (handRemaining === 0) {
      debugLogger.log('hachihachi', `⚔️ Opponent ${playerIndex} AI: SHOUBU (hand empty, cannot continue)`, {
        dekiyakuValue: currentDekiyakuValue,
        reason: 'No cards left in hand'
      });
      return 'shoubu';
    }

    // If deck is low (3 or fewer cards), play conservatively and go for Shoubu
    if (deckRemaining <= 3) {
      debugLogger.log('hachihachi', `⚔️ Opponent ${playerIndex} AI: SHOUBU (deck running low)`, {
        dekiyakuValue: currentDekiyakuValue,
        deckRemaining: deckRemaining,
        reason: 'Low cards in deck, play safe'
      });
      return 'shoubu';
    }

    // Default: Sage (aggressive strategy - try to get more dekiyaku)
    debugLogger.log('hachihachi', `⚔️ Opponent ${playerIndex} AI: SAGE (aggressive play)`, {
      dekiyakuValue: currentDekiyakuValue,
      handRemaining: handRemaining,
      deckRemaining: deckRemaining,
      reason: 'Sufficient cards remaining to continue'
    });
    return 'sage';
  }

  /**
   * Make AI decision for sage continuation at turn start
   * Decides whether to continue sage or cancel
   * @param {number} playerIndex - Player index
   * @returns {string} 'continue' or 'cancel'
   */
  _makeOpponentSageContinuationDecision(playerIndex) {
    const player = this.players[playerIndex];
    const currentDekiyakuValue = (player.dekiyaku || []).reduce((sum, d) => sum + d.value, 0);
    const baselineValue = this.sageBaselineKakuyaku[playerIndex] || 0;
    const hasImproved = currentDekiyakuValue > baselineValue;
    const handRemaining = player.hand.length;
    const deckRemaining = this.deck.count;

    // If no cards left, must cancel (can't continue playing)
    if (handRemaining === 0) {
      debugLogger.log('hachihachi', `🔮 Opponent ${playerIndex} AI: CANCEL sage (hand empty)`, {
        currentDekiyakuValue: currentDekiyakuValue,
        reason: 'No cards left in hand'
      });
      return 'cancel';
    }

    // If already improved, continue to try for more
    if (hasImproved) {
      debugLogger.log('hachihachi', `🔮 Opponent ${playerIndex} AI: Continue sage (already improved)`, {
        baselineValue: baselineValue,
        currentDekiyakuValue: currentDekiyakuValue,
        reason: 'Already gained new dekiyaku, try for more'
      });
      return 'continue';
    }

    // If deck is very low, cancel to secure current value
    if (deckRemaining <= 2) {
      debugLogger.log('hachihachi', `🔮 Opponent ${playerIndex} AI: CANCEL sage (deck critical)`, {
        deckRemaining: deckRemaining,
        reason: 'Deck nearly exhausted, secure current points'
      });
      return 'cancel';
    }

    // If deck is somewhat low, play conservatively and cancel
    if (deckRemaining <= 5) {
      debugLogger.log('hachihachi', `🔮 Opponent ${playerIndex} AI: CANCEL sage (deck low)`, {
        deckRemaining: deckRemaining,
        reason: 'Deck running low, take safe option'
      });
      return 'cancel';
    }

    // Still have plenty of cards - continue trying to improve
    debugLogger.log('hachihachi', `🔮 Opponent ${playerIndex} AI: Continue sage (plenty of cards)`, {
      deckRemaining: deckRemaining,
      reason: 'Sufficient cards remaining to try for improvement'
    });
    return 'continue';
  }

  /**
   * Trigger UI decision modal for sage continuation (cancel or continue)
   * @private
   */
  _triggerSageContinuationDecision() {
    if (this.uiCallback && this.currentPlayerIndex === 0) {
      const player = this.players[0];
      const baselineValue = this.sageBaselineKakuyaku[0] || 0;
      const currentDekiyakuValue = (player.dekiyaku || []).reduce((sum, d) => sum + d.value, 0);
      const hasImproved = currentDekiyakuValue > baselineValue;

      debugLogger.log('hachihachi', `📞 Invoking UI callback for Sage Continuation decision`, {
        playerIndex: 0,
        baselineValue: baselineValue,
        currentDekiyakuValue: currentDekiyakuValue,
        hasImproved: hasImproved
      });

      // Call UI with sage continuation decision
      this.uiCallback('sageContinuation', {
        playerKey: 0,
        dekiyakuList: player.dekiyaku,
        baselineValue: baselineValue,
        currentValue: currentDekiyakuValue,
        hasImproved: hasImproved,
        fieldMultiplier: this.fieldMultiplier,
        deckRemaining: this.deck.count
      });
    }
  }

  /**
   * Resume turn after sage continuation decision (player chose to continue)
   */
  resumeTurnAfterSageDecision() {
    debugLogger.log('hachihachi', `⚔️ Player 0 chose to CONTINUE sage`, {
      currentPhase: this.phase
    });

    // Move to normal select_hand phase
    this.phase = 'select_hand';
    this.message = 'Your turn! Select a card from your hand.';
  }

  /**
   * Set callbacks for UI
   */
  setRoundSummaryCallback(callback) {
    this.roundSummaryCallback = callback;
  }

  setTeyakuPaymentCallback(callback) {
    this.teyakuPaymentCallback = callback;
  }

  setOpponentDecisionCallback(callback) {
    this.opponentDecisionCallback = callback;
  }

  /**
   * Initialize empty game state (called once at startup)
   * Does NOT deal cards - just sets up data structures
   */
  initializeGameState() {
    this.deck = new Deck();

    // Initialize 3 players with empty state
    this.players = [];
    for (let i = 0; i < 3; i++) {
      this.players[i] = {
        hand: [],
        captured: [],
        teyaku: [],
        teyakuScore: 0,
        dekiyaku: [],
        dekiyakuScore: 0,
        finalizedDekiyaku: undefined,
        cancelledSage: false,
        roundScore: 0,
        gameScore: 0,
        isHuman: (i === 0)
      };
    }

    // Initialize empty game state
    this.field = [];
    this.drawnCard = null;
    this.drawnCardMatches = [];
    this.selectedCards = [];
    this.fieldMultiplier = 1;
    this.phase = 'not_started';
    this.currentPlayerIndex = 0;
    this.message = '';
    this.teyakuDisplay = {};

    // Sage decision state tracking
    this.sagePlayers = new Set();
    this.sageBaselineKakuyaku = {};
    for (let i = 0; i < 3; i++) {
      this.sageBaselineKakuyaku[i] = 0;
    }

    // Track opponent decisions
    this.opponentDecisions = {};
  }

  /**
   * Reset game state for new round and deal cards
   * Preserves cumulative game scores from previous rounds
   */
  reset() {
    this.deck = new Deck();

    // Preserve cumulative game scores from previous rounds
    const previousGameScores = this.players ? this.players.map(p => p.gameScore || 0) : [0, 0, 0];

    // Initialize 3 players (resetting round state while preserving game scores)
    this.players = [];
    for (let i = 0; i < 3; i++) {
      this.players[i] = {
        hand: [],
        captured: [],
        teyaku: [],
        teyakuScore: 0,
        dekiyaku: [],
        dekiyakuScore: 0,
        finalizedDekiyaku: undefined, // Clear from previous round
        cancelledSage: false, // Clear from previous round
        roundScore: 0,
        gameScore: previousGameScores[i], // Preserve cumulative score
        isHuman: (i === 0)
      };
    }

    // Game state
    this.field = [];
    this.drawnCard = null;
    this.drawnCardMatches = [];
    this.selectedCards = [];
    this.fieldMultiplier = 1;
    this.phase = 'setup'; // setup, teyaku_display, select_hand, select_field, drawing, playing, sage_decision, round_end
    this.currentPlayerIndex = 0;
    this.message = '';
    this.teyakuDisplay = {};

    // Sage decision state tracking
    // Track which players have called sage (risky continuation)
    // If they don't improve by end of round, they lose all points
    this.sagePlayers = new Set(); // Players who chose sage
    this.sageBaselineKakuyaku = {}; // Track dekiyaku value at time of sage decision
    for (let i = 0; i < 3; i++) {
      this.sageBaselineKakuyaku[i] = 0; // Will be set when sage is called
    }

    // Round end reason tracking
    this.roundEndReason = null; // 'shoubu', 'cancel', or null (deck exhausted)
    this.shoubuPlayerIndex = null; // Which player called shoubu
    this.cancelPlayerIndex = null; // Which player called cancel

    // Track opponent decisions for display in round summary
    this.opponentDecisions = {}; // { playerIndex: { decision, dekiyakuValue } }

    // Deal and start round
    this.deal();
  }

  /**
   * Start new game
   */
  startGame(rounds = 12) {
    this.totalRounds = rounds;
    this.currentRound = 0;
    debugLogger.log('hachihachi', `🎴 Starting Hachi-Hachi game (${rounds} rounds)`);
    this.nextRound();
  }

  /**
   * Start next round
   */
  nextRound() {
    this.currentRound++;
    if (this.currentRound > this.totalRounds) {
      this.phase = 'game_end';
      this.message = 'Game Over!';
      return;
    }
    debugLogger.log('hachihachi', `🔄 Starting round ${this.currentRound} of ${this.totalRounds}`, null);
    this.reset();
    debugLogger.log('hachihachi', `✅ Round ${this.currentRound} initialized - ${this.field.length} field cards, ${this.players[0].hand.length} player cards`, {
      fieldCards: this.field.map(c => c.name),
      player0Hand: this.players[0].hand.length,
      player1Hand: this.players[1].hand.length,
      player2Hand: this.players[2].hand.length
    });
  }

  /**
   * Check if field has 4 cards of the same month (invalid deal)
   * @returns {boolean} true if field is invalid
   */
  isInvalidField() {
    const monthCounts = {};
    for (const card of this.field) {
      monthCounts[card.month] = (monthCounts[card.month] || 0) + 1;
      if (monthCounts[card.month] === 4) {
        return true;
      }
    }
    return false;
  }

  /**
   * Deal cards: 8 to each player, 8 to field (4-4)
   */
  deal() {
    debugLogger.log('hachihachi', `Dealing round ${this.currentRound}`);

    // Keep dealing until we get a valid field
    let validDeal = false;
    let dealAttempts = 0;
    const maxAttempts = 100; // Safety limit

    while (!validDeal && dealAttempts < maxAttempts) {
      dealAttempts++;

      // Reset deck and hands for re-deal
      if (dealAttempts > 1) {
        this.deck = new Deck();
        for (let i = 0; i < 3; i++) {
          this.players[i].hand = [];
        }
      }

      // Deal 4 field cards
      this.field = this.deck.drawMultiple(4);

      // Deal 8 cards to each player
      for (let i = 0; i < 8; i++) {
        for (let p = 0; p < 3; p++) {
          const card = this.deck.draw();
          if (card) this.players[p].hand.push(card);
        }
      }

      // Deal remaining 4 field cards
      this.field.push(...this.deck.drawMultiple(4));

      // Check if field is valid (no 4 of the same month)
      if (this.isInvalidField()) {
        debugLogger.log('hachihachi', `⚠️ Invalid field detected (4 cards of same month) - re-dealing...`, {
          attempt: dealAttempts,
          fieldCards: this.field.map(c => `${c.name} (${c.month})`)
        });
      } else {
        validDeal = true;
        debugLogger.log('hachihachi', `✅ Valid field dealt after ${dealAttempts} attempt(s)`, {
          fieldCards: this.field.map(c => `${c.name} (${c.month})`)
        });
      }
    }

    if (!validDeal) {
      console.error('Failed to deal valid field after', maxAttempts, 'attempts');
    }

    // Calculate field multiplier
    this.calculateFieldMultiplier();

    // Show teyaku payment grid
    this.showTeyakuPaymentGrid();
  }

  /**
   * Calculate field multiplier (1×, 2×, 4×)
   * Based on specific bright cards in the field:
   * - 4× (Grand Field): Rain Man (November) or Phoenix (December)
   * - 2× (Large Field): Crane (January), Curtain (March), or Moon (August)
   * - 1× (Small Field): No multiplier cards
   */
  calculateFieldMultiplier() {
    // Specific bright cards that trigger multipliers (card names as they appear in cards.js)
    const largeBrightCards = ['January - bright - crane', 'March - bright - curtain', 'August - bright - moon'];
    const grandBrightCards = ['November - bright - rain man', 'December - bright - phoenix'];

    // Check for specific cards in the field
    const hasGrandBright = this.field.some(c => grandBrightCards.includes(c.name));
    const hasLargeBright = this.field.some(c => largeBrightCards.includes(c.name));

    if (hasGrandBright) {
      this.fieldMultiplier = 4;
      const grandCard = this.field.find(c => grandBrightCards.includes(c.name));
      debugLogger.log('hachihachi', `🔴 Field multiplier: 4× (GRAND - ${grandCard.name})`, {
        fieldCards: this.field.map(c => `${c.name} (${c.type})`),
        triggeringCard: `${grandCard.name}`,
        multiplier: this.fieldMultiplier
      });
    } else if (hasLargeBright) {
      this.fieldMultiplier = 2;
      const largeCard = this.field.find(c => largeBrightCards.includes(c.name));
      debugLogger.log('hachihachi', `🟡 Field multiplier: 2× (LARGE - ${largeCard.name})`, {
        fieldCards: this.field.map(c => `${c.name} (${c.type})`),
        triggeringCard: `${largeCard.name}`,
        multiplier: this.fieldMultiplier
      });
    } else {
      this.fieldMultiplier = 1;
      debugLogger.log('hachihachi', `⚪ Field multiplier: 1× (SMALL - No multiplier cards)`, {
        fieldCards: this.field.map(c => `${c.name} (${c.type})`),
        multiplier: this.fieldMultiplier
      });
    }
  }

  /**
   * Show teyaku payment grid
   */
  showTeyakuPaymentGrid() {
    this.phase = 'teyaku_display';

    // Detect teyaku for all players
    for (let i = 0; i < 3; i++) {
      this.players[i].teyaku = Teyaku.detectTeyaku(this.players[i].hand);
      debugLogger.log('hachihachi', `Player ${i} teyaku:`, this.players[i].teyaku);
    }

    // Store teyaku cards for display (UI reference only, don't move in Card3D)
    // Cards remain in their hand zones - teyakuDisplay is just for the modal/UI
    for (let i = 1; i < 3; i++) {
      const teyakuCards = [];
      this.players[i].teyaku.forEach(t => {
        if (t.cardsInvolved && Array.isArray(t.cardsInvolved)) {
          teyakuCards.push(...t.cardsInvolved);
        }
      });
      const zoneKey = `player${i}Teyaku`;
      this.teyakuDisplay[zoneKey] = teyakuCards;
    }

    // Store teyaku for later calculations
    this.teyakuPaymentData = {
      playerTeyaku: this.players[0].teyaku,
      opponent1Teyaku: this.players[1].teyaku,
      opponent2Teyaku: this.players[2].teyaku
    };

    // Apply teyaku settlements immediately (kan are passed at this point)
    this.applyTeyakuSettlements();

    // Show payment grid modal
    if (this.teyakuPaymentCallback) {
      this.teyakuPaymentCallback({
        roundNumber: this.currentRound,
        playerTeyaku: this.players[0].teyaku,
        opponent1Teyaku: this.players[1].teyaku,
        opponent2Teyaku: this.players[2].teyaku,
        fieldMultiplier: this.fieldMultiplier,
        parValue: this.PAR_VALUE,
        onContinue: () => this.startMainPlay()
      });
    } else {
      this.startMainPlay();
    }
  }

  /**
   * Apply teyaku settlements to gameScore immediately
   * This happens right after teyaku are revealed (before main play)
   */
  applyTeyakuSettlements() {
    const getTeyakuTotal = (teyakuList) => {
      if (!teyakuList || teyakuList.length === 0) return 0;
      return teyakuList.reduce((sum, t) => sum + (t.value || 0), 0) * this.fieldMultiplier;
    };

    const teyakuValues = [
      getTeyakuTotal(this.teyakuPaymentData.playerTeyaku),
      getTeyakuTotal(this.teyakuPaymentData.opponent1Teyaku),
      getTeyakuTotal(this.teyakuPaymentData.opponent2Teyaku)
    ];

    // Store teyaku settlements for later calculation at round end
    this.teyakuSettlements = [];

    // Calculate (but do not apply) teyaku settlements - will be applied at round end
    for (let i = 0; i < 3; i++) {
      let netPayment = 0;

      // Collect from other players if this player has teyaku
      if (teyakuValues[i] > 0) {
        netPayment += teyakuValues[i] * 2; // Collect from both other players
      }

      // Pay to other players who have teyaku
      for (let j = 0; j < 3; j++) {
        if (i !== j && teyakuValues[j] > 0) {
          netPayment -= teyakuValues[j];
        }
      }

      // Store for later application at round end
      this.teyakuSettlements[i] = netPayment;

      debugLogger.log('hachihachi', `💳 Player ${i} teyaku settlement calculated (will apply at round end):`, {
        teyakuValue: teyakuValues[i],
        netPayment: netPayment
      });
    }
  }

  /**
   * Start main play phase
   */
  startMainPlay() {
    this.phase = 'select_hand';
    this.currentPlayerIndex = 0;
    this.message = 'Select a card from your hand.';
    debugLogger.log('hachihachi', 'Starting main play phase');
  }

  /**
   * Player selects a card (hand or field)
   * Follows Sakura pattern:
   * 1. Click hand card in select_hand phase → select it, move to select_field phase
   * 2. Click field card in select_field phase → match and capture
   * 3. Click same hand card again in select_field phase → place on field (if no matches)
   * 4. Click different hand card in select_field phase → switch selection
   */
  selectCard(card, owner = 'player') {
    debugLogger.log('hachihachi', `📌 selectCard() entry point`, {
      cardName: card.name,
      owner: owner,
      currentPhase: this.phase,
      currentPlayerIndex: this.currentPlayerIndex,
      drawnCard: this.drawnCard?.name,
      selectedCardsCount: this.selectedCards.length
    });

    // Handle field card clicks for drawn card matching (select_drawn_match phase)
    if (owner === 'field' && this.phase === 'select_drawn_match') {
      debugLogger.log('hachihachi', `🎯 selectCard: Routing to selectFieldCard for drawn match`, {
        phase: this.phase,
        owner: owner,
        card: card.name,
        drawnCard: this.drawnCard?.name
      });
      return this.selectFieldCard(card);
    }

    // Handle field card clicks for hand card matching (select_field phase)
    if (owner === 'field' && this.phase === 'select_field') {
      debugLogger.log('hachihachi', `🎯 selectCard: Routing to selectFieldCard for hand match`, {
        phase: this.phase,
        owner: owner,
        card: card.name,
        selectedCard: this.selectedCards[0]?.name
      });
      return this.selectFieldCard(card);
    }

    // Handle hand card selection in select_hand phase or opponent_turn phase (AI)
    if ((this.phase === 'select_hand' || this.phase === 'opponent_turn') && owner === 'player') {
      // Find matching cards on field
      const matches = this.field.filter(fc => fc.month === card.month);

      debugLogger.log('hachihachi', `🎴 Hand card selected: ${card.name} (${card.month})`, {
        fieldCards: this.field.map(c => `${c.name} (${c.month})`),
        matchCount: matches.length,
        matchedCards: matches.map(m => `${m.name} (${m.month})`)
      });

      // Store selected card and matches info
      this.selectedCards = [card];
      this.drawnCardMatches = matches;
      this.phase = 'select_field';

      // Set appropriate message based on matches
      if (matches.length === 0) {
        this.message = 'Click the card again to place on field, or click a different card';
      } else {
        this.message = `Click matching ${card.month} card to capture, or click the card again to place on field`;
      }

      return true;
    }

    // Handle selections in select_field phase
    if (this.phase === 'select_field' && owner === 'player') {
      // Check if clicking the SAME card - try to place it on field
      if (this.selectedCards[0].id === card.id) {
        // Recalculate fresh matches for this specific hand card (don't use drawnCardMatches which is from drawn card phase)
        const matches = this.field.filter(fc => fc.month === card.month);

        debugLogger.log('hachihachi', `🔍 Hand card placement attempt: ${card.name} (${card.month})`, {
          fieldCards: this.field.map(c => `${c.name} (${c.month})`),
          matchCount: matches.length,
          matchedCards: matches.map(m => `${m.name} (${m.month})`)
        });

        if (matches.length > 0) {
          // Matches exist - cannot place on field, must match
          this.message = `You must match with a card on the field (${matches.length} match${matches.length > 1 ? 'es' : ''} available)`;
          debugLogger.log('hachihachi', `❌ Cannot place card - matches exist`, {
            selectedCard: card.name,
            matches: matches.map(m => m.name)
          });
          return false;
        }

        // No matches - allow placing on field
        debugLogger.log('hachihachi', `✅ Placing card on field - no matches`, {
          card: card.name,
          month: card.month
        });
        return this.placeCardOnField(card);
      }

      // Check if clicking a DIFFERENT hand card - switch selection
      if (this.selectedCards[0].id !== card.id) {
        // Find matches for new card
        const matches = this.field.filter(fc => fc.month === card.month);

        // Update selection
        this.selectedCards = [card];
        this.drawnCardMatches = matches;

        // Update message
        if (matches.length === 0) {
          this.message = 'Click the card again to place on field, or click a different card';
        } else {
          this.message = `Click matching ${card.month} card to capture, or click the card again to place on field`;
        }

        return true;
      }
    }

    debugLogger.log('hachihachi', `❌ selectCard() returning false - no matching condition`, {
      owner: owner,
      currentPhase: this.phase,
      cardName: card.name,
      reasonMessage: 'Card click did not match any valid game phase condition'
    });
    return false;
  }

  /**
   * Place selected card on field (for unmatched cards)
   */
  placeCardOnField(card) {
    if (this.selectedCards.length === 0 || this.selectedCards[0].id !== card.id) {
      return false;
    }

    const currentPlayer = this.players[this.currentPlayerIndex];

    // Remove from hand
    currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== card.id);

    // Add to field
    this.field.push(card);

    this.message = `${card.name} placed on field`;
    debugLogger.log('hachihachi', `📌 Player ${this.currentPlayerIndex} placed ${card.name} on field (no match)`, {
      card: card.name,
      handSize: currentPlayer.hand.length,
      fieldSize: this.field.length
    });

    // Assign gridSlot to the hand card NOW, before drawing the next card
    // This ensures when the drawn card is placed on field, the hand card's slot is already reserved
    if (this.card3DManager && this.card3DManager.cards.has(card.id)) {
      const card3D = this.card3DManager.cards.get(card.id);
      if (card3D && card3D.gridSlot === undefined) {
        card3D.gridSlot = this.card3DManager.getNextAvailableFieldSlot();
        debugLogger.log('hachihachi', `📍 Pre-assigned gridSlot ${card3D.gridSlot} to hand card ${card.name} before drawing`, {
          cardId: card.id,
          slot: card3D.gridSlot
        });
      }
    }

    this.selectedCards = [];
    this.drawnCardMatches = [];
    this.proceedToDrawPhase();

    return true;
  }

  /**
   * Player selects field card to match
   */
  selectFieldCard(fieldCard) {
    debugLogger.log('hachihachi', `🔷 selectFieldCard() called`, {
      fieldCard: fieldCard.name,
      phase: this.phase,
      drawnCard: this.drawnCard?.name,
      selectedCards: this.selectedCards.map(c => c.name),
      selectedCardsLength: this.selectedCards.length
    });

    // Handle drawn card matching (select_drawn_match phase)
    if (this.phase === 'select_drawn_match' && this.drawnCard) {
      debugLogger.log('hachihachi', `📍 selectFieldCard() called in select_drawn_match phase`, {
        phase: this.phase,
        currentPlayerIndex: this.currentPlayerIndex,
        drawnCard: this.drawnCard.name,
        fieldCard: fieldCard.name
      });

      const currentPlayer = this.players[this.currentPlayerIndex];
      const drawnCard = this.drawnCard;

      // Validate that drawn card and field card have the same month
      if (drawnCard.month !== fieldCard.month) {
        debugLogger.log('hachihachi', `❌ Invalid match attempt: drawn card month doesn't match field card`, {
          drawnCardMonth: drawnCard.month,
          fieldCardMonth: fieldCard.month,
          drawnCard: drawnCard.name,
          fieldCard: fieldCard.name
        });
        this.message = `Cards must match by month! ${drawnCard.name} (${drawnCard.month}) cannot match ${fieldCard.name} (${fieldCard.month})`;
        return false;
      }

      debugLogger.log('hachihachi', `✅ Player ${this.currentPlayerIndex} matched drawn card: ${drawnCard.name} ↔ ${fieldCard.name}`, {
        drawnCard: drawnCard.name,
        fieldCard: fieldCard.name,
        totalCaptured: currentPlayer.captured.length + 2
      });

      currentPlayer.captured.push(drawnCard, fieldCard);
      this.field = this.field.filter(c => c.id !== fieldCard.id);

      // Check dekiyaku
      const newDekiyaku = Dekiyaku.detectDekiyaku(currentPlayer.captured);
      const previousDekiyakuCount = (this.players[this.currentPlayerIndex].dekiyaku || []).length;
      const newDekiyakuGained = newDekiyaku.length > previousDekiyakuCount;

      debugLogger.log('hachihachi', `📊 Dekiyaku check after drawn match for Player ${this.currentPlayerIndex}:`, {
        previousDekiyakuCount: previousDekiyakuCount,
        newDekiyakuCount: newDekiyaku.length,
        newDekiyakuGained: newDekiyakuGained,
        currentPlayerIndex: this.currentPlayerIndex,
        allNewDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none',
        totalCaptured: currentPlayer.captured.length
      });

      this.players[this.currentPlayerIndex].dekiyaku = newDekiyaku;

      this.drawnCard = null;
      this.drawnCardMatches = [];

      // If new dekiyaku was just captured, pause for Shoubu/Sage decision
      if (newDekiyakuGained) {
        // Check if player's hand is empty - if so, they cannot get a second dekiyaku, auto-Shoubu
        if (this.players[this.currentPlayerIndex].hand.length === 0) {
          debugLogger.log('hachihachi', `🎯 AUTOMATIC SHOUBU - Player's hand is empty (cannot form 2nd dekiyaku)!`, {
            player: this.currentPlayerIndex,
            newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
            totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
            reason: 'No cards left in hand to continue playing'
          });
          // Auto-call Shoubu (end round immediately)
          this.callShoubu(this.currentPlayerIndex);
          return true;
        }

        if (this.currentPlayerIndex === 0) {
          // Player is human - show decision UI
          debugLogger.log('hachihachi', `🎯 SHOUBU/SAGE DECISION TRIGGERED for human player!`, {
            newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
            totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
            phase: 'shoubu_decision',
            handRemaining: this.players[this.currentPlayerIndex].hand.length,
            deckRemaining: this.deck.count
          });
          this.phase = 'shoubu_decision';
          this.message = `Dekiyaku captured! Choose: SHOUBU (end round) or SAGE (continue playing)`;
          // Trigger UI decision
          this._triggerShoubuSageDecision();
          return true;
        } else if (this.currentPlayerIndex > 0) {
          // Opponent - make AI decision
          debugLogger.log('hachihachi', `🎯 SHOUBU/SAGE DECISION for Opponent ${this.currentPlayerIndex}!`, {
            newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
            totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
            handRemaining: this.players[this.currentPlayerIndex].hand.length,
            deckRemaining: this.deck.count
          });

          // Opponent makes decision via AI
          const opponentDecision = this._makeOpponentDekiyakuDecision(this.currentPlayerIndex);

          if (opponentDecision === 'sage') {
            this.callSage(this.currentPlayerIndex);
          } else {
            this.callShoubu(this.currentPlayerIndex);
          }
          return true;
        }
      } else {
        // No new dekiyaku - proceed to next player
        debugLogger.log('hachihachi', `ℹ️ No new dekiyaku from drawn match - proceeding to next player`, {
          currentPlayerIndex: this.currentPlayerIndex,
          allDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none',
          deckRemaining: this.deck.count
        });
        setTimeout(() => this.nextPlayer(), 300);
      }

      return true;
    }

    // Handle hand card matching (select_field phase)
    if (this.selectedCards.length === 0) {
      debugLogger.log('hachihachi', `❌ selectFieldCard: No selected hand card`, {
        phase: this.phase,
        selectedCardsLength: this.selectedCards.length,
        fieldCard: fieldCard.name
      });
      return false;
    }

    const handCard = this.selectedCards[0];

    debugLogger.log('hachihachi', `🎯 selectFieldCard: Attempting hand-field match`, {
      phase: this.phase,
      handCard: handCard.name,
      handCardMonth: handCard.month,
      fieldCard: fieldCard.name,
      fieldCardMonth: fieldCard.month,
      currentPlayerIndex: this.currentPlayerIndex
    });

    // CRITICAL: Validate that hand card and field card have the same month
    // Only cards of the same month can be matched
    if (handCard.month !== fieldCard.month) {
      debugLogger.log('hachihachi', `❌ Invalid match attempt: hand card month doesn't match field card`, {
        handCardMonth: handCard.month,
        fieldCardMonth: fieldCard.month,
        handCard: handCard.name,
        fieldCard: fieldCard.name
      });
      this.message = `Cards must match by month! ${handCard.name} (${handCard.month}) cannot match ${fieldCard.name} (${fieldCard.month})`;
      return false;
    }

    // Remove from hand
    const currentPlayer = this.players[this.currentPlayerIndex];
    currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== handCard.id);

    // Check if Hiki (all 4 cards)
    const hikiCards = this.field.filter(c => c.month === fieldCard.month);
    if (hikiCards.length === 3) {
      // Capture all 4
      currentPlayer.captured.push(handCard, ...hikiCards);
      this.field = this.field.filter(c => !hikiCards.includes(c));
      this.message = `HIKI! Captured all 4 ${fieldCard.month}!`;
      debugLogger.log('hachihachi', `🎪 HIKI! Player ${this.currentPlayerIndex} captured all 4 ${fieldCard.month}!`, {
        hand: handCard.name,
        field: hikiCards.map(c => c.name),
        totalCaptured: currentPlayer.captured.length
      });
    } else {
      // Capture just the matched card(s)
      currentPlayer.captured.push(handCard, fieldCard);
      this.field = this.field.filter(c => c.id !== fieldCard.id);
      debugLogger.log('hachihachi', `✅ Player ${this.currentPlayerIndex} matched: ${handCard.name} ↔ ${fieldCard.name}`, {
        handCard: handCard.name,
        fieldCard: fieldCard.name,
        totalCaptured: currentPlayer.captured.length
      });
    }

    // Check for NEW dekiyaku (only check against previous dekiyaku state)
    // This will be used to trigger Shoubu/Sage decision
    const newDekiyaku = Dekiyaku.detectDekiyaku(currentPlayer.captured);
    const previousDekiyakuCount = (this.players[this.currentPlayerIndex].dekiyaku || []).length;
    const newDekiyakuGained = newDekiyaku.length > previousDekiyakuCount;

    debugLogger.log('hachihachi', `📊 Dekiyaku check after hand card match for Player ${this.currentPlayerIndex}:`, {
      previousDekiyakuCount: previousDekiyakuCount,
      newDekiyakuCount: newDekiyaku.length,
      newDekiyakuGained: newDekiyakuGained,
      currentPlayerIndex: this.currentPlayerIndex,
      allNewDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none',
      totalCaptured: currentPlayer.captured.length
    });

    // Update the player's current dekiyaku
    this.players[this.currentPlayerIndex].dekiyaku = newDekiyaku;

    this.selectedCards = [];
    this.drawnCardMatches = [];

    // If new dekiyaku was just captured, pause for Shoubu/Sage decision
    if (newDekiyakuGained) {
      // Check if player's hand is empty - if so, they cannot get a second dekiyaku, auto-Shoubu
      if (this.players[this.currentPlayerIndex].hand.length === 0) {
        debugLogger.log('hachihachi', `🎯 AUTOMATIC SHOUBU - Player's hand is empty (cannot form 2nd dekiyaku)!`, {
          player: this.currentPlayerIndex,
          newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
          totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
          matchContext: `${handCard.name} ↔ ${fieldCard.name}`,
          reason: 'No cards left in hand to continue playing'
        });
        // Auto-call Shoubu (end round immediately)
        this.callShoubu(this.currentPlayerIndex);
        return true;
      }

      if (this.currentPlayerIndex === 0) {
        // Player is human - show decision UI
        debugLogger.log('hachihachi', `🎯 SHOUBU/SAGE DECISION TRIGGERED for human player!`, {
          newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
          totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
          phase: 'shoubu_decision',
          matchContext: `${handCard.name} ↔ ${fieldCard.name}`,
          handRemaining: this.players[this.currentPlayerIndex].hand.length,
          deckRemaining: this.deck.count
        });
        this.phase = 'shoubu_decision';
        this.message = `Dekiyaku captured! Choose: SHOUBU (end round) or SAGE (continue playing)`;
        // Trigger UI decision
        this._triggerShoubuSageDecision();
        return true;
      } else if (this.currentPlayerIndex > 0) {
        // Opponent - make AI decision
        debugLogger.log('hachihachi', `🎯 SHOUBU/SAGE DECISION for Opponent ${this.currentPlayerIndex}!`, {
          newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
          totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
          handRemaining: this.players[this.currentPlayerIndex].hand.length,
          deckRemaining: this.deck.count
        });

        // Opponent makes decision via AI
        const opponentDecision = this._makeOpponentDekiyakuDecision(this.currentPlayerIndex);

        if (opponentDecision === 'sage') {
          this.callSage(this.currentPlayerIndex);
        } else {
          this.callShoubu(this.currentPlayerIndex);
        }
        return true;
      }
    } else {
      // No new dekiyaku - continue normally
      debugLogger.log('hachihachi', `ℹ️ No new dekiyaku from hand card match - proceeding to draw phase`, {
        currentPlayerIndex: this.currentPlayerIndex,
        allDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none',
        deckRemaining: this.deck.count
      });
      this.proceedToDrawPhase();
    }

    return true;
  }

  /**
   * Proceed to draw phase
   */
  proceedToDrawPhase() {
    this.phase = 'drawing';
    const card = this.deck.draw();

    if (!card) {
      // Deck exhausted - check if all players have cards in hand
      // Only end round if deck AND all hands are empty
      const allHandsEmpty = this.players.every(p => p.hand.length === 0);
      if (allHandsEmpty) {
        // All cards have been played - end round
        this.endRound();
        return;
      } else {
        // Players still have cards but deck is empty
        // Continue to next player's turn (they must play from their hand)
        this.nextPlayer();
        return;
      }
    }

    this.drawnCard = card;
    const matches = this.field.filter(fc => fc.month === card.month);
    this.drawnCardMatches = matches;

    if (matches.length === 0) {
      // Add to field
      this.field.push(card);
      this.drawnCard = null;
      // Proceed to next player after brief delay for animation
      setTimeout(() => this.nextPlayer(), 300);
    } else if (matches.length === 3) {
      // Hiki! All 4 cards of the month - auto-capture all without decision
      this.phase = 'playing';
      setTimeout(() => {
        const currentPlayer = this.players[this.currentPlayerIndex];
        debugLogger.log('hachihachi', `🎪 HIKI! Player ${this.currentPlayerIndex} drew ${card.name} - capturing all 4 ${card.month}!`, {
          drawnCard: card.name,
          fieldCards: matches.map(m => m.name),
          totalCaptured: currentPlayer.captured.length + 4
        });

        currentPlayer.captured.push(card, ...matches);
        this.field = this.field.filter(c => !matches.includes(c));

        // Check dekiyaku
        const newDekiyaku = Dekiyaku.detectDekiyaku(currentPlayer.captured);
        const previousDekiyakuCount = (this.players[this.currentPlayerIndex].dekiyaku || []).length;
        const newDekiyakuGained = newDekiyaku.length > previousDekiyakuCount;

        debugLogger.log('hachihachi', `📊 Dekiyaku check after Hiki draw for Player ${this.currentPlayerIndex}:`, {
          previousDekiyakuCount: previousDekiyakuCount,
          newDekiyakuCount: newDekiyaku.length,
          newDekiyakuGained: newDekiyakuGained,
          currentPlayerIndex: this.currentPlayerIndex,
          allNewDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none',
          totalCaptured: currentPlayer.captured.length
        });

        this.players[this.currentPlayerIndex].dekiyaku = newDekiyaku;

        this.drawnCard = null;
        this.drawnCardMatches = [];

        // If new dekiyaku was just captured, pause for Shoubu/Sage decision
        if (newDekiyakuGained && this.currentPlayerIndex === 0) {
          // Player is human - show decision UI
          debugLogger.log('hachihachi', `🎯 SHOUBU/SAGE DECISION TRIGGERED for human player (Hiki)!`, {
            newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
            totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
            phase: 'shoubu_decision'
          });
          this.phase = 'shoubu_decision';
          this.message = `Dekiyaku captured! Choose: SHOUBU (end round) or SAGE (continue playing)`;
          // Trigger UI decision
          this._triggerShoubuSageDecision();
          return;
        } else if (newDekiyakuGained && this.currentPlayerIndex > 0) {
          // Opponent - auto decide (for now, auto-sage to be aggressive)
          debugLogger.log('hachihachi', `⚠️ Opponent ${this.currentPlayerIndex} captured dekiyaku from Hiki draw - auto-choosing SAGE`, {
            newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
            totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0)
          });
          setTimeout(() => this.nextPlayer(), 300);
        } else {
          // No new dekiyaku - proceed to next player
          debugLogger.log('hachihachi', `ℹ️ No new dekiyaku from Hiki draw - proceeding to next player`, {
            currentPlayerIndex: this.currentPlayerIndex,
            allDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none'
          });
          setTimeout(() => this.nextPlayer(), 300);
        }
      }, 400);
    } else if (matches.length > 1) {
      // Multiple matches (2 cards) - player/AI must choose which one to match
      this.phase = 'select_drawn_match';
      this.message = `Drew ${card.name} - Select which card to match`;
      debugLogger.log('hachihachi', `📍 Entering select_drawn_match phase for Player ${this.currentPlayerIndex}`, {
        drawnCard: card.name,
        matchCount: matches.length,
        matchedCards: matches.map(m => m.name),
        isHumanPlayer: this.currentPlayerIndex === 0,
        isAI: this.currentPlayerIndex > 0
      });
      if (this.currentPlayerIndex > 0) {
        // AI player - choose first match
        setTimeout(() => {
          this.selectFieldCard(matches[0]);
        }, 500);
      }
    } else {
      // Single match - auto-capture
      this.phase = 'playing';
      setTimeout(() => {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const fieldCard = matches[0];

        debugLogger.log('hachihachi', `⚡ Auto-match! Player ${this.currentPlayerIndex} drew ${card.name} matching ${fieldCard.name}`, {
          drawnCard: card.name,
          matchedCard: fieldCard.name
        });

        currentPlayer.captured.push(card, fieldCard);
        this.field = this.field.filter(c => c.id !== fieldCard.id);

        // Check dekiyaku
        const newDekiyaku = Dekiyaku.detectDekiyaku(currentPlayer.captured);
        const previousDekiyakuCount = (this.players[this.currentPlayerIndex].dekiyaku || []).length;
        const newDekiyakuGained = newDekiyaku.length > previousDekiyakuCount;

        debugLogger.log('hachihachi', `📊 Dekiyaku check after auto-match draw for Player ${this.currentPlayerIndex}:`, {
          previousDekiyakuCount: previousDekiyakuCount,
          newDekiyakuCount: newDekiyaku.length,
          newDekiyakuGained: newDekiyakuGained,
          currentPlayerIndex: this.currentPlayerIndex,
          allNewDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none',
          totalCaptured: currentPlayer.captured.length
        });

        this.players[this.currentPlayerIndex].dekiyaku = newDekiyaku;

        debugLogger.log('hachihachi', `⚡ Auto-match completed: Player ${this.currentPlayerIndex} captured ${card.name} + ${fieldCard.name}`, {
          totalCaptured: currentPlayer.captured.length,
          newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`)
        });

        this.drawnCard = null;
        this.drawnCardMatches = [];

        // If new dekiyaku was just captured, pause for Shoubu/Sage decision
        if (newDekiyakuGained && this.currentPlayerIndex === 0) {
          // Player is human - show decision UI
          debugLogger.log('hachihachi', `🎯 SHOUBU/SAGE DECISION TRIGGERED for human player (auto-match)!`, {
            newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
            totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
            phase: 'shoubu_decision'
          });
          this.phase = 'shoubu_decision';
          this.message = `Dekiyaku captured! Choose: SHOUBU (end round) or SAGE (continue playing)`;
          // Trigger UI decision
          this._triggerShoubuSageDecision();
          return;
        } else if (newDekiyakuGained && this.currentPlayerIndex > 0) {
          // Opponent - auto decide (for now, auto-sage to be aggressive)
          debugLogger.log('hachihachi', `⚠️ Opponent ${this.currentPlayerIndex} captured dekiyaku from draw - auto-choosing SAGE`, {
            newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
            totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0)
          });
          setTimeout(() => this.nextPlayer(), 300);
        } else {
          // No new dekiyaku - proceed to next player
          debugLogger.log('hachihachi', `ℹ️ No new dekiyaku from auto-match draw - proceeding to next player`, {
            currentPlayerIndex: this.currentPlayerIndex,
            allDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none'
          });
          setTimeout(() => this.nextPlayer(), 300);
        }
      }, 400);
    }
  }

  /**
   * Move to next player
   */
  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 3;

    if (this.phase === 'drawing' || this.phase === 'playing' || this.phase === 'select_drawn_match') {
      // Check if all cards are played (deck empty AND all hands empty)
      const allHandsEmpty = this.players.every(p => p.hand.length === 0);
      if (this.deck.count === 0 && allHandsEmpty) {
        // All cards have been played - end round
        this.endRound();
        return;
      }

      // Check if current player has called sage before - give them option to cancel or continue
      if (this.sagePlayers.has(this.currentPlayerIndex)) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const currentDekiyakuValue = (currentPlayer.dekiyaku || []).reduce((sum, d) => sum + d.value, 0);

        debugLogger.log('hachihachi', `🔮 Player ${this.currentPlayerIndex} has sage active at turn start`, {
          dekiyakuValue: currentDekiyakuValue,
          canCancel: true
        });

        // Player has sage - give them decision to continue or cancel
        if (this.currentPlayerIndex === 0) {
          // Human player - show decision modal
          this.phase = 'sage_decision';
          this._triggerSageContinuationDecision();
          return;
        } else {
          // AI player - make decision
          const decision = this._makeOpponentSageContinuationDecision(this.currentPlayerIndex);
          if (decision === 'cancel') {
            this.callCancel(this.currentPlayerIndex);
            return;
          }
          // Continuing sage - notify UI
          if (this.opponentDecisionCallback) {
            this.opponentDecisionCallback({
              playerIndex: this.currentPlayerIndex,
              decision: 'sage_continue',
              dekiyakuList: currentPlayer.dekiyaku,
              dekiyakuValue: currentDekiyakuValue
            });
          }
          // Otherwise continue to normal turn
        }
      }

      // Next player's turn (normal play, no sage continuation decision needed)
      if (this.currentPlayerIndex === 0) {
        // Human player's turn
        this.phase = 'select_hand';
        this.message = 'Your turn! Select a card from your hand.';
      } else {
        // AI player's turn
        this.phase = 'opponent_turn';
        // Schedule AI move with slight delay to allow UI updates
        setTimeout(() => this.opponentTurn(), 500);
      }
    }
  }

  /**
   * Opponent (AI) turn handler
   */
  opponentTurn() {
    // Only proceed if still in opponent_turn phase
    if (this.phase !== 'opponent_turn') {
      return;
    }

    const hand = this.players[this.currentPlayerIndex].hand;
    if (hand.length === 0) {
      // No cards left - just draw
      setTimeout(() => this.proceedToDrawPhase(), 300);
      return;
    }

    // Simple AI: prefer matching cards
    const matchingCards = hand.filter(c => this.field.some(fc => fc.month === c.month));
    const cardToPlay = matchingCards.length > 0 ? matchingCards[0] : hand[0];

    // Select the card (enters select_field phase)
    this.selectCard(cardToPlay, 'player');

    // CRITICAL: Calculate fresh matches for this opponent's card, not reuse player's drawnCardMatches
    const freshMatches = this.field.filter(fc => fc.month === cardToPlay.month);

    debugLogger.log('hachihachi', `🤖 Opponent ${this.currentPlayerIndex} turn: playing ${cardToPlay.name}`, {
      freshMatches: freshMatches.map(m => `${m.name} (${m.month})`),
      matchCount: freshMatches.length
    });

    // Check if there are matches
    if (freshMatches.length > 0) {
      // Match with first matching field card
      setTimeout(() => {
        this.selectFieldCard(freshMatches[0]);
      }, 400);
    } else {
      // Place on field
      setTimeout(() => {
        this.placeCardOnField(cardToPlay);
      }, 400);
    }
  }

  /**
   * Call method for SHOUBU decision (end round)
   * The dekiyaku they currently have will be finalized and counted
   * @param {number} playerKey - Player index (0=player, 1-2=opponents)
   */
  callShoubu(playerKey) {
    const playerIndex = typeof playerKey === 'number' ? playerKey : this.currentPlayerIndex;
    const player = this.players[playerIndex];

    debugLogger.log('hachihachi', `🛑 Player ${playerIndex} chose SHOUBU (end round)`, {
      dekiyaku: player.dekiyaku.map(d => d.name),
      totalValue: player.dekiyaku.reduce((sum, d) => sum + d.value, 0)
    });

    // Store opponent decision for display in summary
    if (playerIndex !== 0) {
      this.opponentDecisions[playerIndex] = {
        decision: 'shoubu',
        dekiyakuValue: player.dekiyaku.reduce((sum, d) => sum + d.value, 0)
      };
    }

    // Notify UI of opponent decision if not player 0
    if (playerIndex !== 0 && this.opponentDecisionCallback) {
      this.opponentDecisionCallback({
        playerIndex: playerIndex,
        decision: 'shoubu',
        dekiyakuList: player.dekiyaku,
        dekiyakuValue: player.dekiyaku.reduce((sum, d) => sum + d.value, 0)
      });
    }

    // Store which player called shoubu for scoring
    this.roundEndReason = 'shoubu';
    this.shoubuPlayerIndex = playerIndex;

    // CRITICAL: When someone calls Shoubu, finalize ALL players' current dekiyaku
    // This ensures all players' dekiyaku are locked in for settlement
    for (let i = 0; i < 3; i++) {
      this.players[i].finalizedDekiyaku = this.players[i].dekiyaku.slice();
      debugLogger.log('hachihachi', `🔒 Player ${i} dekiyaku finalized:`, {
        dekiyaku: this.players[i].finalizedDekiyaku.map(d => d.name).join(', ') || 'none',
        totalValue: this.players[i].finalizedDekiyaku.reduce((sum, d) => sum + d.value, 0)
      });
    }

    // Remove from sage players if they were in it (cancelled sage)
    this.sagePlayers.delete(playerIndex);

    // End the round with current dekiyaku
    this.phase = 'round_end';
    this.endRound();
  }

  /**
   * Call method for SAGE decision (continue playing)
   * Risk: if they don't improve, they lose all points at end of round
   * @param {number} playerKey - Player index (0=player, 1-2=opponents)
   */
  callSage(playerKey) {
    const playerIndex = typeof playerKey === 'number' ? playerKey : this.currentPlayerIndex;
    const player = this.players[playerIndex];

    const currentDekiyakuValue = player.dekiyaku.reduce((sum, d) => sum + d.value, 0);

    debugLogger.log('hachihachi', `⚔️ Player ${playerIndex} chose SAGE (continue playing)`, {
      currentDekiyaku: player.dekiyaku.map(d => d.name),
      currentValue: currentDekiyakuValue,
      riskNote: 'Will lose all points if no improvement before round ends'
    });

    // Store opponent decision for display in summary
    if (playerIndex !== 0) {
      this.opponentDecisions[playerIndex] = {
        decision: 'sage',
        dekiyakuValue: currentDekiyakuValue
      };
    }

    // Notify UI of opponent decision if not player 0
    if (playerIndex !== 0 && this.opponentDecisionCallback) {
      this.opponentDecisionCallback({
        playerIndex: playerIndex,
        decision: 'sage',
        dekiyakuList: player.dekiyaku,
        dekiyakuValue: currentDekiyakuValue
      });
    }

    // Mark as sage player and store baseline
    this.sagePlayers.add(playerIndex);
    this.sageBaselineKakuyaku[playerIndex] = currentDekiyakuValue;

    // Clear finalized dekiyaku (can still improve)
    player.finalizedDekiyaku = undefined;

    // Continue to draw phase (dekiyaku will be updated if new ones are captured)
    this.proceedToDrawPhase();
  }

  /**
   * Call method for CANCEL SAGE decision (reduce to par)
   * "Safe" option - gets par value score instead of trying for more
   * This is a way to cancel a previous sage decision and settle for par
   * @param {number} playerKey - Player index (0=player, 1-2=opponents)
   */
  callCancel(playerKey) {
    const playerIndex = typeof playerKey === 'number' ? playerKey : this.currentPlayerIndex;
    const player = this.players[playerIndex];

    debugLogger.log('hachihachi', `🔄 Player ${playerIndex} chose CANCEL (half dekiyaku value)`, {
      currentDekiyaku: player.dekiyaku.map(d => d.name),
      currentValue: player.dekiyaku.reduce((sum, d) => sum + d.value, 0),
      note: 'Will receive half dekiyaku value from each opponent'
    });

    // Store opponent decision for display in summary
    if (playerIndex !== 0) {
      this.opponentDecisions[playerIndex] = {
        decision: 'cancel',
        dekiyakuValue: player.dekiyaku.reduce((sum, d) => sum + d.value, 0)
      };
    }

    // Notify UI of opponent decision if not player 0
    if (playerIndex !== 0 && this.opponentDecisionCallback) {
      this.opponentDecisionCallback({
        playerIndex: playerIndex,
        decision: 'cancel',
        dekiyakuList: player.dekiyaku,
        dekiyakuValue: player.dekiyaku.reduce((sum, d) => sum + d.value, 0)
      });
    }

    // Store which player called cancel for scoring
    this.roundEndReason = 'cancel';
    this.cancelPlayerIndex = playerIndex;

    // Cancel sage if they were playing sage
    this.sagePlayers.delete(playerIndex);

    // Store special flag to indicate cancel was chosen
    // This prevents full dekiyaku from being scored (only half value)
    player.cancelledSage = true;
    player.finalizedDekiyaku = player.dekiyaku.slice(); // Store for half-value scoring

    // End the round (with half dekiyaku)
    this.phase = 'round_end';
    this.endRound();
  }

  /**
   * Legacy method for backward compatibility
   */
  chooseShoubu() {
    this.callShoubu(this.currentPlayerIndex);
  }

  /**
   * Legacy method for backward compatibility
   */
  chooseSage() {
    this.callSage(this.currentPlayerIndex);
  }

  /**
   * Cancel sage decision - player can call this to go back to par value
   * Only applicable when player has called sage (playerHasSageActive === true)
   */
  cancelSage() {
    this.callCancel(0); // Player is always index 0
  }

  /**
   * End round and calculate scores
   *
   * Scoring for Hachi-Hachi:
   * 1. Card points: (captured points - 88) × field multiplier
   * 2. Dekiyaku: detected during play, applied with field multiplier
   * 3. Teyaku: paid at round start (separate settlement, not included in roundScore)
   * 4. Field multiplier: 1×, 2×, or 4× based on bright cards on field
   */
  endRound() {
    this.phase = 'round_end';
    debugLogger.log('hachihachi', `🏁 ROUND ${this.currentRound} ENDED - Calculating scores`, {
      fieldMultiplier: this.fieldMultiplier,
      roundEndReason: this.roundEndReason || 'deck_exhausted'
    });

    // Verify all deck cards are accounted for
    const totalCaptured = this.players.reduce((sum, p) => sum + p.captured.length, 0);
    const remainingField = this.field.length;
    const totalCards = totalCaptured + remainingField;

    if (totalCards !== 48) {
      debugLogger.log('hachihachi', `⚠️ Card accounting error: ${totalCaptured} captured + ${remainingField} field = ${totalCards} (should be 48)`, {
        player0Captured: this.players[0].captured.length,
        player1Captured: this.players[1].captured.length,
        player2Captured: this.players[2].captured.length,
        fieldCards: this.field.length
      });
    }

    // Initialize all scores to 0 (dekiyaku is the ONLY scoring method)
    for (let i = 0; i < 3; i++) {
      this.players[i].roundScore = 0;
    }

    // Determine how the round ended and handle scoring accordingly
    let roundEndReason = this.roundEndReason || 'deck_exhausted';
    let roundWinner = null;
    const dekiyakuSettlements = [0, 0, 0]; // Track settlement amounts for display

    debugLogger.log('hachihachi', `📋 Round Ending - Method: ${roundEndReason}`, {
      shoulduPlayerIndex: this.shoubuPlayerIndex,
      cancelPlayerIndex: this.cancelPlayerIndex,
      sagePlayers: Array.from(this.sagePlayers),
      hasAnyDekiyaku: this.players.some(p => (p.dekiyaku || []).length > 0)
    });

    // ============================================================================
    // CASE 1: SHOUBU - Only the player who called shoubu scores
    // ============================================================================
    if (roundEndReason === 'shoubu') {
      const shoubuPlayer = this.players[this.shoubuPlayerIndex];
      const dekiyakuValue = (shoubuPlayer.dekiyaku || []).reduce((sum, d) => sum + d.value, 0);

      debugLogger.log('hachihachi', `🛑 SHOUBU SCORING: Player ${this.shoubuPlayerIndex} called Shoubu`, {
        dekiyakuValue: dekiyakuValue,
        willScore: dekiyakuValue > 0
      });

      if (dekiyakuValue > 0) {
        // Player who called shoubu collects from each opponent
        const pointsPerOpponent = dekiyakuValue * this.fieldMultiplier;

        for (let i = 0; i < 3; i++) {
          if (i === this.shoubuPlayerIndex) {
            // This player collects from 2 opponents
            shoubuPlayer.roundScore = pointsPerOpponent * 2;
            dekiyakuSettlements[i] = pointsPerOpponent * 2;

            debugLogger.log('hachihachi', `💰 Player ${i} (SHOUBU caller) collects:`, {
              pointsPerOpponent: pointsPerOpponent,
              totalCollected: pointsPerOpponent * 2,
              reason: 'Called Shoubu with dekiyaku'
            });
          } else {
            // Opponent pays
            const paymentAmount = pointsPerOpponent;

            // CRITICAL RULE: If opponent called sage, they pay DOUBLE
            if (this.sagePlayers.has(i)) {
              this.players[i].roundScore = -paymentAmount * 2;
              dekiyakuSettlements[i] = -paymentAmount * 2;

              debugLogger.log('hachihachi', `💸 Player ${i} (SAGE caller) pays DOUBLE:`, {
                basePayment: paymentAmount,
                doublePayment: paymentAmount * 2,
                reason: 'Called Sage, must pay double to Shoubu caller'
              });
            } else {
              // Did not call sage - pay normal amount
              this.players[i].roundScore = -paymentAmount;
              dekiyakuSettlements[i] = -paymentAmount;

              debugLogger.log('hachihachi', `💸 Player ${i} pays:`, {
                payment: paymentAmount,
                reason: 'Opponent called Shoubu'
              });
            }
          }
        }

        roundWinner = this.shoubuPlayerIndex;
      }
    }
    // ============================================================================
    // CASE 2: CANCEL - Only the player who called cancel scores (half value)
    // ============================================================================
    else if (roundEndReason === 'cancel') {
      const cancelPlayer = this.players[this.cancelPlayerIndex];
      const dekiyakuValue = (cancelPlayer.dekiyaku || []).reduce((sum, d) => sum + d.value, 0);

      debugLogger.log('hachihachi', `🔄 CANCEL SCORING: Player ${this.cancelPlayerIndex} called Cancel`, {
        dekiyakuValue: dekiyakuValue,
        halfValue: Math.floor(dekiyakuValue / 2),
        willScore: dekiyakuValue > 0
      });

      if (dekiyakuValue > 0) {
        // Player who called cancel collects HALF value from each opponent
        const halfValuePerOpponent = Math.floor((dekiyakuValue * this.fieldMultiplier) / 2);

        for (let i = 0; i < 3; i++) {
          if (i === this.cancelPlayerIndex) {
            // This player collects half value from 2 opponents
            cancelPlayer.roundScore = halfValuePerOpponent * 2;
            dekiyakuSettlements[i] = halfValuePerOpponent * 2;

            debugLogger.log('hachihachi', `💰 Player ${i} (CANCEL caller) collects half:`, {
              halfValuePerOpponent: halfValuePerOpponent,
              totalCollected: halfValuePerOpponent * 2,
              reason: 'Called Cancel with dekiyaku'
            });
          } else {
            // Opponent pays half value
            const halfPayment = halfValuePerOpponent;
            this.players[i].roundScore = -halfPayment;
            dekiyakuSettlements[i] = -halfPayment;

            debugLogger.log('hachihachi', `💸 Player ${i} pays half:`, {
              payment: halfPayment,
              reason: 'Opponent called Cancel'
            });
          }
        }

        roundWinner = this.cancelPlayerIndex;
      }
    }
    // ============================================================================
    // CASE 3: DECK EXHAUSTED - All sage players collect half their dekiyaku value
    // ============================================================================
    else {
      // roundEndReason === 'deck_exhausted' (all players kept calling sage)
      debugLogger.log('hachihachi', `📖 DECK EXHAUSTED SCORING: All players called Sage`, {
        sagePlayers: Array.from(this.sagePlayers),
        hasAnyDekiyaku: this.players.some(p => (p.dekiyaku || []).length > 0)
      });

      // Check if any player has dekiyaku
      const hasAnyDekiyaku = this.players.some(p => (p.dekiyaku || []).length > 0);

      if (hasAnyDekiyaku) {
        // All players score half their dekiyaku value
        for (let i = 0; i < 3; i++) {
          const dekiyakuValue = (this.players[i].dekiyaku || []).reduce((sum, d) => sum + d.value, 0);

          if (dekiyakuValue > 0) {
            // This player collects half from each of 2 opponents
            const halfValuePerOpponent = Math.floor((dekiyakuValue * this.fieldMultiplier) / 2);
            this.players[i].roundScore = halfValuePerOpponent * 2;
            dekiyakuSettlements[i] = halfValuePerOpponent * 2;

            debugLogger.log('hachihachi', `💰 Player ${i} (deck exhausted) collects half:`, {
              dekiyakuValue: dekiyakuValue,
              halfValuePerOpponent: halfValuePerOpponent,
              totalCollected: halfValuePerOpponent * 2,
              reason: 'Has dekiyaku, deck exhausted'
            });
          } else {
            // This player has no dekiyaku - they pay
            let totalToPay = 0;

            for (let j = 0; j < 3; j++) {
              if (i !== j) {
                const otherDekiyakuValue = (this.players[j].dekiyaku || []).reduce((sum, d) => sum + d.value, 0);
                if (otherDekiyakuValue > 0) {
                  totalToPay += Math.floor((otherDekiyakuValue * this.fieldMultiplier) / 2);
                }
              }
            }

            this.players[i].roundScore = -totalToPay;
            dekiyakuSettlements[i] = -totalToPay;

            debugLogger.log('hachihachi', `💸 Player ${i} (deck exhausted) pays:`, {
              totalToPay: totalToPay,
              reason: 'Has no dekiyaku, others do'
            });
          }
        }

        // Winner is the first player who called sage
        // For deck exhaustion, find first sage player (or player 0 if all were sage)
        const firstSagePlayer = Array.from(this.sagePlayers)[0] ?? 0;
        roundWinner = firstSagePlayer;
      } else {
        // No one has dekiyaku - calculate par value for each player
        debugLogger.log('hachihachi', `📊 DECK EXHAUSTED - No dekiyaku: Calculating par value for all players`, {});

        const CARD_VALUES = { 'bright': 20, 'ribbon': 5, 'animal': 10, 'chaff': 1 };

        for (let i = 0; i < 3; i++) {
          const player = this.players[i];
          const cardPoints = player.captured.reduce((sum, card) => {
            return sum + (CARD_VALUES[card.type] || 0);
          }, 0);

          // Par value scoring: (cardPoints - 88) × fieldMultiplier
          const parScore = (cardPoints - this.PAR_VALUE) * this.fieldMultiplier;
          player.roundScore = parScore;
          dekiyakuSettlements[i] = 0; // No dekiyaku settlement

          debugLogger.log('hachihachi', `💰 Player ${i} (no dekiyaku) par value:`, {
            cardPoints: cardPoints,
            parValue: this.PAR_VALUE,
            fieldMultiplier: this.fieldMultiplier,
            parScore: parScore
          });
        }

        // Winner is first sage player, or player with highest score if no sage
        if (this.sagePlayers.size > 0) {
          const firstSagePlayer = Array.from(this.sagePlayers)[0];
          roundWinner = firstSagePlayer;
        } else {
          const scores = this.players.map(p => p.roundScore);
          const maxScore = Math.max(...scores);
          roundWinner = scores.findIndex(s => s === maxScore);
        }
      }
    }

    // Log comparative scores
    const scores = this.players.map(p => p.roundScore);
    const maxScore = Math.max(...scores);
    const leaders = this.players.filter((p, i) => scores[i] === maxScore);
    debugLogger.log('hachihachi', `🎯 Round ${this.currentRound} Results (after dekiyaku settlement):`, {
      player0: `${scores[0]} kan`,
      player1: `${scores[1]} kan`,
      player2: `${scores[2]} kan`,
      leaders: leaders.length === 1 ? `Player ${this.players.indexOf(leaders[0])}` : 'Tie',
      leaderScore: maxScore
    });

    // Prepare summary data for UI
    // Format: { roundScores: [p0, p1, p2], gameScores: [cumulative0, cumulative1, cumulative2] }
    const roundScores = scores; // Reuse scores from above logging section

    // Calculate cumulative game scores
    const gameScores = this.players.map((p, i) => {
      const cumulativeScore = (p.gameScore || 0) + p.roundScore;
      this.players[i].gameScore = cumulativeScore;
      return cumulativeScore;
    });

    // Determine round winner (highest score) - reuse maxScore from above
    const winner = roundScores.findIndex(s => s === maxScore);

    // Call summary callback with properly formatted data
    if (this.roundSummaryCallback) {
      // Build teyaku data for display
      const teyakuData = {
        player: this.players[0].teyaku || [],
        opponent1: this.players[1].teyaku || [],
        opponent2: this.players[2].teyaku || []
      };

      // Build dekiyaku data for display
      const dekiyakuData = {
        player: this.players[0].dekiyaku || [],
        opponent1: this.players[1].dekiyaku || [],
        opponent2: this.players[2].dekiyaku || []
      };

      // Build card breakdown for each player (show how many of each type)
      const CARD_VALUES = { 'bright': 20, 'ribbon': 5, 'animal': 10, 'chaff': 1 };
      const cardBreakdown = this.players.map(player => {
        const breakdown = {
          brights: [],
          ribbons: [],
          animals: [],
          chaffs: []
        };

        player.captured.forEach(card => {
          if (card.type === 'bright') breakdown.brights.push(card);
          else if (card.type === 'ribbon') breakdown.ribbons.push(card);
          else if (card.type === 'animal') breakdown.animals.push(card);
          else if (card.type === 'chaff') breakdown.chaffs.push(card);
        });

        return {
          total: player.captured.length,
          brights: breakdown.brights.length,
          ribbons: breakdown.ribbons.length,
          animals: breakdown.animals.length,
          chaffs: breakdown.chaffs.length,
          points: Object.entries(breakdown).reduce((sum, [type, cards]) => {
            if (type === 'brights') return sum + (cards.length * 20);
            if (type === 'ribbons') return sum + (cards.length * 5);
            if (type === 'animals') return sum + (cards.length * 10);
            if (type === 'chaffs') return sum + (cards.length * 1);
            return sum;
          }, 0)
        };
      });

      // Calculate score breakdown for each player
      // NOTE: Score breakdown shows all component parts (teyaku, dekiyaku, par)
      // Par is ONLY included when no dekiyaku exist
      const CARD_VALUES_BREAKDOWN = { 'bright': 20, 'ribbon': 5, 'animal': 10, 'chaff': 1 };
      const hasAnyDekiyakuInRound = this.players.some(p => (p.dekiyaku || []).length > 0);

      const scoreBreakdown = this.players.map((player, i) => {
        // Get teyaku settlement (already applied in applyTeyakuSettlements)
        const teyakuScore = this.teyakuSettlements[i] || 0;

        // Get dekiyaku settlement from the calculated values above
        const dekiyakuScore = dekiyakuSettlements[i];

        // Calculate par value ONLY if no dekiyaku in this round
        let parScore = 0;
        if (!hasAnyDekiyakuInRound) {
          const cardPoints = player.captured.reduce((sum, card) => {
            return sum + (CARD_VALUES_BREAKDOWN[card.type] || 0);
          }, 0);
          parScore = (cardPoints - this.PAR_VALUE) * this.fieldMultiplier;
        }

        // Round total should be sum of all components
        const roundTotal = teyakuScore + 0 + dekiyakuScore + parScore;

        return {
          teyakuScore: teyakuScore,
          potScore: 0, // Placeholder for future pot implementation
          dekiyakuScore: dekiyakuScore,
          parScore: parScore, // Par value score (only when no dekiyaku)
          roundTotal: roundTotal // Sum of all components
        };
      });

      this.roundSummaryCallback({
        roundNumber: this.currentRound,
        winner: winner,
        fieldMultiplier: this.fieldMultiplier,
        teyaku: teyakuData,
        dekiyaku: dekiyakuData,
        cardBreakdown: cardBreakdown,
        scoreBreakdown: scoreBreakdown,
        opponentDecisions: this.opponentDecisions,
        allScores: {
          roundScores: roundScores,
          gameScores: gameScores
        },
        totalRounds: this.totalRounds,
        isGameOver: this.currentRound >= this.totalRounds,
        stats: {
          totalCards: this.players.reduce((sum, p) => sum + p.captured.length, 0),
          fieldMultiplierUsed: this.fieldMultiplier,
          parValue: this.PAR_VALUE
        }
      });
    }
  }

  /**
   * Get game state for rendering
   */
  getState() {
    return {
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentPlayerIndex: this.currentPlayerIndex,
      fieldMultiplier: this.fieldMultiplier,
      parValue: this.PAR_VALUE,
      message: this.message,

      // Card locations
      field: this.field,
      drawnCard: this.drawnCard,
      drawnCardMatches: this.drawnCardMatches,

      // Player data (N-player format)
      players: this.players.map((p, i) => ({
        hand: p.hand,
        captured: p.captured,
        teyaku: p.teyaku,
        teyakuScore: p.teyakuScore,
        dekiyaku: p.dekiyaku,
        dekiyakuScore: p.dekiyakuScore,
        roundScore: p.roundScore,
        gameScore: p.gameScore || 0,
        isHuman: p.isHuman
      })),
      playerCount: 3,

      // Game-wide data
      deck: this.deck,
      deckCount: this.deck.count,
      selectedCards: this.selectedCards,
      teyakuDisplay: this.teyakuDisplay,
      sagePlayers: Array.from(this.sagePlayers),
      playerHasSageActive: this.sagePlayers.has(0), // True if player (index 0) called sage

      // Game mode identifier
      isHachihachiMode: true
    };
  }

}
