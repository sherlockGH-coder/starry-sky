(() => {
  class AmbientSynth {
    constructor(context) {
      this.context = context;
      this.masterGain = context.createGain();
      this.masterGain.gain.value = 0.0;
      this.started = false; // 防止重复启动

      this.lowpass = context.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = 1400;
      this.lowpass.Q.value = 0.6;

      this.lfo = context.createOscillator();
      this.lfo.frequency.value = 0.07; // slow swell
      this.lfoGain = context.createGain();
      this.lfoGain.gain.value = 0.25; // depth

      this.oscillators = [];
      const freqs = [220.00, 277.18, 329.63]; // A, C#, E  (A major, airy)
      for (const freq of freqs) {
        const osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = context.createGain();
        gain.gain.value = 0.15 / freqs.length;

        osc.connect(gain);
        gain.connect(this.lowpass);

        this.oscillators.push({ osc, gain });
      }

      // Subtle stereo shimmer using delay
      this.delayL = context.createDelay(5.0);
      this.delayR = context.createDelay(5.0);
      this.delayL.delayTime.value = 0.22;
      this.delayR.delayTime.value = 0.27;
      this.feedback = context.createGain();
      this.feedback.gain.value = 0.15;

      const merger = context.createChannelMerger(2);
      this.lowpass.connect(this.delayL);
      this.lowpass.connect(this.delayR);
      this.delayL.connect(merger, 0, 0);
      this.delayR.connect(merger, 0, 1);
      this.delayL.connect(this.feedback);
      this.delayR.connect(this.feedback);
      this.feedback.connect(this.lowpass);

      // LFO modulates masterGain for breathing effect
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.masterGain.gain);

      merger.connect(this.masterGain);
      this.masterGain.connect(context.destination);
    }

    start() {
      if (this.started) return; // 防止重复启动
      this.started = true;
      
      const now = this.context.currentTime;
      for (const { osc } of this.oscillators) {
        try {
          osc.start(now + 0.01);
        } catch (e) {
          console.warn('振荡器启动失败:', e);
        }
      }
      try {
        this.lfo.start(now + 0.02);
      } catch (e) {
        console.warn('LFO启动失败:', e);
      }
      // fade in
      this.masterGain.gain.cancelScheduledValues(0);
      this.masterGain.gain.linearRampToValueAtTime(0.0, now);
      this.masterGain.gain.linearRampToValueAtTime(0.7, now + 2.2);
    }

    stop() {
      const now = this.context.currentTime;
      this.masterGain.gain.cancelScheduledValues(0);
      this.masterGain.gain.linearRampToValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0, now + 0.9);
    }
  }

  class AudioManagerCls {
    constructor() {
      this.context = null;
      this.synth = null;
      this.playing = false;
      this.audioEl = null;
      this.currentMode = 'ambient'; // 'ambient' | 'yiruma'
      this.onError = null;
      this.synthStarted = false; // 防止重复启动合成器
      this.networkQuality = 'unknown'; // 'fast' | 'slow' | 'unknown'
      this.isCloudEnvironment = this.detectCloudEnvironment();
    }

    // 检测是否在云服务器环境
    detectCloudEnvironment() {
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
      const hasCloudIndicators = hostname.includes('herokuapp') ||
                                hostname.includes('vercel') ||
                                hostname.includes('netlify') ||
                                hostname.includes('github.io') ||
                                hostname.includes('surge.sh') ||
                                !isLocalhost;
      return hasCloudIndicators;
    }

    // 检测网络质量
    async detectNetworkQuality() {
      if (!navigator.connection) {
        this.networkQuality = 'unknown';
        return;
      }

      const connection = navigator.connection;
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;

      // 根据网络类型和速度判断
      if (effectiveType === '4g' && downlink > 2) {
        this.networkQuality = 'fast';
      } else if (effectiveType === '3g' || downlink < 1) {
        this.networkQuality = 'slow';
      } else {
        this.networkQuality = 'medium';
      }

      console.log(`网络质量检测: ${this.networkQuality} (类型: ${effectiveType}, 速度: ${downlink}Mbps)`);
    }

    async init() {
      if (this.context) return;
      
      // 检测网络质量
      await this.detectNetworkQuality();
      
      const Context = window.AudioContext || window.webkitAudioContext;
      this.context = new Context();
      // On iOS, resume after user gesture
      if (this.context.state === 'suspended') {
        try { await this.context.resume(); } catch {}
      }
      this.synth = new AmbientSynth(this.context);
      
      // HTMLAudio for track
      this.audioEl = new Audio();
      this.audioEl.loop = true;
      
      // 根据网络环境调整预加载策略
      if (this.isCloudEnvironment || this.networkQuality === 'slow') {
        this.audioEl.preload = 'metadata'; // 云环境或慢网络只预加载元数据
        console.log('检测到云环境或慢网络，使用轻量预加载策略');
      } else {
        this.audioEl.preload = 'auto'; // 本地环境预加载更多数据
      }
      
      this.audioEl.crossOrigin = 'anonymous';
      this.audioEl.volume = 0.85;
      
      // 云环境下默认使用合成器，避免网络问题
      if (this.isCloudEnvironment && this.networkQuality === 'slow') {
        console.log('检测到云环境且网络较慢，默认使用合成器模式');
        this.currentMode = 'ambient';
      } else {
        this.setTrack('yiruma');
      }
    }

    // 专门的音频加载等待方法，支持重试和更长超时
    async waitForAudioLoad(maxRetries = 2) {
      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          await new Promise((resolve, reject) => {
            // 根据网络环境和质量调整超时时间
            let timeoutMs;
            if (this.isCloudEnvironment) {
              // 云环境使用更长超时
              timeoutMs = this.networkQuality === 'slow' ? 15000 : 10000;
            } else {
              // 本地环境
              timeoutMs = this.networkQuality === 'slow' ? 8000 : 5000;
            }
            
            // 重试时增加超时时间
            if (retry > 0) {
              timeoutMs += 5000;
            }
            
            console.log(`音频加载超时设置: ${timeoutMs}ms (重试: ${retry}/${maxRetries})`);
            
            const timeout = setTimeout(() => {
              reject(new Error('音频加载超时'));
            }, timeoutMs);
            
            const onCanPlay = () => {
              clearTimeout(timeout);
              this.audioEl.removeEventListener('canplay', onCanPlay);
              this.audioEl.removeEventListener('canplaythrough', onCanPlayThrough);
              this.audioEl.removeEventListener('error', onError);
              resolve();
            };
            
            const onCanPlayThrough = () => {
              clearTimeout(timeout);
              this.audioEl.removeEventListener('canplay', onCanPlay);
              this.audioEl.removeEventListener('canplaythrough', onCanPlayThrough);
              this.audioEl.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = (e) => {
              clearTimeout(timeout);
              this.audioEl.removeEventListener('canplay', onCanPlay);
              this.audioEl.removeEventListener('canplaythrough', onCanPlayThrough);
              this.audioEl.removeEventListener('error', onError);
              reject(e);
            };
            
            this.audioEl.addEventListener('canplay', onCanPlay);
            this.audioEl.addEventListener('canplaythrough', onCanPlayThrough);
            this.audioEl.addEventListener('error', onError);
            
            // 如果已经可以播放了，立即resolve
            if (this.audioEl.readyState >= 2) {
              onCanPlay();
            } else if (retry > 0) {
              // 重试时重新加载
              console.log(`音频加载重试 ${retry}/${maxRetries}`);
              this.audioEl.load();
            }
          });
          
          console.log('音频加载成功');
          return; // 成功则退出重试循环
          
        } catch (e) {
          console.warn(`音频加载失败 (尝试 ${retry + 1}/${maxRetries + 1}):`, e);
          if (retry === maxRetries) {
            throw e; // 最后一次重试失败则抛出错误
          }
          // 等待一下再重试
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    async toggle() {
      if (!this.context) await this.init();
      if (!this.playing) {
        if (this.currentMode === 'ambient') {
          if (!this.synthStarted) {
            this.synth.start();
            this.synthStarted = true;
          }
        } else {
          try {
            console.log('尝试播放音频，当前状态:', this.audioEl.readyState, this.audioEl.src);
            
            // 如果音频还没加载完成，等待一下
            if (this.audioEl.readyState < 2) {
              console.log('音频未完全加载，等待加载...');
              await this.waitForAudioLoad();
            }
            
            await this.audioEl.play();
            console.log('音频播放成功');
          } catch (e) {
            console.error('音频播放失败:', e);
            // 根据不同错误类型提供更精确的处理
            if (e.name === 'NotAllowedError') {
              if (this.onError) this.onError('音乐播放被浏览器拦截，请再点一次"音乐"按钮');
              return false;
            } else if (e.name === 'NotSupportedError') {
              if (this.onError) this.onError('音频格式不支持，已切换到合成器音景');
            } else if (e.message && e.message.includes('音频加载超时')) {
              if (this.onError) this.onError('网络较慢，音频加载超时，已切换到合成器音景');
            } else if (e.name === 'AbortError') {
              if (this.onError) this.onError('音频加载被中断，已切换到合成器音景');
            } else {
              // 网络错误、CORS错误等
              const isNetworkError = e.message && (
                e.message.includes('fetch') ||
                e.message.includes('network') ||
                e.message.includes('CORS') ||
                e.message.includes('Failed to load')
              );
              if (isNetworkError) {
                if (this.onError) this.onError('网络连接问题或跨域限制，已切换到合成器音景');
              } else {
                if (this.onError) this.onError('音频播放出现问题，已切换到合成器音景');
              }
            }
            
            // 自动切换到合成器模式
            console.log('切换到合成器模式');
            this.currentMode = 'ambient';
            if (!this.synthStarted) {
              this.synth.start();
              this.synthStarted = true;
            }
            this.playing = true;
            return true;
          }
        }
        this.playing = true; return true;
      } else {
        if (this.currentMode === 'ambient') this.synth.stop();
        else { try { this.audioEl.pause(); } catch {} }
        this.playing = false; return false;
      }
    }

    isPlaying() { return this.playing; }

    setTrack(mode) {
      this.currentMode = mode;
      if (!this.audioEl) return;
      if (mode === 'yiruma') {
        // 支持多个音频源，包括CDN备用源
        const candidates = [
          './assets/yiruma.mp3',
          // 可以添加CDN备用源
          // 'https://your-cdn.com/yiruma.mp3',
        ];
        let idx = 0;
        let loadAttempts = 0;
        const maxLoadAttempts = 2; // 每个源最多尝试2次
        
        const tryNext = () => {
          if (idx >= candidates.length) {
            // 所有候选源都失败，切换到合成器
            console.warn('所有音频源都加载失败，切换到合成器模式');
            this.currentMode = 'ambient';
            if (this.onError) this.onError('音频文件无法加载，已切换到合成器音景');
            return;
          }
          
          this.audioEl.src = candidates[idx];
          console.log(`尝试加载音频 (${idx + 1}/${candidates.length}):`, this.audioEl.src);
          
          // 重置加载尝试计数
          loadAttempts = 0;
          this.audioEl.load();
        };
        
        const retryCurrentSource = () => {
          loadAttempts++;
          if (loadAttempts < maxLoadAttempts) {
            console.log(`重试加载当前音频源 (${loadAttempts + 1}/${maxLoadAttempts}):`, this.audioEl.src);
            setTimeout(() => {
              this.audioEl.load();
            }, 1000); // 等待1秒后重试
          } else {
            // 当前源重试次数用完，尝试下一个源
            idx++;
            tryNext();
          }
        };
        
        this.audioEl.onerror = (e) => {
          console.error('音频加载失败:', e, '当前src:', this.audioEl.src);
          retryCurrentSource();
        };
        
        this.audioEl.onloadstart = () => {
          console.log('开始加载音频文件:', this.audioEl.src);
        };
        
        this.audioEl.oncanplay = () => {
          console.log('音频可以播放:', this.audioEl.src);
        };
        
        this.audioEl.onloadeddata = () => {
          console.log('音频数据加载完成:', this.audioEl.src);
        };
        
        // 添加网络状态监听
        this.audioEl.onstalled = () => {
          console.warn('音频加载停滞，可能是网络问题');
        };
        
        this.audioEl.onsuspend = () => {
          console.warn('音频加载被暂停');
        };
        
        tryNext();
      } else {
        // ambient mode uses synth only
        if (!this.synth) return;
      }
    }
  }

  window.AudioManager = new AudioManagerCls();
})();


