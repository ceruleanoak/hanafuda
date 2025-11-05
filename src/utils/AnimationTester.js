/**
 * AnimationTester - Test environment for card animations
 * Allows testing and tweaking animation parameters with visual feedback
 */

import { Card3D } from './Card3D.js';
import { debugLogger } from './DebugLogger.js';

export class AnimationTester {
  constructor(cardRenderer) {
    this.cardRenderer = cardRenderer;
    this.isActive = false;

    debugLogger.log('animation', '🎬 AnimationTester constructed', {
      cardRenderer: !!cardRenderer
    });

    // Test card - using a simple dummy card
    this.testCard = null;
    this.testCard3D = null;

    // Start and end positions
    this.startPos = { x: 0, y: 0, z: 0 };
    this.endPos = { x: 0, y: 0, z: 0 };

    // Animation parameters (defaults)
    this.params = {
      // Position
      startX: 200,
      startY: 300,
      startZ: 0,
      endX: 600,
      endY: 300,
      endZ: 0,

      // Animation
      duration: 500,
      easing: 'easeInOutQuad',

      // Visual properties
      startRotation: 0,
      endRotation: 0,
      startScale: 1.0,
      endScale: 1.0,
      startFaceUp: 1,
      endFaceUp: 1,
      startOpacity: 1.0,
      endOpacity: 1.0,

      // Physics (for future use)
      enablePhysics: false,
      gravity: 0,
      velocityX: 0,
      velocityY: 0,
      velocityZ: 0,
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
        startRotation: 0,
        endRotation: 0,
        startScale: 1.0,
        endScale: 1.0,
        startFaceUp: 1,
        endFaceUp: 1,
        startOpacity: 1.0,
        endOpacity: 1.0,
      },
      'Flip While Moving': {
        duration: 600,
        easing: 'easeInOutQuad',
        startRotation: 0,
        endRotation: 0,
        startScale: 1.0,
        endScale: 1.0,
        startFaceUp: 1,
        endFaceUp: 0,
        startOpacity: 1.0,
        endOpacity: 1.0,
      },
      'Arc Jump': {
        duration: 800,
        easing: 'easeOutQuad',
        startRotation: 0,
        endRotation: 0,
        startScale: 1.0,
        endScale: 1.0,
        startFaceUp: 1,
        endFaceUp: 1,
        startOpacity: 1.0,
        endOpacity: 1.0,
        startZ: 0,
        endZ: 100,
      },
      'Spin and Grow': {
        duration: 700,
        easing: 'easeInOutCubic',
        startRotation: 0,
        endRotation: Math.PI * 2,
        startScale: 0.5,
        endScale: 1.5,
        startFaceUp: 1,
        endFaceUp: 1,
        startOpacity: 1.0,
        endOpacity: 1.0,
      },
      'Fade Out': {
        duration: 600,
        easing: 'easeInQuad',
        startRotation: 0,
        endRotation: 0,
        startScale: 1.0,
        endScale: 0.8,
        startFaceUp: 1,
        endFaceUp: 1,
        startOpacity: 1.0,
        endOpacity: 0.0,
      },
      'Bounce In (Back Easing)': {
        duration: 600,
        easing: 'easeOutBack',
        startRotation: 0,
        endRotation: 0,
        startScale: 0.3,
        endScale: 1.0,
        startFaceUp: 1,
        endFaceUp: 1,
        startOpacity: 0.0,
        endOpacity: 1.0,
      },
      'Victory Spin': {
        duration: 1000,
        easing: 'easeOutCubic',
        startRotation: 0,
        endRotation: Math.PI * 4,
        startScale: 1.0,
        endScale: 1.2,
        startFaceUp: 1,
        endFaceUp: 1,
        startOpacity: 1.0,
        endOpacity: 1.0,
        startZ: 0,
        endZ: 50,
      },
      'Flip and Fade': {
        duration: 800,
        easing: 'easeInOutQuad',
        startRotation: 0,
        endRotation: Math.PI,
        startScale: 1.0,
        endScale: 1.0,
        startFaceUp: 1,
        endFaceUp: 0,
        startOpacity: 1.0,
        endOpacity: 0.3,
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

    // Create a dummy card for testing
    this.testCard = {
      id: 'test-card',
      suit: 'pine',
      type: 'bright',
      month: 'January',
      image: './images/cards/01-pine-bright.png',
      points: 20
    };

    // Calculate default positions (left and right sides of screen, clearly visible)
    const centerY = canvasHeight / 2;
    const leftX = canvasWidth * 0.3;
    const rightX = canvasWidth * 0.7;

    this.params.startX = leftX;
    this.params.startY = centerY;
    this.params.endX = rightX;
    this.params.endY = centerY;

    // Don't create the card yet - only show outlines initially
    this.testCard3D = null;

    this.isActive = true;

    debugLogger.log('animation', '✅ AnimationTester initialized', {
      startPos: `(${Math.round(leftX)}, ${Math.round(centerY)})`,
      endPos: `(${Math.round(rightX)}, ${Math.round(centerY)})`
    });
  }

  /**
   * Reset the test card to start position (only called internally by playAnimation)
   */
  resetCard() {
    debugLogger.log('animation', '🔄 AnimationTester resetting card', {
      startPos: `(${Math.round(this.params.startX)}, ${Math.round(this.params.startY)}, ${Math.round(this.params.startZ)})`,
      startRotation: this.params.startRotation,
      startScale: this.params.startScale,
      startFaceUp: this.params.startFaceUp,
      startOpacity: this.params.startOpacity
    });

    this.testCard3D = new Card3D(
      this.testCard,
      this.params.startX,
      this.params.startY,
      this.params.startZ
    );

    this.testCard3D.rotation = this.params.startRotation;
    this.testCard3D.scale = this.params.startScale;
    this.testCard3D.faceUp = this.params.startFaceUp;
    this.testCard3D.targetFaceUp = this.params.startFaceUp;
    this.testCard3D.opacity = this.params.startOpacity;
    this.testCard3D.targetOpacity = this.params.startOpacity;

    this.isPlaying = false;
  }

  /**
   * Stop animation and hide card
   */
  stopAnimation() {
    debugLogger.log('animation', '⏹️ AnimationTester stopping animation', {
      wasPlaying: this.isPlaying
    });

    this.isPlaying = false;
    this.testCard3D = null;
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
      from: `(${Math.round(this.params.startX)}, ${Math.round(this.params.startY)}, ${Math.round(this.params.startZ)})`,
      to: `(${Math.round(this.params.endX)}, ${Math.round(this.params.endY)}, ${Math.round(this.params.endZ)})`,
      duration: `${this.params.duration}ms`,
      easing: this.params.easing,
      rotation: `${this.params.startRotation} → ${this.params.endRotation}`,
      scale: `${this.params.startScale} → ${this.params.endScale}`,
      faceUp: `${this.params.startFaceUp} → ${this.params.endFaceUp}`,
      opacity: `${this.params.startOpacity} → ${this.params.endOpacity}`
    });

