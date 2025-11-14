/**
 * GameStateValidator - Validates game state and card zone assignments
 * Used for testing to ensure all cards are in correct zones
 */

export class GameStateValidator {
  /**
   * Validate that all cards are accounted for in the game
   * @param {Object} gameState - The game state object
   * @param {Card3DManager} card3DManager - The 3D card manager
   * @param {number} playerCount - Number of players (2, 3, or 4)
   * @returns {Object} Validation results with pass/fail status
   */
  static validateCardAllocation(gameState, card3DManager, playerCount = 2) {
    const results = {
      pass: true,
      errors: [],
      warnings: [],
      summary: {}
    };

    try {
      // Expected card counts
      const totalCardsInDeck = 48; // Standard Hanafuda deck
      let expectedCards = 0;
      let actualCards = 0;

      // Count expected cards in play (excluding deck)
      const fieldSize = gameState.field?.length || 0;
      const deckSize = gameState.deck?.length || 0;

      if (gameState.players && Array.isArray(gameState.players)) {
        gameState.players.forEach((player, index) => {
          const handSize = player.hand?.length || 0;
          expectedCards += handSize;
        });
      }

      expectedCards += fieldSize;

      if (gameState.players && Array.isArray(gameState.players)) {
        gameState.players.forEach((player) => {
          const trickSize = player.trick?.length || 0;
          expectedCards += trickSize;
        });
      }

      // NOTE: Deck cards are NOT counted - only cards "in play"

      // Count actual cards in Card3D zones (excluding deck and drawnCard for "in play" count)
      if (card3DManager && card3DManager.zoneCards) {
        Object.entries(card3DManager.zoneCards).forEach(([zoneName, zoneSet]) => {
          // Count all zones except deck and drawnCard for "in play" validation
          if (zoneName !== 'deck' && zoneName !== 'drawnCard') {
            actualCards += zoneSet.size;
          }
        });
      }

      // Validate counts
      if (actualCards !== expectedCards) {
        results.pass = false;
        results.errors.push(
          `Card count mismatch: expected ${expectedCards}, found ${actualCards} in Card3D zones (excluding deck/drawnCard)`
        );
      }

      // Validate zone assignments for 2-player
      if (playerCount === 2) {
        const expectedPlayer0Hand = gameState.players?.[0]?.hand?.length || 0;
        const expectedPlayer1Hand = gameState.players?.[1]?.hand?.length || 0;
        const actualPlayer0Hand = card3DManager?.zoneCards?.['player0Hand']?.size || 0;
        const actualPlayer1Hand = card3DManager?.zoneCards?.['player1Hand']?.size || 0;

        if (actualPlayer0Hand !== expectedPlayer0Hand) {
          results.pass = false;
          results.errors.push(
            `player0Hand: expected ${expectedPlayer0Hand}, got ${actualPlayer0Hand}`
          );
        }

        if (actualPlayer1Hand !== expectedPlayer1Hand) {
          results.pass = false;
          results.errors.push(
            `player1Hand: expected ${expectedPlayer1Hand}, got ${actualPlayer1Hand}`
          );
        }

        results.summary = {
          player0Hand: { expected: expectedPlayer0Hand, actual: actualPlayer0Hand },
          player1Hand: { expected: expectedPlayer1Hand, actual: actualPlayer1Hand },
          field: { expected: fieldSize, actual: card3DManager?.zoneCards?.['field']?.size || 0 },
          deck: { expected: deckSize, actual: card3DManager?.zoneCards?.['deck']?.size || 0 },
          player0Trick: { expected: gameState.players?.[0]?.trick?.length || 0, actual: card3DManager?.zoneCards?.['player0Trick']?.size || 0 },
          player1Trick: { expected: gameState.players?.[1]?.trick?.length || 0, actual: card3DManager?.zoneCards?.['player1Trick']?.size || 0 }
        };
      }

      return results;
    } catch (error) {
      results.pass = false;
      results.errors.push(`Validation error: ${error.message}`);
      return results;
    }
  }

  /**
   * Check if a specific zone has expected cards
   * @param {Card3DManager} card3DManager
   * @param {string} zoneName
   * @param {number} expectedCount
   * @returns {Object} Zone validation result
   */
  static validateZone(card3DManager, zoneName, expectedCount) {
    const zoneSize = card3DManager?.zoneCards?.[zoneName]?.size || 0;
    const pass = zoneSize === expectedCount;

    return {
      zone: zoneName,
      expected: expectedCount,
      actual: zoneSize,
      pass: pass,
      message: pass
        ? `✓ ${zoneName}: ${zoneSize} cards (correct)`
        : `✗ ${zoneName}: expected ${expectedCount}, got ${zoneSize}`
    };
  }

  /**
   * Validate zone name availability and structure
   * @param {Card3DManager} card3DManager
   * @param {number} playerCount
   * @returns {Array} Array of validation results
   */
  static validateZoneStructure(card3DManager, playerCount = 2) {
    const results = [];
    const expectedZones = ['deck', 'drawnCard', 'field'];

    // Add player zones
    for (let i = 0; i < playerCount; i++) {
      expectedZones.push(`player${i}Hand`);
      expectedZones.push(`player${i}Trick`);
    }

    expectedZones.forEach(zoneName => {
      const exists = card3DManager?.zoneCards?.hasOwnProperty(zoneName);
      results.push({
        zone: zoneName,
        exists: exists,
        message: exists ? `✓ Zone "${zoneName}" exists` : `✗ Zone "${zoneName}" missing`
      });
    });

    return results;
  }

  /**
   * Print validation results to console
   * @param {Object} results
   */
  static printResults(results) {
    console.group('🧪 Game State Validation Results');

    if (results.pass) {
      console.log('✓ All validations passed');
    } else {
      console.error('✗ Validation failed');
      console.group('Errors:');
      results.errors.forEach(error => console.error(`  - ${error}`));
      console.groupEnd();
    }

    if (results.warnings.length > 0) {
      console.group('Warnings:');
      results.warnings.forEach(warning => console.warn(`  - ${warning}`));
      console.groupEnd();
    }

    if (Object.keys(results.summary).length > 0) {
      console.group('Summary:');
      Object.entries(results.summary).forEach(([zone, data]) => {
        const status = data.expected === data.actual ? '✓' : '✗';
        console.log(`  ${status} ${zone}: ${data.actual}/${data.expected}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}
