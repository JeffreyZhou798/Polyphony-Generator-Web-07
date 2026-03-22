import type { INoteSequence } from '@magenta/music';

export interface GenerationConfig {
  voiceCount: 2 | 3 | 4;
  length: number;
  temperature: number;
  modelType: 'basic_rnn' | 'melody_rnn' | 'attention_rnn' | 'polyphony_rnn' | 'music_vae';
  musicStyle: 'classical' | 'pop' | 'jazz' | 'modern' | 'experimental';
  magentaWeight?: 1 | 2 | 3 | 4 | 5; // 遗留字段，向后兼容
  aiStyleWeight: number; // 新的AI风格权重：0-100%
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

export interface GenerationResult {
  originalMelody: INoteSequence;
  generatedVoices: INoteSequence[];
  combinedSequence: INoteSequence;
}

export interface GenerationProgress {
  stage: 'loading' | 'parsing' | 'generating' | 'validating' | 'building' | 'complete';
  progress: number;
  message: string;
}
