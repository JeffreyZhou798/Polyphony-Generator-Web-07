export interface PitchDimensions {
  pitchSelectionWeight: { magenta: number; rules: number; };
  pitchRangeWeight: { magenta: number; rules: number; };
  pitchVariationWeight: { magenta: number; rules: number; };
  velocityWeight: { magenta: number; rules: number; };
}

export interface RhythmDimensions {
  patternWeight: { magenta: number; rules: number; };
  densityWeight: { magenta: number; rules: number; };
  freedomWeight: { magenta: number; rules: number; };
  syncopationWeight: { magenta: number; rules: number; };
}

export interface HarmonyDimensions {
  progressionWeight: { magenta: number; rules: number; };
  harmonicRhythmWeight: { magenta: number; rules: number; };
  tensionWeight: { magenta: number; rules: number; };
  nonHarmonicWeight: { magenta: number; rules: number; };
}

export interface IntervalDimensions {
  intervalSelectionWeight: { magenta: number; rules: number; };
  intervalProgressionWeight: { magenta: number; rules: number; };
  intervalTensionWeight: { magenta: number; rules: number; };
  intervalContinuityWeight: { magenta: number; rules: number; };
}

export interface MelodyProfileDimensions {
  contourWeight: { magenta: number; rules: number; };
  ornamentationWeight: { magenta: number; rules: number; };
  repetitionWeight: { magenta: number; rules: number; };
  motivicWeight: { magenta: number; rules: number; };
}

export interface TextureDimensions {
  voiceRelationshipWeight: { magenta: number; rules: number; };
  voiceCrossingWeight: { magenta: number; rules: number; };
  voiceDensityWeight: { magenta: number; rules: number; };
  counterpointWeight: { magenta: number; rules: number; };
}

export interface VoiceLeadingDimensions {
  voiceLineWeight: { magenta: number; rules: number; };
  voiceIndependenceWeight: { magenta: number; rules: number; };
  voiceInterweavingWeight: { magenta: number; rules: number; };
  voiceDominanceWeight: { magenta: number; rules: number; };
}

export interface CompleteMusicDimensions {
  pitch: PitchDimensions;
  rhythm: RhythmDimensions;
  harmony: HarmonyDimensions;
  interval: IntervalDimensions;
  melodyProfile: MelodyProfileDimensions;
  texture: TextureDimensions;
  voiceLeading: VoiceLeadingDimensions;
}

export interface GenerationConfig {
  musicStyle: 'classical' | 'jazz' | 'pop' | 'modern';
  voiceCount: number;
  modelType: 'basic_rnn' | 'melody_rnn' | 'attention_rnn' | 'polyphony_rnn' | 'music_vae';
  temperature: number;           // Creativity: 0.5-2.0
  aiStyleWeight: number;         // AI权重: 0-100
  length: number;
  dimensionWeights?: {
    pitch?: number;
    rhythm?: number;
    harmony?: number;
    interval?: number;
    melodyProfile?: number;
    texture?: number;
    voiceLeading?: number;
  };
}
