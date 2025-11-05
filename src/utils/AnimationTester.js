/**
 * AnimationTester - Test environment for card animations
 * Stacks all existing cards face down on the left, then animates them to the right
 */

import { Card3D } from './Card3D.js';
import { debugLogger } from './DebugLogger.js';

export class AnimationTester {
  constructor(cardRenderer, card3DManager) {
    this.cardRenderer = cardRenderer;
    this.card3DManager = card3DManager;
    this.isActive = false;

    debugLogger.log('animation', '🎬 AnimationTester constructed', {
      cardRenderer: !!cardRenderer,
      card3DManager: !!card3DManager
    });

    // Store all cards and their original states
    this.allCards = [];
    this.originalStates = [];

    // Pile positions
    this.leftPileX = 0;
    this.leftPileY = 0;
    this.rightPileX = 0;
    this.rightPileY = 0;

    // Animation parameters (defaults)
    this.params = {
      // End position (start is always left pile)
      endX: 600,
      endY: 300,
      endZ: 0,

      // Curve control point (for bezier path)
      curveEnabled: false,
      curveX: 400,
      curveY: 200,
      curveZ: 50,

      // Animation
      duration: 500,
      easing: 'easeInOutQuad',

      // Visual properties
      endRotation: 0,
      endScale: 1.0,
      endFaceUp: 1,
      endOpacity: 1.0,

      // Flip timing (0 = flip early, 1 = flip late)
      flipTiming: 0.5,
    };

    // Animation state
    this.isPlaying = false;
    this.animationStartTime = 0;

    // Available options
    this.easingOptions = [
      'linear',
      'easeInQuad',
      'easeOutQuad',
      'easeInOutQuad',
      'easeOutCubic',
      'easeInOutCubic',
      'easeOutBack'
    ];

    // Animation presets
    this.presets = {
      'Simple Slide': {
        duration: 500,
        easing: 'easeInOutQuad',
        endRotation: 0,
        endScale: 1.0,
        endFaceUp: 1,
        endOpacity: 1.0,
        endZ: 0,
      },
      'Flip While Moving': {
        duration: 600,
        easing: 'easeInOutQuad',
        endRotation: 0,
        endScale: 1.0,
        endFaceUp: 1,
        endOpacity: 1.0,
        endZ: 0,
      },
      'Arc Jump': {
        duration: 800,
        easing: 'easeOutQuad',
        endRotation: 0,
        endScale: 1.0,
        endFaceUp: 1,
        endOpacity: 1.0,
        endZ: 100,
      },
      'Spin and Grow': {
        duration: 700,
        easing: 'easeInOutCubic',
        endRotation: Math.PI * 2,
        endScale: 1.5,
        endFaceUp: 1,
        endOpacity: 1.0,
        endZ: 0,
      },
      'Fade Out': {
        duration: 600,
        easing: 'easeInQuad',
        endRotation: 0,
        endScale: 0.8,
        endFaceUp: 1,
        endOpacity: 0.0,
        endZ: 0,
      },
      'Bounce In (Back Easing)': {
        duration: 600,
        easing: 'easeOutBack',
        endRotation: 0,
        endScale: 1.0,
        endFaceUp: 1,
        endOpacity: 1.0,
        endZ: 0,
      },
      'Victory Spin': {
        duration: 1000,
        easing: 'easeOutCubic',
        endRotation: Math.PI * 4,
        endScale: 1.2,
        endFaceUp: 1,
        endOpacity: 1.0,
        endZ: 50,
      },
      'Flip and Fade': {
        duration: 800,
        easing: 'easeInOutQuad',
        endRotation: Math.PI,
        endScale: 1.0,
        endFaceUp: 0,
        endOpacity: 0.3,
        endZ: 0,
      },
    };
  }

