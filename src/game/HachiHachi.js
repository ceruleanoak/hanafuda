import { Deck } from './Deck.js';
import { Teyaku } from './Teyaku.js';
import { Dekiyaku } from './Dekiyaku.js';

/**
 * Hachi-Hachi (88) - Three-player hanafuda game
 *
 * A traditional Japanese gambling game with complex scoring involving:
 * - Teyaku (hand combinations) - scored at round start
 * - Dekiyaku (captured combinations) - scored when formed
 * - Field multipliers - affect all point exchanges
 * - Sage/Shoubu decision - continue or end round
 */
export class HachiHachi {
  /**
   * Initialize a new Hachi-Hachi game
   * @param {GameOptions} gameOptions - Game configuration
   */
  constructor(gameOptions = {}) {
    this.gameOptions = gameOptions;

    // Game state
    this.deck = new Deck();
    this.phase = 'setup'; // setup, teyaku, playing, sage_decision, round_end, game_end
    this.currentPlayer = null; // 'player', 'opponent1', 'opponent2'
    this.dealer = null;
    this.fieldMultiplier = 1; // 1x (small field), 2x (large field), 4x (grand field)

    // Player states
    this.players = {
      player: { hand: [], captured: [], teyakuScore: 0, teyakuClaimed: [] },
      opponent1: { hand: [], captured: [], teyakuScore: 0, teyakuClaimed: [] },
      opponent2: { hand: [], captured: [], teyakuScore: 0, teyakuClaimed: [] }
    };

    this.field = [];

    // Round state
    this.roundState = {
      teyakuPaid: false,
      sagesCalled: {}, // { 'player': true, 'opponent1': false, 'opponent2': true }
      sageCancelCalled: null, // player who called cancel
      dekiyakuFormed: {}, // { 'player': [dekiyaku list], ... }
      roundWinner: null,
      roundScores: {} // { 'player': points, ... }
    };

    // Game state
    this.roundNumber = 0;
    this.gameScores = {
      player: 0,
      opponent1: 0,
      opponent2: 0
    };

    this.message = '';

    // Callbacks for UI
    this.uiCallback = null;
    this.roundSummaryCallback = null;
  }

  /**
   * Set callback for UI decisions (Sage/Shoubu)
   */
  setUICallback(callback) {
    this.uiCallback = callback;
  }

  /**
   * Set callback for round summary display
   */
  setRoundSummaryCallback(callback) {
    this.roundSummaryCallback = callback;
  }

  /**
   * Get current game state (for Card3DManager and rendering)
   * @returns {Object} Game state object
   */
  getState() {
    return {
      phase: this.phase,
      currentPlayer: this.currentPlayer,
      deck: this.deck.cards,
      field: this.field,
      players: [
        { hand: this.players.player.hand, captured: this.players.player.captured },
        { hand: this.players.opponent1.hand, captured: this.players.opponent1.captured },
        { hand: this.players.opponent2.hand, captured: this.players.opponent2.captured }
      ],
      gameScores: this.gameScores,
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      dealer: this.dealer,
      fieldMultiplier: this.fieldMultiplier,
      message: this.message
    };
  }

  /**
   * Start a new game
   * @param {number} numRounds - Number of rounds to play (default 12)
   */
  startGame(numRounds = 12) {
    this.totalRounds = numRounds;
    this.roundNumber = 0;
    this.gameScores = { player: 0, opponent1: 0, opponent2: 0 };
    this.dealer = 'player'; // Can be randomized
    this.startRound();
  }

  /**
   * Start a new round
   */
  startRound() {
    this.roundNumber++;
    this.phase = 'setup';

    // Reset round state
    this.roundState = {
      teyakuPaid: false,
      sagesCalled: {},
      sageCancelCalled: null,
      dekiyakuFormed: {},
      roundWinner: null,
      roundScores: {}
    };

    // Reset player states
    Object.keys(this.players).forEach(playerKey => {
      this.players[playerKey] = {
        hand: [],
        captured: [],
        teyakuScore: 0,
        teyakuClaimed: []
      };
    });

    this.field = [];
    this.currentPlayer = null;
    this.message = `Round ${this.roundNumber} starting...`;

    // Deal cards
    this.dealCards();
  }

