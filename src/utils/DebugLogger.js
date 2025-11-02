/**
 * DebugLogger - Centralized logging system for debugging animations and game flow
 */

export class DebugLogger {
  constructor() {
    this.enabled = true;
    this.categories = {
      animation: true,
      message: true,
      gameState: true,
      render: false, // Disabled by default as it's very verbose
      error: true
    };

    // Track all messages shown to player
    this.messageHistory = [];

    // Track animation statistics
    this.animationStats = {
      created: 0,
      completed: 0,
      failed: 0,
      active: 0
    };

    console.log('%c[DebugLogger] Initialized', 'color: #4ecdc4; font-weight: bold');
    this.logHeader();
  }

  logHeader() {
    console.log('%c========================================', 'color: #4ecdc4');
    console.log('%c   HANAFUDA KOI-KOI DEBUG LOGGER', 'color: #4ecdc4; font-weight: bold');
    console.log('%c========================================', 'color: #4ecdc4');
    console.log('%cEnabled categories:', 'color: #4ecdc4', this.categories);
    console.log('%c========================================', 'color: #4ecdc4');
  }

  /**
   * Log a message to the console
   */
  log(category, message, data = null, style = null) {
    if (!this.enabled || !this.categories[category]) return;

    const timestamp = new Date().toLocaleTimeString();
    const categoryColors = {
      animation: '#ffeb3b',
      message: '#4ecdc4',
      gameState: '#9b59b6',
      render: '#95a5a6',
      error: '#ff6b6b'
    };

    const color = categoryColors[category] || '#fff';
    const prefix = `[${timestamp}] [${category.toUpperCase()}]`;

    if (style) {
      console.log(`%c${prefix} ${message}`, style, data || '');
    } else {
      console.log(`%c${prefix}%c ${message}`, `color: ${color}; font-weight: bold`, 'color: inherit', data || '');
    }

    if (data) {
      console.log(data);
    }
  }

  /**
   * Log player-visible message
   */
  logMessage(message) {
    this.messageHistory.push({
      timestamp: new Date().toISOString(),
      message
    });
    this.log('message', `Player Message: "${message}"`, null, 'color: #4ecdc4; font-size: 14px; font-weight: bold');
  }

  /**
   * Log animation creation
   */
  logAnimationCreated(card, startPos, endPos, duration) {
    this.animationStats.created++;
    this.animationStats.active++;

    this.log('animation', `Animation Created [#${this.animationStats.created}]`, {
      card: `${card.name} (${card.month})`,
      from: `(${Math.round(startPos.x)}, ${Math.round(startPos.y)})`,
      to: `(${Math.round(endPos.x)}, ${Math.round(endPos.y)})`,
      duration: `${duration}ms`,
      activeCount: this.animationStats.active
    });
  }

  /**
   * Log animation progress
   */
  logAnimationProgress(card, progress, position) {
    // Only log at 25%, 50%, 75% to avoid spam
    const roundedProgress = Math.round(progress * 100);
    if (roundedProgress === 25 || roundedProgress === 50 || roundedProgress === 75) {
      this.log('animation', `Animation Progress: ${roundedProgress}%`, {
        card: card.name,
        position: `(${Math.round(position.x)}, ${Math.round(position.y)})`
      });
    }
  }

  /**
   * Log animation completion
   */
  logAnimationCompleted(card) {
    this.animationStats.completed++;
    this.animationStats.active--;

    this.log('animation', `Animation Completed ✓`, {
      card: card.name,
      totalCompleted: this.animationStats.completed,
      activeCount: this.animationStats.active
    });
  }

  /**
   * Log animation failure/warning
   */
  logAnimationWarning(message, data) {
    this.animationStats.failed++;
    this.log('error', `⚠️ Animation Warning: ${message}`, data);
  }

  /**
   * Log game state change
   */
  logGameStateChange(beforeState, afterState, action) {
    this.log('gameState', `State Change: ${action}`, {
      phase: `${beforeState.phase} → ${afterState.phase}`,
      playerCaptured: `${beforeState.playerCaptured.length} → ${afterState.playerCaptured.length}`,
      opponentCaptured: `${beforeState.opponentCaptured.length} → ${afterState.opponentCaptured.length}`,
      field: `${beforeState.field.length} → ${afterState.field.length}`,
      deckCount: afterState.deckCount
    });
  }

  /**
   * Log render frame (verbose)
   */
  logRenderFrame(animatingCount, visibleCards) {
    this.log('render', `Frame rendered`, {
      animatingCards: animatingCount,
      visibleCards
    });
  }

  /**
   * Log error
   */
  logError(message, error) {
    this.log('error', `❌ ERROR: ${message}`, {
      error: error?.message || error,
      stack: error?.stack
    });
    console.error(error);
  }

  /**
   * Get animation statistics
   */
  getAnimationStats() {
    return { ...this.animationStats };
  }

  /**
   * Get message history
   */
  getMessageHistory() {
    return [...this.messageHistory];
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('%c========================================', 'color: #4ecdc4');
    console.log('%c   DEBUG SUMMARY', 'color: #4ecdc4; font-weight: bold');
    console.log('%c========================================', 'color: #4ecdc4');
    console.log('Animation Stats:', this.animationStats);
    console.log('Messages Shown:', this.messageHistory.length);
    if (this.messageHistory.length > 0) {
      console.log('Recent Messages:');
      this.messageHistory.slice(-5).forEach(m => {
        console.log(`  - ${m.message}`);
      });
    }
    console.log('%c========================================', 'color: #4ecdc4');
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`DebugLogger ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable category
   */
  setCategoryEnabled(category, enabled) {
    if (this.categories.hasOwnProperty(category)) {
      this.categories[category] = enabled;
      console.log(`DebugLogger category '${category}' ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

// Create global singleton
export const debugLogger = new DebugLogger();

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  window.debugLogger = debugLogger;
  console.log('%cDebug commands available:', 'color: #4ecdc4; font-weight: bold');
  console.log('  window.debugLogger.printSummary() - Show debug summary');
  console.log('  window.debugLogger.getAnimationStats() - Get animation stats');
  console.log('  window.debugLogger.getMessageHistory() - Get message history');
  console.log('  window.debugLogger.setEnabled(true/false) - Enable/disable logging');
}
