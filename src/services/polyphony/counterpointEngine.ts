import type { INoteSequence } from '@magenta/music';
import { modelLoader } from '../magenta/modelLoader';
import type { GenerationConfig } from '../magenta/types';
import { MusicWeightCalculator } from '../musicTheory/weightCalculator';
import { TimeSliceScanner, type TimeSliceViolation } from './timeSliceScanner';
import { musicRuleEngine } from '../rules/ruleEngine';

export interface CounterpointNote {
  pitch: number;
  startTime: number;
  endTime: number;
  velocity: number;
  voiceId: number;
  isStrongBeat?: boolean;
  originalNote?: any;
  crossesMeasure?: boolean;
  isOriginal?: boolean;  // 标记为原始音符，绝对不修改
  originalEndTime?: number;  // 保存原始结束时间
}

/**
 * 对位复调生成引擎
 * 1. 先在重拍上建立和声框架（检查和弦级数）
 * 2. 然后在弱拍上添加变奏和装饰
 */
export class CounterpointEngine {
  private voiceRanges = {
    soprano: { min: 60, max: 81 },
    alto: { min: 55, max: 74 },
    tenor: { min: 48, max: 67 },
    bass: { min: 40, max: 60 }
  };

  private majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

  private chordDefinitions = {
    I: { root: 0, third: 4, fifth: 7 },
    ii: { root: 2, third: 5, fifth: 9 },
    iii: { root: 4, third: 7, fifth: 11 },
    IV: { root: 5, third: 9, fifth: 0 },
    V: { root: 7, third: 11, fifth: 2 },
    vi: { root: 9, third: 0, fifth: 4 },
    viio: { root: 11, third: 2, fifth: 5 }
  };