  /**
   * Deal cards to players and field
   * Hachi-Hachi deal: 4-3-3-3 to players, 3-3 to field
   * Results in: 7 cards per player, 6 cards on field
   */
  dealCards() {
    this.deck.shuffle();

    const dealOrder = ['player', 'opponent1', 'opponent2'];
    const playerHands = { player: [], opponent1: [], opponent2: [] };
    const fieldCards = [];

    // Deal 4 cards to each player (starting from player to right of dealer)
    for (let i = 0; i < 4; i++) {
      dealOrder.forEach(playerKey => {
        playerHands[playerKey].push(this.deck.draw());
      });
    }

    // Deal 3 cards face-up to field
    for (let i = 0; i < 3; i++) {
      fieldCards.push(this.deck.draw());
    }

    // Deal 3 more cards to each player
    for (let i = 0; i < 3; i++) {
      dealOrder.forEach(playerKey => {
        playerHands[playerKey].push(this.deck.draw());
      });
    }

    // Deal 3 more cards face-up to field
    for (let i = 0; i < 3; i++) {
      fieldCards.push(this.deck.draw());
    }

    // Check for misdeal (4 cards of same month on field)
    if (this.isMisdeal(fieldCards)) {
      this.message = 'Misdeal! 4 cards of same month on field. Redealing...';
      this.dealCards();
      return;
    }

    // Set hands and field
    this.players.player.hand = playerHands.player;
    this.players.opponent1.hand = playerHands.opponent1;
    this.players.opponent2.hand = playerHands.opponent2;
    this.field = fieldCards;

    // Calculate field multiplier based on brights on field
    this.calculateFieldMultiplier();

    this.phase = 'teyaku';
    this.message = 'Check your hand for teyaku combinations...';
  }

  /**
   * Check if a misdeal occurred (4 cards of same month on field)
   * @param {Array} fieldCards - Cards on the field
   * @returns {boolean} true if misdeal
   */
  isMisdeal(fieldCards) {
    const monthCounts = {};
    fieldCards.forEach(card => {
      monthCounts[card.month] = (monthCounts[card.month] || 0) + 1;
    });

    return Object.values(monthCounts).some(count => count === 4);
  }

  /**
   * Calculate field multiplier based on bright cards on field
   * Small field (no brights): 1x
   * Large field (Jan/Mar/Aug brights): 2x
   * Grand field (Nov/Dec brights): 4x
   */
  calculateFieldMultiplier() {
    const brightMonths = [1, 3, 8]; // January, Cherry Blossom, Moon
    const grandMonths = [11, 12]; // Rain Man, Phoenix

    const fieldMonths = this.field.map(card => card.month);

    const hasGrandBright = fieldMonths.some(m => grandMonths.includes(m));
    const hasLargeBright = fieldMonths.some(m => brightMonths.includes(m));

    if (hasGrandBright) {
      this.fieldMultiplier = 4;
      this.message += ' (Grand Field: 4× multiplier)';
    } else if (hasLargeBright) {
      this.fieldMultiplier = 2;
      this.message += ' (Large Field: 2× multiplier)';
    } else {
      this.fieldMultiplier = 1;
      this.message += ' (Small Field: 1× multiplier)';
    }
  }

