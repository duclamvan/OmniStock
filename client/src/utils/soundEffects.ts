// Professional barcode scanning sound effects using Web Audio API

export class SoundEffects {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
  }

  // Initialize audio context (call on user interaction)
  public async initAudio() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Professional success beep - higher frequency, shorter duration
  public async playSuccessBeep() {
    if (!this.audioContext) return;
    
    try {
      await this.initAudio();
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Success sound: 880Hz (A5 note), quick beep
      oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      // Quick fade in and out for crisp sound
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.error('Error playing success sound:', error);
    }
  }

  // Professional error beep - lower frequency, longer duration
  public async playErrorBeep() {
    if (!this.audioContext) return;
    
    try {
      await this.initAudio();
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Error sound: 220Hz (A3 note), longer beep
      oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      // Longer, lower volume for error
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing error sound:', error);
    }
  }

  // Double beep for already scanned items
  public async playDuplicateBeep() {
    if (!this.audioContext) return;
    
    try {
      await this.initAudio();
      
      // First beep
      const oscillator1 = this.audioContext.createOscillator();
      const gainNode1 = this.audioContext.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(this.audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(440, this.audioContext.currentTime);
      oscillator1.type = 'sine';
      
      gainNode1.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode1.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
      gainNode1.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.08);
      
      oscillator1.start(this.audioContext.currentTime);
      oscillator1.stop(this.audioContext.currentTime + 0.08);
      
      // Second beep (after short delay)
      const oscillator2 = this.audioContext.createOscillator();
      const gainNode2 = this.audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(this.audioContext.destination);
      
      oscillator2.frequency.setValueAtTime(440, this.audioContext.currentTime + 0.1);
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0, this.audioContext.currentTime + 0.1);
      gainNode2.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.11);
      gainNode2.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.18);
      
      oscillator2.start(this.audioContext.currentTime + 0.1);
      oscillator2.stop(this.audioContext.currentTime + 0.18);
    } catch (error) {
      console.error('Error playing duplicate sound:', error);
    }
  }

  // Notification sound for attention
  public async playNotificationSound() {
    if (!this.audioContext) return;
    
    try {
      await this.initAudio();
      
      // Two quick beeps at different frequencies
      const oscillator1 = this.audioContext.createOscillator();
      const gainNode1 = this.audioContext.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(this.audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(660, this.audioContext.currentTime);
      oscillator1.type = 'sine';
      
      gainNode1.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode1.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + 0.01);
      gainNode1.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.08);
      
      oscillator1.start(this.audioContext.currentTime);
      oscillator1.stop(this.audioContext.currentTime + 0.08);
      
      // Second beep
      const oscillator2 = this.audioContext.createOscillator();
      const gainNode2 = this.audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(this.audioContext.destination);
      
      oscillator2.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.1);
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0, this.audioContext.currentTime + 0.1);
      gainNode2.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + 0.11);
      gainNode2.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.18);
      
      oscillator2.start(this.audioContext.currentTime + 0.1);
      oscillator2.stop(this.audioContext.currentTime + 0.18);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  // Completion celebration sound
  public async playCompletionSound() {
    if (!this.audioContext) return;
    
    try {
      await this.initAudio();
      
      // Play ascending notes for completion
      const notes = [523, 659, 784]; // C5, E5, G5
      
      notes.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);
        
        const startTime = this.audioContext!.currentTime + (index * 0.1);
        
        oscillator.frequency.setValueAtTime(freq, startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.15);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      });
    } catch (error) {
      console.error('Error playing completion sound:', error);
    }
  }
}

// Create singleton instance
export const soundEffects = new SoundEffects();