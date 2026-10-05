/**
 * High-performance Click Sound Effects Utility
 * Uses Web Audio API for zero-latency, overlapping playback with HTML5 Audio pool fallback.
 */

const LOCAL_SOUND_URL = '/audio/click-tick.mp3';
const CLOUDINARY_SOUND_URL = 'https://res.cloudinary.com/ew2a27vg/video/upload/v1791191603/Tick_-_Sound_Effect_HD_-_House_Of_Sound_Effects.mp3';

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private audioPool: HTMLAudioElement[] = [];
  private poolIndex = 0;
  private isEnabled = true;
  private isLoaded = false;
  private isPreloading = false;
  private volume = 0.45;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('manufacture_ai_sound_enabled');
      if (stored !== null) {
        this.isEnabled = stored === 'true';
      }

      // Initialize audio pool for instant fallback
      const poolSize = 6;
      for (let i = 0; i < poolSize; i++) {
        const audio = new Audio(LOCAL_SOUND_URL);
        audio.preload = 'auto';
        audio.volume = this.volume;
        // Fallback to Cloudinary URL if local file fails
        audio.onerror = () => {
          audio.src = CLOUDINARY_SOUND_URL;
        };
        this.audioPool.push(audio);
      }

      this.preloadWebAudio();
    }
  }

  public subscribe(listener: (enabled: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.isEnabled));
  }

  private async preloadWebAudio() {
    if (this.isPreloading || this.isLoaded || typeof window === 'undefined') return;
    this.isPreloading = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }

      // Fetch audio data (try local first, fallback to remote Cloudinary URL)
      let response: Response;
      try {
        response = await fetch(LOCAL_SOUND_URL);
        if (!response.ok) throw new Error('Local audio not found');
      } catch {
        response = await fetch(CLOUDINARY_SOUND_URL);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      this.isLoaded = true;
    } catch {
      // Graceful fallback to HTML5 Audio pool
      this.isLoaded = false;
    } finally {
      this.isPreloading = false;
    }
  }

  public playClick(pitchJitter = false) {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Ensure AudioContext is ready or resumed on user gesture
    if (!this.audioCtx && (window.AudioContext || (window as any).webkitAudioContext)) {
      this.preloadWebAudio();
    }

    // Try Web Audio API first for zero-latency instant tick
    if (this.audioCtx && this.audioBuffer) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffer;

        // Subtle realistic mechanical click pitch jitter
        if (pitchJitter) {
          source.playbackRate.value = 0.97 + Math.random() * 0.06;
        }

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = this.volume;

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        source.start(0);
        return;
      } catch {
        // Fall through to HTML5 audio pool
      }
    }

    // HTML5 Audio pool fallback
    try {
      const audio = this.audioPool[this.poolIndex];
      this.poolIndex = (this.poolIndex + 1) % this.audioPool.length;
      audio.currentTime = 0;
      audio.volume = this.volume;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Blocked by browser autoplay before first user interaction
        });
      }
    } catch {
      // Audio play suppressed
    }
  }

  public toggleSound(): boolean {
    this.isEnabled = !this.isEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('manufacture_ai_sound_enabled', String(this.isEnabled));
    }
    if (this.isEnabled) {
      // Play a confirmation click when turning sound back on
      this.playClick(false);
    }
    this.notify();
    return this.isEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('manufacture_ai_sound_enabled', String(enabled));
    }
    this.notify();
  }

  public getSoundEnabled(): boolean {
    return this.isEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audioPool.forEach(a => {
      a.volume = this.volume;
    });
  }

  public getVolume(): number {
    return this.volume;
  }
}

export const soundManager = new SoundManager();

