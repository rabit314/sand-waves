  // ============ Audio System ============
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audio = {
    playTone(freq, type, duration, vol, detune=0) {
      if(audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if(detune) osc.frequency.exponentialRampToValueAtTime(detune, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    },
    noise(duration, vol) {
      if(audioCtx.state === 'suspended') audioCtx.resume();
      const bufferSize = audioCtx.sampleRate * duration;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      const gain = audioCtx.createGain();
      
      // Lowpass filter for explosion crunch
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noiseSource.start();
    },
    shoot() { this.playTone(150, 'square', 0.2, 0.05, 40); this.noise(0.2, 0.1); },
    hit() { this.playTone(80, 'sawtooth', 0.15, 0.15, 20); },
    explosion() { this.noise(0.8, 0.5); this.playTone(60, 'square', 0.6, 0.3, 10); },
    alert() { this.playTone(400, 'sine', 0.1, 0.1, 600); },
    bgm: null,
    startBGM() {
      if (this.bgm) return;
      if(audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(55, audioCtx.currentTime);
      
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.25;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      this.bgm = { osc, lfo };
    }
  };
