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
   * Card names drawn from HANAFUDA_DECK in cards.js for consistency
   */
  getKoikoiYaku() {
    return [
      { name: 'Five Brights', points: 15, type: 'brights', description: 'Crane + Curtain + Moon + Rain man + Phoenix', cards: [1, 9, 29, 41, 45] },
      { name: 'Four Brights', points: 8, type: 'brights', description: 'Crane + Curtain + Moon + Phoenix (no Rain man)', cards: [1, 9, 29, 45] },
      { name: 'Rainy Four', points: 7, type: 'brights', description: 'Rain man + any 3 of: Crane, Curtain, Moon, Phoenix', cards: [1, 9, 29, 41] },
      { name: 'Three Brights', points: 6, type: 'brights', description: 'Any 3 of: Crane, Curtain, Moon, Rain man, Phoenix', cards: [1, 9, 29] },
      { name: 'Poetry Ribbons', points: 5, type: 'ribbons', description: 'Red ribbons: Jan + Feb + Mar (+1 per extra)', cards: [2, 6, 10] },
      { name: 'Blue Ribbons', points: 5, type: 'ribbons', description: 'Blue ribbons: Jun + Sep + Oct (+1 per extra)', cards: [22, 34, 38] },
      { name: 'Boar-Deer-Butterfly', points: 5, type: 'animals', description: 'Boar + Deer + Butterflies', cards: [25, 37, 21] },
      { name: 'Ribbons (5+)', points: '5+', type: 'ribbons', description: 'Any 5+ ribbon cards (+1 per extra)', cards: [2, 6, 10, 14, 18, 22, 26, 34, 38, 43] },
      { name: 'Animals (5+)', points: '5+', type: 'animals', description: 'Any 5+ animal cards (+1 per extra)', cards: [5, 13, 17, 21, 25, 30, 33, 37, 42] },
      { name: 'Flower Viewing Sake', points: 5, type: 'special', description: 'Sake cup + Curtain', cards: [33, 9] },
      { name: 'Moon Viewing Sake', points: 5, type: 'special', description: 'Sake cup + Moon', cards: [33, 29] },
      { name: 'Chaff (10+)', points: '1+', type: 'chaff', description: 'Any 10+ chaff cards (+1 per extra)', cards: [3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 36, 39, 40, 44, 46, 47, 48] }
    ];
  }

  /**
   * Get Sakura yaku definitions
   * 8 traditional yaku - each consists of exactly 3 cards
   * Each yaku imposes a -50 point penalty on opponents
   * Card names drawn from HANAFUDA_DECK in cards.js for consistency
   */
  getSakuraYaku() {
    return [
      // Bright Yaku (2 Brights + 1 Animal each)
      {
        name: 'Drinking (Nomi)',
        description: 'Curtain + Moon + Sake cup',
        type: 'brights',
        cards: [9, 29, 33],
        points: '-50'
      },
      {
        name: 'Spring (Omote)',
        description: 'Crane + Bush warbler + Curtain',
        type: 'brights',
        cards: [1, 5, 9],
        points: '-50'
      },

      // Ribbon Yaku (3 Ribbons each)
      {
        name: 'Red Ribbons (Akatan)',
        description: 'Jan + Feb + Mar red ribbons',
        type: 'ribbons',
        cards: [2, 6, 10],
        points: '-50'
      },
      {
        name: 'Blue Ribbons (Aotan)',
        description: 'Jun + Sep + Oct blue ribbons',
        type: 'ribbons',
        cards: [22, 34, 38],
        points: '-50'
      },
      {
        name: 'Grass Ribbons (Kusatan)',
        description: 'Apr + May + Jul red ribbons',
        type: 'ribbons',
        cards: [14, 18, 26],
        points: '-50'
      },

      // Animal Yaku (3 Animals each)
      {
        name: 'Animals A',
        description: 'Butterflies + Sake cup + Deer',
        type: 'animals',
        cards: [21, 33, 37],
        points: '-50'
      },
      {
        name: 'Animals B',
        description: 'Cuckoo + Bridge + Boar',
        type: 'animals',
        cards: [13, 17, 25],
        points: '-50'
      },
      {
        name: 'Boar-Geese-Deer (Ganbo)',
        description: 'Boar + Geese + Deer',
        type: 'animals',
        cards: [25, 30, 37],
        points: '-50'
      }
    ];
  }

  /**
   * Get Hachi-Hachi dekiyaku definitions
   * Card names drawn from HANAFUDA_DECK in cards.js for consistency
   */
  getHachihachiYaku() {
    return [
      { name: 'Five Brights', points: 12, type: 'brights', description: 'Crane + Curtain + Moon + Rain man + Phoenix', cards: [1, 9, 29, 41, 45] },
      { name: 'Four Brights', points: 10, type: 'brights', description: 'Crane + Curtain + Moon + Phoenix', cards: [1, 9, 29, 45] },
      { name: 'Seven Ribbons', points: 10, type: 'ribbons', description: 'All red ribbons except November', cards: [2, 6, 10, 14, 18, 22, 26] },
      { name: 'Poetry Ribbons', points: 7, type: 'ribbons', description: 'Jan + Feb + Mar red ribbons', cards: [2, 6, 10] },
      { name: 'Blue Ribbons', points: 7, type: 'ribbons', description: 'Jun + Sep + Oct blue ribbons', cards: [22, 34, 38] },
      { name: 'Boar-Deer-Butterfly', points: 7, type: 'animals', description: 'Boar + Deer + Butterflies', cards: [25, 37, 21] }
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
      // Add data-description attribute for tooltip hover on modes with descriptions
      const hasDescription = yaku.description && ['sakura', 'koikoi', 'hachihachi'].includes(gameMode);
      const tooltipAttr = hasDescription ? ` data-description="${yaku.description}"` : '';

      html += `<div class="trick-entry${hasDescription ? ' has-tooltip' : ''}"${tooltipAttr}>`;
      html += `<div class="trick-header">`;
      html += `<div class="trick-name">${yaku.name}</div>`;
      html += `<span class="trick-pts">${yaku.points}</span>`;
      html += `</div>`;
      html += `<div class="trick-cards-row">`;

      // Show required cards - very small
      yaku.cards.slice(0, 8).forEach(cardId => {
        html += `<canvas class="trick-card-tiny" data-card-id="${cardId}" data-type="${yaku.type}"></canvas>`;
      });

      if (yaku.cards.length > 8) {
        html += `<span class="card-more">+${yaku.cards.length - 8}</span>`;
      }

      html += `</div>`;
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
