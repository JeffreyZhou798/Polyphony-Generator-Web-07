import type { INoteSequence } from '@magenta/music';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export class MusicXMLBuilder {
  buildMusicXML(sequence: INoteSequence, title: string = 'Polyphony Output'): string {
    if (!sequence.notes || sequence.notes.length === 0) {
      throw new Error('音符序列为空');
    }
    
    // 按 voiceId 分组音符
    const voices = this.groupNotesByVoiceId(sequence.notes);
    const voiceCount = voices.length;
    
    console.log(`构建 MusicXML: ${voiceCount} 个声部, 共 ${sequence.notes.length} 个音符`);
    voices.forEach((voice, i) => {
      console.log(`  声部 ${i}: ${voice.notes.length} 个音符`);
    });
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${title}</work-title>
  </work>
  <identification>
    <creator type="software">Polyphony AI Web</creator>
  </identification>
  <part-list>
`;

    // 为每个声部创建 part
    const voiceNames = ['Soprano', 'Alto', 'Tenor', 'Bass'];
    for (let i = 0; i < voiceCount; i++) {
      xml += `    <score-part id="P${i + 1}">
      <part-name>${voiceNames[i] || `Voice ${i + 1}`}</part-name>
    </score-part>
`;
    }

    xml += `  </part-list>
`;

    // 为每个声部生成音符
    for (let i = 0; i < voiceCount; i++) {
      xml += this.buildPartXML(voices[i].notes, i + 1, voiceNames[i]);
    }

    xml += `</score-partwise>`;

    return xml;
  }

  private groupNotesByVoiceId(notes: any[]): Array<{ voiceId: number; notes: any[] }> {
    // 按 voiceId 分组
    const voiceMap = new Map<number, any[]>();
    
    for (const note of notes) {
      const voiceId = note.voiceId !== undefined ? note.voiceId : 0;
      if (!voiceMap.has(voiceId)) {
        voiceMap.set(voiceId, []);
      }
      voiceMap.get(voiceId)!.push(note);
    }
    
    // 转换为数组并按 voiceId 排序
    const voices = Array.from(voiceMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([voiceId, notes]) => ({
        voiceId,
        notes: notes.sort((a, b) => (a.startTime || 0) - (b.startTime || 0))
      }));
    
    return voices;
  }

  private buildPartXML(notes: any[], partId: number, _voiceName: string): string {
    if (notes.length === 0) {
      // 如果声部没有音符，创建一个空小节
      return `  <part id="P${partId}">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>${partId <= 2 ? 'G' : 'F'}</sign>
          <line>${partId <= 2 ? '2' : '4'}</line>
        </clef>
      </attributes>
      <note>
        <rest/>
        <duration>16</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
`;
    }
    
    let xml = `  <part id="P${partId}">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>${partId <= 2 ? 'G' : 'F'}</sign>
          <line>${partId <= 2 ? '2' : '4'}</line>
        </clef>
      </attributes>
`;

    let currentMeasure = 1;
    const divisions = 4;
    const beatsPerMeasure = 4;
    const measureLengthSteps = beatsPerMeasure * divisions;
    let currentStep = 0;

    const appendMeasureIfNeeded = (targetMeasure: number) => {
      while (currentMeasure < targetMeasure) {
        xml += `    </measure>
    <measure number="${++currentMeasure}">
`;
      }
    };

    const appendRest = (restSteps: number) => {
      let remaining = restSteps;
      while (remaining > 0) {
        const measureOffset = currentStep % measureLengthSteps;
        const remainingInMeasure = measureLengthSteps - measureOffset;
        const segment = Math.min(remaining, remainingInMeasure);
        const { type, dotted } = this.getDurationTypeAndDot(segment, divisions);

        xml += `      <note>
        <rest/>
        <duration>${segment}</duration>
        <voice>1</voice>
        <type>${type}</type>
        ${dotted ? '<dot/>\n' : ''}      </note>
`;

        currentStep += segment;
        remaining -= segment;

        const nextMeasure = Math.floor(currentStep / measureLengthSteps) + 1;
        appendMeasureIfNeeded(nextMeasure);
      }
    };

    notes.forEach((note) => {
      const startStep = note.quantizedStartStep != null
        ? note.quantizedStartStep
        : Math.round((note.startTime || 0) * divisions);
      const endStep = note.quantizedEndStep != null
        ? note.quantizedEndStep
        : Math.round((note.endTime || (note.startTime || 0) + 0.25) * divisions);

      if (startStep > currentStep) {
        appendRest(startStep - currentStep);
      }

      let remaining = Math.max(1, endStep - startStep);
      let localStep = startStep;
      const notePitch = note.pitch || 60;
      const pitch = this.midiToPitch(notePitch);

      while (remaining > 0) {
        const measureOffset = localStep % measureLengthSteps;
        const remainingInMeasure = measureLengthSteps - measureOffset;
        const segment = Math.min(remaining, remainingInMeasure);
        const { type, dotted } = this.getDurationTypeAndDot(segment, divisions);
        const isStartSegment = localStep === startStep;
        const isEndSegment = remaining === segment;

        const tieTags = [
          !isStartSegment ? '        <tie type="stop"/>\n' : '',
          !isEndSegment ? '        <tie type="start"/>\n' : ''
        ].join('');

        const notationTags = !isStartSegment || !isEndSegment
          ? `        <notations>
          ${!isStartSegment ? '<tied type="stop"/>' : ''}
          ${!isEndSegment ? '<tied type="start"/>' : ''}
        </notations>
`
          : '';

        xml += `      <note>
        <pitch>
          <step>${pitch.step}</step>
          ${pitch.alter !== 0 ? `<alter>${pitch.alter}</alter>` : ''}
          <octave>${pitch.octave}</octave>
        </pitch>
${tieTags}        <duration>${segment}</duration>
        <voice>1</voice>
        <type>${type}</type>
        ${dotted ? '<dot/>\n' : ''}${notationTags}      </note>
`;

        localStep += segment;
        remaining -= segment;
        currentStep = localStep;

        const nextMeasure = Math.floor(currentStep / measureLengthSteps) + 1;
        appendMeasureIfNeeded(nextMeasure);
      }
    });

    xml += `    </measure>
  </part>
`;

    return xml;
  }

  private getDurationTypeAndDot(duration: number, divisions: number): { type: string, dotted: boolean } {
    const ratio = duration / divisions;
    
    // 附点音符判断 (1.5倍)
    if (Math.abs(ratio - 6) < 0.1) return { type: 'whole', dotted: true }; // 6 beats
    if (Math.abs(ratio - 3) < 0.1) return { type: 'half', dotted: true }; // 3 beats
    if (Math.abs(ratio - 1.5) < 0.1) return { type: 'quarter', dotted: true }; // 1.5 beats
    if (Math.abs(ratio - 0.75) < 0.1) return { type: 'eighth', dotted: true }; // 0.75 beats
    if (Math.abs(ratio - 0.375) < 0.1) return { type: '16th', dotted: true }; // 0.375 beats

    // 普通音符
    if (ratio >= 4) return { type: 'whole', dotted: false };
    if (ratio >= 2) return { type: 'half', dotted: false };
    if (ratio >= 1) return { type: 'quarter', dotted: false };
    if (ratio >= 0.5) return { type: 'eighth', dotted: false };
    if (ratio >= 0.25) return { type: '16th', dotted: false };
    return { type: '32nd', dotted: false };
  }

  private midiToPitch(midiNote: number): { step: string; alter: number; octave: number } {
    const pitchClass = midiNote % 12;
    const octave = Math.floor(midiNote / 12) - 1;

    const pitchMap: { [key: number]: { step: string; alter: number } } = {
      0: { step: 'C', alter: 0 },
      1: { step: 'C', alter: 1 },
      2: { step: 'D', alter: 0 },
      3: { step: 'D', alter: 1 },
      4: { step: 'E', alter: 0 },
      5: { step: 'F', alter: 0 },
      6: { step: 'F', alter: 1 },
      7: { step: 'G', alter: 0 },
      8: { step: 'G', alter: 1 },
      9: { step: 'A', alter: 0 },
      10: { step: 'A', alter: 1 },
      11: { step: 'B', alter: 0 }
    };

    const pitch = pitchMap[pitchClass];
    return { ...pitch, octave };
  }

  async exportMusicXML(sequence: INoteSequence, filename: string = 'polyphony_output'): Promise<void> {
    const xml = this.buildMusicXML(sequence, filename);
    const blob = new Blob([xml], { type: 'application/xml' });
    saveAs(blob, `${filename}.musicxml`);
  }

  async exportMXL(sequence: INoteSequence, filename: string = 'polyphony_output'): Promise<void> {
    const xml = this.buildMusicXML(sequence, filename);
    
    const zip = new JSZip();
    zip.file('score.xml', xml);
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container>
  <rootfiles>
    <rootfile full-path="score.xml"/>
  </rootfiles>
</container>`);

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${filename}.mxl`);
  }

  async exportMIDI(sequence: INoteSequence, filename: string = 'polyphony_output'): Promise<void> {
    try {
      const { Midi } = await import('@tonejs/midi');
      
      const midi = new Midi();
      const track = midi.addTrack();

      if (sequence.notes) {
        sequence.notes.forEach(note => {
          if (note.pitch && note.startTime != null && note.endTime != null) {
            track.addNote({
              midi: note.pitch,
              time: note.startTime,
              duration: note.endTime - note.startTime,
              velocity: (note.velocity || 80) / 127
            });
          }
        });
      }

      const midiArray = midi.toArray();
      const midiBlob = new Blob([midiArray as any], { type: 'audio/midi' });
      saveAs(midiBlob, `${filename}.mid`);
    } catch (error) {
      console.error('导出 MIDI 失败:', error);
      throw new Error('MIDI 导出失败');
    }
  }
}

export const musicXMLBuilder = new MusicXMLBuilder();
