/**
 * AnimationSequence - Builds complex multi-stage animation sequences
 * Stores animation configurations that Game will execute
 */

import { debugLogger } from './DebugLogger.js';

export class AnimationSequence {
  constructor(name = 'Animation') {
    this.name = name;
    this.stages = [];
  }

  /**
   * Add a parallel animation stage (configs for animations that play simultaneously)
   */
  addParallelStage(animationConfigs, stageName = '') {
    this.stages.push({
      type: 'parallel',
      configs: animationConfigs,
      name: stageName
    });
    return this;
  }

  /**
   * Add a sequential animation stage (configs for animations that play one after another)
   */
  addSequentialStage(animationConfigs, stageName = '') {
    this.stages.push({
      type: 'sequential',
      configs: animationConfigs,
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
   * Get all stages
   */
  getStages() {
    return this.stages;
  }

  /**
   * Get sequence info
   */
  getInfo() {
    return {
      name: this.name,
      stageCount: this.stages.length,
      stages: this.stages.map(s => `${s.type}${s.name ? `: ${s.name}` : ''}`)
    };
  }
}
