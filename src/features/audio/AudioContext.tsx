import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AudioContextType {
  playCorrect: () => void;
  playIncorrect: () => void;
  playBonus: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

interface SoundFunction {
  (): void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [sounds, setSounds] = useState<{ [key: string]: SoundFunction }>({});
  const audioContextRef = useRef<AudioContext>();

  // Initialize audio context on first user interaction
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }
    return audioContextRef.current;
  };

  useEffect(() => {
    // Create oscillator-based sounds
    const createSound = (type: OscillatorType, frequency: number, duration: number) => {
      return () => {
        const ctx = initAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Create a smooth envelope
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
      };
    };

    const newSounds = {
      correct: createSound('sine', 523.25, 0.15), // High C - success sound
      incorrect: createSound('sawtooth', 196.0, 0.3), // Low G - error sound
      bonus: createSound('sine', 987.77, 0.3), // High B - achievement sound
      click: createSound('sine', 440, 0.1), // Simple click sound
    };

    setSounds(newSounds);

    return () => {
      // Cleanup for programmatic sounds - nothing to do as they're self-contained
    };
  }, []);

  const playSound = (soundName: keyof typeof sounds) => {
    if (!isMuted && sounds[soundName]) {
      sounds[soundName](); // SoundFunction is already a callable function
    }
  };

  const value = {
    playCorrect: () => playSound('correct'),
    playIncorrect: () => playSound('incorrect'),
    playBonus: () => playSound('bonus'),
    playClick: () => playSound('click'),
    isMuted,
    toggleMute: () => setIsMuted(prev => !prev),
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};
