/**
 * AnimationSequence - Manages complex multi-stage animation sequences
 * Supports parallel animations, sequential stages, delays, and event callbacks
 */

import { debugLogger } from './DebugLogger.js';

export class AnimationSequence {
  constructor(name = 'Animation') {
    this.name = name;
    this.stages = [];
    this.currentStageIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.onComplete = null;
    this.onStageComplete = null;
    this.currentAnimations = [];
  }

  /**
   * Add a parallel animation stage (multiple animations play simultaneously)
   */
  addParallelStage(animations, stageName = '') {
    this.stages.push({
      type: 'parallel',
      animations: animations,
      name: stageName
    });
    return this;
  }

  /**
   * Add a sequential animation stage (animations play one after another)
   */
  addSequentialStage(animations, stageName = '') {
    this.stages.push({
      type: 'sequential',
      animations: animations,
      name: stageName
    });
    return this;
  }

  /**
   * Add a delay stage
   */
  addDelay(durationMs, stageName = '') {
    this.stages.push({
      type: 'delay',
      duration: durationMs,
      name: stageName || `Delay ${durationMs}ms`
    });
    return this;
  }

  /**
   * Add an event callback stage (for sound hooks, etc.)
   */
  addEvent(eventName, data = {}, stageName = '') {
    this.stages.push({
      type: 'event',
      eventName: eventName,
      data: data,
      name: stageName || `Event: ${eventName}`
    });
    return this;
  }

  /**
   * Start playing the sequence
   */
  play(onComplete = null) {
    if (this.isPlaying) {
      debugLogger.logAnimationWarning('Animation sequence already playing', { name: this.name });
      return;
    }

    this.isPlaying = true;
    this.currentStageIndex = 0;
    this.onComplete = onComplete;

    debugLogger.log('animation', `▶️ Starting animation sequence: ${this.name}`, {
      stages: this.stages.length,
      types: this.stages.map(s => `${s.type}${s.name ? `: ${s.name}` : ''}`).join(' → ')
    });

    this.playNextStage();
  }

  /**
   * Play the next stage in the sequence
   */
  playNextStage() {
    if (!this.isPlaying || this.isPaused) return;

    if (this.currentStageIndex >= this.stages.length) {
      // Sequence complete
      this.complete();
      return;
    }

    const stage = this.stages[this.currentStageIndex];
    debugLogger.log('animation', `Playing stage ${this.currentStageIndex + 1}/${this.stages.length}: ${stage.type}`, {
      name: stage.name || 'unnamed'
    });

    switch (stage.type) {
      case 'parallel':
        this.playParallelStage(stage);
        break;
      case 'sequential':
        this.playSequentialStage(stage);
        break;
      case 'delay':
        this.playDelayStage(stage);
        break;
      case 'event':
        this.playEventStage(stage);
        break;
      default:
        debugLogger.logAnimationWarning('Unknown stage type', { type: stage.type });
        this.nextStage();
    }
  }

  /**
   * Play a parallel stage (all animations at once)
   */
  playParallelStage(stage) {
    this.currentAnimations = stage.animations;

    if (this.currentAnimations.length === 0) {
      this.nextStage();
      return;
    }

    let completedCount = 0;
    const totalCount = this.currentAnimations.length;

    this.currentAnimations.forEach((anim, index) => {
      const originalOnComplete = anim.onComplete;
      anim.onComplete = () => {
        if (originalOnComplete) originalOnComplete();
        completedCount++;

        if (completedCount === totalCount) {
          this.currentAnimations = [];
          this.nextStage();
        }
      };
    });
  }

  /**
   * Play a sequential stage (animations one after another)
   */
  playSequentialStage(stage) {
    this.currentAnimations = [...stage.animations];
    this.playNextSequentialAnimation();
  }

  /**
   * Play the next animation in a sequential stage
   */
  playNextSequentialAnimation() {
    if (this.currentAnimations.length === 0) {
      this.nextStage();
      return;
    }

    const anim = this.currentAnimations.shift();
    const originalOnComplete = anim.onComplete;

    anim.onComplete = () => {
      if (originalOnComplete) originalOnComplete();
      this.playNextSequentialAnimation();
    };
  }

  /**
   * Play a delay stage
   */
  playDelayStage(stage) {
    setTimeout(() => {
      if (this.isPlaying) {
        this.nextStage();
      }
    }, stage.duration);
  }

  /**
   * Play an event stage (fire callback immediately)
   */
  playEventStage(stage) {
    debugLogger.log('animation', `🔊 Animation Event: ${stage.eventName}`, stage.data);

    // Fire custom event for sound system to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hanafuda:animation', {
        detail: {
          event: stage.eventName,
          data: stage.data
        }
      }));
    }

    this.nextStage();
  }

  /**
   * Move to next stage
   */
  nextStage() {
    this.currentStageIndex++;
    if (this.onStageComplete) {
      this.onStageComplete(this.currentStageIndex - 1, this.stages[this.currentStageIndex - 1]);
    }
    this.playNextStage();
  }

  /**
   * Complete the sequence
   */
  complete() {
    debugLogger.log('animation', `✅ Animation sequence complete: ${this.name}`, null);
    this.isPlaying = false;
    this.currentStageIndex = 0;
    this.currentAnimations = [];

    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Pause the sequence
   */
  pause() {
    this.isPaused = true;
    debugLogger.log('animation', `⏸️ Paused sequence: ${this.name}`, null);
  }

  /**
   * Resume the sequence
   */
  resume() {
    this.isPaused = false;
    debugLogger.log('animation', `▶️ Resumed sequence: ${this.name}`, null);
    this.playNextStage();
  }

  /**
   * Stop the sequence
   */
  stop() {
    debugLogger.log('animation', `⏹️ Stopped sequence: ${this.name}`, null);
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStageIndex = 0;
    this.currentAnimations = [];
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      name: this.name,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentStage: this.currentStageIndex,
      totalStages: this.stages.length,
      progress: this.stages.length > 0 ? (this.currentStageIndex / this.stages.length) : 0
    };
  }
}
