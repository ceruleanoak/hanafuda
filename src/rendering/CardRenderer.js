/**
 * CardRenderer - Handles rendering individual cards as placeholder boxes
 */

export class CardRenderer {
  constructor() {
    this.cardWidth = 80;
    this.cardHeight = 120;
    this.padding = 5;
    this.fontSize = 10;
    this.selectedColor = '#4ecdc4';
    this.defaultColor = '#333';
    this.borderColor = '#666';
    this.textColor = '#fff';
  }

  /**
   * Draw a card as a placeholder box with text
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} card - Card object from deck
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {boolean} isSelected - Whether card is selected
   * @param {boolean} isFaceDown - Whether card is face down
   */
  drawCard(ctx, card, x, y, isSelected = false, isFaceDown = false) {
    ctx.save();

    // Card background
    ctx.fillStyle = isSelected ? this.selectedColor : this.defaultColor;
    ctx.fillRect(x, y, this.cardWidth, this.cardHeight);

    // Card border
    ctx.strokeStyle = isSelected ? this.selectedColor : this.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.cardWidth, this.cardHeight);

    if (isFaceDown) {
      // Draw card back pattern
      this.drawCardBack(ctx, x, y);
    } else {
      // Draw card information
      this.drawCardInfo(ctx, card, x, y);
    }

    ctx.restore();
  }

  /**
   * Draw card back pattern
   */
  drawCardBack(ctx, x, y) {
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(x + 10, y + 10, this.cardWidth - 20, this.cardHeight - 20);

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    const centerX = x + this.cardWidth / 2;
    const centerY = y + this.cardHeight / 2;

    // Simple pattern
    for (let i = 0; i < 3; i++) {
      ctx.strokeRect(
        centerX - 15 - i * 5,
        centerY - 25 - i * 5,
        30 + i * 10,
        50 + i * 10
      );
    }
  }

  /**
   * Draw card information (month, type, name)
   */
  drawCardInfo(ctx, card, x, y) {
    ctx.fillStyle = this.textColor;
    ctx.font = `bold ${this.fontSize}px monospace`;
    ctx.textAlign = 'center';

    const centerX = x + this.cardWidth / 2;
    let currentY = y + 20;

    // Month (first 3 letters)
    const monthShort = card.month.substring(0, 3);
    ctx.fillText(monthShort, centerX, currentY);

    currentY += 15;

    // Type indicator with color
    const typeColors = {
      'bright': '#ffeb3b',
      'animal': '#ff9800',
      'ribbon': '#e91e63',
      'chaff': '#9e9e9e'
    };

    ctx.fillStyle = typeColors[card.type] || this.textColor;
    ctx.fillText(card.type.toUpperCase(), centerX, currentY);

    currentY += 15;
    ctx.fillStyle = this.textColor;

    // Wrap card name text
    const words = card.name.split(' - ');
    ctx.font = `${this.fontSize - 2}px monospace`;

    for (let i = 1; i < words.length && currentY < y + this.cardHeight - 15; i++) {
      const text = words[i];
      // Truncate if too long
      const displayText = text.length > 10 ? text.substring(0, 9) + '.' : text;
      ctx.fillText(displayText, centerX, currentY);
      currentY += 12;
    }

    // Points at bottom
    ctx.font = `bold ${this.fontSize}px monospace`;
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText(`${card.points}pt`, centerX, y + this.cardHeight - 10);
  }

  /**
   * Check if a point is inside a card's bounds
   */
  isPointInCard(x, y, cardX, cardY) {
    return x >= cardX &&
           x <= cardX + this.cardWidth &&
           y >= cardY &&
           y <= cardY + this.cardHeight;
  }

  /**
   * Get card dimensions
   */
  getCardDimensions() {
    return {
      width: this.cardWidth,
      height: this.cardHeight
    };
  }
}
