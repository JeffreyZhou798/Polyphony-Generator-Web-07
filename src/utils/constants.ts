export const MUSIC_STYLES = {
  CLASSICAL: 'classical',
  POP: 'pop',
  JAZZ: 'jazz',
  MODERN: 'modern',
  EXPERIMENTAL: 'experimental'
} as const;

export const MODEL_TYPES = {
  BASIC_RNN: 'basic_rnn',
  MELODY_RNN: 'melody_rnn',
  ATTENTION_RNN: 'attention_rnn',
  POLYPHONY_RNN: 'polyphony_rnn',
  MUSIC_VAE: 'music_vae'
} as const;

export const VOICE_COUNTS = [2, 3, 4] as const;

export const GENERATION_LENGTHS = [4, 8, 16, 32, 64] as const;

export const TEMPERATURE_RANGE = {
  MIN: 0.5,
  MAX: 2.0,
  DEFAULT: 1.0
} as const;

export const AI_STYLE_WEIGHT_RANGE = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50
} as const;

export const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

export const SUPPORTED_FORMATS = ['.musicxml', '.mxl'] as const;

export type MusicStyle = typeof MUSIC_STYLES[keyof typeof MUSIC_STYLES];
export type ModelType = typeof MODEL_TYPES[keyof typeof MODEL_TYPES];
export type VoiceCount = typeof VOICE_COUNTS[number];
export type GenerationLength = typeof GENERATION_LENGTHS[number];