  /**
   * Player claims teyaku from their hand
   * @param {string} playerKey - 'player', 'opponent1', or 'opponent2'
   */
  claimTeyaku(playerKey) {
    const hand = this.players[playerKey].hand;
    const teyakuList = Teyaku.detectTeyaku(hand);

    // Score teyaku (player gets from each opponent)
    let teyakuValue = 0;
    teyakuList.forEach(t => {
      teyakuValue += t.value;
    });

    this.players[playerKey].teyakuScore = teyakuValue * this.fieldMultiplier;
    this.players[playerKey].teyakuClaimed = teyakuList;

    if (teyakuList.length > 0) {
      const teyakuNames = teyakuList.map(t => t.name).join(', ');
      this.message = `${playerKey} claimed teyaku: ${teyakuNames} (${teyakuValue} kan)`;
    }
  }

  /**
   * All players claim their teyaku
   */
  processAllTeyaku() {
    ['player', 'opponent1', 'opponent2'].forEach(playerKey => {
      this.claimTeyaku(playerKey);
    });

    this.roundState.teyakuPaid = true;
    this.phase = 'playing';
    this.currentPlayer = this.dealer;
    this.message = `${this.dealer} starts. Play begins...`;
  }

  /**
   * Play a card from hand to field
   * @param {string} playerKey - Player making the move
   * @param {object} card - Card from hand to play
   * @returns {boolean} true if move is valid
   */
  playCard(playerKey, card) {
    if (this.currentPlayer !== playerKey) {
      this.message = 'Not your turn!';
      return false;
    }

    if (this.phase !== 'playing' && this.phase !== 'choose_match') {
      this.message = 'Not in playing phase!';
      return false;
    }

    // Remove card from hand
    const cardIndex = this.players[playerKey].hand.findIndex(
      c => c.id === card.id
    );
    if (cardIndex === -1) {
      this.message = 'Card not in hand!';
      return false;
    }

    this.players[playerKey].hand.splice(cardIndex, 1);

    // Check for matches on field
    const matches = this.field.filter(fc => fc.month === card.month);

    if (matches.length === 0) {
      // No match - card stays on field
      this.field.push(card);
      this.message = `${playerKey} played ${card.name} - no match`;
      this.phase = 'waiting_for_draw';
    } else if (matches.length === 1) {
      // One match - capture both
      this.captureCards(playerKey, [card, matches[0]]);
      this.message = `${playerKey} matched and captured`;
      this.phase = 'waiting_for_draw';
    } else if (matches.length === 2) {
      // Two matches - player chooses which to capture
      this.message = `${playerKey} can match with 2 cards. Which one?`;
      this.phase = 'choose_match';
      this.currentCard = card;
      this.currentMatches = matches;
      return true;
    } else if (matches.length === 3) {
      // Three matches - capture all with played card
      this.captureCards(playerKey, [card, ...matches]);
      this.message = `${playerKey} matched all 3 and captured`;
      this.phase = 'waiting_for_draw';
    }

    // Draw a card from deck
    this.drawCard(playerKey);
    return true;
  }

  /**
   * Choose which card to capture when multiple matches exist
   * @param {string} playerKey - Player making the choice
   * @param {object} targetCard - The field card to capture
   */
  chooseMatch(playerKey, targetCard) {
    if (this.phase !== 'choose_match' && this.phase !== 'choose_drawn_match') {
      this.message = 'Not in choose match phase!';
      return false;
    }

    if (this.currentPlayer !== playerKey) {
      this.message = 'Not your turn!';
      return false;
    }

    // Validate target is in current matches
    if (!this.currentMatches.some(m => m.id === targetCard.id)) {
      this.message = 'Invalid target card!';
      return false;
    }

    this.captureCards(playerKey, [this.currentCard, targetCard]);

    if (this.phase === 'choose_match') {
      this.message = `${playerKey} chose and captured`;
      this.phase = 'waiting_for_draw';
      this.drawCard(playerKey);
    } else {
      // choose_drawn_match - move to next player after draw
      this.message = `${playerKey} drew and captured`;
      this.nextPlayer();
    }

    return true;
  }

