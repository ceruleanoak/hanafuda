/**
 * CardRenderer - Handles rendering individual cards with PNG images or placeholder boxes
 */

import { versionedUrl } from '../utils/version.js';

export class CardRenderer {
  constructor() {
    // Base card dimensions (will be scaled based on viewport)
    this.baseCardWidth = 100;
    this.baseCardHeight = 140;
    this.cardWidth = 100;
    this.cardHeight = 140;
    this.scaleFactor = 1.0;

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

    // Card back selection
    this.selectedCardBackId = 'default';
    this.cardBackPath = 'assets/card-backs/carback-flower.png';
  }

  /**
   * Update card dimensions based on viewport size
   * @param {number} viewportWidth - Viewport width in pixels
   * @param {number} viewportHeight - Viewport height in pixels
   */
  updateCardScale(viewportWidth, viewportHeight) {
    // Calculate scale factor based on viewport
    // Use the smaller dimension to determine scale
    const baseViewportWidth = 1920; // Reference desktop width
    const baseViewportHeight = 1080; // Reference desktop height

    // Calculate scale based on both width and height, use the smaller one
    const widthScale = viewportWidth / baseViewportWidth;
    const heightScale = viewportHeight / baseViewportHeight;

    // Use the smaller scale factor to ensure cards fit
    let scale = Math.min(widthScale, heightScale);

    // Apply minimum and maximum scale limits
    scale = Math.max(0.4, Math.min(1.2, scale)); // Clamp between 40% and 120%

    // For very small screens (mobile phones), use a more aggressive scale
    if (viewportWidth < 480) {
      scale = Math.max(0.5, viewportWidth / 600);
    } else if (viewportWidth < 768) {
      scale = Math.max(0.6, viewportWidth / 1000);
    }

    this.scaleFactor = scale;
    this.cardWidth = Math.floor(this.baseCardWidth * scale);
    this.cardHeight = Math.floor(this.baseCardHeight * scale);
    this.fontSize = Math.max(8, Math.floor(11 * scale));
    this.padding = Math.max(3, Math.floor(5 * scale));

    return {
      width: this.cardWidth,
      height: this.cardHeight,
      scale: this.scaleFactor
    };
  }

  /**
   * Get current card dimensions
   * @returns {{width: number, height: number, scale: number}}
   */
  getCardDimensions() {
    return {
      width: this.cardWidth,
      height: this.cardHeight,
      scale: this.scaleFactor
    };
  }

