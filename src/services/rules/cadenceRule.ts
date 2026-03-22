import type { INoteSequence } from '@magenta/music';
import type { Rule, RuleResult, RuleViolation } from './types';
import type { MusicStyle } from '../../utils/constants';

/**
 * 终止式规则
 * 检查终止式是否符合古典规范
 * 适用于古典风格
 */
export class CadenceRule implements Rule {
  name = 'CadenceRule';
  description = '检查终止式是否符合古典规范';
  styles: MusicStyle[] = ['classical'];
  strictness = 'strict' as const;
  priority = 90; // 高优先级

  check(sequence: INoteSequence): RuleResult {
    const violations: RuleViolation[] = [];
    
    if (!sequence.notes || sequence.notes.length < 8) {
      return { violations };
    }
    
    // 检查最后 4 拍的和声
    const lastNotes = sequence.notes.slice(-8);
    const timeSteps = this.groupNotesByTime(lastNotes);
    
    if (timeSteps.length < 2) {
      return { violations };
    }
    
    // 倒数第二个和弦应该是 V 或 viio
    const penultimateChord = timeSteps[timeSteps.length - 2];
    const finalChord = timeSteps[timeSteps.length - 1];
    
    const penultPitches = penultimateChord.map(n => n.pitch || 60);
    const finalPitches = finalChord.map(n => n.pitch || 60);
    
    const penultRoot = this.findChordRoot(penultPitches);
    const finalRoot = this.findChordRoot(finalPitches);
    
    // 检查是否是正格终止 (V-I) 或 变格终止 (IV-I) 或 阻碍终止 (V-vi)
    const isAuthentic = this.isDegree(penultRoot, 5) && this.isDegree(finalRoot, 0);
    const isPlagal = this.isDegree(penultRoot, 4) && this.isDegree(finalRoot, 0);
    const isDeceptive = this.isDegree(penultRoot, 5) && !this.isDegree(finalRoot, 0);
    
    if (!isAuthentic && !isPlagal && !isDeceptive) {
      violations.push({
        rule: this.name,
        message: `终止式不规范: ${penultRoot} → ${finalRoot}`,
        severity: 'warning',
        score: 0.6,
        details: {
          penultRoot,
          finalRoot,
          suggestion: '建议使用正格终止 (V-I)、变格终止 (IV-I) 或 阻碍终止 (V-vi)'
        }
      });
    }
    
    return { violations };
  }
  
  canFix(): boolean {
    return false; // 终止式不适合自动修正
  }
  
  private groupNotesByTime(notes: any[]): any[][] {
    const tolerance = 0.05;
    const sortedNotes = [...notes].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    const chords: any[][] = [];
    let currentChord: any[] = [];
    
    for (const note of sortedNotes) {
      if (currentChord.length === 0) {
        currentChord.push(note);
      } else {
        const timeDiff = Math.abs((note.startTime || 0) - (currentChord[0].startTime || 0));
        
        if (timeDiff <= tolerance) {
          currentChord.push(note);
        } else {
          chords.push(currentChord);
          currentChord = [note];
        }
      }
    }
    
    if (currentChord.length > 0) {
      chords.push(currentChord);
    }
    
    return chords;
  }
  
  private findChordRoot(pitches: number[]): number {
    const pitchClasses = pitches.map(p => p % 12);
    const tonic = 0; // 假设 C 大调
    
    // 计算每个音级的出现次数
    const degreeCounts = pitchClasses.reduce((acc, pc) => {
      const degree = (pc - tonic + 12) % 12;
      const degreeIndex = [0, 2, 4, 5, 7, 9, 11].findIndex(d => d === degree);
      if (degreeIndex >= 0) {
        acc[degreeIndex] = (acc[degreeIndex] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);
    
    // 返回出现次数最多的音级
    let maxCount = 0;
    let maxDegree = 0;
    for (const [degree, count] of Object.entries(degreeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxDegree = parseInt(degree);
      }
    }
    
    // 根据音级返回根音
    const scale = [0, 2, 4, 5, 7, 9, 11];
    return scale[maxDegree];
  }
  
  private isDegree(pitch: number, degree: number): boolean {
    const tonic = 0;
    const scale = [0, 2, 4, 5, 7, 9, 11];
    const degreePitches = scale.map(d => (d + tonic) % 12);
    return degreePitches.includes(pitch % 12);
  }
}