  /**
   * Capture cards and add to score pile
   * @param {string} playerKey - Player capturing
   * @param {array} cards - Cards to capture
   */
  captureCards(playerKey, cards) {
    cards.forEach(card => {
      // Remove from field if present
      const fieldIndex = this.field.findIndex(fc => fc.id === card.id);
      if (fieldIndex !== -1) {
        this.field.splice(fieldIndex, 1);
      }
    });

    // Add to score pile
    this.players[playerKey].captured.push(...cards);

    // Check for dekiyaku after capture
    this.checkDekiyaku(playerKey);
  }

  /**
   * Draw card from deck and play it
   * @param {string} playerKey - Player drawing
   */
  drawCard(playerKey) {
    if (this.phase === 'waiting_for_draw') {
      // Clear the waiting state
      this.phase = 'playing';
    }

    if (this.deck.remaining() === 0) {
      // No more cards - hand exhausted, move to scoring
      this.phase = 'hand_exhausted';
      this.message = 'All cards played - evaluating round...';
      this.calculateScores();
      return;
    }

    const drawnCard = this.deck.draw();
    const matches = this.field.filter(fc => fc.month === drawnCard.month);

    if (matches.length === 0) {
      // No match - card goes to field
      this.field.push(drawnCard);
      this.message = `${playerKey} drew ${drawnCard.name} - no match`;
      this.nextPlayer();
    } else if (matches.length === 1) {
      // One match - capture both
      this.captureCards(playerKey, [drawnCard, matches[0]]);
      this.message = `${playerKey} drew match`;
      this.nextPlayer();
    } else if (matches.length === 2) {
      // Two matches - player chooses
      this.message = `${playerKey} drew matching card - choose which to capture`;
      this.phase = 'choose_drawn_match';
      this.currentCard = drawnCard;
      this.currentMatches = matches;
      return;
    } else if (matches.length === 3) {
      // Three matches - capture all
      this.captureCards(playerKey, [drawnCard, ...matches]);
      this.message = `${playerKey} drew and captured all 3`;
      this.nextPlayer();
    }
  }

  /**
   * Check if player has formed dekiyaku after capture
   * @param {string} playerKey - Player to check
   */
  checkDekiyaku(playerKey) {
    const newDekiyaku = Dekiyaku.detectDekiyaku(this.players[playerKey].captured);
    this.roundState.dekiyakuFormed[playerKey] = newDekiyaku;

    if (newDekiyaku.length > 0) {
      const names = newDekiyaku.map(d => d.name).join(', ');
      const values = newDekiyaku.map(d => d.value).join(', ');
      this.message = `${playerKey} formed dekiyaku: ${names} (${values} kan)!`;
      this.phase = 'sage_decision';
      this.currentPlayer = playerKey;

      // Trigger UI callback for player decisions
      if (this.uiCallback && playerKey === 'player') {
        this.uiCallback('sage', {
          playerKey,
          dekiyakuList: newDekiyaku,
          playerScore: this.gameScores.player,
          opponent1Score: this.gameScores.opponent1,
          opponent2Score: this.gameScores.opponent2,
          roundNumber: this.roundNumber,
          totalRounds: this.totalRounds
        });
      }
    }
  }

  /**
   * Player calls sage (continue playing)
   * @param {string} playerKey - Player making the call
   * @returns {boolean} true if valid
   */
  callSage(playerKey) {
    if (this.phase !== 'sage_decision') {
      this.message = 'Not in sage decision phase!';
      return false;
    }

    if (this.currentPlayer !== playerKey) {
      this.message = 'Not your decision to make!';
      return false;
    }

    this.roundState.sagesCalled[playerKey] = true;
    this.message = `${playerKey} calls SAGE - round continues...`;
    this.phase = 'playing';
    this.nextPlayer();
    return true;
  }

