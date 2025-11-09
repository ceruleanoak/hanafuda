/**
 * ShopUI - Manages the Koi Koi Shop interface
 * Handles win condition selection and card shopping
 */

import { WIN_CONDITIONS } from '../game/KoiKoiShop.js';
import { HANAFUDA_DECK } from '../data/cards.js';

export class ShopUI {
  constructor(cardRenderer) {
    this.cardRenderer = cardRenderer;
    this.selectedWinCondition = null;
    this.selectedCards = [];
    this.shopDeck = [];
    this.faceUpCards = [];
    this.isLocked = false;
    this.onComplete = null; // Callback when shop is complete
  }

  /**
   * Initialize the shop with random cards and win conditions
   */
  initialize() {
    // Reset state
    this.selectedWinCondition = null;
    this.selectedCards = [];
    this.isLocked = false;

    // Create a shuffled deck for the shop
    this.shopDeck = this.createShuffledDeck();

    // Draw 3 face-up cards for the shop
    this.faceUpCards = [
      this.shopDeck.pop(),
      this.shopDeck.pop(),
      this.shopDeck.pop()
    ];
  }

  /**
   * Create a shuffled deck for the shop
   */
  createShuffledDeck() {
    const deck = [...HANAFUDA_DECK];
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  /**
   * Get 3 random win conditions (one from each difficulty)
   */
  getRandomWinConditions() {
    const conditions = Object.values(WIN_CONDITIONS);
    const easy = conditions.filter(c => c.difficulty === 1);
    const medium = conditions.filter(c => c.difficulty === 2);
    const hard = conditions.filter(c => c.difficulty === 3);

    return [
      easy[Math.floor(Math.random() * easy.length)],
      medium[Math.floor(Math.random() * medium.length)],
      hard[Math.floor(Math.random() * hard.length)]
    ];
  }

  /**
   * Select a win condition
   */
  selectWinCondition(condition) {
    this.selectedWinCondition = condition;
  }

  /**
   * Select a shop card
   */
  selectShopCard(cardIndex) {
    if (!this.selectedWinCondition) {
      return { success: false, error: 'Please select a win condition first' };
    }

    if (this.selectedCards.length >= 4) {
      return { success: false, error: 'You have already selected 4 cards' };
    }

    // Lock the win condition after first card selection
    if (this.selectedCards.length === 0) {
      this.isLocked = true;
    }

    // Add the selected card to the player's selection
    const selectedCard = this.faceUpCards[cardIndex];
    this.selectedCards.push(selectedCard);

    // Replace the face-up card with a new one from the deck
    if (this.shopDeck.length > 0) {
      this.faceUpCards[cardIndex] = this.shopDeck.pop();
    } else {
      // No more cards in deck, remove this slot
      this.faceUpCards[cardIndex] = null;
    }

    return { success: true, selectedCard };
  }

  /**
   * Check if shop is complete (4 cards selected)
   */
  isComplete() {
    return this.selectedCards.length >= 4;
  }

  /**
   * Get the current shop state
   */
  getState() {
    return {
      selectedWinCondition: this.selectedWinCondition,
      selectedCards: this.selectedCards,
      faceUpCards: this.faceUpCards,
      isLocked: this.isLocked,
      remainingSelections: 4 - this.selectedCards.length
    };
  }

  /**
   * Render the shop interface to the modal
   */
  renderToModal(modalElement) {
    const state = this.getState();
    const winConditions = this.getRandomWinConditions();

    let html = `
      <h2>Koi Koi Shop</h2>
      <p class="shop-instructions">Select a win condition and choose 4 cards to add to your starting hand.</p>

      <div class="win-conditions-section">
        <h3>Select Your Win Condition</h3>
        <div class="win-conditions-list">
    `;

    // Render win conditions
    winConditions.forEach((condition, index) => {
      const isSelected = state.selectedWinCondition?.id === condition.id;
      const isLocked = state.isLocked && !isSelected;

      html += `
        <div class="win-condition-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}"
             data-condition-id="${condition.id}">
          <div class="win-condition-header">
            <span class="win-condition-stars">${condition.stars}</span>
            ${isLocked ? '<span class="lock-icon">🔒</span>' : ''}
          </div>
          <h4 class="win-condition-name">${condition.name}</h4>
          <p class="win-condition-description">${condition.description}</p>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <div class="shop-cards-section">
        <h3>Shop Cards (${state.remainingSelections} remaining)</h3>
        <p class="shop-hint">${!state.selectedWinCondition ? 'Select a win condition to unlock the shop' : 'Click a card to add it to your hand'}</p>

        <div class="shop-cards-display">
    `;

    // Render face-up cards
    state.faceUpCards.forEach((card, index) => {
      if (card) {
        const canSelect = state.selectedWinCondition && state.selectedCards.length < 4;
        html += `
          <div class="shop-card ${canSelect ? 'selectable' : 'disabled'}" data-card-index="${index}">
            <div class="shop-card-image" data-card-id="${card.id}">
              <img src="${card.image}" alt="${card.name}" />
            </div>
            <p class="shop-card-name">${card.name}</p>
          </div>
        `;
      }
    });

    // Render face-down deck pile
    html += `
          <div class="shop-deck-pile">
            <div class="deck-pile-image">🎴</div>
            <p class="deck-pile-label">Deck</p>
          </div>
        </div>
      </div>

      <div class="selected-cards-section">
        <h3>Your Selected Cards</h3>
        <div class="selected-cards-display">
    `;

    // Render selected cards
    for (let i = 0; i < 4; i++) {
      if (state.selectedCards[i]) {
        const card = state.selectedCards[i];
        html += `
          <div class="selected-card">
            <img src="${card.image}" alt="${card.name}" />
          </div>
        `;
      } else {
        html += `
          <div class="selected-card empty">
            <span class="empty-slot">?</span>
          </div>
        `;
      }
    }

    html += `
        </div>
      </div>

      <div class="modal-buttons">
        <button id="shop-start-game" class="primary-btn" ${!this.isComplete() ? 'disabled' : ''}>
          ${this.isComplete() ? 'Start Game' : `Select ${state.remainingSelections} more card${state.remainingSelections !== 1 ? 's' : ''}`}
        </button>
      </div>
    `;

    modalElement.innerHTML = html;
    this.attachEventListeners(modalElement, winConditions);
  }

  /**
   * Attach event listeners to the modal elements
   */
  attachEventListeners(modalElement, winConditions) {
    // Win condition selection
    const conditionCards = modalElement.querySelectorAll('.win-condition-card');
    conditionCards.forEach(card => {
      card.addEventListener('click', () => {
        if (!this.isLocked) {
          const conditionId = card.getAttribute('data-condition-id');
          const condition = winConditions.find(c => c.id === conditionId);
          this.selectWinCondition(condition);
          this.renderToModal(modalElement);
        }
      });
    });

    // Shop card selection
    const shopCards = modalElement.querySelectorAll('.shop-card.selectable');
    shopCards.forEach(card => {
      card.addEventListener('click', () => {
        const cardIndex = parseInt(card.getAttribute('data-card-index'));
        const result = this.selectShopCard(cardIndex);

        if (result.success) {
          this.renderToModal(modalElement);

          // If shop is complete, enable start button
          if (this.isComplete() && this.onComplete) {
            this.onComplete(this.selectedCards, this.selectedWinCondition);
          }
        } else if (result.error) {
          // Show error message
          alert(result.error);
        }
      });
    });

    // Start game button
    const startButton = modalElement.querySelector('#shop-start-game');
    if (startButton && !startButton.disabled) {
      startButton.addEventListener('click', () => {
        if (this.onComplete) {
          this.onComplete(this.selectedCards, this.selectedWinCondition);
        }
      });
    }
  }

  /**
   * Set the callback for when shop is complete
   */
  setOnCompleteCallback(callback) {
    this.onComplete = callback;
  }
}
