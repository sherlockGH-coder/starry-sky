(() => {
  class RomanticPianoSynth {
    constructor(context) {
      this.context = context;
      this.masterGain = context.createGain();
      this.masterGain.gain.value = 0.0;
      this.started = false;
      
      // 创建更丰富的混响效果
      this.reverb = this.createLushReverb();
      this.reverbGain = context.createGain();
      this.reverbGain.gain.value = 0.45; // 增加混响深度
      
      // 创建多重延迟效果，营造空间感
      this.delay1 = context.createDelay(2.0);
      this.delay1.delayTime.value = 0.25;
      this.delay1Feedback = context.createGain();
      this.delay1Feedback.gain.value = 0.15;
      this.delay1Gain = context.createGain();
      this.delay1Gain.gain.value = 0.12;
      
      this.delay2 = context.createDelay(2.0);
      this.delay2.delayTime.value = 0.375;
      this.delay2Feedback = context.createGain();
      this.delay2Feedback.gain.value = 0.1;
      this.delay2Gain = context.createGain();
      this.delay2Gain.gain.value = 0.08;
      
      // 创建温暖的低通滤波器
      this.lowpass = context.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = 4500; // 更亮一些
      this.lowpass.Q.value = 0.6;
      
      // 轻微的高通滤波，保持清晰度
      this.highpass = context.createBiquadFilter();
      this.highpass.type = 'highpass';
      this.highpass.frequency.value = 60;
      this.highpass.Q.value = 0.3;
      
      // 添加合唱效果，增加丰富度
      this.chorus = this.createChorus();
      this.chorusGain = context.createGain();
      this.chorusGain.gain.value = 0.2;
      
      // 音频路由
      this.masterGain.connect(this.highpass);
      this.highpass.connect(this.lowpass);
      this.lowpass.connect(context.destination);
      
      // 混响路由
      this.lowpass.connect(this.reverbGain);
      this.reverbGain.connect(this.reverb);
      this.reverb.connect(context.destination);
      
      // 延迟效果路由
      this.lowpass.connect(this.delay1Gain);
      this.delay1Gain.connect(this.delay1);
      this.delay1.connect(this.delay1Feedback);
      this.delay1Feedback.connect(this.delay1);
      this.delay1.connect(context.destination);
      
      this.lowpass.connect(this.delay2Gain);
      this.delay2Gain.connect(this.delay2);
      this.delay2.connect(this.delay2Feedback);
      this.delay2Feedback.connect(this.delay2);
      this.delay2.connect(context.destination);
      
      // 合唱效果路由
      this.lowpass.connect(this.chorusGain);
      this.chorusGain.connect(this.chorus.input);
      this.chorus.output.connect(context.destination);
      
      // 更接近Yiruma风格的和弦进行（类似"River Flows in You"的和谐感）
      this.chordProgression = [
        [220.00, 261.63, 329.63, 440.00], // A minor (A, C, E, A) - 温柔开始
        [246.94, 293.66, 369.99, 493.88], // B minor (B, D, F#, B) 
        [293.66, 369.99, 440.00, 587.33], // D major (D, F#, A, D) - 明亮
        [329.63, 415.30, 493.88, 659.25], // E major (E, G#, B, E)
        [196.00, 261.63, 329.63, 392.00], // A minor (A, C, E, A) 低八度
        [220.00, 277.18, 349.23, 440.00], // A7 (A, C#, E, G) - 过渡和弦
        [293.66, 369.99, 440.00, 587.33], // D major (D, F#, A, D)
        [220.00, 261.63, 329.63, 440.00], // A minor (A, C, E, A) - 回到主调
      ];
      
      // 更接近Yiruma风格的柔美旋律线条
      this.melody = [
        // 第一段：温柔的开场
        { note: 523.25, duration: 2.0, velocity: 0.28 }, // C5 - 轻柔开始
        { note: 493.88, duration: 1.0, velocity: 0.25 }, // B4
        { note: 440.00, duration: 1.5, velocity: 0.3 },  // A4
        { note: 493.88, duration: 0.5, velocity: 0.22 }, // B4
        { note: 523.25, duration: 3.0, velocity: 0.32 }, // C5 - 长音
        
        // 第二段：情感递进
        { note: 587.33, duration: 1.5, velocity: 0.35 }, // D5 - 稍强
        { note: 659.25, duration: 1.0, velocity: 0.33 }, // E5
        { note: 587.33, duration: 0.75, velocity: 0.3 }, // D5
        { note: 523.25, duration: 0.75, velocity: 0.28 }, // C5
        { note: 493.88, duration: 2.5, velocity: 0.25 }, // B4 - 长音休止
        
        // 第三段：高潮部分
        { note: 783.99, duration: 1.0, velocity: 0.4 },  // G5 - 高音亮点
        { note: 698.46, duration: 0.75, velocity: 0.37 }, // F5
        { note: 659.25, duration: 0.75, velocity: 0.35 }, // E5
        { note: 587.33, duration: 1.5, velocity: 0.32 }, // D5
        { note: 523.25, duration: 1.0, velocity: 0.3 },  // C5
        { note: 493.88, duration: 1.0, velocity: 0.28 }, // B4
        { note: 440.00, duration: 3.0, velocity: 0.25 }, // A4 - 温柔结束
        
        // 第四段：装饰性尾声
        { note: 659.25, duration: 0.5, velocity: 0.2 },  // E5 - 很轻
        { note: 587.33, duration: 0.5, velocity: 0.22 }, // D5
        { note: 523.25, duration: 1.0, velocity: 0.25 }, // C5
        { note: 440.00, duration: 2.0, velocity: 0.2 },  // A4 - 渐弱结束
      ];
      
      // 添加琶音伴奏模式
      this.arpeggioPattern = [0, 2, 1, 3, 2, 1]; // 和弦音符的演奏顺序
      this.arpeggioIndex = 0;
      this.nextArpeggioTime = 0;
      
      this.currentChordIndex = 0;
      this.currentMelodyIndex = 0;
      this.nextChordTime = 0;
      this.nextMelodyTime = 0;
      this.chordDuration = 8.0; // 更长的和弦持续时间，营造宁静感
      this.tempo = 1.0; // Yiruma风格的中等节拍
      
      this.activeNotes = new Map();
    }
    
    createChorus() {
      // 创建合唱效果
      const chorusInput = this.context.createGain();
      const chorusDelay1 = this.context.createDelay(0.1);
      const chorusDelay2 = this.context.createDelay(0.1);
      const chorusLFO1 = this.context.createOscillator();
      const chorusLFO2 = this.context.createOscillator();
      const chorusDepth1 = this.context.createGain();
      const chorusDepth2 = this.context.createGain();
      const chorusMix = this.context.createGain();
      const chorusOutput = this.context.createGain();
      
      chorusLFO1.frequency.value = 0.5;
      chorusLFO2.frequency.value = 0.7;
      chorusDepth1.gain.value = 0.002;
      chorusDepth2.gain.value = 0.003;
      chorusMix.gain.value = 0.5;
      
      // 连接LFO到延迟时间调制
      chorusLFO1.connect(chorusDepth1);
      chorusLFO2.connect(chorusDepth2);
      chorusDepth1.connect(chorusDelay1.delayTime);
      chorusDepth2.connect(chorusDelay2.delayTime);
      
      // 设置基础延迟时间
      chorusDelay1.delayTime.value = 0.02;
      chorusDelay2.delayTime.value = 0.03;
      
      // 连接音频路径
      chorusInput.connect(chorusDelay1);
      chorusInput.connect(chorusDelay2);
      chorusDelay1.connect(chorusMix);
      chorusDelay2.connect(chorusMix);
      chorusMix.connect(chorusOutput);
      
      // 启动LFO
      chorusLFO1.start();
      chorusLFO2.start();
      
      // 返回输入和输出节点
      return {
        input: chorusInput,
        output: chorusOutput
      };
    }
    
    createLushReverb() {
      const convolver = this.context.createConvolver();
      const length = this.context.sampleRate * 3.5; // 更长的混响时间
      const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          // 更复杂的衰减曲线，模拟大厅混响
          const decay = Math.pow(1 - i / length, 1.5);
          const earlyReflection = i < length * 0.1 ? Math.sin(i * 0.01) * 0.3 : 0;
          channelData[i] = (Math.random() * 2 - 1) * decay * 0.15 + earlyReflection;
        }
      }
      
      convolver.buffer = impulse;
      return convolver;
    }
    
    createRomanticPianoNote(frequency, startTime, duration, velocity = 0.3) {
      // 创建更真实的钢琴音色，模拟Yiruma的钢琴演奏风格
      
      // 确保时间参数有效，防止RangeError
      const now = this.context.currentTime;
      const validStartTime = Math.max(startTime, now + 0.01); // 至少比当前时间晚0.01秒
      const validDuration = Math.max(duration, 0.1); // 至少0.1秒的持续时间
      
      // 使用多个振荡器模拟真实钢琴的复杂音色
      // 基频 - 使用三角波模拟钢琴的温暖基音
      const fundamental = this.context.createOscillator();
      fundamental.type = 'triangle'; // 三角波比锯齿波更接近钢琴音色
      fundamental.frequency.value = frequency;
      
      // 重要谐波 - 钢琴的特征谐波
      const harmonic2 = this.context.createOscillator();
      harmonic2.type = 'sine';
      harmonic2.frequency.value = frequency * 2;
      
      const harmonic3 = this.context.createOscillator();
      harmonic3.type = 'sine';
      harmonic3.frequency.value = frequency * 3;
      
      const harmonic4 = this.context.createOscillator();
      harmonic4.type = 'sine';
      harmonic4.frequency.value = frequency * 4;
      
      // 添加轻微的不和谐谐波，增加真实感
      const subHarmonic = this.context.createOscillator();
      subHarmonic.type = 'sine';
      subHarmonic.frequency.value = frequency * 0.5; // 低八度
      
      // 更细腻的颤音，模拟手指在琴键上的自然颤动
      const vibrato = this.context.createOscillator();
      vibrato.type = 'sine';
      vibrato.frequency.value = 2.8; // 更慢更自然的颤音
      const vibratoGain = this.context.createGain();
      vibratoGain.gain.value = 0.8; // 轻微的频率调制
      
      // 音色调制 - 模拟钢琴的音色变化和共鸣
      const tremolo = this.context.createOscillator();
      tremolo.type = 'sine';
      tremolo.frequency.value = 4.5; // 温柔的音量调制
      const tremoloGain = this.context.createGain();
      tremoloGain.gain.value = 0.015; // 非常轻微的音量调制
      
      // 连接颤音
      vibrato.connect(vibratoGain);
      vibratoGain.connect(fundamental.frequency);
      vibratoGain.connect(harmonic2.frequency);
      
      tremolo.connect(tremoloGain);
      
      // 为每个振荡器创建独立的增益控制
      const fundamentalGain = this.context.createGain();
      const harmonic2Gain = this.context.createGain();
      const harmonic3Gain = this.context.createGain();
      const harmonic4Gain = this.context.createGain();
      const subHarmonicGain = this.context.createGain();
      
      // 钢琴式的音色平衡 - 基音突出，谐波递减
      fundamentalGain.gain.value = velocity * 1.0;   // 基音最强
      harmonic2Gain.gain.value = velocity * 0.6;     // 八度谐波较强
      harmonic3Gain.gain.value = velocity * 0.25;    // 五度谐波中等
      harmonic4Gain.gain.value = velocity * 0.1;     // 高谐波较弱
      subHarmonicGain.gain.value = velocity * 0.15;  // 低音共鸣
      
      // 添加音量调制
      tremoloGain.connect(fundamentalGain.gain);
      tremoloGain.connect(harmonic2Gain.gain);
      
      // 连接音频图
      fundamental.connect(fundamentalGain);
      harmonic2.connect(harmonic2Gain);
      harmonic3.connect(harmonic3Gain);
      harmonic4.connect(harmonic4Gain);
      subHarmonic.connect(subHarmonicGain);
      
      fundamentalGain.connect(this.masterGain);
      harmonic2Gain.connect(this.masterGain);
      harmonic3Gain.connect(this.masterGain);
      harmonic4Gain.connect(this.masterGain);
      subHarmonicGain.connect(this.masterGain);
      
      // 钢琴风格的 ADSR 包络 - 快速起音，自然衰减
      const attackTime = 0.08;      // 钢琴的快速起音
      const decayTime = 0.3;        // 较快的初始衰减
      const sustainLevel = velocity * 0.4; // 较低的持续音量
      const releaseTime = Math.min(validDuration * 0.6, 2.5); // 自然的释放，不超过音符长度的60%
      
      // 基频包络 - 钢琴风格的动态
      fundamentalGain.gain.setValueAtTime(0, validStartTime);
      fundamentalGain.gain.exponentialRampToValueAtTime(velocity * 1.0, validStartTime + attackTime);
      fundamentalGain.gain.exponentialRampToValueAtTime(sustainLevel, validStartTime + attackTime + decayTime);
      fundamentalGain.gain.setValueAtTime(sustainLevel, validStartTime + validDuration - releaseTime);
      fundamentalGain.gain.exponentialRampToValueAtTime(0.001, validStartTime + validDuration);
      
      // 谐波包络 - 不同的衰减特性模拟真实钢琴
      harmonic2Gain.gain.setValueAtTime(0, validStartTime);
      harmonic2Gain.gain.exponentialRampToValueAtTime(velocity * 0.6, validStartTime + attackTime * 1.1);
      harmonic2Gain.gain.exponentialRampToValueAtTime(sustainLevel * 0.6, validStartTime + attackTime + decayTime);
      harmonic2Gain.gain.setValueAtTime(sustainLevel * 0.6, validStartTime + validDuration - releaseTime * 0.8);
      harmonic2Gain.gain.exponentialRampToValueAtTime(0.001, validStartTime + validDuration);
      
      harmonic3Gain.gain.setValueAtTime(0, validStartTime);
      harmonic3Gain.gain.exponentialRampToValueAtTime(velocity * 0.25, validStartTime + attackTime * 0.9);
      harmonic3Gain.gain.exponentialRampToValueAtTime(sustainLevel * 0.3, validStartTime + attackTime + decayTime * 0.7);
      harmonic3Gain.gain.setValueAtTime(sustainLevel * 0.3, validStartTime + validDuration - releaseTime * 1.2);
      harmonic3Gain.gain.exponentialRampToValueAtTime(0.001, validStartTime + validDuration);
      
      harmonic4Gain.gain.setValueAtTime(0, validStartTime);
      harmonic4Gain.gain.exponentialRampToValueAtTime(velocity * 0.1, validStartTime + attackTime * 0.8);
      harmonic4Gain.gain.exponentialRampToValueAtTime(sustainLevel * 0.15, validStartTime + attackTime + decayTime * 0.5);
      harmonic4Gain.gain.setValueAtTime(sustainLevel * 0.15, validStartTime + validDuration - releaseTime * 1.5);
      harmonic4Gain.gain.exponentialRampToValueAtTime(0.001, validStartTime + validDuration);
      
      // 低频共鸣 - 钢琴的琴体共鸣效果
      subHarmonicGain.gain.setValueAtTime(0, validStartTime);
      subHarmonicGain.gain.exponentialRampToValueAtTime(velocity * 0.15, validStartTime + attackTime * 1.5);
      subHarmonicGain.gain.exponentialRampToValueAtTime(sustainLevel * 0.2, validStartTime + attackTime + decayTime * 1.3);
      subHarmonicGain.gain.setValueAtTime(sustainLevel * 0.2, validStartTime + validDuration - releaseTime * 0.7);
      subHarmonicGain.gain.exponentialRampToValueAtTime(0.001, validStartTime + validDuration);
      
      // 启动所有振荡器
      vibrato.start(validStartTime);
      tremolo.start(validStartTime);
      fundamental.start(validStartTime);
      harmonic2.start(validStartTime);
      harmonic3.start(validStartTime);
      harmonic4.start(validStartTime);
      subHarmonic.start(validStartTime);
      
      // 停止所有振荡器
      vibrato.stop(validStartTime + validDuration);
      tremolo.stop(validStartTime + validDuration);
      fundamental.stop(validStartTime + validDuration);
      harmonic2.stop(validStartTime + validDuration);
      harmonic3.stop(validStartTime + validDuration);
      harmonic4.stop(validStartTime + validDuration);
      subHarmonic.stop(validStartTime + validDuration);
      
      return { fundamental, harmonic2, harmonic3, harmonic4, subHarmonic, vibrato, tremolo };
    }
    
    playChord(chordNotes, startTime, duration) {
      chordNotes.forEach((frequency, index) => {
        // 更细腻的音量控制
        const velocity = 0.08 + (index === 0 ? 0.04 : index === 2 ? 0.03 : 0.02);
        this.createRomanticPianoNote(frequency, startTime, duration, velocity);
      });
    }
    
    playMelodyNote(frequency, startTime, duration, velocity = 0.35) {
      this.createRomanticPianoNote(frequency, startTime, duration, velocity);
    }
    
    playArpeggio(chordNotes, startTime) {
      const noteIndex = this.arpeggioPattern[this.arpeggioIndex % this.arpeggioPattern.length];
      if (noteIndex < chordNotes.length) {
        const frequency = chordNotes[noteIndex];
        this.createRomanticPianoNote(frequency, startTime, 0.8, 0.12);
      }
      this.arpeggioIndex++;
    }
    
    scheduleMusic() {
      const now = this.context.currentTime;
      const scheduleAhead = 8.0; // 提前更多时间安排音符
      
      // 安排和弦 - 更柔和的节奏
      while (this.nextChordTime < now + scheduleAhead) {
        const chord = this.chordProgression[this.currentChordIndex];
        this.playChord(chord, this.nextChordTime, this.chordDuration);
        
        this.nextChordTime += this.chordDuration;
        this.currentChordIndex = (this.currentChordIndex + 1) % this.chordProgression.length;
      }
      
      // 安排琶音伴奏
      while (this.nextArpeggioTime < now + scheduleAhead) {
        const chord = this.chordProgression[this.currentChordIndex % this.chordProgression.length];
        this.playArpeggio(chord, this.nextArpeggioTime);
        
        this.nextArpeggioTime += 0.4; // 琶音间隔
      }
      
      // 安排主旋律 - 更有表情的演奏
      while (this.nextMelodyTime < now + scheduleAhead) {
        const melodyNote = this.melody[this.currentMelodyIndex];
        const noteDuration = melodyNote.duration * this.tempo;
        const velocity = melodyNote.velocity || 0.35;
        
        this.playMelodyNote(melodyNote.note, this.nextMelodyTime + 2.0, noteDuration, velocity);
        
        this.nextMelodyTime += noteDuration;
        this.currentMelodyIndex = (this.currentMelodyIndex + 1) % this.melody.length;
      }
    }

    start() {
      if (this.started) return;
      this.started = true;
      
      const now = this.context.currentTime;
      this.nextChordTime = now + 0.5;
      this.nextMelodyTime = now + 2.5;
      this.nextArpeggioTime = now + 1.0;
      
      // 更柔和的淡入效果
      this.masterGain.gain.cancelScheduledValues(0);
      this.masterGain.gain.setValueAtTime(0.0, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.5, now + 4.0);
      
      // 开始音乐调度
      this.scheduleMusic();
      
      // 定期调度新的音符
      this.schedulerInterval = setInterval(() => {
        if (this.started) {
          this.scheduleMusic();
        }
      }, 1000);
    }

    stop() {
      if (!this.started) return;
      this.started = false;
      
      const now = this.context.currentTime;
      this.masterGain.gain.cancelScheduledValues(0);
      this.masterGain.gain.exponentialRampToValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
      }
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
      this.synth = new RomanticPianoSynth(this.context);
      
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
      
      // 优先尝试原始音乐，即使在云环境下
      this.setTrack('yiruma');
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
        // 优先尝试播放原始音乐（Yiruma），如果失败再使用合成器
        if (this.currentMode === 'yiruma') {
          try {
            console.log('尝试播放 Yiruma 音乐，当前状态:', this.audioEl.readyState, this.audioEl.src);
            
            // 如果音频还没加载完成，等待一下
            if (this.audioEl.readyState < 2) {
              console.log('音频未完全加载，等待加载...');
              await this.waitForAudioLoad();
            }
            
            await this.audioEl.play();
            console.log('Yiruma 音乐播放成功');
            this.playing = true;
            return true;
          } catch (e) {
            console.error('Yiruma 音乐播放失败:', e);
            // 根据不同错误类型提供更精确的处理
            if (e.name === 'NotAllowedError') {
              if (this.onError) this.onError('音乐播放被浏览器拦截，请再点一次"音乐"按钮');
              return false;
            } else {
              // 其他错误则自动切换到合成器模式
              let errorMessage = '网络或音频文件问题，已切换到浪漫钢琴合成器';
              if (e.name === 'NotSupportedError') {
                errorMessage = '音频格式不支持，已切换到浪漫钢琴合成器';
              } else if (e.message && e.message.includes('音频加载超时')) {
                errorMessage = '网络较慢，音频加载超时，已切换到浪漫钢琴合成器';
              } else if (e.name === 'AbortError') {
                errorMessage = '音频加载被中断，已切换到浪漫钢琴合成器';
              } else if (e.message && (
                e.message.includes('fetch') ||
                e.message.includes('network') ||
                e.message.includes('CORS') ||
                e.message.includes('Failed to load')
              )) {
                errorMessage = '网络连接问题或跨域限制，已切换到浪漫钢琴合成器';
              }
              
              if (this.onError) this.onError(errorMessage);
              
              // 自动切换到合成器模式
              console.log('切换到浪漫钢琴合成器模式');
              this.currentMode = 'ambient';
              // 继续执行合成器启动逻辑
            }
          }
        }
        
        // 启动合成器（ambient模式或从yiruma模式fallback过来的）
        if (this.currentMode === 'ambient') {
          if (!this.synthStarted) {
            this.synth.start();
            this.synthStarted = true;
          }
          this.playing = true;
          return true;
        }
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
            console.warn('所有音频源都加载失败，切换到浪漫钢琴合成器模式');
            this.currentMode = 'ambient';
            if (this.onError) this.onError('音频文件无法加载，已切换到浪漫钢琴合成器');
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
