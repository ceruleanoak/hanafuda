/**
 * Enhanced Card3D - Full 3D card representation with multiple animation modes
 * Designed for real-time rendering where all cards exist as 3D objects
 */

/**
 * Easing functions for tween animations
 */
const Easing = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

/**
 * Enhanced Card3D with full animation support
 */
export class Card3D {
  constructor(cardData, x = 0, y = 0, z = 0) {
    // ===== IDENTITY & DATA =====
    this.cardData = cardData;
    this.id = cardData.id;

    // ===== SPATIAL STATE =====
    this.x = x;
    this.y = y;
    this.z = Math.max(0, z); // Z never less than 0

    this.vx = 0; // Velocity
    this.vy = 0;
    this.vz = 0;

    this.ax = 0; // Acceleration
    this.ay = 0;
    this.az = 0;

    this.rotation = 0; // Rotation angle (radians, around Z-axis)
    this.rotationVelocity = 0;

    this.scale = 1.0; // Uniform scale multiplier
    this.scaleVelocity = 0;
    this.targetScale = 1.0; // Target scale for smooth transitions

    // ===== HOVER STATE =====
    this.isHovered = false; // Whether card is currently hovered
    this.hoverScale = 1.15; // Scale multiplier when hovered (15% larger)
    this.baseScale = 1.0; // Base scale when not hovered

    // ===== PRESENTATION STATE =====
    this.faceUp = 0; // Face orientation (0 = face down, 1 = face up)
    this.targetFaceUp = 0;
    this.faceUpVelocity = 0;

    this.opacity = 1.0; // Visual opacity (0-1)
    this.targetOpacity = 1.0;

    // ===== LAYOUT & HOME POSITION =====
    this.homeZone = null; // Zone ID ('deck', 'field', 'playerHand', etc.)
    this.homePosition = { x, y, z }; // Where this card "lives" when at rest
    this.homeIndex = 0; // Index within zone for layout ordering

    // ===== ANIMATION STATE =====
    this.animationMode = 'idle'; // 'physics', 'tween', 'spring', 'idle'

    // Tween mode properties
    this.tweenTarget = null; // {x, y, z, rotation, scale, faceUp}
    this.tweenStart = null; // Starting values
    this.tweenControlPoint = null; // {x, y, z} for curved paths (optional)
    this.tweenFlipTiming = 0.5; // 0-1: controls when flip occurs (0=early, 0.5=linear, 1=late)
    this.tweenPeakScale = null; // If set, scale peaks at midpoint instead of linear tween
    this.tweenDuration = 0; // ms
    this.tweenProgress = 0; // 0-1
    this.tweenEasing = 'easeInOutQuad';

    // Spring mode properties
    this.springStrength = 8.0; // Spring force coefficient
    this.springDamping = 0.85; // Damping coefficient (0-1)

    // Physics mode properties
    this.physicsDamping = 0.95; // Velocity damping per second

    // ===== RENDERING & CULLING =====
    this.screenAABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    this.isVisible = true;
    this.renderLayer = 3; // Rendering priority (higher = drawn later)
    this.homeRenderLayer = 3; // Original render layer before animation elevation

    // ===== STATE TRACKING =====
    this.isAtHome = true;
    this.isDragging = false;

    // ===== LIFECYCLE =====
    this.isActive = true;
    this.pooled = false;

    // ===== CALLBACKS =====
    this.onAnimationComplete = null;
    this.onArriveAtHome = null;
    this.onFlipComplete = null;
  }

  /**
   * Update card state based on current animation mode
   * @param {number} deltaTime - Time elapsed in seconds
   */
  update(deltaTime) {
    const zBefore = this.z;

    switch (this.animationMode) {
      case 'physics':
        this.updatePhysics(deltaTime);
        break;
      case 'tween':
        this.updateTween(deltaTime);
        break;
      case 'spring':
        this.updateSpring(deltaTime);
        break;
      case 'idle':
        // No updates needed
        break;
    }

    // Always update face-up animation (independent of main animation mode)
    this.updateFaceAnimation(deltaTime);

    // Always update opacity
    this.updateOpacity(deltaTime);

    // Always update scale (for hover animations)
    this.updateScale(deltaTime);
  }

