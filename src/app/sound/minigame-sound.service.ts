import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MinigameSoundService {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext not supported:', error);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine', volume: number = 0.2) {
    if (!this.audioContext) return;

    try {
      frequencies.forEach(freq => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);
        
        oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext!.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + duration);
        
        oscillator.start(this.audioContext!.currentTime);
        oscillator.stop(this.audioContext!.currentTime + duration);
      });
    } catch (error) {
      console.warn('Error playing chord:', error);
    }
  }

  // Successful pass - ascending happy tone
  playSuccessfulPass() {
    this.playChord([523.25, 659.25, 783.99], 0.3, 'sine', 0.25); // C5, E5, G5
  }

  // Wrong pass - descending sad tone
  playWrongPass() {
    this.playChord([392, 349.23, 311.13, 277.18], 0.5, 'sawtooth', 0.25); // G4, F4, D#4, C#4 - sad descending
  }

  // Goal scored - celebratory ascending scale
  playGoalScored() {
    this.playChord([523.25, 659.25, 783.99, 1046.50], 0.6, 'sine', 0.3); // C5, E5, G5, C6
    setTimeout(() => {
      this.playChord([659.25, 783.99, 1046.50, 1318.51], 0.5, 'sine', 0.25); // E5, G5, C6, E6
    }, 200);
  }

  // Save - quick sharp sound
  playSave() {
    this.playTone(600, 0.15, 'square', 0.3);
    setTimeout(() => {
      this.playTone(400, 0.1, 'square', 0.25);
    }, 80);
  }

  // Failed save - sad descending sound
  playFailedSave() {
    this.playChord([300, 250, 200, 150], 0.8, 'sawtooth', 0.3); // Sad descending
    setTimeout(() => {
      this.playChord([200, 150, 100], 0.6, 'sawtooth', 0.25); // Even sadder
    }, 200);
  }

  // Success tackle - solid thud
  playSuccessTackle() {
    this.playTone(150, 0.3, 'sawtooth', 0.4);
    setTimeout(() => {
      this.playTone(200, 0.2, 'sawtooth', 0.3);
    }, 150);
  }

  // Wrong tackle - buzzer sound
  playWrongTackle() {
    this.playTone(300, 0.15, 'square', 0.3);
    setTimeout(() => {
      this.playTone(250, 0.15, 'square', 0.3);
    }, 60);
    setTimeout(() => {
      this.playTone(200, 0.15, 'square', 0.3);
    }, 120);
  }
}
