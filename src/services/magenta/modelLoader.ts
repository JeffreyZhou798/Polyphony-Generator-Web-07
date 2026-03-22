import * as mm from '@magenta/music';

export class MagentaModelLoader {
  private musicRNN: mm.MusicRNN | null = null;
  private musicVAE: mm.MusicVAE | null = null;
  private loadingPromise: Promise<void> | null = null;
  private currentRNNModelName: string | null = null;

  // 多模型支持 URL
  private MODEL_URLS: Record<string, string> = {
    basic_rnn: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn',
    melody_rnn: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn',
    attention_rnn: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/attention_rnn',
    polyphony_rnn: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/polyphony_rnn',
    music_vae: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small'
  };

  private MODEL_FALLBACKS: Record<string, string> = {
    attention_rnn: 'melody_rnn',
    polyphony_rnn: 'basic_rnn'
  };

  // 根据风格选择最优模型
  private STYLE_MODEL_MAP: Record<string, string> = {
    classical: 'basic_rnn',  // 古典用 attention model 有时加载失败，改用 basic_rnn
    pop: 'basic_rnn',         // 流行用标准 basic model
    jazz: 'polyphony_rnn',      // 爵士用 polyphony model，支持复调
    modern: 'basic_rnn'     // 现代改用 basic_rnn 保证稳定性
  };

  async loadMusicRNN(style: string = 'classical', specificModel?: string): Promise<void> {
    const targetModelName = specificModel || this.STYLE_MODEL_MAP[style] || 'basic_rnn';

    // 如果已经加载了目标模型，则直接返回
    if (this.musicRNN && this.currentRNNModelName === targetModelName) {
      return;
    }

    if (this.loadingPromise) {
      await this.loadingPromise;
      // 如果之前正在加载其他模型，或者加载完成后的模型不是我们想要的，重新加载
      if (this.currentRNNModelName !== targetModelName) {
        return this.loadMusicRNN(style, specificModel);
      }
      return;
    }

    // 清理旧模型
    if (this.musicRNN) {
      this.musicRNN.dispose();
      this.musicRNN = null;
    }

    this.loadingPromise = (async () => {
      try {
        const modelUrl = this.MODEL_URLS[targetModelName] || this.MODEL_URLS['basic_rnn'];

        console.log(`开始加载 ${targetModelName} 模型...`);

        this.musicRNN = new mm.MusicRNN(modelUrl);

        await this.musicRNN.initialize();
        this.currentRNNModelName = targetModelName;
        console.log(`✅ ${targetModelName} 模型加载成功`);
      } catch (error) {
        const fallbackModel = this.MODEL_FALLBACKS[targetModelName];
        if (fallbackModel) {
          try {
            const fallbackUrl = this.MODEL_URLS[fallbackModel] || this.MODEL_URLS['basic_rnn'];
            console.warn(`⚠️ ${targetModelName} 模型不可用，自动切换为 ${fallbackModel}`);
            this.musicRNN = new mm.MusicRNN(fallbackUrl);
            await this.musicRNN.initialize();
            this.currentRNNModelName = fallbackModel;
            console.log(`✅ ${fallbackModel} 模型加载成功`);
            return;
          } catch (fallbackError) {
            console.error(`❌ ${fallbackModel} 模型加载失败:`, fallbackError);
          }
        }
        console.error(`❌ ${targetModelName} 模型加载失败:`, error);
        this.musicRNN = null;
        this.currentRNNModelName = null;
        throw new Error('模型加载失败，请检查网络连接');
      } finally {
        this.loadingPromise = null;
      }
    })();

    await this.loadingPromise;
  }

  async loadMusicVAE(): Promise<void> {
    if (this.musicVAE) return;

    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise = (async () => {
      try {
        console.log('开始加载 MusicVAE 模型...');
        
        this.musicVAE = new mm.MusicVAE(
          'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small'
        );

        await this.musicVAE.initialize();
        console.log('✅ MusicVAE 模型加载成功');
      } catch (error) {
        console.error('❌ MusicVAE 模型加载失败:', error);
        this.musicVAE = null;
        throw new Error('模型加载失败，请检查网络连接');
      } finally {
        this.loadingPromise = null;
      }
    })();

    await this.loadingPromise;
  }

  getMusicRNN(): mm.MusicRNN {
    if (!this.musicRNN) {
      throw new Error('MusicRNN 模型未加载');
    }
    return this.musicRNN;
  }

  getMusicVAE(): mm.MusicVAE {
    if (!this.musicVAE) {
      throw new Error('MusicVAE 模型未加载');
    }
    return this.musicVAE;
  }

  isMusicRNNLoaded(): boolean {
    return this.musicRNN !== null;
  }

  isMusicVAELoaded(): boolean {
    return this.musicVAE !== null;
  }

  dispose(): void {
    if (this.musicRNN) {
      this.musicRNN.dispose();
      this.musicRNN = null;
    }
    if (this.musicVAE) {
      this.musicVAE.dispose();
      this.musicVAE = null;
    }
  }
}

export const modelLoader = new MagentaModelLoader();
