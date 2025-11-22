/**
 * AudioManager - Manages game audio and music
 */
export class AudioManager {
  constructor() {
    this.audio = {
      win: null,
      lose: null,
      snap: null
    };
    this.enabled = true;
    this.volume = 0.5;
    this.snapVolume = 0.7; // Slightly louder for snap sound effect
    this.currentMusic = null;
  }

  /**
   * Load audio files
   */
  async loadAudio() {
    try {
      // Create audio elements for win, lose, and snap sounds
      // Use Vite's BASE_URL to handle both local dev and GitHub Pages deployment
      const basePath = import.meta.env.BASE_URL;
      this.audio.win = new Audio(`${basePath}assets/audio/hanafuda-win.mp3`);
      this.audio.lose = new Audio(`${basePath}assets/audio/hanafuda-lose.mp3`);
      this.audio.snap = new Audio(`${basePath}assets/audio/hanafuda-snap.mp3`);

      // Set volume for music
      this.audio.win.volume = this.volume;
      this.audio.lose.volume = this.volume;

      // Set volume for snap (slightly louder)
      this.audio.snap.volume = this.snapVolume;

      // Preload audio files
      this.audio.win.preload = 'auto';
      this.audio.lose.preload = 'auto';
      this.audio.snap.preload = 'auto';

      console.log('🎵 Audio files loaded successfully');
    } catch (error) {
      console.warn('⚠️ Failed to load audio files:', error);
      console.warn('Place audio files in /public/assets/audio/:');
      console.warn('  - hanafuda-win.mp3');
      console.warn('  - hanafuda-lose.mp3');
      console.warn('  - hanafuda-snap.mp3');
    }
  }

  /**
   * Play winning music
   */
  playWinMusic() {
    if (!this.enabled || !this.audio.win) {
      return;
    }

    this.stopAll();
    this.currentMusic = this.audio.win;

    // Reset to beginning and play
    this.audio.win.currentTime = 0;
    this.audio.win.play().catch(err => {
      console.warn('Could not play win music:', err.message);
    });

    console.log('🎉 Playing win music');
  }

  /**
   * Play losing music
   */
  playLoseMusic() {
    if (!this.enabled || !this.audio.lose) {
      return;
    }

    this.stopAll();
    this.currentMusic = this.audio.lose;

    // Reset to beginning and play
    this.audio.lose.currentTime = 0;
    this.audio.lose.play().catch(err => {
      console.warn('Could not play lose music:', err.message);
    });

    console.log('😢 Playing lose music');
  }

  /**
   * Play snap sound effect (when cards match)
   */
  playSnapSound() {
    if (!this.enabled || !this.audio.snap) {
      return;
    }

    // Reset to beginning and play (don't stop music, just play the sound effect)
    this.audio.snap.currentTime = 0;
    this.audio.snap.play().catch(err => {
      console.warn('Could not play snap sound:', err.message);
    });

    console.log('📌 Playing snap sound');
  }

  /**
   * Stop all currently playing audio
   */
  stopAll() {
    Object.values(this.audio).forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    this.currentMusic = null;
  }

  /**
   * Fade out current music
   * @param {number} duration - Fade duration in milliseconds
   */
  fadeOut(duration = 500) {
    if (!this.currentMusic || this.currentMusic.paused) {
      return;
    }

    const startVolume = this.currentMusic.volume;
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
      this.currentMusic.volume = newVolume;

      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        this.stopAll();
        // Restore original volume for next play
        this.setVolume(this.volume);
      }
    }, stepTime);
  }

  /**
   * Set master volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.audio).forEach(audio => {
      if (audio) {
        audio.volume = this.volume;
      }
    });
  }

  /**
   * Enable or disable audio
   * @param {boolean} enabled - Whether audio is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * Check if audio is currently playing
   * @returns {boolean}
   */
  isPlaying() {
    return this.currentMusic && !this.currentMusic.paused;
  }
}
