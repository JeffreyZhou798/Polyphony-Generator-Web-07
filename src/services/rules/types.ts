import type { INoteSequence } from '@magenta/music';
import type { MusicStyle } from '../../utils/constants';

export interface RuleViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  score: number; // 违规程度得分 (0-1)
  time?: number;
  voice1?: number;
  voice2?: number;
  details?: any;
}

export interface RuleResult {
  violations: RuleViolation[];
}

export interface Rule {
  name: string;
  description: string;
  styles: MusicStyle[];
  strictness: 'strict' | 'moderate' | 'loose';
  priority?: number; // 规则优先级
  check(sequence: INoteSequence): RuleResult;
  canFix(): boolean;
  fix?(sequence: INoteSequence): INoteSequence;
}

export interface ValidationResult {
  valid: boolean;
  violations: RuleViolation[];
  warnings: RuleViolation[];
  errors: RuleViolation[];
}
