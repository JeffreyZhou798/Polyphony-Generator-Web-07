import {
  CompleteMusicDimensions,
  GenerationConfig,
  PitchDimensions,
  RhythmDimensions,
  HarmonyDimensions,
  IntervalDimensions,
  MelodyProfileDimensions,
  TextureDimensions,
  VoiceLeadingDimensions
} from './types';

export class MusicWeightCalculator {
  static calculateAllDimensions(config: GenerationConfig): CompleteMusicDimensions {
    const baseWeight = config.aiStyleWeight;
    
    return {
      pitch: this.calculatePitchDimensions(baseWeight, config.dimensionWeights?.pitch),
      rhythm: this.calculateRhythmDimensions(baseWeight, config.dimensionWeights?.rhythm),
      harmony: this.calculateHarmonyDimensions(baseWeight, config.dimensionWeights?.harmony),
      interval: this.calculateIntervalDimensions(baseWeight, config.dimensionWeights?.interval),
      melodyProfile: this.calculateMelodyProfileDimensions(baseWeight, config.dimensionWeights?.melodyProfile),
      texture: this.calculateTextureDimensions(baseWeight, config.dimensionWeights?.texture),
      voiceLeading: this.calculateVoiceLeadingDimensions(baseWeight, config.dimensionWeights?.voiceLeading)
    };
  }

  private static calculatePitchDimensions(baseWeight: number, offset?: number): PitchDimensions {
    const weight = this.applyOffset(baseWeight, offset);
    return {
      pitchSelectionWeight: this.splitWeight(weight),
      pitchRangeWeight: this.splitWeight(weight),
      pitchVariationWeight: this.splitWeight(weight),
      velocityWeight: this.splitWeight(weight)
    };
  }

  private static calculateRhythmDimensions(baseWeight: number, offset?: number): RhythmDimensions {
    const weight = this.applyOffset(baseWeight, offset);
    return {
      patternWeight: this.splitWeight(weight),
      densityWeight: this.splitWeight(weight),
      freedomWeight: this.splitWeight(weight),
      syncopationWeight: this.splitWeight(weight)
    };
  }

  private static calculateHarmonyDimensions(baseWeight: number, offset?: number): HarmonyDimensions {
    const weight = this.applyOffset(baseWeight, offset);
    return {
      progressionWeight: this.splitWeight(weight),
      harmonicRhythmWeight: this.splitWeight(weight),
      tensionWeight: this.splitWeight(weight),
      nonHarmonicWeight: this.splitWeight(weight)
    };
  }

  private static calculateIntervalDimensions(baseWeight: number, offset?: number): IntervalDimensions {
    const weight = this.applyOffset(baseWeight, offset);
    return {
      intervalSelectionWeight: this.splitWeight(weight),
      intervalProgressionWeight: this.splitWeight(weight),
      intervalTensionWeight: this.splitWeight(weight),
      intervalContinuityWeight: this.splitWeight(weight)
    };
  }

  private static calculateMelodyProfileDimensions(baseWeight: number, offset?: number): MelodyProfileDimensions {
    const weight = this.applyOffset(baseWeight, offset);
    return {
      contourWeight: this.splitWeight(weight),
      ornamentationWeight: this.splitWeight(weight),
      repetitionWeight: this.splitWeight(weight),
      motivicWeight: this.splitWeight(weight)
    };
  }

  private static calculateTextureDimensions(baseWeight: number, offset?: number): TextureDimensions {
    const weight = this.applyOffset(baseWeight, offset);
    return {
      voiceRelationshipWeight: this.splitWeight(weight),
      voiceCrossingWeight: this.splitWeight(weight),
      voiceDensityWeight: this.splitWeight(weight),
      counterpointWeight: this.splitWeight(weight)
    };
  }

  private static calculateVoiceLeadingDimensions(baseWeight: number, offset?: number): VoiceLeadingDimensions {
    const weight = this.applyOffset(baseWeight, offset);
    return {
      voiceLineWeight: this.splitWeight(weight),
      voiceIndependenceWeight: this.splitWeight(weight),
      voiceInterweavingWeight: this.splitWeight(weight),
      voiceDominanceWeight: this.splitWeight(weight)
    };
  }

  private static splitWeight(totalWeight: number): { magenta: number; rules: number } {
    return {
      magenta: totalWeight,
      rules: 100 - totalWeight
    };
  }

  private static applyOffset(baseWeight: number, offset?: number): number {
    if (offset === undefined) return baseWeight;
    const adjusted = baseWeight + offset;
    return Math.max(0, Math.min(100, adjusted));
  }

  static calculateRuleApplicationProbability(
    rulesWeight: number,
    isStrongBeat: boolean,
    strictness: string
  ): number {
    const baseProbability = rulesWeight / 100;
    const strictnessMultiplier: Record<string, number> = {
      'very-strict': 2.0,
      'strict': 1.5,
      'moderate': 1.0,
      'relaxed': 0.7,
      'very-relaxed': 0.4
    };
    const s = strictnessMultiplier[strictness] || 1.0;
    const beatMultiplier = isStrongBeat ? 1.3 : 0.8;
    return Math.min(1, Math.max(0, baseProbability * s * beatMultiplier));
  }

  static calculateMagentaRetention(
    magentaWeight: number,
    strictness: string
  ): number {
    const baseRetention = magentaWeight / 100;
    const strictnessMultiplier: Record<string, number> = {
      'very-strict': 0.3,
      'strict': 0.5,
      'moderate': 0.7,
      'relaxed': 0.85,
      'very-relaxed': 0.95
    };
    const s = strictnessMultiplier[strictness] || 0.7;
    return Math.min(1, baseRetention * s);
  }

  static shouldApplyHardRule(ruleName: string, aiStyleWeight: number): boolean {
    const minStrictness = this.getMinStrictnessForRule(ruleName);
    const probabilityToIgnore = aiStyleWeight / 100;
    const actualIgnoreProbability = Math.max(probabilityToIgnore, 1 - minStrictness);
    return Math.random() > actualIgnoreProbability;
  }

  static getRuleApplicationProbabilityWithProtection(
    ruleName: string,
    aiStyleWeight: number
  ): number {
    const minStrictness = this.getMinStrictnessForRule(ruleName);
    const probabilityToIgnore = aiStyleWeight / 100;
    let applyProbability = 1 - probabilityToIgnore;
    return Math.max(applyProbability, minStrictness);
  }

  static applySoftRule(
    ruleValue: number,
    magentaValue: number,
    ruleWeight: number,
    magentaWeight: number
  ): number {
    const totalWeight = ruleWeight + magentaWeight;
    if (totalWeight === 0) return ruleValue;
    return (ruleValue * ruleWeight + magentaValue * magentaWeight) / totalWeight;
  }

  static getMinStrictnessForRule(ruleName: string): number {
    const strictnessMap: Record<string, number> = {
      'parallel_5th': 0.3,
      'parallel_8th': 0.3,
      'voice_crossing': 0.5,
      'direct_5th': 0.4,
      'dissonance': 0.6,
      'large_leap': 0.2,
      'max_distance': 0.2
    };
    return strictnessMap[ruleName] || 0.2;
  }

  static isHardRule(ruleName: string): boolean {
    const hardRules = [
      'parallel_5th', 'parallel_8th',
      'voice_crossing',
      'direct_5th', 'direct_8th',
      'hidden_5th', 'hidden_8th',
      'unresolved_dissonance'
    ];
    return hardRules.includes(ruleName);
  }
}
