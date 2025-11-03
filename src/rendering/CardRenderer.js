/**
 * CardRenderer - Handles rendering individual cards with PNG images or placeholder boxes
 */

export class CardRenderer {
  constructor() {
    this.cardWidth = 100;
    this.cardHeight = 140;
    this.padding = 5;
    this.fontSize = 11;
    this.selectedColor = '#4ecdc4';
    this.defaultColor = '#333';
    this.borderColor = '#666';
    this.textColor = '#fff';
    this.hueShift = 0; // Hue shift in degrees (0-360)

    // Image cache: { imagePath: Image }
    this.imageCache = new Map();
    this.loadingImages = new Set();
    // Track failed image loads to prevent retrying every frame
    this.failedImages = new Set();
  }

  /**
   * Set hue shift for card colors
   * @param {number} degrees - Hue shift in degrees (0-360)
   */
  setHueShift(degrees) {
    this.hueShift = degrees % 360;
  }

  /**
   * Preload an image
   * @param {string} imagePath - Path to image
   * @returns {Promise<Image>}
   */
  loadImage(imagePath) {
    if (this.imageCache.has(imagePath)) {
      return Promise.resolve(this.imageCache.get(imagePath));
    }

    if (this.loadingImages.has(imagePath)) {
      // Already loading, return a promise that waits
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.imageCache.has(imagePath)) {
            clearInterval(checkInterval);
            resolve(this.imageCache.get(imagePath));
          }
        }, 50);
      });
    }

    this.loadingImages.add(imagePath);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(imagePath, img);
        this.loadingImages.delete(imagePath);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingImages.delete(imagePath);
        this.failedImages.add(imagePath);
        reject(new Error(`Failed to load image: ${imagePath}`));
      };
      img.src = imagePath;
    });
  }

  /**
   * Draw a card with PNG image or fallback to placeholder
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} card - Card object from deck
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {boolean} isSelected - Whether card is selected
   * @param {boolean} isFaceDown - Whether card is face down
   * @param {number} opacity - Opacity (0-1), default 1
   */
  drawCard(ctx, card, x, y, isSelected = false, isFaceDown = false, opacity = 1.0) {
    ctx.save();

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Try to load image if available and not already loaded or failed
    if (card.image && !this.imageCache.has(card.image) && !this.loadingImages.has(card.image) && !this.failedImages.has(card.image)) {
      this.loadImage(card.image).catch(() => {
        // Image failed to load, will use fallback
      });
    }

    // Check if we have a loaded image
    const hasImage = card.image && this.imageCache.has(card.image);
    const cardImage = hasImage ? this.imageCache.get(card.image) : null;

    if (isFaceDown) {
      // Draw card back pattern
      this.drawCardBack(ctx, x, y);

      // Selection border for face-down cards
      if (isSelected) {
        ctx.strokeStyle = this.selectedColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.cardWidth, this.cardHeight);
      }
    } else if (hasImage && cardImage) {
      // Apply hue shift filter if set
      if (this.hueShift !== 0) {
        ctx.filter = `hue-rotate(${this.hueShift}deg)`;
      }

      // Draw the card image
      ctx.drawImage(cardImage, x, y, this.cardWidth, this.cardHeight);

      // Reset filter
      if (this.hueShift !== 0) {
        ctx.filter = 'none';
      }

      // Selection border overlay
      if (isSelected) {
        ctx.strokeStyle = this.selectedColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.cardWidth, this.cardHeight);
      }
    } else {
      // Fallback to text placeholder
      ctx.fillStyle = isSelected ? this.selectedColor : this.defaultColor;
      ctx.fillRect(x, y, this.cardWidth, this.cardHeight);

      ctx.strokeStyle = isSelected ? this.selectedColor : this.borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, this.cardWidth, this.cardHeight);

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
