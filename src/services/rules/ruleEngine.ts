import type { INoteSequence } from '@magenta/music';
import type { MusicStyle } from '../../utils/constants';
import type { Rule, ValidationResult, RuleViolation } from './types';
import { VoiceRangeRule } from './voiceRangeRule';
import { HarmonyRule } from './harmonyRule';
import { VoiceLeadingRule } from './voiceLeadingRule';
import { ParallelFifthsRule } from './parallelFifthsRule';
import { ParallelOctavesRule } from './parallelOctavesRule';
import { VoiceCrossingRule } from './voiceCrossingRule';
import { CadenceRule } from './cadenceRule';
import { MusicWeightCalculator } from '../musicTheory/weightCalculator';

/**
 * 音乐规则引擎
 * 根据音乐风格和AI权重动态应用不同的规则
 */
export class MusicRuleEngine {
  private rules: Rule[];
  private aiStyleWeight: number = 50; // 默认50%

  constructor(style: MusicStyle = 'classical') {
    this.rules = this.loadRulesForStyle(style);
  }

  setStyle(style: MusicStyle): void {
    this.rules = this.loadRulesForStyle(style);
  }
  
  setAIStyleWeight(weight: number): void {
    this.aiStyleWeight = Math.max(0, Math.min(100, weight));
  }

  /**
   * 根据音乐风格加载相应的规则
   */
  private loadRulesForStyle(style: MusicStyle): Rule[] {
    const baseRules: Rule[] = [
      new VoiceRangeRule(),
      new VoiceLeadingRule()
    ];

    switch (style) {
      case 'classical':
        // 古典复调：严格遵循和声规则
        return [
          ...baseRules,
          new HarmonyRule(),
          new ParallelFifthsRule(),
          new ParallelOctavesRule(),
          new VoiceCrossingRule(),
          new CadenceRule() // 新增终止式规则
        ];

      case 'pop':
        // 流行音乐：允许更自由的声部进行
        return [
          ...baseRules,
          new HarmonyRule()
        ];

      case 'jazz':
        // 爵士音乐：最宽松，仅基本规则
        return [
          ...baseRules
        ];

      case 'modern':
        // 现代风格：中等严格度
        return [
          ...baseRules,
          new HarmonyRule(),
          new VoiceCrossingRule()
        ];

      default:
        return baseRules;
    }
  }

  /**
   * 验证序列是否符合所有规则
   * 使用动态规则权重和AI风格权重
   */
  validate(sequence: INoteSequence): ValidationResult {
    const allViolations: RuleViolation[] = [];
    
    // 应用所有规则
    this.rules.forEach(rule => {
      // 计算规则应用概率
      const isHardRule = MusicWeightCalculator.isHardRule(rule.name);
      const applyProbability = MusicWeightCalculator.getRuleApplicationProbabilityWithProtection(
        rule.name,
        this.aiStyleWeight
      );
      
      // 根据概率决定是否应用规则
      if (Math.random() < applyProbability || isHardRule) {
        const result = rule.check(sequence);
        
        // 根据AI权重调整违规严重程度
        const magentaRetention = MusicWeightCalculator.calculateMagentaRetention(
          this.aiStyleWeight,
          'moderate'
        );
        
        const weightedViolations = result.violations.map(v => {
          // 使用软规则应用方法计算调整后的分数
          const adjustedScore = MusicWeightCalculator.applySoftRule(
            v.score, // 规则分数
            v.score * magentaRetention, // Magenta保留分数
            100 - this.aiStyleWeight, // 规则权重
            this.aiStyleWeight // Magenta权重
          );
          
          // 只有严重违规才保留为 error，其他转为 warning
          return {
            ...v,
            score: adjustedScore,
            severity: adjustedScore > 0.7 ? v.severity : 'warning'
          };
        });
        
        allViolations.push(...weightedViolations);
      }
    });

    // 分类违规
    const errors = allViolations.filter(v => v.severity === 'error');
    const warnings = allViolations.filter(v => v.severity === 'warning');

    return {
      valid: errors.length === 0, // 只关注严重错误
      violations: allViolations,
      warnings,
      errors
    };
  }

  /**
   * 自动修正序列中的问题
   * 使用AI风格权重决定是否应用修正
   */
  fix(sequence: INoteSequence): INoteSequence {
    let fixedSequence = { ...sequence };
    let maxFixes = 3; // 最多修正 3 次
    let fixCount = 0;
    
    // 按优先级排序规则（优先级高的先修正）
    const priorityRules = this.rules
      .filter(r => r.canFix() && r.fix)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const rule of priorityRules) {
      if (fixCount >= maxFixes) break; // 达到最大修正次数
      
      // 使用 shouldApplyHardRule 决定是否应用硬规则修正
      const shouldApply = MusicWeightCalculator.shouldApplyHardRule(rule.name, this.aiStyleWeight);
      
      if (shouldApply) {
        const result = rule.check(fixedSequence);
        
        // 只修正严重违规
        const severeViolations = result.violations.filter(v => v.score > 0.7);
        
        if (severeViolations.length > 0) {
          fixedSequence = rule.fix(fixedSequence);
          fixCount++;
          console.log(`应用修正 ${fixCount}/${maxFixes}: ${rule.name}`);
        }
      }
    }
    
    return fixedSequence;
  }

  /**
   * 获取当前激活的规则描述
   */
  getRulesDescription(): string[] {
    return this.rules.map(rule => `${rule.name}: ${rule.description}`);
  }

  /**
   * 获取规则统计信息
   */
  getRulesStats(): { total: number; strict: number; moderate: number; loose: number } {
    return {
      total: this.rules.length,
      strict: this.rules.filter(r => r.strictness === 'strict').length,
      moderate: this.rules.filter(r => r.strictness === 'moderate').length,
      loose: this.rules.filter(r => r.strictness === 'loose').length
    };
  }
}

export const musicRuleEngine = new MusicRuleEngine();