  /**
   * Physics mode: velocity-based movement with acceleration and damping
   */
  updatePhysics(deltaTime) {
    // Update velocities based on acceleration
    this.vx += this.ax * deltaTime;
    this.vy += this.ay * deltaTime;
    this.vz += this.az * deltaTime;

    // Apply damping
    const dampFactor = Math.pow(this.physicsDamping, deltaTime);
    this.vx *= dampFactor;
    this.vy *= dampFactor;
    this.vz *= dampFactor;

    // Update positions
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.z += this.vz * deltaTime;

    // Ensure Z never goes below 0
    if (this.z < 0) {
      this.z = 0;
      this.vz = 0;
      this.az = 0;
    }

    // Update rotation
    this.rotation += this.rotationVelocity * deltaTime;

    // Check if settled (very low velocity)
    const velocityThreshold = 1.0;
    if (Math.abs(this.vx) < velocityThreshold &&
        Math.abs(this.vy) < velocityThreshold &&
        Math.abs(this.vz) < velocityThreshold) {
      this.animationMode = 'idle';
      this.stop();
      if (this.onAnimationComplete) {
        this.onAnimationComplete();
        this.onAnimationComplete = null;
      }
    }
  }

  /**
   * Tween mode: deterministic interpolation to target
   */
  updateTween(deltaTime) {
    if (!this.tweenTarget || !this.tweenStart) return;

    // Update progress
    this.tweenProgress += (deltaTime * 1000) / this.tweenDuration; // Convert deltaTime to ms

    if (this.tweenProgress >= 1.0) {
      // Tween complete - snap to exact target
      this.tweenProgress = 1.0;
      if (this.tweenTarget.x !== undefined) this.x = this.tweenTarget.x;
      if (this.tweenTarget.y !== undefined) this.y = this.tweenTarget.y;
      if (this.tweenTarget.z !== undefined) this.z = Math.max(0, this.tweenTarget.z);
      if (this.tweenTarget.rotation !== undefined) this.rotation = this.tweenTarget.rotation;
      if (this.tweenTarget.scale !== undefined) this.scale = this.tweenTarget.scale;
      if (this.tweenTarget.faceUp !== undefined) this.targetFaceUp = this.tweenTarget.faceUp;

      // After animation completes, restore Z to the home position value for render layering
      // This preserves render layering from fan/arc layouts in trick piles
      if (this.homePosition) {
        this.z = this.homePosition.z || 0;
      }

      // Only restore render layer if not in a display zone (drawnCard, opponentPlayedCard)
      // These zones keep the card in animation layer between tweens
      if (this.homeZone !== 'drawnCard' && this.homeZone !== 'opponentPlayedCard') {
        this.renderLayer = this.homeRenderLayer;
        this.isDisplayAnimating = false;
      }

      // Complete
      this.animationMode = 'idle';
      this.tweenTarget = null;
      this.tweenStart = null;

      // Check if at home
      this.checkIfAtHome();

      if (this.onAnimationComplete) {
        this.onAnimationComplete();
        this.onAnimationComplete = null;
      }
    } else {
      // Interpolate
      const easingFunc = Easing[this.tweenEasing] || Easing.easeInOutQuad;
      const t = easingFunc(this.tweenProgress);

      // Use bezier curve for position if control point is provided
      if (this.tweenControlPoint) {
        // Quadratic bezier curve: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const t1 = 1 - t;
        const t1Sq = t1 * t1;
        const tSq = t * t;
        const t1t2 = 2 * t1 * t;

        if (this.tweenTarget.x !== undefined) {
          this.x = t1Sq * this.tweenStart.x + t1t2 * this.tweenControlPoint.x + tSq * this.tweenTarget.x;
        }
        if (this.tweenTarget.y !== undefined) {
          this.y = t1Sq * this.tweenStart.y + t1t2 * this.tweenControlPoint.y + tSq * this.tweenTarget.y;
        }
        if (this.tweenTarget.z !== undefined) {
          const controlZ = this.tweenControlPoint.z !== undefined ? this.tweenControlPoint.z : this.tweenStart.z;
          this.z = Math.max(0, t1Sq * this.tweenStart.z + t1t2 * controlZ + tSq * this.tweenTarget.z);
        }
      } else {
        // Linear interpolation for position
        if (this.tweenTarget.x !== undefined) {
          this.x = this.tweenStart.x + (this.tweenTarget.x - this.tweenStart.x) * t;
        }
        if (this.tweenTarget.y !== undefined) {
          this.y = this.tweenStart.y + (this.tweenTarget.y - this.tweenStart.y) * t;
        }
        if (this.tweenTarget.z !== undefined) {
          this.z = Math.max(0, this.tweenStart.z + (this.tweenTarget.z - this.tweenStart.z) * t);
        }
      }

      // Always use linear interpolation for rotation
      if (this.tweenTarget.rotation !== undefined) {
        this.rotation = this.tweenStart.rotation + (this.tweenTarget.rotation - this.tweenStart.rotation) * t;
      }

      // Scale: if peakScale is set, use parabolic curve; otherwise linear
      if (this.tweenPeakScale !== null) {
        // Parabolic curve: peaks at t=0.5
        // scale = start + peakAmount * (1 - (2*t - 1)^2)
        const parabolaT = 2 * t - 1; // Convert t from [0,1] to [-1,1]
        const scaleFactor = 1 - (parabolaT * parabolaT); // Parabola: 1 at t=0.5, 0 at t=0 and t=1
        this.scale = this.tweenStart.scale + this.tweenPeakScale * scaleFactor;
      } else if (this.tweenTarget.scale !== undefined) {
        this.scale = this.tweenStart.scale + (this.tweenTarget.scale - this.tweenStart.scale) * t;
      }

      // Use custom timing curve for faceUp based on flipTiming parameter
      if (this.tweenTarget.faceUp !== undefined) {
        let flipT = t;

        // Apply flip timing adjustment
        // flipTiming = 0: flip early (ease-out curve)
        // flipTiming = 0.5: linear flip (default)
        // flipTiming = 1: flip late (ease-in curve)
        if (this.tweenFlipTiming < 0.5) {
          // Early flip: use ease-out curve
          const strength = (0.5 - this.tweenFlipTiming) * 2; // 0 to 1
          flipT = 1 - Math.pow(1 - t, 1 + strength * 2);
        } else if (this.tweenFlipTiming > 0.5) {
          // Late flip: use ease-in curve
          const strength = (this.tweenFlipTiming - 0.5) * 2; // 0 to 1
          flipT = Math.pow(t, 1 + strength * 2);
        }

        // Set faceUp directly during tween (bypass spring animation for precise timing)
        this.faceUp = this.tweenStart.faceUp + (this.tweenTarget.faceUp - this.tweenStart.faceUp) * flipT;
        this.targetFaceUp = this.faceUp;
        this.faceUpVelocity = 0;
      }
    }
  }

