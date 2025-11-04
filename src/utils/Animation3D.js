/**
 * 3D Animation System
 *
 * A physics-based animation system where cards have X, Y, Z positions
 * with velocity and acceleration in all 3 dimensions.
 *
 * Z represents height from the board (never < 0) and affects scale.
 */

/**
 * Represents a card in 3D space with physics properties
 */
class Card3D {
    constructor(cardData, x = 0, y = 0, z = 0) {
        // Reference to the original card data
        this.cardData = cardData;

        // Position (Z is height from board, reflected by scale)
        this.x = x;
        this.y = y;
        this.z = Math.max(0, z); // Z never less than 0

        // Velocity
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;

        // Acceleration
        this.ax = 0;
        this.ay = 0;
        this.az = 0;

        // Face up/down state (0 = face down, 1 = face up)
        // Can be animated between these values
        this.faceUp = 0;
        this.targetFaceUp = 0;
        this.faceUpVelocity = 0;

        // Scale factor based on Z position
        // Higher Z = larger scale (closer to camera)
        this.baseScale = 1.0;

        // Rotation (for future use)
        this.rotation = 0;
        this.rotationVelocity = 0;
    }

    /**
     * Update position based on velocity and acceleration
     * @param {number} deltaTime - Time elapsed in seconds
     */
    update(deltaTime) {
        // Update velocities based on acceleration
        this.vx += this.ax * deltaTime;
        this.vy += this.ay * deltaTime;
        this.vz += this.az * deltaTime;

        // Update positions based on velocity
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.z += this.vz * deltaTime;

        // Ensure Z never goes below 0
        if (this.z < 0) {
            this.z = 0;
            this.vz = 0;
            this.az = 0;
        }

        // Update face up/down animation
        const faceUpDiff = this.targetFaceUp - this.faceUp;
        if (Math.abs(faceUpDiff) > 0.01) {
            // Smooth transition using spring-like motion
            this.faceUpVelocity += faceUpDiff * 10 * deltaTime;
            this.faceUpVelocity *= 0.8; // Damping
            this.faceUp += this.faceUpVelocity * deltaTime;

            // Clamp to valid range
            this.faceUp = Math.max(0, Math.min(1, this.faceUp));
        } else {
            this.faceUp = this.targetFaceUp;
            this.faceUpVelocity = 0;
        }

        // Update rotation
        this.rotation += this.rotationVelocity * deltaTime;
    }

    /**
     * Set the target position (for smooth interpolation)
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {number} z - Target Z position (height)
     * @param {number} speed - Speed of movement (pixels/second)
     */
    setTarget(x, y, z, speed = 500) {
        const dx = x - this.x;
        const dy = y - this.y;
        const dz = Math.max(0, z) - this.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > 0) {
            const time = distance / speed;
            this.vx = dx / time;
            this.vy = dy / time;
            this.vz = dz / time;
        }
    }

    /**
     * Apply an impulse (instant velocity change)
     * @param {number} vx - Velocity in X direction
     * @param {number} vy - Velocity in Y direction
     * @param {number} vz - Velocity in Z direction
     */
    applyImpulse(vx, vy, vz) {
        this.vx += vx;
        this.vy += vy;
        this.vz += vz;
    }

    /**
     * Set acceleration
     * @param {number} ax - Acceleration in X direction
     * @param {number} ay - Acceleration in Y direction
     * @param {number} az - Acceleration in Z direction
     */
    setAcceleration(ax, ay, az) {
        this.ax = ax;
        this.ay = ay;
        this.az = az;
    }

    /**
     * Apply friction/damping to slow down movement
     * @param {number} factor - Damping factor (0-1, where 1 = no damping)
     */
    applyDamping(factor = 0.95) {
        this.vx *= factor;
        this.vy *= factor;
        this.vz *= factor;
    }

    /**
     * Get the scale factor based on Z position
     * Cards higher up appear larger (closer to camera)
     * @returns {number} Scale factor
     */
    getScale() {
        // Z affects scale: higher Z = larger scale
        // Z = 0 -> scale = baseScale
        // Z = 100 -> scale = baseScale * 1.5
        const zScaleFactor = 1.0 + (this.z / 200);
        return this.baseScale * zScaleFactor;
    }

    /**
     * Set face up state (0 = down, 1 = up)
     * @param {number} faceUp - Target face up value (0-1)
     */
    setFaceUp(faceUp) {
        this.targetFaceUp = Math.max(0, Math.min(1, faceUp));
    }

    /**
     * Check if card is currently animating
     * @returns {boolean} True if card has significant velocity or is animating face state
     */
    isAnimating() {
        const velocityThreshold = 1.0;
        const faceUpThreshold = 0.01;

        return Math.abs(this.vx) > velocityThreshold ||
               Math.abs(this.vy) > velocityThreshold ||
               Math.abs(this.vz) > velocityThreshold ||
               Math.abs(this.targetFaceUp - this.faceUp) > faceUpThreshold;
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
}

/**
 * Manages all Card3D instances and handles animation updates
 */
class Animation3DManager {
    constructor() {
        this.cards = []; // Array of Card3D instances
        this.lastUpdateTime = performance.now();
    }

    /**
     * Initialize cards from game state
     * @param {Array} cardDataArray - Array of card data objects
     * @param {Object} layoutInfo - Initial layout positions
     */
    initializeCards(cardDataArray, layoutInfo = {}) {
        this.cards = [];

        cardDataArray.forEach((cardData, index) => {
            const x = layoutInfo.x || 0;
            const y = layoutInfo.y || 0;
            const z = layoutInfo.z || 0;

            const card3D = new Card3D(cardData, x, y, z);
            this.cards.push(card3D);
        });
    }

    /**
     * Add a new card to the system
     * @param {Object} cardData - Card data object
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} z - Initial Z position
     * @returns {Card3D} The created Card3D instance
     */
    addCard(cardData, x = 0, y = 0, z = 0) {
        const card3D = new Card3D(cardData, x, y, z);
        this.cards.push(card3D);
        return card3D;
    }

    /**
     * Remove a card from the system
     * @param {Card3D} card3D - The card to remove
     */
    removeCard(card3D) {
        const index = this.cards.indexOf(card3D);
        if (index !== -1) {
            this.cards.splice(index, 1);
        }
    }

    /**
     * Update all cards - call this in your game loop
     * @param {number} currentTime - Current time in milliseconds (from performance.now())
     */
    update(currentTime = performance.now()) {
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = currentTime;

        // Clamp delta time to prevent large jumps
        const clampedDeltaTime = Math.min(deltaTime, 0.1);

        // Update all cards
        this.cards.forEach(card => {
            card.update(clampedDeltaTime);
        });
    }

    /**
     * Get cards sorted by Z position (for rendering back to front)
     * @returns {Array<Card3D>} Sorted array of cards
     */
    getCardsSortedByZ() {
        return [...this.cards].sort((a, b) => a.z - b.z);
    }

    /**
     * Find a Card3D by its card data reference
     * @param {Object} cardData - The card data to find
     * @returns {Card3D|null} The found card or null
     */
    findCard(cardData) {
        return this.cards.find(card => card.cardData === cardData) || null;
    }

    /**
     * Check if any cards are currently animating
     * @returns {boolean} True if any card is animating
     */
    isAnyAnimating() {
        return this.cards.some(card => card.isAnimating());
    }

    /**
     * Stop all animations
     */
    stopAll() {
        this.cards.forEach(card => card.stop());
    }

    /**
     * Clear all cards
     */
    clear() {
        this.cards = [];
    }
}

export { Card3D, Animation3DManager };