  /**
   * Player calls shoubu (end round)
   * @param {string} playerKey - Player making the call
   * @returns {boolean} true if valid
   */
  callShoubu(playerKey) {
    if (this.phase !== 'sage_decision') {
      this.message = 'Not in sage decision phase!';
      return false;
    }

    if (this.currentPlayer !== playerKey) {
      this.message = 'Not your decision to make!';
      return false;
    }

    this.roundState.roundWinner = playerKey;
    this.phase = 'round_end';
    this.message = `${playerKey} calls SHOUBU - round ends!`;
    this.calculateScores();
    return true;
  }

  /**
   * Player calls cancel (end round with reduced score)
   * Only valid if player previously called sage
   * @param {string} playerKey - Player making the call
   * @returns {boolean} true if valid
   */
  callCancel(playerKey) {
    if (this.phase !== 'playing') {
      this.message = 'Can only cancel during playing phase!';
      return false;
    }

    if (this.currentPlayer !== playerKey) {
      this.message = 'Not your turn!';
      return false;
    }

    if (!this.roundState.sagesCalled[playerKey]) {
      this.message = 'Can only cancel if you called sage!';
      return false;
    }

    this.roundState.sageCancelCalled = playerKey;
    this.roundState.roundWinner = playerKey;
    this.phase = 'round_end';
    this.message = `${playerKey} cancels sage - round ends with reduced score!`;
    this.calculateScores();
    return true;
  }

  /**
   * Move to next player in turn order
   */
  nextPlayer() {
    const playerOrder = ['player', 'opponent1', 'opponent2'];
    const currentIndex = playerOrder.indexOf(this.currentPlayer);
    this.currentPlayer = playerOrder[(currentIndex + 1) % 3];
  }

  /**
   * Calculate round scores and determine winner
   */
  calculateScores() {
    // Check for special cases first
    if (this.checkSpecialCases()) {
      return;
    }

    // Check if any player has dekiyaku
    const hasDekiyaku = Object.values(this.roundState.dekiyakuFormed)
      .some(list => list && list.length > 0);

    if (hasDekiyaku) {
      this.scoreDekiyakuRound();
    } else {
      this.scoreCardPointsRound();
    }
  }

