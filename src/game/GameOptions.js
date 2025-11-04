/**
 * GameOptions - Manages game configuration and localStorage persistence
 */

export class GameOptions {
  constructor() {
    this.storageKey = 'hanafuda_options';
    this.defaults = {
      // Koi-Koi Rules
      koikoiEnabled: true,
      multiplierMode: '2x',              // '2x' or 'cumulative' (2x→3x→4x)
      autoDouble7Plus: true,
      bothPlayersScore: false,           // false = winner-take-all (traditional), true = both score

      // Yaku Rules
      viewingSakeMode: 'always',         // 'always', 'never', 'requireOther'
      moonViewingSakeMode: 'always',     // 'always', 'never', 'requireOther'

      // Game Variations
      bombVariationEnabled: false,       // Enable bomb variation (multi-card play)

      // UI Settings
      helpMode: false,                    // Help highlighting
      tutorialShown: false,               // Has user seen tutorial bubble?
      animationsEnabled: true,            // Enable/disable card animations
      cardHueShift: 0,                    // Hue shift for cards in degrees (0-360)

      // Experimental Features
      experimental3DAnimations: false     // Enable experimental 3D animation system
    };

    this.options = this.load();
  }

  /**
   * Load options from localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new options
        return { ...this.defaults, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    }
    return { ...this.defaults };
  }

  /**
   * Save options to localStorage
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.options));
      return true;
    } catch (error) {
      console.error('Failed to save options:', error);
      return false;
    }
  }

  /**
   * Get a specific option value
   */
  get(key) {
    return this.options[key];
  }

  /**
   * Set a specific option value and save
   */
  set(key, value) {
    this.options[key] = value;
    this.save();
  }

  /**
   * Update multiple options at once
   */
  update(updates) {
    Object.assign(this.options, updates);
    this.save();
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.options = { ...this.defaults };
    this.save();
  }

  /**
   * Get all options
   */
  getAll() {
    return { ...this.options };
  }

  /**
   * Mark tutorial as shown
   */
  markTutorialShown() {
    this.set('tutorialShown', true);
  }

  /**
   * Check if this is first time user
   */
  isFirstTime() {
    return !this.get('tutorialShown');
  }
}
