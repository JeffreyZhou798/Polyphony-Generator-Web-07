import type { CounterpointNote } from './counterpointEngine';

export interface TimeSliceViolation {
  time: number;
  voice1Pitch: number;
  voice2Pitch: number;
  violationType: string;
  interval: number;
  note1: CounterpointNote;
  note2: CounterpointNote;
}

export class TimeSliceScanner {
  static checkCounterpoint(
    voice1: CounterpointNote[],
    voice2: CounterpointNote[]
  ): TimeSliceViolation[] {
    const violations: TimeSliceViolation[] = [];

    // 1. 收集所有关键时间点
    const allTimePoints = new Set<number>();
    voice1.forEach(n => {
      allTimePoints.add(n.startTime);
      allTimePoints.add(n.endTime);
    });
    voice2.forEach(n => {
      allTimePoints.add(n.startTime);
      allTimePoints.add(n.endTime);
    });

    // 2. 在每个时间点检查纵向和声关系
    const sortedTimes = Array.from(allTimePoints).sort((a, b) => a - b);
    for (const time of sortedTimes) {
      const activeNotes1 = voice1.filter(n => n.startTime <= time && time < n.endTime);
      const activeNotes2 = voice2.filter(n => n.startTime <= time && time < n.endTime);

      // 检查所有可能的音符组合
      for (const note1 of activeNotes1) {
        for (const note2 of activeNotes2) {
          const violation = this.checkHarmony(note1, note2, time, voice1, voice2);
          if (violation) {
            // 避免在不同时间切片重复记录同一个音符组合的相同违规
            const exists = violations.find(
              v => v.note1 === note1 && v.note2 === note2 && v.violationType === violation.violationType
            );
            if (!exists) {
              violations.push(violation);
            }
          }
        }
      }
    }

    return violations;
  }

  private static checkHarmony(
    note1: CounterpointNote,
    note2: CounterpointNote,
    time: number,
    voice1: CounterpointNote[],
    voice2: CounterpointNote[]
  ): TimeSliceViolation | null {
    const interval = Math.abs(note1.pitch - note2.pitch);

    // 检查声部交叉 (假设 note1 是下方声部, note2 是上方声部)
    if (note1.voiceId > note2.voiceId && note1.pitch > note2.pitch) {
      return {
        time,
        voice1Pitch: note1.pitch,
        voice2Pitch: note2.pitch,
        violationType: 'voice_crossing',
        interval,
        note1,
        note2
      };
    } else if (note1.voiceId < note2.voiceId && note1.pitch < note2.pitch) {
      return {
        time,
        voice1Pitch: note1.pitch,
        voice2Pitch: note2.pitch,
        violationType: 'voice_crossing',
        interval,
        note1,
        note2
      };
    }

    // 检查平行五度 (7半音)
    if (interval % 12 === 7 && this.isParallelInterval(7, interval, voice1, voice2, time, note1, note2)) {
      return {
        time,
        voice1Pitch: note1.pitch,
        voice2Pitch: note2.pitch,
        violationType: 'parallel_5th',
        interval,
        note1,
        note2
      };
    }

    // 检查平行八度 (0半音)
    if (interval % 12 === 0 && this.isParallelInterval(0, interval, voice1, voice2, time, note1, note2)) {
      return {
        time,
        voice1Pitch: note1.pitch,
        voice2Pitch: note2.pitch,
        violationType: 'parallel_8th',
        interval,
        note1,
        note2
      };
    }

    return null;
  }

  private static isParallelInterval(
    targetIntervalMod: number,
    currentInterval: number,
    voice1: CounterpointNote[],
    voice2: CounterpointNote[],
    currentTime: number,
    note1: CounterpointNote,
    note2: CounterpointNote
  ): boolean {
    if (currentInterval % 12 !== targetIntervalMod) return false;

    const prevTime = this.findPreviousTime(voice1, voice2, currentTime);
    if (prevTime === null) return false;

    const prevActive1 = voice1.filter(n => n.startTime <= prevTime && prevTime < n.endTime);
    const prevActive2 = voice2.filter(n => n.startTime <= prevTime && prevTime < n.endTime);

    if (prevActive1.length === 0 || prevActive2.length === 0) return false;

    const prevNote1 = prevActive1[0];
    const prevNote2 = prevActive2[0];
    
    // 如果是同一个长音延续，不是平行进行
    if (prevNote1 === note1 && prevNote2 === note2) return false;
    // 如果有一个声部保持不动，则是斜向进行，不是平行进行
    if (prevNote1.pitch === note1.pitch || prevNote2.pitch === note2.pitch) return false;

    const prevInterval = Math.abs(prevNote1.pitch - prevNote2.pitch);
    return prevInterval % 12 === targetIntervalMod;
  }

  private static findPreviousTime(
    voice1: CounterpointNote[],
    voice2: CounterpointNote[],
    currentTime: number
  ): number | null {
    const allTimes = new Set<number>();
    voice1.forEach(n => {
      if (n.startTime < currentTime) allTimes.add(n.startTime);
    });
    voice2.forEach(n => {
      if (n.startTime < currentTime) allTimes.add(n.startTime);
    });

    const sortedTimes = Array.from(allTimes).sort((a, b) => b - a);
    return sortedTimes.length > 0 ? sortedTimes[0] : null;
  }
}
