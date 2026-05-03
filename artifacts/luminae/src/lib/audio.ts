class GameAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    this.muted = localStorage.getItem('luminae_muted') === 'true';
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('luminae_muted', String(this.muted));
    return this.muted;
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playCrystalPicked() {
    this.playTone(880, 'sine', 0.2, 0.05);
  }

  playCardPurchased() {
    this.playTone(523.25, 'sine', 0.1, 0.05); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.3, 0.05), 50); // E5
  }

  playTurnStart() {
    this.playTone(440, 'triangle', 0.4, 0.05); // A4
  }

  playWin() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'square', 0.4, 0.1), i * 150);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }
}

export const gameAudio = new GameAudio();