  async generateCounterpoint(
    cantusFirmus: INoteSequence,
    config: GenerationConfig
  ): Promise<INoteSequence> {
    console.log('=== 开始生成对位复调 ===');
    console.log('步骤0: 计算音乐维度权重...');
    
    // 计算所有维度的权重
    const dimensions = MusicWeightCalculator.calculateAllDimensions(config as any);
    console.log('AI风格权重:', config.aiStyleWeight);
    console.log('维度权重:', config.dimensionWeights);
    console.log('计算结果:', dimensions);
    
    console.log('步骤1: 分析原始旋律结构');

    const sopranoNotes: CounterpointNote[] = this.analyzeAndMarkBeats(
      cantusFirmus.notes || []
    );

    console.log(`Soprano: ${sopranoNotes.length} 个音符，${sopranoNotes.filter(n => n.isStrongBeat).length} 个重拍`);

    const allNotes: CounterpointNote[] = [...sopranoNotes];

    const voiceNames = ['alto', 'tenor', 'bass'];
    const voicesToGenerate = Math.min(config.voiceCount - 1, 3);

    for (let i = 0; i < voicesToGenerate; i++) {
      const voiceId = i + 1;
      const voiceName = voiceNames[i] as 'alto' | 'tenor' | 'bass';
      
      console.log(`\n步骤${i + 2}: 生成 ${voiceName} 声部`);
      
      console.log('  2.1 建立重拍和声框架...');
      const harmonicFramework = this.buildHarmonicFramework(
        sopranoNotes,
        voiceId,
        voiceName,
        config.musicStyle,
        dimensions,
        config.temperature
      );

      console.log(`  重拍框架: ${harmonicFramework.length} 个音符`);

      console.log('  2.2 使用 Magenta 生成变奏材料...');
      const variationSequence = await this.generateVariationMaterial(
        cantusFirmus,
        config,
        i,
        dimensions
      );

      console.log(`  Magenta 生成: ${(variationSequence.notes || []).length} 个音符`);

      console.log('  2.3 在弱拍上添加变奏...');
      const completeVoice = this.addVariationsToFramework(
        harmonicFramework,
        variationSequence,  // ✅ 传递完整序列
        sopranoNotes,
        voiceId,
        voiceName,
        config.musicStyle,
        dimensions,
        config.temperature
      );

      console.log(`  完整声部: ${completeVoice.length} 个音符`);

      allNotes.push(...completeVoice);
    }

    const finalSequence = this.buildSequence(allNotes, cantusFirmus);
    
    // ✅ 使用规则引擎验证和修正（让规则引擎参与工作）
    console.log('\n步骤4: 规则引擎验证与修正...');
    musicRuleEngine.setStyle(config.musicStyle as any);
    musicRuleEngine.setAIStyleWeight(config.aiStyleWeight);
    
    const validationResult = musicRuleEngine.validate(finalSequence);
    console.log(`  规则验证: ${validationResult.valid ? '✅ 通过' : '⚠️ 需修正'}`);
    console.log(`  违规数: ${validationResult.violations.length}, 严重: ${validationResult.errors.length}, 警告: ${validationResult.warnings.length}`);
    
    // 如果有严重违规，使用规则引擎修正
    let correctedSequence = finalSequence;
    if (validationResult.errors.length > 0) {
      console.log('  使用规则引擎自动修正...');
      correctedSequence = musicRuleEngine.fix(finalSequence);
    }
    
    console.log('=== 对位复调生成完成 ===');
    console.log('总音符数:', allNotes.length);
    console.log(`AI参与度: ${config.aiStyleWeight}%, 规则参与度: ${100 - config.aiStyleWeight}%`);
    
    // 使用 TimeSliceScanner 检查复调违规
    console.log('\n步骤5: 检查复调规则违规...');
    const violations = this.checkAllVoicePairs(allNotes);
    
    if (violations.length > 0) {
      console.log(`⚠️  发现 ${violations.length} 个违规:`);
      violations.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.violationType} at time ${v.time.toFixed(2)}s, interval: ${v.interval}`);
      });
    } else {
      console.log('✅ 未发现复调规则违规');
    }

    return correctedSequence;
  }
  
  private checkAllVoicePairs(allNotes: CounterpointNote[]): TimeSliceViolation[] {
    const allViolations: TimeSliceViolation[] = [];
    
    // 按 voiceId 分组
    const notesByVoice = new Map<number, CounterpointNote[]>();
    allNotes.forEach(note => {
      if (!notesByVoice.has(note.voiceId)) {
        notesByVoice.set(note.voiceId, []);
      }
      notesByVoice.get(note.voiceId)!.push(note);
    });
    
    // 检查所有声部对的组合
    const voiceIds = Array.from(notesByVoice.keys()).sort((a, b) => a - b);
    for (let i = 0; i < voiceIds.length; i++) {
      for (let j = i + 1; j < voiceIds.length; j++) {
        const voice1 = notesByVoice.get(voiceIds[i])!;
        const voice2 = notesByVoice.get(voiceIds[j])!;
        
        const violations = TimeSliceScanner.checkCounterpoint(voice1, voice2);
        allViolations.push(...violations);
      }
    }
    
    return allViolations;
  }

  /**
   * P0 修复：原始旋律绝对不变
   * - 不分割跨小节音符
   * - 不量化时间
   * - 直接保留原始音符，只添加分析标记
   */
  private analyzeAndMarkBeats(notes: any[]): CounterpointNote[] {
    const beatsPerMeasure = 4.0;
    const beatDuration = 1.0;

    // 直接保留原始音符，不分割
    const processedNotes: CounterpointNote[] = [];
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const startTime = note.startTime || 0;
      
      // 保留原始 endTime
      let endTime = note.endTime;
      if (!endTime || endTime <= startTime) {
        if (i < notes.length - 1) {
          endTime = notes[i + 1].startTime || startTime + beatDuration;
        } else {
          endTime = startTime + beatDuration;
        }
      }
      
      // 判断强拍（仅用于分析，不影响原始音符）
      const beatPosition = (startTime % beatsPerMeasure) / beatDuration;
      const isStrongBeat = beatPosition < 0.1 || Math.abs(beatPosition - 2) < 0.1;

      // ✅ 关键修复：直接保留原始音符，不分割，添加 isOriginal 标记
      processedNotes.push({
        pitch: note.pitch || 60,
        startTime,   // 保留原始 startTime
        endTime,     // 保留原始 endTime
        velocity: note.velocity || 80,
        voiceId: 0,
        isStrongBeat,
        originalNote: note,      // 保留原始引用
        isOriginal: true,        // 标记为原始音符
        originalEndTime: endTime // 保存原始结束时间
      });
    }
    
    console.log('  原始旋律保护: 不分割、不量化、直接保留');
    return processedNotes;
  }

  private buildHarmonicFramework(
    soprano: CounterpointNote[],
    voiceId: number,
    voiceType: 'alto' | 'tenor' | 'bass',
    style: string,
    dimensions: any,
    temperature: number
  ): CounterpointNote[] {
    const framework: CounterpointNote[] = [];
    const range = this.voiceRanges[voiceType];
    const strongBeats = soprano.filter(n => n.isStrongBeat);
    const beatsPerMeasure = 4.0;

    for (let i = 0; i < strongBeats.length; i++) {
      const sopranoNote = strongBeats[i];
      const chordDegree = this.determineChordDegree(i, strongBeats.length, style, temperature, dimensions);
      const chordTone = this.selectChordTone(sopranoNote.pitch, chordDegree, voiceType, i, dimensions);

      let pitch = chordTone;
      while (pitch < range.min) pitch += 12;
      while (pitch > range.max) pitch -= 12;
      if (pitch > sopranoNote.pitch) pitch -= 12;

      // 计算强拍音符的时长
      // 强拍音符只占据 1 拍，留出空间给变奏音符
      const nextStrongBeat = strongBeats[i + 1];
      const nextStartTime = nextStrongBeat ? nextStrongBeat.startTime : sopranoNote.startTime + beatsPerMeasure;
      const gapToNext = nextStartTime - sopranoNote.startTime;
      
      // 强拍音符固定占 1 拍，或者更短（如果间隙小于 1 拍）
      const strongBeatDuration = Math.min(1.0, gapToNext);

      framework.push({
        pitch,
        startTime: sopranoNote.startTime,
        endTime: sopranoNote.startTime + strongBeatDuration,
        velocity: sopranoNote.velocity,
        voiceId,
        isStrongBeat: true
      });
    }

    return framework;
  }

  /**
   * P1 修复：恢复完整的和弦进行选择
   * P2 修复：Temperature 直接控制随机性
   * P3 修复：Harmony 维度影响和弦复杂度
   */
  private determineChordDegree(
    position: number, 
    total: number, 
    style: string, 
    temperature: number,
    dimensions?: any
  ): keyof typeof this.chordDefinitions {
    // ✅ P2 修复：Temperature 直接控制随机性
    // temperature 范围 0.5-2.0，映射到 0-1 的随机概率
    const randomChance = (temperature - 0.5) / 1.5;  // 0.5->0, 2.0->1
    
    // ✅ P3 修复：Harmony 维度影响和弦复杂度
    const harmonyWeight = dimensions?.harmony?.progressionWeight?.magenta || 50;
    const harmonyComplexity = harmonyWeight / 100;  // 0-1
    
    // ✅ P1 修复：恢复完整的和弦进行（参考复调规则.md）
    // 根据 harmony 复杂度分组：低复杂度用简单进行，高复杂度用复杂进行
    const progressions: { [key: string]: { simple: string[][]; complex: string[][] } } = {
      classical: {
        simple: [
          ['I', 'IV', 'V', 'I'],
          ['I', 'I', 'V', 'V'],
          ['I', 'IV', 'V', 'I']
        ],
        complex: [
          ['I', 'V', 'vi', 'iii', 'IV', 'ii', 'V', 'I'],
          ['I', 'ii', 'vi', 'IV', 'I', 'V', 'viio', 'I'],
          ['I', 'V', 'vi', 'ii', 'V/vi', 'vi', 'ii', 'V'],
          ['I', 'IV', 'V', 'vi', 'ii', 'V', 'I'],
          ['I', 'vi', 'ii', 'V', 'I']
        ]
      },
      jazz: {
        simple: [
          ['I', 'vi', 'ii', 'V'],
          ['I', 'IV', 'V', 'I']
        ],
        complex: [
          ['I', 'III', 'vi', 'ii', 'V'],
          ['I', 'V', 'iii', 'vi', 'ii', 'V'],
          ['I', 'vi', 'ii', 'V', 'I', 'vi', 'ii', 'V'],
          ['I', 'IV', 'iii', 'vi', 'ii', 'V'],
          ['I', 'vi', 'ii', 'V', 'iii', 'vi', 'ii', 'V']
        ]
      },
      pop: {
        simple: [
          ['I', 'V', 'vi', 'IV'],
          ['I', 'vi', 'IV', 'V'],
          ['I', 'IV', 'V', 'I']
        ],
        complex: [
          ['I', 'vi', 'IV', 'V', 'I', 'V', 'vi', 'IV'],
          ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'I'],
          ['I', 'iii', 'vi', 'IV'],
          ['I', 'V', 'IV', 'V']
        ]
      },
      modern: {
        simple: [
          ['I', 'V', 'vi', 'IV'],
          ['I', 'IV', 'V', 'I']
        ],
        complex: [
          ['I', 'V', 'III', 'vi'],
          ['I', 'IV', 'V', 'VII'],
          ['I', 'V', 'vi', 'V', 'IV'],
          ['I', 'V', 'vi', 'IV', 'I', 'IV', 'V', 'I'],
          ['I', 'vi', 'IV', 'V', 'iii', 'vi', 'IV', 'V']
        ]
      }
    };

    const styleProgressions = progressions[style] || progressions.classical;
    
    // 根据权重决定使用简单还是复杂和弦进行
    const useComplexProgression = Math.random() < harmonyComplexity;
    const progressionSet = useComplexProgression ? styleProgressions.complex : styleProgressions.simple;
    
    // Temperature 高时，随机选择不同进行；Temperature 低时，使用标准进行
    const progression = Math.random() < randomChance 
      ? progressionSet[Math.floor(Math.random() * progressionSet.length)]
      : progressionSet[0];  // 使用最标准的进行
    
    const index = Math.floor((position / Math.max(1, total)) * progression.length);
    
    return progression[index % progression.length] as keyof typeof this.chordDefinitions;
  }

  private selectChordTone(
    _sopranoPitch: number,
    chordDegree: keyof typeof this.chordDefinitions,
    voiceType: 'alto' | 'tenor' | 'bass',
    position: number,
    _dimensions?: any
  ): number {
    const chord = this.chordDefinitions[chordDegree];
    const tonic = 60;

    let chordTone: number;
    
    // 增加对 chord 为 undefined 的防护
    if (!chord) {
      console.warn(`Chord degree '${chordDegree}' not found, falling back to 'I'`);
      const fallbackChord = this.chordDefinitions['I'];
      chordTone = tonic + fallbackChord.root;
      return chordTone;
    }
    
    if (voiceType === 'bass') {
      chordTone = tonic + chord.root;
    } else if (voiceType === 'tenor') {
      chordTone = position % 2 === 0 ? tonic + chord.fifth : tonic + chord.root;
    } else {
      chordTone = position % 2 === 0 ? tonic + chord.third : tonic + chord.fifth;
    }

    return chordTone;
  }

  /**
   * P1 修复：返回完整的 INoteSequence，保留节奏信息
   * P2 修复：Temperature 直接传递给 Magenta，不进行过度调整
   */
  private async generateVariationMaterial(
    cantusFirmus: INoteSequence,
    config: GenerationConfig,
    _voiceIndex: number,
    _dimensions: any
  ): Promise<INoteSequence> {  // ✅ 返回完整序列，不仅仅是 pitch[]
    const steps = config.length * 16;
    let generated: INoteSequence;

    // ✅ P2 修复：直接使用 Temperature，不进行过度调整
    // Temperature 范围 0.5-2.0，让 Magenta 完整控制随机性
    const baseTemp = config.temperature;
    
    // 仅根据风格做轻微调整（不影响用户控制）
    const styleTemps: Record<string, number> = {
      classical: 0.9,   // 古典稍保守
      pop: 1.0,         // 流行中等
      jazz: 1.2,        // 爵士稍自由
      modern: 1.1       // 现代稍自由
    };
    const adjustedTemp = baseTemp * (styleTemps[config.musicStyle] || 1.0);
    
    console.log(`  使用温度: ${adjustedTemp.toFixed(2)} (基础: ${baseTemp.toFixed(2)}, 风格调整: ${styleTemps[config.musicStyle] || 1.0})`);

    if (config.modelType !== 'music_vae') {
      const model = modelLoader.getMusicRNN();
      // ✅ 直接使用 Temperature，让 Magenta 完整控制随机性
      generated = await model.continueSequence(cantusFirmus, steps, adjustedTemp);
    } else {
      const model = modelLoader.getMusicVAE();
      const results = await model.sample(1, adjustedTemp);
      generated = results[0];
    }

    console.log(`  Magenta 生成完整序列: ${(generated.notes || []).length} 个音符`);
    console.log(`  保留节奏信息: startTime, endTime, velocity`);
    
    // ✅ 返回完整序列，包含节奏信息
    return generated;
  }

  /**
   * P1 修复：使用完整的 INoteSequence（包含节奏信息）
   * P2 修复：使用 dimensions 权重控制变奏
   */
  private addVariationsToFramework(
    framework: CounterpointNote[],
    variationSequence: INoteSequence,  // ✅ 完整序列，不仅仅是 pitch[]
    _soprano: CounterpointNote[],
    voiceId: number,
    voiceType: 'alto' | 'tenor' | 'bass',
    style: string,
    dimensions: any,
    temperature: number
  ): CounterpointNote[] {
    const complete: CounterpointNote[] = [];
    const range = this.voiceRanges[voiceType];
    let variationIndex = 0;

    for (let i = 0; i < framework.length; i++) {
      const currentFrame = framework[i];
      const nextFrame = framework[i + 1];

      // 先添加强拍音符
      complete.push(currentFrame);

      if (nextFrame) {
        // 计算从当前强拍结束到下一个强拍开始之间的时间
        const gapDuration = nextFrame.startTime - currentFrame.endTime;
        
        if (gapDuration > 0.25) {
          // 有足够间隙，添加变奏
          this.addVariationsInGap(
            complete,
            currentFrame,
            nextFrame.startTime,
            gapDuration,
            variationSequence,  // ✅ 传递完整序列
            variationIndex,
            range,
            voiceId,
            style,
            dimensions,
            temperature
          );
          variationIndex += Math.floor(gapDuration / 0.5);
        }
      }
    }

    return complete;
  }
  
  /**
   * P1 修复：使用完整的 INoteSequence（包含节奏信息）
   * P2 修复：使用 dimensions 权重完整控制变奏
   * 不再阉割功能，让用户通过权重控制
   */
  private addVariationsInGap(
    complete: CounterpointNote[],
    startFrame: CounterpointNote,
    nextFrameStartTime: number,
    _gapDuration: number,
    variationSequence: INoteSequence,  // ✅ 完整序列
    startIndex: number,
    range: { min: number; max: number },
    voiceId: number,
    style: string,
    dimensions: any,
    temperature: number
  ): void {
    const magentaNotes = variationSequence.notes || [];
    
    // 变奏从强拍结束后开始
    const variationStartTime = startFrame.endTime;
    const availableDuration = nextFrameStartTime - variationStartTime;
    
    if (availableDuration < 0.25) return;
    
    // ========== 关键修复：让维度权重直接影响可观察参数 ==========
    
    // 1. 变奏密度：权重直接决定音符数量（效果明显）
    const densityWeight = dimensions.rhythm.densityWeight.magenta / 100;  // 0-1
    // 低权重(0-30%) → 1-2个, 中权重(30-70%) → 2-4个, 高权重(70-100%) → 4-8个
    const minVariations = Math.round(1 + densityWeight * 3);  // 1-4
    const maxVariations = Math.round(2 + densityWeight * 6);  // 2-8
    const densityBasedCount = minVariations + Math.floor(Math.random() * (maxVariations - minVariations + 1));
    
    // 根据可用空间调整
    let spaceBasedMax = 1;
    if (availableDuration > 2.0) spaceBasedMax = style === 'jazz' ? 8 : 6;
    else if (availableDuration > 1.0) spaceBasedMax = style === 'jazz' ? 6 : 4;
    else if (availableDuration > 0.5) spaceBasedMax = 4;
    else spaceBasedMax = 2;
    
    const numVariations = Math.min(densityBasedCount, spaceBasedMax);
    if (numVariations <= 0) return;
    
    // 2. 节奏自由度：权重决定时值多样性（效果明显）
    const freedomWeight = dimensions.rhythm.freedomWeight.magenta / 100;  // 0-1
    // 低权重 → 固定八分音符(0.5拍), 高权重 → 混合时值
    const allowedDurations = freedomWeight < 0.3 
      ? [0.5]  // 只有八分音符
      : freedomWeight < 0.7 
        ? [0.5, 1.0]  // 八分 + 四分
        : [0.25, 0.5, 1.0, 1.5];  // 十六分 + 八分 + 四分 + 附点
    
    // 3. 切分音：权重决定是否允许切分（效果明显）
    const syncopationWeight = dimensions.rhythm.syncopationWeight.magenta / 100;  // 0-1
    const allowSyncopation = Math.random() < syncopationWeight;
    
    // 4. 音程跳跃：权重决定最大音程（效果明显）
    const pitchDim = dimensions.pitch;
    const pitchSelectionWeight = pitchDim.pitchSelectionWeight.magenta / 100;  // 0-1
    // 低权重 → 级进(1-2半音), 高权重 → 允许大跳(最大12半音)
    const maxInterval = Math.round(2 + pitchSelectionWeight * 10);  // 2-12
    
    // 5. Temperature 影响随机性强度
    const randomIntensity = (temperature - 0.5) / 1.5;  // 0-1
    
    // ========== 开始生成音符 ==========
    let currentTime = variationStartTime;
    
    for (let j = 0; j < numVariations && currentTime < nextFrameStartTime - 0.1; j++) {
      const prevPitch = complete[complete.length - 1].pitch;
      
      // 根据权重决定使用 Magenta AI 还是规则引擎
      const useMagenta = Math.random() < pitchSelectionWeight && magentaNotes.length > 0;
      
      let pitch: number;
      if (useMagenta) {
        // ===== Magenta AI 生成的音高 =====
        const magentaIndex = (startIndex + j) % magentaNotes.length;
        pitch = magentaNotes[magentaIndex].pitch || prevPitch + 2;
      } else {
        // ===== 规则引擎建议的音高（级进或小跳）=====
        const step = (Math.random() < 0.5 ? 1 : 2) * (Math.random() < 0.5 ? 1 : -1);
        pitch = prevPitch + step;
      }
      
      // 限制音程跳跃（根据权重）
      const actualInterval = Math.abs(pitch - prevPitch);
      if (actualInterval > maxInterval) {
        // 超出允许范围，强制调整到级进
        const direction = pitch > prevPitch ? 1 : -1;
        pitch = prevPitch + direction * (1 + Math.floor(Math.random() * 2));
      }
      
      // 调整到声部音域
      while (pitch < range.min) pitch += 12;
      while (pitch > range.max) pitch -= 12;
      
      // 调整到音阶
      pitch = this.adjustToScale(pitch, startFrame.pitch);
      
      // 节奏时值选择
      let noteDuration = allowedDurations[Math.floor(Math.random() * allowedDurations.length)];
      
      // 使用 Magenta 的节奏信息（如果权重允许）
      const useMagentaRhythm = Math.random() < freedomWeight && magentaNotes.length > 0;
      if (useMagentaRhythm) {
        const magentaIndex = (startIndex + j) % magentaNotes.length;
        const magentaNote = magentaNotes[magentaIndex];
        const magentaDuration = (magentaNote.endTime || 0.5) - (magentaNote.startTime || 0);
        if (magentaDuration > 0.1 && magentaDuration < 2.0) {
          noteDuration = magentaDuration;
        }
      }
      
      // 切分：如果允许切分，可以稍微偏移开始时间
      let noteStartTime = currentTime;
      if (allowSyncopation && Math.random() < 0.5) {
        const offset = [0.125, 0.25, 0.375][Math.floor(Math.random() * 3)];  // 后半拍偏移
        noteStartTime += offset;
        noteDuration = Math.max(0.25, noteDuration - offset);  // 调整时长
      }
      
      // Temperature 影响随机变化
      if (Math.random() < randomIntensity * 0.3) {
        noteDuration *= (0.5 + Math.random());  // 随机拉伸或缩短
      }
      
      // 确保不超过下一强拍
      const maxEndTime = nextFrameStartTime - 0.05;
      const noteEndTime = Math.min(noteStartTime + noteDuration, maxEndTime);
      
      if (noteEndTime > noteStartTime + 0.1) {
        complete.push({
          pitch,
          startTime: noteStartTime,
          endTime: noteEndTime,
          velocity: Math.max(50, startFrame.velocity - 10),
          voiceId,
          isStrongBeat: false
        });
        
        currentTime = noteEndTime;
      }
    }
    
    // 日志输出：让用户看到效果
    console.log(`  变奏生成: ${numVariations}个音符, 密度=${Math.round(densityWeight*100)}%, 时值=${allowedDurations.join('/')}, 最大音程=${maxInterval}半音, 切分=${allowSyncopation?'是':'否'}`);
  }

  private adjustToScale(pitch: number, _referencePitch: number): number {
    const pitchClass = pitch % 12;

    if (this.majorScaleIntervals.includes(pitchClass)) {
      return pitch;
    }

    const closest = this.majorScaleIntervals.reduce((prev, curr) => {
      const prevDist = Math.abs((prev - pitchClass + 12) % 12);
      const currDist = Math.abs((curr - pitchClass + 12) % 12);
      return currDist < prevDist ? curr : prev;
    });

    return pitch + (closest - pitchClass);
  }

  /**
   * P0 修复：原始旋律直接透传，不进行任何修改
   * P1/P2 修复：使用完整的权重系统和 Magenta 节奏信息
   */
  private buildSequence(notes: CounterpointNote[], original: INoteSequence): INoteSequence {
    const beatsPerMeasure = 4.0;
    const stepsPerBeat = 4;
    
    const convertedNotes = notes.map(note => {
      // ✅ P0 核心修复：原始旋律直接透传，绝对不修改
      if (note.voiceId === 0 && note.isOriginal && note.originalNote) {
        // 直接返回原始音符，不进行任何量化
        return {
          ...note.originalNote,
          voiceId: 0
        };
      }
      
      // 只对生成的声部进行量化处理
      const quantizedStartStep = Math.round(note.startTime * stepsPerBeat);
      const quantizedEndStep = Math.round(note.endTime * stepsPerBeat);
      const quantizedStartTime = quantizedStartStep / stepsPerBeat;
      const quantizedEndTime = quantizedEndStep / stepsPerBeat;
      
      return {
        pitch: note.pitch,
        startTime: quantizedStartTime,
        endTime: quantizedEndTime,
        velocity: note.velocity,
        voiceId: note.voiceId,
        quantizedStartStep,
        quantizedEndStep,
        isDrum: false
      };
    });

    // 只对生成的声部进行时间修正
    const correctedNotes = this.correctMeasureTiming(convertedNotes, beatsPerMeasure, stepsPerBeat);

    return {
      notes: correctedNotes,
      totalTime: original.totalTime,
      totalQuantizedSteps: original.totalQuantizedSteps,
      quantizationInfo: { stepsPerQuarter: stepsPerBeat },
      tempos: original.tempos,
      timeSignatures: original.timeSignatures
    };
  }
  
  /**
   * P0 修复：跳过原始旋律，只对生成的声部进行时间修正
   */
  private correctMeasureTiming(
    notes: any[],
    _beatsPerMeasure: number,
    stepsPerBeat: number
  ): any[] {
    // 按 voiceId 分组
    const notesByVoice = new Map<number, any[]>();
    notes.forEach(note => {
      const voiceId = note.voiceId || 0;
      if (!notesByVoice.has(voiceId)) {
        notesByVoice.set(voiceId, []);
      }
      notesByVoice.get(voiceId)!.push(note);
    });
    
    const correctedNotes: any[] = [];
    
    notesByVoice.forEach((voiceNotes, voiceId) => {
      // ✅ P0 核心修复：voiceId === 0 是原始旋律，不进行任何修正
      if (voiceId === 0) {
        correctedNotes.push(...voiceNotes);
        console.log(`  原始旋律保护: voiceId=${voiceId} 不修正，保留 ${voiceNotes.length} 个音符`);
        return;
      }
      
      // 只对生成的声部进行时间修正
      voiceNotes.sort((a, b) => a.startTime - b.startTime);
      
      for (let i = 0; i < voiceNotes.length; i++) {
        const current = voiceNotes[i];
        const next = voiceNotes[i + 1];
        
        // 如果有间隙，延伸当前音符
        if (next && next.startTime > current.endTime + 0.01) {
          const gap = next.startTime - current.endTime;
          if (gap >= 0.25) {
            current.endTime = next.startTime;
            current.quantizedEndStep = Math.round(current.endTime * stepsPerBeat);
          }
        }
        
        correctedNotes.push(current);
      }
    });
    
    return correctedNotes;
  }
}

export const counterpointEngine = new CounterpointEngine();