  /**
   * Set the selected card back by ID
   * Maps card back IDs to image paths
   * @param {string} cardBackId - The card back ID (e.g., 'default', 'sakura', 'koi')
   */
  setCardBack(cardBackId) {
    this.selectedCardBackId = cardBackId;

    // Map card back IDs to image file paths
    const cardBackMap = {
      'default': 'assets/card-backs/carback-flower.png', // Use flower as default
      'sakura': 'assets/card-backs/carback-flower.png',
      'koi': 'assets/card-backs/cardback-wave.png',
      'moon': 'assets/card-backs/carback-flower.png', // Fallback to flower
      'crane': 'assets/card-backs/carback-fan.png',
      'phoenix': 'assets/card-backs/carback-flower.png' // Fallback to flower
    };

    this.cardBackPath = cardBackMap[cardBackId] || cardBackMap['default'];
    // Preload the card back image
    this.loadImage(this.cardBackPath).catch(() => {
      // If loading fails, fall back to wave
      this.cardBackPath = 'assets/card-backs/cardback-wave.png';
      this.loadImage(this.cardBackPath);
    });
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
   * @param {Object} pointValueOptions - Optional { enabled: boolean, getValue: (card) => number }
   */
  drawCard(ctx, card, x, y, isSelected = false, isFaceDown = false, opacity = 1.0, pointValueOptions = null) {
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

      // Draw point value badge if enabled
      if (pointValueOptions && pointValueOptions.enabled && !isFaceDown) {
        const pointValue = pointValueOptions.getValue(card);
        this.drawPointValueBadge(ctx, pointValue, x, y);
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
   * Draw card back image or fallback pattern
   */
  drawCardBack(ctx, x, y) {
    // Try to draw the card back image
    if (this.imageCache.has(this.cardBackPath)) {
      const img = this.imageCache.get(this.cardBackPath);
      try {
        ctx.drawImage(img, x, y, this.cardWidth, this.cardHeight);
        return;
      } catch (e) {
        // If drawing fails, fall through to pattern fallback
      }
    }

    // Fallback pattern if image not loaded yet
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
   * Draw point value badge on card (for Sakura mode)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} pointValue - Point value to display
   * @param {number} x - Card X position
   * @param {number} y - Card Y position
   */
  drawPointValueBadge(ctx, pointValue, x, y) {
    const badgeSize = 24;
    const badgeX = x + this.cardWidth - badgeSize - 4;
    const badgeY = y + 4;
    const badgeRadius = badgeSize / 2;

    // Choose badge color based on point value
    let badgeColor, textColor;
    if (pointValue === 0) {
      badgeColor = '#757575'; // Gray for 0 points
      textColor = '#ffffff';
    } else if (pointValue === 1) {
      badgeColor = '#4CAF50'; // Green for 1 point
      textColor = '#ffffff';
    } else if (pointValue === 5) {
      badgeColor = '#2196F3'; // Blue for 5 points
      textColor = '#ffffff';
    } else if (pointValue === 20) {
      badgeColor = '#FFC107'; // Gold for 20 points
      textColor = '#000000';
    } else {
      badgeColor = '#9C27B0'; // Purple for other values
      textColor = '#ffffff';
    }

    // Draw badge circle with shadow
    ctx.save();

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Circle background
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(badgeX + badgeRadius, badgeY + badgeRadius, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw point value text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pointValue.toString(), badgeX + badgeRadius, badgeY + badgeRadius);

    ctx.restore();
  }

  /**
   * Draw point value badge on scaled card (for Sakura mode with 3D cards)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} pointValue - Point value to display
   * @param {number} x - Card X position
   * @param {number} y - Card Y position
   * @param {number} scale - Card scale factor
   */
  drawPointValueBadgeScaled(ctx, pointValue, x, y, scale) {
    const badgeSize = 24 * scale;
    const scaledWidth = this.cardWidth * scale;
    const badgeX = x + scaledWidth - badgeSize - (4 * scale);
    const badgeY = y + (4 * scale);
    const badgeRadius = badgeSize / 2;

    // Choose badge color based on point value
    let badgeColor, textColor;
    if (pointValue === 0) {
      badgeColor = '#757575'; // Gray for 0 points
      textColor = '#ffffff';
    } else if (pointValue === 1) {
      badgeColor = '#4CAF50'; // Green for 1 point
      textColor = '#ffffff';
    } else if (pointValue === 5) {
      badgeColor = '#2196F3'; // Blue for 5 points
      textColor = '#ffffff';
    } else if (pointValue === 20) {
      badgeColor = '#FFC107'; // Gold for 20 points
      textColor = '#000000';
    } else {
      badgeColor = '#9C27B0'; // Purple for other values
      textColor = '#ffffff';
    }

    // Draw badge circle with shadow
    ctx.save();

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4 * scale;
    ctx.shadowOffsetX = 1 * scale;
    ctx.shadowOffsetY = 1 * scale;

    // Circle background
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(badgeX + badgeRadius, badgeY + badgeRadius, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw point value text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${12 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pointValue.toString(), badgeX + badgeRadius, badgeY + badgeRadius);

    ctx.restore();
  }

  /**
   * Draw electric shimmer effect around card (for wild card in Sakura mode)
   * Creates an animated yellow/gold electric aura
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Card X position
   * @param {number} y - Card Y position
   * @param {number} width - Card width
   * @param {number} height - Card height
   * @param {number} scale - Card scale factor
   */
  drawElectricShimmer(ctx, x, y, width, height, scale) {
    ctx.save();

    // Clip to card bounds to keep effect contained
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Use time for animation - 3x faster
    const time = (Date.now() / 1000) * 3;

    // Draw multiple layers of shimmer
    const layers = 3;
    for (let layer = 0; layer < layers; layer++) {
      const offset = layer * 1 * scale; // Reduced offset
      const phaseShift = layer * Math.PI / 2;

      // Animate the glow intensity - faster
      const pulseSpeed = (2 + layer * 0.5);
      const pulse = 0.5 + 0.5 * Math.sin(time * pulseSpeed + phaseShift);

      // Create gradient for glow effect - tighter to card
      const gradient = ctx.createRadialGradient(
        x + width / 2, y + height / 2, 0,
        x + width / 2, y + height / 2, Math.max(width, height) / 2.5 // Tighter gradient
      );

      const alpha = (0.1 + pulse * 0.08) * (1 - layer * 0.3); // Reduced alpha
      gradient.addColorStop(0, `rgba(255, 215, 0, 0)`);
      gradient.addColorStop(0.8, `rgba(255, 215, 0, ${alpha})`);
      gradient.addColorStop(1, `rgba(255, 140, 0, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height); // No extension beyond card
    }

    // Draw animated electric arcs INSIDE the border
    const arcCount = 12; // More arcs for smoother effect
    for (let i = 0; i < arcCount; i++) {
      const arcPulse = Math.sin(time * 1.5 + i) * 0.5 + 0.5;

      // Arc positions just inside the perimeter
      const side = i % 4;
      let startX, startY, endX, endY;
      const inset = 2 * scale; // Stay inside border
      const arcLength = 5 * scale; // Shorter arcs

      switch(side) {
        case 0: // Top
          startX = x + (i / arcCount) * width * 4;
          startY = y + inset;
          endX = startX + Math.sin(time * 2 + i) * 3 * scale;
          endY = y + arcPulse * arcLength;
          break;
        case 1: // Right
          startX = x + width - inset;
          startY = y + (i / arcCount) * height * 4;
          endX = x + width - arcPulse * arcLength;
          endY = startY + Math.sin(time * 2 + i) * 3 * scale;
          break;
        case 2: // Bottom
          startX = x + (i / arcCount) * width * 4;
          startY = y + height - inset;
          endX = startX + Math.sin(time * 2 + i) * 3 * scale;
          endY = y + height - arcPulse * arcLength;
          break;
        case 3: // Left
          startX = x + inset;
          startY = y + (i / arcCount) * height * 4;
          endX = x + arcPulse * arcLength;
          endY = startY + Math.sin(time * 2 + i) * 3 * scale;
          break;
      }

      // Draw electric arc
      ctx.strokeStyle = `rgba(255, 215, 0, ${arcPulse * 0.5})`;
      ctx.lineWidth = (1.5 + arcPulse * 0.5) * scale;
      ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
      ctx.shadowBlur = 4 * scale;

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      // Bezier curve for lightning effect
      const cpX = (startX + endX) / 2 + Math.sin(time * 3 + i) * 2 * scale;
      const cpY = (startY + endY) / 2 + Math.cos(time * 3 + i) * 2 * scale;
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.stroke();
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /**
   * Draw electric overlay on top of card (for wild card in Sakura mode)
   * Adds a subtle electric glow over the card face
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Card X position
   * @param {number} y - Card Y position
   * @param {number} width - Card width
   * @param {number} height - Card height
   * @param {number} scale - Card scale factor
   */
  drawElectricOverlay(ctx, x, y, width, height, scale) {
    ctx.save();

    // 3x faster animation
    const time = (Date.now() / 1000) * 3;

    // Pulsing border glow - faster
    const borderPulse = 0.2 + 0.2 * Math.sin(time * 1.5);

    // Draw glowing border - thinner
    ctx.strokeStyle = `rgba(255, 215, 0, ${borderPulse})`;
    ctx.lineWidth = 3 * scale;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 8 * scale;
    ctx.strokeRect(x, y, width, height);

    // Draw corner sparks - faster
    const corners = [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height]
    ];

    corners.forEach((corner, i) => {
      const sparkPulse = Math.sin(time * 2 + i * Math.PI / 2);
      if (sparkPulse > 0.5) {
        const sparkSize = (sparkPulse - 0.5) * 6 * scale; // Smaller sparks
        ctx.fillStyle = `rgba(255, 255, 100, ${sparkPulse * 0.8})`;
        ctx.shadowColor = 'rgba(255, 255, 100, 0.8)';
        ctx.shadowBlur = 10 * scale;

        ctx.beginPath();
        ctx.arc(corner[0], corner[1], sparkSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.restore();
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
   * Draw card thickness effect (simulates 3D depth)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Card x position
   * @param {number} y - Card y position
   * @param {number} width - Card width
   * @param {number} height - Card height
   * @param {number} scale - Card scale
   * @param {number} faceUp - Face up value (0-1)
   */
  drawCardThickness(ctx, x, y, width, height, scale, faceUp) {
    // Thickness in pixels (scales with card size)
    const baseThickness = 3;
    const thickness = baseThickness * scale;

    // During flip, show edge thickness more prominently
    // When card is edge-on (faceUp near 0.5), show maximum thickness
    const flipFactor = 1 - Math.abs(faceUp - 0.5) * 2; // 0 at face-up/down, 1 at edge-on
    const edgeThickness = thickness + (flipFactor * thickness * 2);

    // Draw thickness shadow on bottom and right edges
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';

    // Bottom edge
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + thickness, y + height + thickness);
    ctx.lineTo(x + width + thickness, y + height + thickness);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();

    // Right edge
    ctx.beginPath();
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width + thickness, y + thickness);
    ctx.lineTo(x + width + thickness, y + height + thickness);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();

    // Draw side edge when card is flipping (more visible at edge-on view)
    if (flipFactor > 0.3) {
      ctx.fillStyle = 'rgba(50, 30, 20, 0.8)'; // Darker brown for card edge
      const edgeWidth = edgeThickness * flipFactor;

      // Draw visible card edge (vertical stripe in middle)
      ctx.fillRect(x + width / 2 - edgeWidth / 2, y, edgeWidth, height);
    }
  }

  /**
   * Draw a Card3D with scale and face-up/down blending
   * @param {CanvasRenderingContext2D} ctx
   * @param {Card3D} card3D - Card3D instance
   * @param {boolean} isSelected - Whether card is selected
   * @param {number} opacity - Opacity (0-1), default 1
   * @param {Object} pointValueOptions - Optional { enabled: boolean, getValue: (card) => number }
   * @param {Object} wildCardOptions - Optional { enabled: boolean, isWildCard: (card) => boolean }
   */
  drawCard3D(ctx, card3D, isSelected = false, opacity = 1.0, pointValueOptions = null, wildCardOptions = null) {
    ctx.save();

    // Get scale based on Z position
    const scale = card3D.getScale();

    // Calculate scaled dimensions
    const scaledWidth = this.cardWidth * scale;
    const scaledHeight = this.cardHeight * scale;

    // Center the scaled card at its position
    const x = card3D.x - scaledWidth / 2;
    const y = card3D.y - scaledHeight / 2;

    // Apply rotation around the card's center
    if (card3D.rotation !== 0) {
      ctx.translate(card3D.x, card3D.y);
      ctx.rotate(card3D.rotation);
      ctx.translate(-card3D.x, -card3D.y);
    }

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Draw card thickness effect (before flip transform)
    const faceUp = card3D.faceUp;
    this.drawCardThickness(ctx, x, y, scaledWidth, scaledHeight, scale, faceUp);

    // Check if this is a wild card (Gaji in Sakura mode)
    const card = card3D.cardData;
    const isWildCard = wildCardOptions && wildCardOptions.enabled &&
                       wildCardOptions.isWildCard(card) &&
                       faceUp >= 0.5; // Only show effect when face is visible

    // Handle face up/down blending
    // faceUp = 0 -> fully face down
    // faceUp = 1 -> fully face up
    // 0 < faceUp < 1 -> blend between the two
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
      // Draw electric shimmer effect for wild card (BEFORE card image)
      if (isWildCard) {
        this.drawElectricShimmer(ctx, x, y, scaledWidth, scaledHeight, scale);
      }

      // Draw the card image (scaled)
      ctx.drawImage(cardImage, x, y, scaledWidth, scaledHeight);

      // Draw point value badge if enabled (needs to be before flip transformation is restored)
      if (pointValueOptions && pointValueOptions.enabled && !isFaceDown) {
        const pointValue = pointValueOptions.getValue(card);
        this.drawPointValueBadgeScaled(ctx, pointValue, x, y, scale);
      }

      // Draw electric overlay effect for wild card (AFTER card image, for extra glow)
      if (isWildCard) {
        this.drawElectricOverlay(ctx, x, y, scaledWidth, scaledHeight, scale);
      }

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
   * Draw card back image with custom size or fallback pattern
   */
  drawCardBackScaled(ctx, x, y, width, height) {
    // Try to draw the card back image with custom size
    if (this.imageCache.has(this.cardBackPath)) {
      const img = this.imageCache.get(this.cardBackPath);
      try {
        ctx.drawImage(img, x, y, width, height);
        return;
      } catch (e) {
        // If drawing fails, fall through to pattern fallback
      }
    }

    // Fallback pattern if image not loaded yet
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