  /**
   * Check for special cases that override all scoring
   * Special cases: All Eights, Double Eights, Sixteen Chaff
   * @returns {boolean} true if special case found and handled
   */
  checkSpecialCases() {
    // All Eights: All 3 players have exactly 88 points
    const playerCards = {
      player: this.getCardPoints(this.players.player.captured),
      opponent1: this.getCardPoints(this.players.opponent1.captured),
      opponent2: this.getCardPoints(this.players.opponent2.captured)
    };

    const allEights = Object.values(playerCards).every(p => p === 88);
    if (allEights) {
      this.roundState.roundWinner = this.dealer;
      this.roundState.roundScores = {
        player: 0,
        opponent1: 0,
        opponent2: 0
      };

      // Dealer gets 10 kan from each opponent
      const dealerPayment = 10 * 2 * this.fieldMultiplier;
      if (this.dealer === 'player') {
        this.roundState.roundScores.player = dealerPayment;
        this.roundState.roundScores.opponent1 = -10 * this.fieldMultiplier;
        this.roundState.roundScores.opponent2 = -10 * this.fieldMultiplier;
      } else if (this.dealer === 'opponent1') {
        this.roundState.roundScores.opponent1 = dealerPayment;
        this.roundState.roundScores.player = -10 * this.fieldMultiplier;
        this.roundState.roundScores.opponent2 = -10 * this.fieldMultiplier;
      } else {
        this.roundState.roundScores.opponent2 = dealerPayment;
        this.roundState.roundScores.player = -10 * this.fieldMultiplier;
        this.roundState.roundScores.opponent1 = -10 * this.fieldMultiplier;
      }

      this.message = 'All Eights! Dealer collects 10 kan from each player.';
      this.applyRoundScores();
      return true;
    }

    // Double Eights: One player has 168+ points (80+ above par of 88)
    for (const [playerKey, points] of Object.entries(playerCards)) {
      if (points >= 168) {
        this.roundState.roundWinner = playerKey;
        const excessPoints = points - 168;
        const payment = (10 + excessPoints) * this.fieldMultiplier;

        this.roundState.roundScores = {
          player: 0,
          opponent1: 0,
          opponent2: 0
        };
        this.roundState.roundScores[playerKey] = payment * 2;
        const otherPlayers = ['player', 'opponent1', 'opponent2'].filter(p => p !== playerKey);
        otherPlayers.forEach(p => {
          this.roundState.roundScores[p] = -payment;
        });

        this.message = `Double Eights! ${playerKey} collects ${payment} kan from each player.`;
        this.applyRoundScores();
        return true;
      }
    }

    // Sixteen Chaff: One player has 16+ chaff cards (willow counts as chaff)
    for (const [playerKey, captured] of Object.entries({
      player: this.players.player.captured,
      opponent1: this.players.opponent1.captured,
      opponent2: this.players.opponent2.captured
    })) {
      const chaffCount = this.getChaffCount(captured);
      if (chaffCount >= 16) {
        this.roundState.roundWinner = playerKey;
        const excessChaff = chaffCount - 16;
        const payment = (12 + excessChaff * 2) * this.fieldMultiplier;

        this.roundState.roundScores = {
          player: 0,
          opponent1: 0,
          opponent2: 0
        };
        this.roundState.roundScores[playerKey] = payment * 2;
        const otherPlayers = ['player', 'opponent1', 'opponent2'].filter(p => p !== playerKey);
        otherPlayers.forEach(p => {
          this.roundState.roundScores[p] = -payment;
        });

        this.message = `Sixteen Chaff! ${playerKey} collects ${payment} kan from each player.`;
        this.applyRoundScores();
        return true;
      }
    }

    return false;
  }

  /**
   * Score round where dekiyaku were formed
   * Handles: Shoubu win, Cancel win, Hands exhausted with sage calls
   */
  scoreDekiyakuRound() {
    // Initialize scores
    this.roundState.roundScores = {
      player: 0,
      opponent1: 0,
      opponent2: 0
    };

    // Case 1: Player called shoubu
    if (this.roundState.roundWinner && !this.roundState.sageCancelCalled) {
      const winner = this.roundState.roundWinner;
      const dekiyakuList = this.roundState.dekiyakuFormed[winner];
      const dekiyakuValue = Dekiyaku.calculateValue(dekiyakuList);

      // Pay teyaku first
      this.payTeyaku();

      // Winner gets paid by opponents
      const otherPlayers = ['player', 'opponent1', 'opponent2'].filter(p => p !== winner);
      otherPlayers.forEach(opponent => {
        let payment = dekiyakuValue * this.fieldMultiplier;

        // If opponent called sage, they pay double
        if (this.roundState.sagesCalled[opponent]) {
          payment = payment * 2;
        }

        this.roundState.roundScores[opponent] -= payment;
        this.roundState.roundScores[winner] += payment;
      });

      this.message = `${winner} wins with ${dekiyakuValue} kan dekiyaku!`;
    }
    // Case 2: Player called cancel
    else if (this.roundState.sageCancelCalled) {
      const canceller = this.roundState.sageCancelCalled;
      const dekiyakuList = this.roundState.dekiyakuFormed[canceller];
      const dekiyakuValue = Dekiyaku.calculateValue(dekiyakuList);

      // Pay teyaku first
      this.payTeyaku();

      // Canceller gets half payment from opponents
      const payment = (dekiyakuValue / 2) * this.fieldMultiplier;
      const otherPlayers = ['player', 'opponent1', 'opponent2'].filter(p => p !== canceller);
      otherPlayers.forEach(opponent => {
        this.roundState.roundScores[opponent] -= payment;
        this.roundState.roundScores[canceller] += payment;
      });

      this.message = `${canceller} cancels sage - gets half dekiyaku value (${dekiyakuValue / 2} kan)`;
    }
    // Case 3: All cards played with sage calls (hands exhausted)
    else if (this.phase === 'hand_exhausted') {
      // Pay teyaku
      this.payTeyaku();

      // All players with dekiyaku get half payment
      const playersWithDekiyaku = ['player', 'opponent1', 'opponent2'].filter(
        p => this.roundState.dekiyakuFormed[p] && this.roundState.dekiyakuFormed[p].length > 0
      );

      playersWithDekiyaku.forEach(playerKey => {
        const dekiyakuValue = Dekiyaku.calculateValue(this.roundState.dekiyakuFormed[playerKey]);
        const payment = (dekiyakuValue / 2) * this.fieldMultiplier;

        const otherPlayers = ['player', 'opponent1', 'opponent2'].filter(p => p !== playerKey);
        otherPlayers.forEach(opponent => {
          this.roundState.roundScores[opponent] -= payment;
          this.roundState.roundScores[playerKey] += payment;
        });
      });

      // First sage caller is winner
      const firstSageCaller = this.getFirstSageCaller();
      this.roundState.roundWinner = firstSageCaller;
      this.message = 'Hands exhausted with sage calls - all players paid half dekiyaku';
    }

    this.applyRoundScores();
  }

