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

      // Yaku Rules
      viewingSakeMode: 'always',         // 'always', 'never', 'requireOther'
      moonViewingSakeMode: 'always',     // 'always', 'never', 'requireOther'

      // Game Settings
      defaultRounds: 6,                   // 1, 3, 6, or 12

      // UI Settings
      helpMode: false,                    // Help highlighting
      tutorialShown: false                // Has user seen tutorial bubble?
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
