
import { ActiveOscillator } from '../types';

// A tiny silent MP3 base64 string.
// This is required to keep the audio engine alive on iOS/Android when the screen is off.
const SILENT_MP3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjkxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASCC8iEAAAAAAA//OEZAAAAAAIAAAAAAAAEAAABHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEZAAAAAAIAAAAAAAAEAAABHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

type StateCallback = (isPlaying: boolean) => void;

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeOscillators: Map<string, ActiveOscillator> = new Map();
  private backgroundAudio: HTMLAudioElement | null = null;
  private onStateChange: StateCallback | null = null;
  
  // The magic number for "Inaudible but Active"
  private readonly SUBLIMINAL_GAIN = 0.0001;
  private readonly AUDIBLE_GAIN = 0.1; 
  private isScalarMode: boolean = false;
  private currentTargetGain: number = 0.1; // Tracks what the gain SHOULD be when playing

  public isGlobalPlaying: boolean = false;

  constructor() {
    // Lazy initialization handled in init()
  }

  public setCallback(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private notifyStateChange(isPlaying: boolean) {
    this.isGlobalPlaying = isPlaying;
    if (this.onStateChange) {
      this.onStateChange(isPlaying);
    }
  }

  public init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Master Gain
      this.masterGain = this.audioContext.createGain();
      // Start at 0 for fade-in
      this.masterGain.gain.value = 0;
      this.currentTargetGain = this.SUBLIMINAL_GAIN; // Default start

      // Analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Route
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.notifyStateChange(true);
  }

  public enableBackgroundMode() {
    if (!this.backgroundAudio) {
      this.backgroundAudio = new Audio(SILENT_MP3);
      this.backgroundAudio.loop = true;
      this.backgroundAudio.volume = 0.01; 
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Ressáurea',
          artist: 'Frequências Ativas',
          album: 'Reprogramação Mental',
          artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3663/3663335.png', sizes: '512x512', type: 'image/png' }]
        });

        navigator.mediaSession.setActionHandler('play', async () => this.resumeGlobal());
        navigator.mediaSession.setActionHandler('pause', () => this.pauseGlobal());
        navigator.mediaSession.setActionHandler('stop', () => this.pauseGlobal());
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    }

    this.backgroundAudio.play().then(() => {
        this.notifyStateChange(true);
    }).catch(e => console.log("Background audio interaction needed", e));
  }

  public async resumeGlobal() {
    if (this.backgroundAudio) this.backgroundAudio.play();
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      // Smooth Fade In
      if (this.masterGain) {
          const now = this.audioContext.currentTime;
          this.masterGain.gain.cancelScheduledValues(now);
          this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
          this.masterGain.gain.linearRampToValueAtTime(this.currentTargetGain, now + 1.5); // 1.5s fade in
      }
    }
    this.notifyStateChange(true);
  }

  public async pauseGlobal() {
    if (this.audioContext && this.masterGain) {
        // Smooth Fade Out
        const now = this.audioContext.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        // Ramp to 0 over 0.8 seconds
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
        
        // Wait for fade to finish before suspending
        setTimeout(() => {
            if (this.backgroundAudio) this.backgroundAudio.pause();
            if (this.audioContext) this.audioContext.suspend();
            this.notifyStateChange(false);
        }, 850);
    } else {
        if (this.backgroundAudio) this.backgroundAudio.pause();
        this.notifyStateChange(false);
    }
  }

  public enableScalarMode(enabled: boolean) {
    if (this.isScalarMode === enabled) return;
    this.isScalarMode = enabled;
    
    // We need to restart active oscillators to apply the new architecture
    // Force restart current oscillators to apply the effect immediately
    if (this.activeOscillators.size > 0) {
        const currentActive = Array.from(this.activeOscillators.entries());
        currentActive.forEach(([id, active]) => {
            const hz = active.oscillator.frequency.value;
            // Immediate stop without fade to prevent overlapping phase issues
            if (active.gain) {
                active.gain.disconnect();
                active.oscillator.stop();
            }
            this.activeOscillators.delete(id);
            
            // Restart with new mode
            this.playFrequency(id, hz);
        });
    }
  }

  public playFrequency(id: string, hz: number) {
    if (!this.audioContext || !this.masterGain || !this.analyser) {
      this.init();
    }

    // If context was suspended (and we are adding a new frequency), we should wake it up
    // But respecting the global play state. If global is paused, we just add it to active list?
    // For now, assume adding a frequency implies desire to play.
    if (this.audioContext?.state === 'suspended') {
      this.resumeGlobal();
    }

    // If already playing, do nothing.
    if (this.activeOscillators.has(id)) return; 

    const ctx = this.audioContext!;
    
    // --- SCALAR WAVE ARCHITECTURE (Zero Point) ---
    // If enabled, we create TWO signal paths. 
    // Left: Normal Phase. Right: Inverted Phase (-180 deg).
    // This creates a standing wave potential between headphones.
    
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, ctx.currentTime);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, ctx.currentTime);
    mainGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 1);

    if (this.isScalarMode) {
        // SCALAR MODE: STEREO SPLIT WITH PHASE INVERSION
        const merger = ctx.createChannelMerger(2);
        
        // Left Channel (Normal)
        const leftPanner = ctx.createStereoPanner();
        leftPanner.pan.value = -1; // Full Left
        
        // Right Channel (Inverted Phase)
        const rightPanner = ctx.createStereoPanner();
        rightPanner.pan.value = 1; // Full Right
        
        // Inverter Gain (Multiplies signal by -1)
        const inverter = ctx.createGain();
        inverter.gain.value = -1; 

        // Connections
        osc.connect(mainGain);
        
        // Path L
        mainGain.connect(leftPanner);
        leftPanner.connect(merger, 0, 0); // Connect to input 0 (Left)
        
        // Path R (Inverted)
        mainGain.connect(inverter);
        inverter.connect(rightPanner);
        rightPanner.connect(merger, 0, 1); // Connect to input 1 (Right)

        // Merge to Analyser
        merger.connect(this.analyser!);
        
        // Store references for cleanup
        this.activeOscillators.set(id, {
            id,
            oscillator: osc,
            gain: mainGain,
            scalarGain: inverter // Stored to ensure it's not garbage collected
        });

    } else {
        // NORMAL MODE (Mono/Center)
        osc.connect(mainGain);
        mainGain.connect(this.analyser!);
        
        this.activeOscillators.set(id, {
            id,
            oscillator: osc,
            gain: mainGain
        });
    }

    osc.start();
  }

  public stopFrequency(id: string) {
    const active = this.activeOscillators.get(id);
    if (active && this.audioContext) {
      // Fade out individual frequency
      active.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
      active.gain.gain.setValueAtTime(active.gain.gain.value, this.audioContext.currentTime);
      active.gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
      
      const oscToStop = active.oscillator;
      const gainToDisconnect = active.gain;
      const scalarGainToDisconnect = active.scalarGain;

      setTimeout(() => {
        oscToStop.stop();
        oscToStop.disconnect();
        gainToDisconnect.disconnect();
        if (scalarGainToDisconnect) scalarGainToDisconnect.disconnect();
      }, 550);
      
      this.activeOscillators.delete(id);
    }
  }

  public async stopAll() {
    // Fade out master
    await this.pauseGlobal(); 
    // Then kill oscillators
    this.activeOscillators.forEach((_, id) => {
        // We can just stop them since master is muted
        const active = this.activeOscillators.get(id);
        if (active) {
            active.oscillator.stop();
            active.oscillator.disconnect();
            active.gain.disconnect();
        }
    });
    this.activeOscillators.clear();
    // Reset gain for next play? No, resumeGlobal handles fade in.
  }

  public setSubliminalMode(isSubliminal: boolean) {
    if (!this.masterGain || !this.audioContext) return;
    this.currentTargetGain = isSubliminal ? this.SUBLIMINAL_GAIN : this.AUDIBLE_GAIN;
    
    // Apply immediate if currently playing
    if (this.audioContext.state === 'running') {
        this.masterGain.gain.setTargetAtTime(this.currentTargetGain, this.audioContext.currentTime, 0.5);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getActiveCount(): number {
    return this.activeOscillators.size;
  }

  // --- DOWNLOAD FEATURE ---
  public async exportFrequencyToFile(hz: number, filename: string, mode: 'auto' | 'ask' = 'auto') {
    const durationSeconds = 300; 
    const sampleRate = 44100;
    
    const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);
    
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    
    const gain = offlineCtx.createGain();
    gain.gain.value = 0.5; 
    
    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    
    osc.start();
    
    const buffer = await offlineCtx.startRendering();
    
    const wavData = this.bufferToWave(buffer, buffer.length);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    const cleanFilename = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${hz}hz.wav`;

    if (mode === 'ask' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: cleanFilename,
          types: [{
            description: 'WAV Audio File',
            accept: { 'audio/wav': ['.wav'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return; 
      } catch (err) {
        console.log("Save Picker cancelled or failed, falling back to auto.");
        if ((err as Error).name === 'AbortError') return;
      }
    }
    
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    document.body.appendChild(anchor);
    anchor.style.display = 'none';
    anchor.href = url;
    anchor.download = cleanFilename;
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }

  private bufferToWave(abuffer: AudioBuffer, len: number) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;
  
    setUint32(0x46464952); 
    setUint32(length - 8); 
    setUint32(0x45564157); 
  
    setUint32(0x20746d66); 
    setUint32(16); 
    setUint16(1); 
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); 
    setUint16(numOfChan * 2); 
    setUint16(16); 
  
    setUint32(0x61746164); 
    setUint32(length - pos - 4); 
  
    for (i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i));
  
    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset])); 
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; 
        view.setInt16(pos, sample, true); 
        pos += 2;
      }
      offset++; 
    }
  
    function setUint16(data: any) {
      view.setUint16(pos, data, true);
      pos += 2;
    }
  
    function setUint32(data: any) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  
    return buffer;
  }
}

export const audioEngine = new AudioEngine();
