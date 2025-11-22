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

    // Initialization
    this.reset();
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
   * Set callback for UI decisions (not used in this simplified version)
   */
  setUICallback(callback) {
    this.uiCallback = callback;
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

  /**
   * Reset game state for new round
   */
  reset() {
    this.deck = new Deck();

    // Initialize 3 players
    this.players = [];
    for (let i = 0; i < 3; i++) {
      this.players[i] = {
        hand: [],
        captured: [],
        teyaku: [],
        teyakuScore: 0,
        dekiyaku: [],
        dekiyakuScore: 0,
        roundScore: 0,
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
    this.reset();
  }

  /**
   * Deal cards: 8 to each player, 8 to field (4-4)
   */
  deal() {
    debugLogger.log('hachihachi', `Dealing round ${this.currentRound}`);

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

    // Calculate field multiplier
    this.calculateFieldMultiplier();

    // Show teyaku payment grid
    this.showTeyakuPaymentGrid();
  }

  /**
   * Calculate field multiplier (1×, 2×, 4×)
   */
  calculateFieldMultiplier() {
    const largeBrightMonths = ['January', 'March', 'August'];
    const grandBrightMonths = ['November', 'December'];

    const fieldMonths = this.field.map(c => c.month);

    if (fieldMonths.some(m => grandBrightMonths.includes(m))) {
      this.fieldMultiplier = 4;
    } else if (fieldMonths.some(m => largeBrightMonths.includes(m))) {
      this.fieldMultiplier = 2;
    } else {
      this.fieldMultiplier = 1;
    }

    debugLogger.log('hachihachi', `Field multiplier: ${this.fieldMultiplier}×`);
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

    // Store teyaku settlements for later display in scoreBreakdown
    this.teyakuSettlements = [];

    // Apply teyaku settlements to gameScore
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

      // Store for later display
      this.teyakuSettlements[i] = netPayment;

      // Apply to game score immediately
      this.players[i].gameScore = (this.players[i].gameScore || 0) + netPayment;

      debugLogger.log('hachihachi', `💳 Player ${i} teyaku settlement applied:`, {
        teyakuValue: teyakuValues[i],
        netPayment: netPayment,
        gameScoreAfter: this.players[i].gameScore
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
        // Check if matches exist - if so, cannot place
        const matches = this.field.filter(fc => fc.month === card.month);

        if (matches.length > 0) {
          // Matches exist - cannot place on field, must match
          this.message = `You must match with a card on the field (${matches.length} match${matches.length > 1 ? 'es' : ''} available)`;
          return false;
        }

        // No matches - allow placing on field
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
      if (newDekiyakuGained && this.currentPlayerIndex === 0) {
        // Player is human - show decision UI
        debugLogger.log('hachihachi', `🎯 SHOUBU/SAGE DECISION TRIGGERED for human player!`, {
          newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
          totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
          phase: 'shoubu_decision'
        });
        this.phase = 'shoubu_decision';
        this.message = `Dekiyaku captured! Choose: SHOUBU (end round) or SAGE (continue playing)`;
        // UI will handle the decision callback
        return true;
      } else if (newDekiyakuGained && this.currentPlayerIndex > 0) {
        // Opponent - auto decide (for now, auto-sage to be aggressive)
        debugLogger.log('hachihachi', `⚠️ Opponent ${this.currentPlayerIndex} captured dekiyaku from drawn match - auto-choosing SAGE`, {
          newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
          totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0)
        });
        setTimeout(() => this.nextPlayer(), 300);
      } else {
        // No new dekiyaku - proceed to next player
        debugLogger.log('hachihachi', `ℹ️ No new dekiyaku from drawn match - proceeding to next player`, {
          currentPlayerIndex: this.currentPlayerIndex,
          allDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none'
        });
        setTimeout(() => this.nextPlayer(), 300);
      }

      return true;
    }

    // Handle hand card matching (select_field phase)
    if (this.selectedCards.length === 0) return false;

    const handCard = this.selectedCards[0];

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
    if (newDekiyakuGained && this.currentPlayerIndex === 0) {
      // Player is human - show decision UI
      debugLogger.log('hachihachi', `🎯 SHOUBU/SAGE DECISION TRIGGERED for human player!`, {
        newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
        totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0),
        phase: 'shoubu_decision',
        matchContext: `${handCard.name} ↔ ${fieldCard.name}`
      });
      this.phase = 'shoubu_decision';
      this.message = `Dekiyaku captured! Choose: SHOUBU (end round) or SAGE (continue playing)`;
      // UI will handle the decision callback
      return true;
    } else if (newDekiyakuGained && this.currentPlayerIndex > 0) {
      // Opponent - auto decide (for now, auto-sage to be aggressive)
      debugLogger.log('hachihachi', `⚠️ Opponent ${this.currentPlayerIndex} captured dekiyaku - auto-choosing SAGE`, {
        newDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`),
        totalDekiyakuValue: newDekiyaku.reduce((sum, d) => sum + d.value, 0)
      });
      this.proceedToDrawPhase();
    } else {
      // No new dekiyaku - continue normally
      debugLogger.log('hachihachi', `ℹ️ No new dekiyaku from hand card match - proceeding to draw phase`, {
        currentPlayerIndex: this.currentPlayerIndex,
        allDekiyaku: newDekiyaku.map(d => `${d.name}(${d.value})`).join(', ') || 'none'
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
          // UI will handle the decision callback
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
          // UI will handle the decision callback
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

      // Next player's turn
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

    // Check if there are matches
    if (this.drawnCardMatches.length > 0) {
      // Match with first matching card
      setTimeout(() => {
        this.selectFieldCard(this.drawnCardMatches[0]);
      }, 400);
    } else {
      // Place on field
      setTimeout(() => {
        this.placeCardOnField(cardToPlay);
      }, 400);
    }
  }

  /**
   * Player chooses SHOUBU (end round)
   * The dekiyaku they currently have will be finalized and counted
   */
  chooseShoubu() {
    const player = this.players[this.currentPlayerIndex];
    debugLogger.log('hachihachi', `🛑 Player ${this.currentPlayerIndex} chose SHOUBU (end round)`, {
      dekiyaku: player.dekiyaku.map(d => d.name),
      totalValue: player.dekiyaku.reduce((sum, d) => sum + d.value, 0)
    });
    // Mark dekiyaku as finalized (no further changes allowed)
    player.finalizedDekiyaku = player.dekiyaku; // Store finalized version
    // End the round with current dekiyaku
    this.endRound();
  }

  /**
   * Player chooses SAGE (continue playing)
   * Risk: if they don't improve, they lose all points at end of round
   */
  chooseSage() {
    const player = this.players[this.currentPlayerIndex];
    debugLogger.log('hachihachi', `⚔️ Player ${this.currentPlayerIndex} chose SAGE (continue playing)`, {
      currentDekiyaku: player.dekiyaku.map(d => d.name),
      currentValue: player.dekiyaku.reduce((sum, d) => sum + d.value, 0),
      riskNote: 'Will lose all points if no improvement before round ends'
    });
    // Continue to draw phase (dekiyaku will be updated if new ones are captured)
    this.proceedToDrawPhase();
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
    debugLogger.log('hachihachi', `🏁 ROUND ${this.currentRound} ENDED - Deck exhausted, calculating scores`, {
      fieldMultiplier: this.fieldMultiplier,
      parValue: this.PAR_VALUE
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

    // Calculate scores for each player
    let totalPoints = 0;
    const CARD_VALUES = { 'bright': 20, 'ribbon': 5, 'animal': 10, 'chaff': 1 };

    for (let i = 0; i < 3; i++) {
      const player = this.players[i];

      // Count card points (raw points from captured cards)
      const cardPoints = player.captured.reduce((sum, card) => {
        return sum + (CARD_VALUES[card.type] || 0);
      }, 0);

      totalPoints += cardPoints;

      // Par value scoring: (cardPoints - 88) × fieldMultiplier
      const cardScore = (cardPoints - this.PAR_VALUE) * this.fieldMultiplier;

      // Total round score: cardScore only
      // NOTE: Teyaku are paid at round START via applyTeyakuSettlements()
      // Dekiyaku is zero-sum and will be settled after all players are scored
      const totalScore = cardScore;

      player.roundScore = totalScore;

      // Use finalized dekiyaku if available (set when player chose Shoubu), otherwise use current
      const dekiyakuToScore = player.finalizedDekiyaku || player.dekiyaku || [];

      debugLogger.log('hachihachi', `📊 Player ${i} Round Score Breakdown (before dekiyaku settlement):`, {
        capturedCards: player.captured.length,
        rawCardPoints: cardPoints,
        parValue: this.PAR_VALUE,
        fieldMultiplier: this.fieldMultiplier,
        cardScore: `(${cardPoints} - ${this.PAR_VALUE}) × ${this.fieldMultiplier} = ${cardScore}`,
        note: 'Teyaku paid at round START (not included in roundScore)',
        teyakuList: player.teyaku.map(t => `${t.name}(${t.value}×${this.fieldMultiplier})`).join(', ') || 'none',
        dekiyakuList: dekiyakuToScore.map(d => `${d.name}(${d.value}×${this.fieldMultiplier})`).join(', ') || 'none',
        scoreBeforeDekiyakuSettlement: totalScore
      });
    }

    // Verify total points
    if (totalPoints !== this.TOTAL_POINTS) {
      debugLogger.log('hachihachi', `⚠️ Total points mismatch: ${totalPoints} points distributed (expected ${this.TOTAL_POINTS})`, {
        difference: this.TOTAL_POINTS - totalPoints,
        player0Points: this.players[0].captured.reduce((sum, c) => sum + (CARD_VALUES[c.type] || 0), 0),
        player1Points: this.players[1].captured.reduce((sum, c) => sum + (CARD_VALUES[c.type] || 0), 0),
        player2Points: this.players[2].captured.reduce((sum, c) => sum + (CARD_VALUES[c.type] || 0), 0)
      });
    }

    // Apply dekiyaku settlement (true zero-sum: only players with dekiyaku gain points)
    // Each player with dekiyaku collects that amount from each other player who doesn't have it
    for (let i = 0; i < 3; i++) {
      const player = this.players[i];
      // Use finalized dekiyaku if available (set when Shoubu was chosen)
      const dekiyakuToCount = player.finalizedDekiyaku || (player.dekiyaku && player.dekiyaku.length > 0 ? player.dekiyaku : []);

      // Calculate total dekiyaku value for this player
      let dekiyakuValue = 0;
      dekiyakuToCount.forEach(d => {
        dekiyakuValue += d.value * this.fieldMultiplier;
      });

      // If this player has dekiyaku, they collect from the other 2 players
      if (dekiyakuValue > 0) {
        // Collect from each other player (even if those players also have dekiyaku)
        const dekiyakuSettlement = dekiyakuValue * 2; // Collect from 2 other players
        player.roundScore += dekiyakuSettlement;

        debugLogger.log('hachihachi', `💰 Player ${i} dekiyaku settlement:`, {
          dekiyaku: dekiyakuToCount.map(d => d.name).join(', '),
          valuePerPlayer: dekiyakuValue,
          totalCollected: dekiyakuSettlement
        });
      }

      // Pay for other players' dekiyaku
      let totalToPay = 0;
      for (let j = 0; j < 3; j++) {
        if (i !== j) {
          const otherDekiyakuToCount = this.players[j].finalizedDekiyaku || (this.players[j].dekiyaku && this.players[j].dekiyaku.length > 0 ? this.players[j].dekiyaku : []);
          let otherDekiyakuValue = 0;
          otherDekiyakuToCount.forEach(d => {
            otherDekiyakuValue += d.value * this.fieldMultiplier;
          });
          if (otherDekiyakuValue > 0) {
            player.roundScore -= otherDekiyakuValue; // Pay to other player
            totalToPay += otherDekiyakuValue;
          }
        }
      }

      if (totalToPay > 0) {
        debugLogger.log('hachihachi', `💸 Player ${i} dekiyaku payments:`, {
          totalOwed: totalToPay
        });
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
      const scoreBreakdown = this.players.map((player, i) => {
        // Get teyaku settlement (already calculated and applied in applyTeyakuSettlements)
        const teyakuScore = this.teyakuSettlements[i] || 0;

        // Get dekiyaku value (from roundScore after card score)
        const dekiyakuList = player.finalizedDekiyaku || player.dekiyaku || [];
        let dekiyakuScore = 0;
        if (dekiyakuList.length > 0) {
          dekiyakuScore = dekiyakuList.reduce((sum, d) => sum + (d.value || 0), 0) * this.fieldMultiplier;
          // Calculate net (collect from others if this player has dekiyaku, pay if others have)
          dekiyakuScore = dekiyakuScore * 2; // Collect from 2 other players
          for (let j = 0; j < 3; j++) {
            if (i !== j) {
              const otherDekiyakuValue = (this.players[j].finalizedDekiyaku || this.players[j].dekiyaku || [])
                .reduce((sum, d) => sum + (d.value || 0), 0) * this.fieldMultiplier;
              if (otherDekiyakuValue > 0) {
                dekiyakuScore -= otherDekiyakuValue;
              }
            }
          }
        }

        // Get card points score (par value calculation)
        const cardPoints = player.captured.reduce((sum, card) => {
          return sum + (this.CARD_VALUES[card.type] || 0);
        }, 0);
        const cardScore = (cardPoints - this.PAR_VALUE) * this.fieldMultiplier;

        return {
          teyakuScore: teyakuScore,
          potScore: 0, // Placeholder for future pot implementation
          dekiyakuScore: dekiyakuScore,
          parScore: cardScore, // Par value score (capturedPoints - 88) × multiplier
          roundTotal: teyakuScore + 0 + dekiyakuScore + cardScore // Sum all components
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

    this.nextRound();
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

      // Game mode identifier
      isHachihachiMode: true
    };
  }

}