  /**
   * Spring mode: pulled toward home position with spring physics
   */
  updateSpring(deltaTime) {
    if (!this.homePosition) {
      this.animationMode = 'idle';
      return;
    }

    // Calculate displacement from home
    const dx = this.homePosition.x - this.x;
    const dy = this.homePosition.y - this.y;
    const dz = (this.homePosition.z || 0) - this.z;

    // Apply spring force (Hooke's law)
    const forceX = dx * this.springStrength;
    const forceY = dy * this.springStrength;
    const forceZ = dz * this.springStrength;

    // Update velocity
    this.vx += forceX * deltaTime;
    this.vy += forceY * deltaTime;
    this.vz += forceZ * deltaTime;

    // Apply damping
    this.vx *= this.springDamping;
    this.vy *= this.springDamping;
    this.vz *= this.springDamping;

    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.z += this.vz * deltaTime;

    // Ensure Z never goes below 0
    if (this.z < 0) {
      this.z = 0;
      this.vz = 0;
    }

    // Check if arrived at home (within threshold and low velocity)
    const distanceThreshold = 2.0;
    const velocityThreshold = 5.0;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const velocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy + this.vz * this.vz);

    if (distance < distanceThreshold && velocity < velocityThreshold) {
      // Snap to home
      this.x = this.homePosition.x;
      this.y = this.homePosition.y;
      this.z = this.homePosition.z || 0;
      this.vx = 0;
      this.vy = 0;
      this.vz = 0;
      this.animationMode = 'idle';
      this.isAtHome = true;

      // Reset Z to 0 after animation completes
      this.z = 0;
      // Only restore render layer if not in a display zone (drawnCard, opponentPlayedCard)
      // These zones keep the card in animation layer between tweens
      if (this.homeZone !== 'drawnCard' && this.homeZone !== 'opponentPlayedCard') {
        this.renderLayer = this.homeRenderLayer;
        this.isDisplayAnimating = false;
      }

      if (this.onArriveAtHome) {
        this.onArriveAtHome();
        this.onArriveAtHome = null;
      }
    }
  }

  /**
   * Update face-up/down animation (smooth flip)
   */
  updateFaceAnimation(deltaTime) {
    const diff = this.targetFaceUp - this.faceUp;
    if (Math.abs(diff) > 0.01) {
      // Smooth transition using spring-like motion (8x faster than original)
      this.faceUpVelocity += diff * 70 * deltaTime;
      this.faceUpVelocity *= 0.8; // Damping
      this.faceUp += this.faceUpVelocity * deltaTime;

      // Clamp to valid range
      this.faceUp = Math.max(0, Math.min(1, this.faceUp));
    } else {
      this.faceUp = this.targetFaceUp;
      this.faceUpVelocity = 0;

      if (this.onFlipComplete && Math.abs(diff) < 0.01) {
        this.onFlipComplete();
        this.onFlipComplete = null;
      }
    }
  }

  /**
   * Update opacity (fade in/out)
   */
  updateOpacity(deltaTime) {
    const diff = this.targetOpacity - this.opacity;
    if (Math.abs(diff) > 0.01) {
      this.opacity += diff * 5 * deltaTime; // Fade speed
      this.opacity = Math.max(0, Math.min(1, this.opacity));
    } else {
      this.opacity = this.targetOpacity;
    }
  }

  /**
   * Update scale (for hover animations)
   */
  updateScale(deltaTime) {
    const diff = this.targetScale - this.scale;
    if (Math.abs(diff) > 0.001) {
      // Quick spring-like animation for hover effect
      this.scaleVelocity += diff * 70 * deltaTime;
      this.scaleVelocity *= 0.8; // Damping (matching flip animation)
      this.scale += this.scaleVelocity * deltaTime;

      // Clamp to reasonable range
      this.scale = Math.max(0.1, Math.min(3, this.scale));
    } else {
      this.scale = this.targetScale;
      this.scaleVelocity = 0;
    }
  }

  /**
   * Start tween animation to target
   * @param {Object} target - {x, y, z, rotation, scale, faceUp}
   * @param {number} duration - Duration in milliseconds
   * @param {string} easing - Easing function name
   * @param {Object} controlPoint - Optional {x, y, z} for curved path
   * @param {number} flipTiming - Optional 0-1 value controlling flip timing (0=early, 0.5=linear, 1=late)
   * @param {number} peakScale - Optional scale increase amount at animation midpoint (instead of linear scale tween)
   * @param {boolean} isDisplayAnimation - If true, elevates Z for lift effect (deck draw, etc.). If false, just positions card (default positioning behavior)
   */
  tweenTo(target, duration = 500, easing = 'easeInOutQuad', controlPoint = null, flipTiming = 0.5, peakScale = null, isDisplayAnimation = false) {
    this.animationMode = 'tween';
    this.tweenTarget = { ...target };
    // Only exclude Z if this is a display animation (deck draw, etc.)
    // If a control point is provided (trick pile arc), always include Z in interpolation
    if (isDisplayAnimation && !controlPoint) {
      this.tweenTarget.z = undefined;
    }
    this.tweenStart = {
      x: this.x,
      y: this.y,
      z: this.z,
      rotation: this.rotation,
      scale: this.scale,
      faceUp: this.faceUp
    };
    this.tweenControlPoint = controlPoint ? { ...controlPoint } : null;

    // Debug logging for trick pile captures with control point
    if (controlPoint && controlPoint.z) {
      debugLogger.log('animation', `Tween with control point Z=${controlPoint.z}`, {
        start: { z: this.tweenStart.z },
        control: { z: controlPoint.z },
        target: { z: this.tweenTarget.z }
      });
    }
    this.tweenFlipTiming = flipTiming;
    this.tweenPeakScale = peakScale;
    this.tweenDuration = duration;
    this.tweenProgress = 0;
    this.tweenEasing = easing;
    this.isAtHome = false;

    // Only raise Z for display animations (deck draw, match animations)
    // Never elevate hand zone cards - they should always stay at Z=0
    if (isDisplayAnimation && this.homeZone && !this.homeZone.includes('Hand')) {
      this.z = 100;
      // Save current render layer and elevate to ensure animated card renders on top
      this.homeRenderLayer = this.renderLayer;
      this.renderLayer = 10;
      // Flag that this is a display animation to preserve layer across zone changes
      this.isDisplayAnimating = true;
    }
  }

  /**
   * Start spring animation to home position
   */
  springToHome() {
    this.animationMode = 'spring';
    this.isAtHome = false;

    // Raise Z position to ensure animating card renders on top
    this.z = 100;
  }

  /**
   * Apply an impulse (instant velocity change) for physics mode
   */
  applyImpulse(vx, vy, vz) {
    this.vx += vx;
    this.vy += vy;
    this.vz += vz;
  }

  /**
   * Set acceleration for physics mode
   */
  setAcceleration(ax, ay, az) {
    this.ax = ax;
    this.ay = ay;
    this.az = az;
  }

  /**
   * Stop all movement
   */
  stop() {
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.ax = 0;
    this.ay = 0;
    this.az = 0;
    this.rotationVelocity = 0;
  }

  /**
   * Set face up state
   */
  setFaceUp(faceUp) {
    this.targetFaceUp = Math.max(0, Math.min(1, faceUp));
  }

  /**
   * Set hover state
   */
  setHovered(hovered) {
    this.isHovered = hovered;
    // Update target scale based on hover state
    this.targetScale = hovered ? this.baseScale * this.hoverScale : this.baseScale;
  }

  /**
   * Get scale factor with subtle Z-based lift effect
   * Scale is proportional to Z position: grows as card lifts off table
   * Only applies when card is in animation render layer (10)
   * At Z=0: scale = 1.0x
   * At Z=100: scale = 1.05x (5% larger)
   */
  getScale() {
    // Only apply lift scale when card is in animation layer (renderLayer = 10)
    // This ensures the lift effect is only visible during actual display animations
    // Field cards stay at renderLayer 0-2, so they never get scaled by z
    if (this.renderLayer === 10) {
      const liftScale = 1.0 + (this.z / 100) * 0.3;
      return this.scale * liftScale;
    }
    return this.scale;
  }

  /**
   * Check if card is animating
   */
  isAnimating() {
    if (this.animationMode !== 'idle') return true;
    if (Math.abs(this.targetFaceUp - this.faceUp) > 0.01) return true;
    if (Math.abs(this.targetOpacity - this.opacity) > 0.01) return true;
    return false;
  }

  /**
   * Check if card is at home position
   */
  checkIfAtHome() {
    if (!this.homePosition) {
      this.isAtHome = false;
      return;
    }

    const threshold = 1.0;
    const dx = Math.abs(this.x - this.homePosition.x);
    const dy = Math.abs(this.y - this.homePosition.y);
    const dz = Math.abs(this.z - (this.homePosition.z || 0));

    this.isAtHome = dx < threshold && dy < threshold && dz < threshold;
  }

  /**
   * Snap to home position immediately
   */
  snapToHome() {
    if (this.homePosition) {
      this.x = this.homePosition.x;
      this.y = this.homePosition.y;
      this.z = this.homePosition.z || 0;
      this.stop();
      this.animationMode = 'idle';
      this.isAtHome = true;
    }
  }

  /**
   * Reset card to initial state (for pooling)
   */
  reset(cardData) {
    this.cardData = cardData;
    this.id = cardData.id;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.ax = 0;
    this.ay = 0;
    this.az = 0;
    this.rotation = 0;
    this.rotationVelocity = 0;
    this.scale = 1.0;
    this.targetScale = 1.0;
    this.baseScale = 1.0;
    this.isHovered = false;
    this.faceUp = 0;
    this.targetFaceUp = 0;
    this.opacity = 1.0;
    this.targetOpacity = 1.0;
    this.homeZone = null;
    this.homePosition = { x: 0, y: 0, z: 0 };
    this.homeIndex = 0;
    this.animationMode = 'idle';
    this.isAtHome = true;
    this.isDragging = false;
    this.isActive = true;
    this.onAnimationComplete = null;
    this.onArriveAtHome = null;
    this.onFlipComplete = null;
  }
}