  /**
   * Score round based on card points
   * Par value is 88 points for 3 players
   */
  scoreCardPointsRound() {
    // Pay teyaku first
    this.payTeyaku();

    // Initialize scores based on card points
    this.roundState.roundScores = {
      player: 0,
      opponent1: 0,
      opponent2: 0
    };

    const playerCards = {
      player: this.getCardPoints(this.players.player.captured),
      opponent1: this.getCardPoints(this.players.opponent1.captured),
      opponent2: this.getCardPoints(this.players.opponent2.captured)
    };

    // Calculate scores: (Points - 88) × Field Multiplier
    const PAR_VALUE = 88;
    let winnerKey = null;
    let maxPoints = 0;

    for (const [playerKey, points] of Object.entries(playerCards)) {
      const score = (points - PAR_VALUE) * this.fieldMultiplier;
      this.roundState.roundScores[playerKey] = score;

      if (points > maxPoints) {
        maxPoints = points;
        winnerKey = playerKey;
      }
    }

    this.roundState.roundWinner = winnerKey;
    this.message = `Card points: ${JSON.stringify(playerCards)}. ${winnerKey} wins with ${maxPoints} points!`;

    this.applyRoundScores();
  }

  /**
   * End the round
   */
  endRound() {
    this.phase = 'round_end';
    this.message = 'Round ended - all cards played';
    this.calculateScores();
  }

  /**
   * Get hand of a player (cards only, not positions)
   */
  getPlayerHand(playerKey) {
    return this.players[playerKey].hand;
  }

  /**
   * Get captured cards of a player
   */
  getPlayerCaptured(playerKey) {
    return this.players[playerKey].captured;
  }

  /**
   * Get field cards
   */
  getField() {
    return this.field;
  }

  /**
   * Get card points for a set of captured cards
   * Bright = 20 points
   * Animal = 10 points
   * Ribbon = 5 points
   * Chaff = 1 point
   * @param {Array} captured - Captured cards
   * @returns {number} Total points
   */
  getCardPoints(captured) {
    return captured.reduce((sum, card) => {
      if (card.type === 'bright') return sum + 20;
      if (card.type === 'animal') return sum + 10;
      if (card.type === 'ribbon') return sum + 5;
      return sum + 1; // chaff
    }, 0);
  }

  /**
   * Get chaff count (willow cards count as chaff)
   * @param {Array} captured - Captured cards
   * @returns {number} Total chaff count
   */
  getChaffCount(captured) {
    return captured.filter(c => c.type === 'chaff' || c.month === 11).length;
  }