  /**
   * Initialize the test environment
   */
  initialize(canvasWidth, canvasHeight) {
    debugLogger.log('animation', '🎬 AnimationTester initializing', {
      canvasWidth,
      canvasHeight
    });

    // Calculate pile positions
    const centerY = canvasHeight / 2;
    this.leftPileX = canvasWidth * 0.2;
    this.leftPileY = centerY;
    this.rightPileX = canvasWidth * 0.8;
    this.rightPileY = centerY;

    // Set default end position to right pile
    this.params.endX = this.rightPileX;
    this.params.endY = this.rightPileY;

    // Collect all cards from the game
    this.allCards = [];
    this.originalStates = [];

    if (this.card3DManager && this.card3DManager.cards) {
      this.card3DManager.cards.forEach(card3D => {
        this.allCards.push(card3D);
        // Store original state
        this.originalStates.push({
          x: card3D.x,
          y: card3D.y,
          z: card3D.z,
          rotation: card3D.rotation,
          scale: card3D.scale,
          faceUp: card3D.faceUp,
          opacity: card3D.opacity,
          homeZone: card3D.homeZone,
          homeX: card3D.homePosition.x,
          homeY: card3D.homePosition.y,
        });
      });
    }

    // Stack all cards on the left pile (face down)
    this.stackCardsOnLeft();

    this.isActive = true;

    debugLogger.log('animation', '✅ AnimationTester initialized', {
      cardCount: this.allCards.length,
      leftPile: `(${Math.round(this.leftPileX)}, ${Math.round(this.leftPileY)})`,
      rightPile: `(${Math.round(this.rightPileX)}, ${Math.round(this.rightPileY)})`
    });
  }

  /**
   * Stack all cards on the left pile (face down)
   */
  stackCardsOnLeft() {
    this.allCards.forEach((card3D, index) => {
      const offset = index * 0.5; // Slight stacking offset
      card3D.x = this.leftPileX;
      card3D.y = this.leftPileY + offset;
      card3D.z = index * 0.1;
      card3D.rotation = 0;
      card3D.scale = 1.0;
      card3D.faceUp = 0; // Face down
      card3D.targetFaceUp = 0;
      card3D.opacity = 1.0;
      card3D.targetOpacity = 1.0;
    });

    debugLogger.log('animation', '📚 Stacked cards on left pile', {
      count: this.allCards.length,
      position: `(${Math.round(this.leftPileX)}, ${Math.round(this.leftPileY)})`
    });
  }

  /**
   * Reset cards to left pile
   */
  resetCards() {
    debugLogger.log('animation', '🔄 AnimationTester resetting cards to left pile', null);

    this.stackCardsOnLeft();
    this.isPlaying = false;
  }

  /**
   * Stop animation and restore cards to original positions
   */
  stopAnimation() {
    debugLogger.log('animation', '⏹️ AnimationTester stopping animation and restoring cards', {
      wasPlaying: this.isPlaying
    });

    this.isPlaying = false;

    // Restore all cards to their original states
    this.allCards.forEach((card3D, index) => {
      const original = this.originalStates[index];
      card3D.x = original.x;
      card3D.y = original.y;
      card3D.z = original.z;
      card3D.rotation = original.rotation;
      card3D.scale = original.scale;
      card3D.faceUp = original.faceUp;
      card3D.targetFaceUp = original.faceUp;
      card3D.opacity = original.opacity;
      card3D.targetOpacity = original.opacity;
    });
  }

