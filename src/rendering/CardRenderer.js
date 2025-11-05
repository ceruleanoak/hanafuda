/**
 * CardRenderer - Handles rendering individual cards with PNG images or placeholder boxes
 */

import { versionedUrl } from '../utils/version.js';

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

    // Image cache: { imagePath: Image }
    this.imageCache = new Map();
    this.loadingImages = new Set();
    // Track failed image loads to prevent retrying every frame
    this.failedImages = new Set();
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
      // Apply version parameter for cache busting
      img.src = versionedUrl(imagePath);
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

    // Check if this is a bomb card
    const isBombCard = card.isBomb || (card.type === 'bomb');

    if (isBombCard) {
      // Special rendering for bomb cards
      this.drawBombCard(ctx, x, y, isSelected);
      ctx.restore();
      return;
    }

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
      // Draw the card image
      ctx.drawImage(cardImage, x, y, this.cardWidth, this.cardHeight);

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
   * Draw bomb card (special pass card)
   */
  drawBombCard(ctx, x, y, isSelected) {
    // Background gradient (black to dark red)
    const gradient = ctx.createLinearGradient(x, y, x, y + this.cardHeight);
    gradient.addColorStop(0, '#1a0000');
    gradient.addColorStop(1, '#4d0000');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, this.cardWidth, this.cardHeight);

    // Border (red if selected, dark red otherwise)
    ctx.strokeStyle = isSelected ? '#ff0000' : '#800000';
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.strokeRect(x, y, this.cardWidth, this.cardHeight);

    // Draw bomb emoji
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💣', x + this.cardWidth / 2, y + this.cardHeight / 2 - 10);

    // Label text
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('BOMB', x + this.cardWidth / 2, y + this.cardHeight - 20);

    // Subtitle
    ctx.font = '9px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('(Pass)', x + this.cardWidth / 2, y + this.cardHeight - 8);
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
    const monthShort = (typeof card.month === 'string') ? card.month.substring(0, 3) : 'N/A';
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
    if (card.name) {
      const words = card.name.split(' - ');
      ctx.font = `${this.fontSize - 2}px monospace`;

      for (let i = 1; i < words.length && currentY < y + this.cardHeight - 15; i++) {
        const text = words[i];
        // Truncate if too long
        const displayText = text.length > 10 ? text.substring(0, 9) + '.' : text;
        ctx.fillText(displayText, centerX, currentY);
        currentY += 12;
      }
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

  /**
   * Draw a Card3D with scale and face-up/down blending
   * @param {CanvasRenderingContext2D} ctx
   * @param {Card3D} card3D - Card3D instance
   * @param {boolean} isSelected - Whether card is selected
   * @param {number} opacity - Opacity (0-1), default 1
   */
  drawCard3D(ctx, card3D, isSelected = false, opacity = 1.0) {
    ctx.save();

    // Get scale based on Z position
    const scale = card3D.getScale();

    // Calculate scaled dimensions
    const scaledWidth = this.cardWidth * scale;
    const scaledHeight = this.cardHeight * scale;

    // Center the scaled card at its position
    const x = card3D.x - scaledWidth / 2;
    const y = card3D.y - scaledHeight / 2;

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Handle face up/down blending
    // faceUp = 0 -> fully face down
    // faceUp = 1 -> fully face up
    // 0 < faceUp < 1 -> blend between the two
    const faceUp = card3D.faceUp;
    const isFaceDown = faceUp < 0.5;

    // During flip transition, apply perspective skew effect
    if (faceUp > 0.05 && faceUp < 0.95) {
      // Calculate rotation angle from faceUp value
      // faceUp goes from 0 (face down, 0°) to 1 (face up, 180°)
      const angle = faceUp * Math.PI; // Convert to radians

      // Use cosine to calculate visible width - this properly emulates 3D rotation
      // When looking down at a card and it rotates:
      // - At 0° (face down): cos(0) = 1 (full width visible)
      // - At 90° (edge-on): cos(90°) = 0 (no width visible)
      // - At 180° (face up): cos(180°) = -1, abs = 1 (full width visible)
      // Small rotations near 0° or 180° cause little visual change (derivative is small)
      // Rotations near 90° cause rapid visual changes (derivative is large)
      const flipScale = Math.abs(Math.cos(angle));

      // Add a minimum scale so card doesn't completely disappear at edge-on view
      const minScale = 0.05;
      const finalScale = Math.max(minScale, flipScale);

      ctx.translate(card3D.x, card3D.y);
      ctx.scale(finalScale, 1);
      ctx.translate(-card3D.x, -card3D.y);
    }

    // Try to load image if available
    const card = card3D.cardData;
    if (card.image && !this.imageCache.has(card.image) && !this.loadingImages.has(card.image) && !this.failedImages.has(card.image)) {
      this.loadImage(card.image).catch(() => {});
    }

    // Check if we have a loaded image
    const hasImage = card.image && this.imageCache.has(card.image);
    const cardImage = hasImage ? this.imageCache.get(card.image) : null;

    if (isFaceDown) {
      // Draw card back pattern (scaled)
      this.drawCardBackScaled(ctx, x, y, scaledWidth, scaledHeight);

      if (isSelected) {
        ctx.strokeStyle = this.selectedColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, scaledWidth, scaledHeight);
      }
    } else if (hasImage && cardImage) {
      // Draw the card image (scaled)
      ctx.drawImage(cardImage, x, y, scaledWidth, scaledHeight);

      // Selection border overlay
      if (isSelected) {
        ctx.strokeStyle = this.selectedColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, scaledWidth, scaledHeight);
      }
    } else {
      // Fallback to text placeholder (scaled)
      ctx.fillStyle = isSelected ? this.selectedColor : this.defaultColor;
      ctx.fillRect(x, y, scaledWidth, scaledHeight);

      ctx.strokeStyle = isSelected ? this.selectedColor : this.borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, scaledWidth, scaledHeight);

      this.drawCardInfoScaled(ctx, card, x, y, scale);
    }

    ctx.restore();
  }

  /**
   * Draw card back pattern with custom size
   */
  drawCardBackScaled(ctx, x, y, width, height) {
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(x + 10, y + 10, width - 20, height - 20);

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

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
   * Draw card information with custom scale
   */
  drawCardInfoScaled(ctx, card, x, y, scale) {
    const width = this.cardWidth * scale;
    const height = this.cardHeight * scale;
    const fontSize = this.fontSize * scale;

    ctx.fillStyle = this.textColor;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';

    const centerX = x + width / 2;
    let currentY = y + 20 * scale;

    // Month (first 3 letters)
    const monthShort = (typeof card.month === 'string') ? card.month.substring(0, 3) : 'N/A';
    ctx.fillText(monthShort, centerX, currentY);

    currentY += 15 * scale;

    // Type indicator with color
    const typeColors = {
      'bright': '#ffeb3b',
      'animal': '#ff9800',
      'ribbon': '#e91e63',
      'chaff': '#9e9e9e'
    };

    ctx.fillStyle = typeColors[card.type] || this.textColor;
    ctx.fillText(card.type.toUpperCase(), centerX, currentY);

    currentY += 15 * scale;
    ctx.fillStyle = this.textColor;

    // Wrap card name text
    if (card.name) {
      const words = card.name.split(' - ');
      ctx.font = `${(fontSize - 2)}px monospace`;

      for (let i = 1; i < words.length && currentY < y + height - 15 * scale; i++) {
        const text = words[i];
        const displayText = text.length > 10 ? text.substring(0, 9) + '.' : text;
        ctx.fillText(displayText, centerX, currentY);
        currentY += 12 * scale;
      }
    }

    // Points at bottom
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText(`${card.points}pt`, centerX, y + height - 10 * scale);
  }
}