    // Create/reset card to start position
    this.resetCard();

    // Start animation
    this.testCard3D.tweenTo(
      {
        x: this.params.endX,
        y: this.params.endY,
        z: this.params.endZ,
        rotation: this.params.endRotation,
        scale: this.params.endScale,
        faceUp: this.params.endFaceUp,
      },
      this.params.duration,
      this.params.easing
    );

    // Set end opacity
    this.testCard3D.targetOpacity = this.params.endOpacity;

    this.isPlaying = true;
    this.animationStartTime = Date.now();

    // Set callback for when animation completes
    this.testCard3D.onAnimationComplete = () => {
      debugLogger.log('animation', '✅ AnimationTester animation complete', {
        duration: `${Date.now() - this.animationStartTime}ms`
      });
      this.isPlaying = false;
      // Hide the card after animation completes
      this.testCard3D = null;
    };
  }

  /**
   * Update the test card animation
   */
  update(deltaTime) {
    if (this.testCard3D) {
      this.testCard3D.update(deltaTime);
    }
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
      hasCard: !!this.testCard3D,
      isPlaying: this.isPlaying,
      cardPosition: this.testCard3D ? `(${Math.round(this.testCard3D.x)}, ${Math.round(this.testCard3D.y)}, ${Math.round(this.testCard3D.z)})` : 'N/A'
    });

    ctx.save();

    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    debugLogger.log('render', '  └─ Background drawn', { color: '#1a1a2e' });

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Animation Tester', canvasWidth / 2, 40);
    debugLogger.log('render', '  └─ Title drawn', null);

    // Draw start outline
    this.drawCardOutline(ctx, this.params.startX, this.params.startY, '#4ecdc4', 'START');
    debugLogger.log('render', '  └─ START outline drawn', {
      position: `(${Math.round(this.params.startX)}, ${Math.round(this.params.startY)})`
    });

    // Draw end outline
    this.drawCardOutline(ctx, this.params.endX, this.params.endY, '#ff6b6b', 'END');
    debugLogger.log('render', '  └─ END outline drawn', {
      position: `(${Math.round(this.params.endX)}, ${Math.round(this.params.endY)})`
    });

    // Draw test card if it exists
    if (this.testCard3D) {
      this.cardRenderer.drawCard3D(ctx, this.testCard3D, false);
      debugLogger.log('render', '  └─ Test card drawn', {
        position: `(${Math.round(this.testCard3D.x)}, ${Math.round(this.testCard3D.y)}, ${Math.round(this.testCard3D.z)})`,
        opacity: this.testCard3D.opacity,
        scale: this.testCard3D.scale,
        rotation: this.testCard3D.rotation
      });
    }

    // Draw animation status
    if (this.isPlaying) {
      ctx.fillStyle = '#4ecdc4';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PLAYING...', canvasWidth / 2, canvasHeight - 20);
      debugLogger.log('render', '  └─ Playing status drawn', null);
    }

    ctx.restore();
  }

  /**
   * Draw a card outline at the specified position
   */
  drawCardOutline(ctx, x, y, color, label) {
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
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - height / 2 - 10);

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
    lines.push('  // Position');
    lines.push(`  startX: ${this.params.startX},`);
    lines.push(`  startY: ${this.params.startY},`);
    lines.push(`  startZ: ${this.params.startZ},`);
    lines.push(`  endX: ${this.params.endX},`);
    lines.push(`  endY: ${this.params.endY},`);
    lines.push(`  endZ: ${this.params.endZ},`);
    lines.push('');

    lines.push('  // Animation');
    lines.push(`  duration: ${this.params.duration},`);
    lines.push(`  easing: '${this.params.easing}',`);
    lines.push('');

    lines.push('  // Visual Properties');
    lines.push(`  startRotation: ${this.params.startRotation},`);
    lines.push(`  endRotation: ${this.params.endRotation},`);
    lines.push(`  startScale: ${this.params.startScale},`);
    lines.push(`  endScale: ${this.params.endScale},`);
    lines.push(`  startFaceUp: ${this.params.startFaceUp},`);
    lines.push(`  endFaceUp: ${this.params.endFaceUp},`);
    lines.push(`  startOpacity: ${this.params.startOpacity},`);
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
   * Deactivate test environment
   */
  deactivate() {
    debugLogger.log('animation', '🛑 AnimationTester deactivating', {
      wasActive: this.isActive,
      wasPlaying: this.isPlaying
    });

    this.isActive = false;
    this.testCard3D = null;
  }
}