  /**
   * Play the animation with current parameters
   */
  playAnimation() {
    if (this.isPlaying) {
      debugLogger.log('animation', '⚠️ AnimationTester already playing', null);
      return; // Already playing
    }

    debugLogger.log('animation', '▶️ AnimationTester starting animation', {
      cardCount: this.allCards.length,
      to: `(${Math.round(this.params.endX)}, ${Math.round(this.params.endY)}, ${Math.round(this.params.endZ)})`,
      duration: `${this.params.duration}ms`,
      easing: this.params.easing,
      endRotation: this.params.endRotation,
      endScale: this.params.endScale,
      endFaceUp: this.params.endFaceUp,
      endOpacity: this.params.endOpacity
    });

    // Reset cards to left pile first
    this.stackCardsOnLeft();

    this.isPlaying = true;
    this.animationStartTime = Date.now();

    // Animate all cards to the right pile with stagger
    this.allCards.forEach((card3D, index) => {
      const delay = index * 30; // Stagger delay

      setTimeout(() => {
        // Calculate slight variation in end position for pile effect
        const offset = index * 0.5;

        // Set up control point for curved path if enabled
        const controlPoint = this.params.curveEnabled ? {
          x: this.params.curveX,
          y: this.params.curveY,
          z: this.params.curveZ
        } : null;

        card3D.tweenTo(
          {
            x: this.params.endX,
            y: this.params.endY + offset,
            z: this.params.endZ + index * 0.1,
            rotation: this.params.endRotation,
            scale: this.params.endScale,
            faceUp: this.params.endFaceUp,
          },
          this.params.duration,
          this.params.easing,
          controlPoint,
          this.params.flipTiming
        );

        card3D.targetOpacity = this.params.endOpacity;
      }, delay);
    });

    // Mark as complete after all animations finish
    const totalDuration = this.allCards.length * 30 + this.params.duration;
    setTimeout(() => {
      debugLogger.log('animation', '✅ AnimationTester animation complete', {
        duration: `${Date.now() - this.animationStartTime}ms`
      });
      this.isPlaying = false;
    }, totalDuration);
  }

  /**
   * Update all cards
   */
  update(deltaTime) {
    this.allCards.forEach(card3D => {
      card3D.update(deltaTime);
    });
  }

  /**
   * Render the test environment
   */
  render(ctx, canvasWidth, canvasHeight) {
    if (!this.isActive) {
      debugLogger.log('render', 'AnimationTester render skipped - not active', null);
      return;
    }

    debugLogger.log('render', '🎨 AnimationTester rendering', {
      canvasSize: `${canvasWidth}x${canvasHeight}`,
      cardCount: this.allCards.length,
      isPlaying: this.isPlaying
    });

    ctx.save();

    // Draw pile outlines
    this.drawPileOutline(ctx, this.leftPileX, this.leftPileY, '#4ecdc4', 'START PILE');
    this.drawPileOutline(ctx, this.params.endX, this.params.endY, '#ff6b6b', 'END PILE');

    // Draw curved path visualization if enabled
    if (this.params.curveEnabled) {
      this.drawCurvePath(ctx);
    }

    // Draw all cards
    this.allCards.forEach(card3D => {
      this.cardRenderer.drawCard3D(ctx, card3D, false, card3D.opacity);
    });

    // Draw animation status
    if (this.isPlaying) {
      ctx.fillStyle = '#4ecdc4';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ANIMATING...', canvasWidth / 2, 40);
    }

    ctx.restore();
  }

  /**
   * Draw a pile outline at the specified position
   */
  drawPileOutline(ctx, x, y, color, label) {
    const width = 100;
    const height = 140;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);

    // Draw rectangle outline
    ctx.strokeRect(
      x - width / 2,
      y - height / 2,
      width,
      height
    );

