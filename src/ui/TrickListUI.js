/**
 * TrickListUI - Displays available yaku (trick/scoring combinations) for current game mode
 * Renders yaku with their required cards at half size with proper color highlighting
 */

import { HANAFUDA_DECK } from '../data/cards.js';

export class TrickListUI {
  constructor(cardRenderer) {
    this.cardRenderer = cardRenderer;
    this.isVisible = false;
    this.gameMode = 'koikoi'; // Will be set by main.js
  }

  /**
   * Show trick list modal for current game mode
   */
  show(gameMode) {
    this.gameMode = gameMode;
    this.isVisible = true;

    const modal = document.getElementById('trick-list-modal');
    if (modal) {
      modal.classList.add('visible');
      this.updateContent(gameMode);

      // Render the cards after a brief delay to ensure DOM is ready
      setTimeout(() => this.renderTrickCards(), 50);
    }
  }

  /**
   * Hide trick list modal
   */
  hide() {
    this.isVisible = false;
    const modal = document.getElementById('trick-list-modal');
    if (modal) {
      modal.classList.remove('visible');
    }
  }

  /**
   * Update modal content based on game mode
   */
  updateContent(gameMode) {
    const content = document.getElementById('trick-list-content');
    if (!content) return;

    let yakuList = [];
    let layoutMode = 'standard';

    switch(gameMode) {
      case 'koikoi':
        yakuList = this.getKoikoiYaku();
        layoutMode = 'detailed';
        break;
      case 'sakura':
        yakuList = this.getSakuraYaku();
        layoutMode = 'compact';
        break;
      case 'hachihachi':
        yakuList = this.getHachihachiYaku();
        layoutMode = 'detailed';
        break;
      case 'match':
        yakuList = this.getMatchYaku();
        layoutMode = 'compact';
        break;
      case 'shop':
        yakuList = this.getKoikoiYaku();
        layoutMode = 'detailed';
        break;
    }

    content.innerHTML = this.renderYakuLayout(yakuList, layoutMode, gameMode);
  }

  /**
   * Get complete Koi-Koi yaku definitions
   */
  getKoikoiYaku() {
    return [
      { name: 'Five Brights', points: 15, type: 'brights', cards: [1, 9, 29, 41, 45] },
      { name: 'Four Brights', points: 10, type: 'brights', cards: [1, 9, 29, 45] },
      { name: 'Rainy Four', points: 8, type: 'brights', cards: [1, 9, 29, 41] },
      { name: 'Three Brights', points: 6, type: 'brights', cards: [1, 9, 29] },
      { name: 'Poetry Ribbons', points: 6, type: 'ribbons', cards: [2, 6, 10] },
      { name: 'Blue Ribbons', points: 6, type: 'ribbons', cards: [22, 34, 38] },
      { name: 'Boar-Deer-Butterfly', points: 6, type: 'animals', cards: [25, 37, 21] },
      { name: 'Ribbons (5+)', points: '5+', type: 'ribbons', cards: [2, 6, 10, 14, 18, 22, 26] },
      { name: 'Animals (5+)', points: '5+', type: 'animals', cards: [5, 13, 17, 21, 25, 30, 33, 37, 42] },
      { name: 'Chaff (10+)', points: '1+', type: 'chaff', cards: [3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 36, 39, 40, 43, 44, 46, 47, 48] },
      { name: 'Viewing Sake', points: 3, type: 'special', cards: [9, 33] },
      { name: 'Moon Viewing', points: 3, type: 'special', cards: [29, 33] }
    ];
  }

  /**
   * Get Sakura yaku definitions
   */
  getSakuraYaku() {
    return [
      { name: 'Brights', points: '1 ea', type: 'brights', cards: [1, 9, 29, 41, 45] },
      { name: 'Animals', points: '1 ea', type: 'animals', cards: [5, 13, 17, 21, 25, 30, 33, 37, 42] },
      { name: 'Ribbons', points: '1 ea', type: 'ribbons', cards: [2, 6, 10, 14, 18, 22, 26, 34, 38, 43] },
      { name: 'Chaff', points: '1 ea', type: 'chaff', cards: [3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 36, 39, 40, 44, 46, 47, 48] }
    ];
  }

  /**
   * Get Hachi-Hachi dekiyaku definitions
   */
  getHachihachiYaku() {
    return [
      { name: 'Five Brights', points: 12, type: 'brights', cards: [1, 9, 29, 41, 45] },
      { name: 'Four Brights', points: 10, type: 'brights', cards: [1, 9, 29, 45] },
      { name: 'Seven Ribbons', points: 10, type: 'ribbons', cards: [2, 6, 10, 14, 18, 22, 26] },
      { name: 'Poetry Ribbons', points: 7, type: 'ribbons', cards: [2, 6, 10] },
      { name: 'Blue Ribbons', points: 7, type: 'ribbons', cards: [22, 34, 38] },
      { name: 'Boar-Deer-Butterfly', points: 7, type: 'animals', cards: [25, 37, 21] }
    ];
  }

  /**
   * Get Match Game trick definitions
   */
  getMatchYaku() {
    return [
      { name: 'Any Match', points: '1-20 ea', type: 'match', cards: [1, 2, 5, 6, 9, 10] }
    ];
  }

  /**
   * Render yaku layout - single simple list for all modes
   */
  renderYakuLayout(yakuList, layoutMode, gameMode) {
    let html = '<div class="trick-list-items">';

    yakuList.forEach(yaku => {
      html += `<div class="trick-entry">`;
      html += `<div class="trick-name">${yaku.name}</div>`;
      html += `<div class="trick-cards-row">`;

      // Show required cards - very small
      yaku.cards.slice(0, 8).forEach(cardId => {
        html += `<canvas class="trick-card-tiny" data-card-id="${cardId}" data-type="${yaku.type}"></canvas>`;
      });

      if (yaku.cards.length > 8) {
        html += `<span class="card-more">+${yaku.cards.length - 8}</span>`;
      }

      html += `</div>`;
      html += `<span class="trick-pts">${yaku.points}</span>`;
      html += `</div>`;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render cards in trick list after modal is displayed
   */
  renderTrickCards() {
    // Render tiny cards - scale down from full size
    this.renderCardSet('.trick-card-tiny', 28, 40);
  }

  /**
   * Render a set of cards with given dimensions
   */
  renderCardSet(selector, displayWidth, displayHeight) {
    const cards = document.querySelectorAll(selector);

    cards.forEach(canvas => {
      const cardId = parseInt(canvas.dataset.cardId);

      // Set canvas dimensions to render full-size then scale down
      const dpr = window.devicePixelRatio || 1;
      const fullCardWidth = 100;  // Default card width
      const fullCardHeight = 140; // Default card height

      canvas.width = fullCardWidth * dpr;
      canvas.height = fullCardHeight * dpr;

      // Get card data
      const card = HANAFUDA_DECK.find(c => c.id === cardId);

      if (card && this.cardRenderer) {
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Draw full-size card
        this.cardRenderer.drawCard(ctx, card, 0, 0, false, false, 1.0);
      }

      // Scale the canvas display size down
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
    });
  }
}