  /**
   * Pay teyaku earned at the start of the round
   * Each player gets teyaku payment from opponents
   */
  payTeyaku() {
    ['player', 'opponent1', 'opponent2'].forEach(playerKey => {
      const teyakuValue = this.players[playerKey].teyakuScore;
      if (teyakuValue > 0) {
        const otherPlayers = ['player', 'opponent1', 'opponent2'].filter(p => p !== playerKey);
        otherPlayers.forEach(opponent => {
          if (!this.roundState.roundScores[opponent]) {
            this.roundState.roundScores[opponent] = 0;
          }
          this.roundState.roundScores[opponent] -= teyakuValue;
          this.roundState.roundScores[playerKey] += teyakuValue;
        });
      }
    });
  }

  /**
   * Get first player who called sage (used for hand exhaustion winner)
   * Returns null if no one called sage
   * @returns {string|null} Player key who first called sage
   */
  getFirstSageCaller() {
    const playerOrder = ['player', 'opponent1', 'opponent2'];
    // Dealer and anti-clockwise would need proper turn tracking
    // For now, return first one found in sagesCalled
    for (const player of playerOrder) {
      if (this.roundState.sagesCalled[player]) {
        return player;
      }
    }
    return null;
  }

  /**
   * Apply round scores to game scores and prepare for next round
   */
  applyRoundScores() {
    ['player', 'opponent1', 'opponent2'].forEach(playerKey => {
      this.gameScores[playerKey] += this.roundState.roundScores[playerKey] || 0;
    });

    // Update dealer for next round
    if (this.roundState.roundWinner) {
      this.dealer = this.roundState.roundWinner;
    }

    this.phase = 'round_end';

    // Trigger round summary callback if provided
    if (this.roundSummaryCallback) {
      const isGameOver = this.roundNumber >= this.totalRounds;
      const winner = isGameOver ? this.checkGameEnd() : this.roundState.roundWinner;

      // Convert winner key to index (0=player, 1=opponent1, 2=opponent2)
      const winnerIndex = winner === 'opponent1' ? 1 : (winner === 'opponent2' ? 2 : 0);

      this.roundSummaryCallback({
        roundNumber: this.roundNumber,
        dekiyakuValue: this.roundState.roundScores[this.currentPlayer] || 0,
        cardPointsValue: 0, // We don't separate these in the calculation
        finalScore: this.roundState.roundScores[this.currentPlayer] || 0,
        winner: winnerIndex,
        scores: {
          roundScores: [
            this.roundState.roundScores.player || 0,
            this.roundState.roundScores.opponent1 || 0,
            this.roundState.roundScores.opponent2 || 0
          ],
          gameScores: [
            this.gameScores.player,
            this.gameScores.opponent1,
            this.gameScores.opponent2
          ]
        },
        fieldMultiplier: this.fieldMultiplier,
        isGameOver: isGameOver,
        totalRounds: this.totalRounds,
        stats: {}
      });
    }
  }

  /**
   * Check if game is over and return winner
   * @returns {string|null} Winning player key or null if game continues
   */
  checkGameEnd() {
    if (this.roundNumber >= this.totalRounds) {
      // Find winner (highest score)
      let winner = 'player';
      let maxScore = this.gameScores.player;

      if (this.gameScores.opponent1 > maxScore) {
        winner = 'opponent1';
        maxScore = this.gameScores.opponent1;
      }
      if (this.gameScores.opponent2 > maxScore) {
        winner = 'opponent2';
        maxScore = this.gameScores.opponent2;
      }

      return winner;
    }
    return null;
  }

  /**
   * Advance to next round
   */
  nextRound() {
    if (this.roundNumber >= this.totalRounds) {
      this.phase = 'game_end';
      this.message = `Game over! Winner: ${this.checkGameEnd()}`;
      return;
    }

    this.startRound();
  }
}