    // Draw label
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - height / 2 - 10);

    ctx.restore();
  }

  /**
   * Draw curved path visualization
   */
  drawCurvePath(ctx) {
    ctx.save();

    // Draw bezier curve
    ctx.strokeStyle = '#ffa500';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(this.leftPileX, this.leftPileY);
    ctx.quadraticCurveTo(
      this.params.curveX,
      this.params.curveY,
      this.params.endX,
      this.params.endY
    );
    ctx.stroke();

    // Draw control point
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffa500';
    ctx.beginPath();
    ctx.arc(this.params.curveX, this.params.curveY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw control point lines
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.leftPileX, this.leftPileY);
    ctx.lineTo(this.params.curveX, this.params.curveY);
    ctx.lineTo(this.params.endX, this.params.endY);
    ctx.stroke();

    // Draw control point label
    ctx.fillStyle = '#ffa500';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CURVE', this.params.curveX, this.params.curveY - 15);

    ctx.restore();
  }

  /**
   * Update a parameter value
   */
  updateParam(key, value) {
    if (key in this.params) {
      const oldValue = this.params[key];
      this.params[key] = value;

      debugLogger.log('animation', `🔧 AnimationTester param updated: ${key}`, {
        oldValue,
        newValue: value
      });

      // Don't create/update card when adjusting parameters
      // The outlines will update automatically in the render method
    } else {
      debugLogger.log('animation', `⚠️ AnimationTester unknown param: ${key}`, { value });
    }
  }

  /**
   * Load a preset
   */
  loadPreset(presetName) {
    if (presetName in this.presets) {
      debugLogger.log('animation', `📋 AnimationTester loading preset: ${presetName}`, null);

      const preset = this.presets[presetName];
      const updatedParams = [];

      // Update params with preset values
      for (const key in preset) {
        if (key in this.params) {
          this.params[key] = preset[key];
          updatedParams.push(key);
        }
      }

      debugLogger.log('animation', `✅ Preset loaded: ${presetName}`, {
        updatedParams: updatedParams.join(', ')
      });

      // Don't show card, just update parameters
      // Card will only show when Play is pressed

      return true;
    } else {
      debugLogger.log('animation', `⚠️ AnimationTester unknown preset: ${presetName}`, null);
    }
    return false;
  }

  /**
   * Get all parameters as a formatted string for copying
   */
  getParametersAsString() {
    const lines = [
      '// Animation Parameters',
      '{',
    ];

    // Group parameters
    lines.push('  // End Position');
    lines.push(`  endX: ${this.params.endX},`);
    lines.push(`  endY: ${this.params.endY},`);
    lines.push(`  endZ: ${this.params.endZ},`);
    lines.push('');

    lines.push('  // Animation');
    lines.push(`  duration: ${this.params.duration},`);
    lines.push(`  easing: '${this.params.easing}',`);
    lines.push('');

    lines.push('  // Visual Properties');
    lines.push(`  endRotation: ${this.params.endRotation},`);
    lines.push(`  endScale: ${this.params.endScale},`);
    lines.push(`  endFaceUp: ${this.params.endFaceUp},`);
    lines.push(`  endOpacity: ${this.params.endOpacity},`);
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Get tween code snippet for implementation
   */
  getTweenCodeSnippet() {
    const lines = [
      '// Tween animation code',
      'card3D.tweenTo(',
      '  {',
      `    x: ${this.params.endX},`,
      `    y: ${this.params.endY},`,
      `    z: ${this.params.endZ},`,
      `    rotation: ${this.params.endRotation},`,
      `    scale: ${this.params.endScale},`,
      `    faceUp: ${this.params.endFaceUp},`,
      '  },',
      `  ${this.params.duration}, // duration (ms)`,
      `  '${this.params.easing}' // easing`,
      ');',
      '',
      '// Set target opacity',
      `card3D.targetOpacity = ${this.params.endOpacity};`,
    ];

    return lines.join('\n');
  }

  /**
   * Deactivate test environment and restore cards
   */
  deactivate() {
    debugLogger.log('animation', '🛑 AnimationTester deactivating', {
      wasActive: this.isActive,
      wasPlaying: this.isPlaying
    });

    this.isActive = false;

    // Restore all cards to their original states
    this.allCards.forEach((card3D, index) => {
      const original = this.originalStates[index];
      card3D.x = original.x;
      card3D.y = original.y;
      card3D.z = original.z;
      card3D.rotation = original.rotation;
      card3D.scale = original.scale;
      card3D.faceUp = original.faceUp;
      card3D.targetFaceUp = original.faceUp;
      card3D.opacity = original.opacity;
      card3D.targetOpacity = original.opacity;
    });

    this.allCards = [];
    this.originalStates = [];
  }
}
