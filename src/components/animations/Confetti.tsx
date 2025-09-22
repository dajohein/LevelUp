import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const fall = keyframes`
  0% { transform: translateY(-100vh) rotate(0deg); }
  100% { transform: translateY(100vh) rotate(360deg); }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1000;
`;

interface Particle {
  id: number;
  x: number;
  color: string;
  rotation: number;
  scale: number;
  speed: number;
}

const ParticleElement = styled.div<{
  x: number;
  color: string;
  rotation: number;
  scale: number;
  speed: number;
}>`
  position: absolute;
  top: 0;
  left: ${props => props.x}%;
  width: 10px;
  height: 10px;
  background-color: ${props => props.color};
  border-radius: ${() => (Math.random() > 0.5 ? '50%' : '0')};
  animation: ${fall} ${props => props.speed}s linear forwards;
  transform: scale(${props => props.scale});
`;

const generateParticle = (id: number): Particle => ({
  id,
  x: Math.random() * 100,
  color: ['#FFD700', '#FF6B6B', '#4CAF50', '#64B5F6', '#BA68C8'][Math.floor(Math.random() * 5)],
  rotation: Math.random() * 360,
  scale: 0.5 + Math.random(),
  speed: 3 + Math.random() * 2,
});

interface ConfettiProps {
  count?: number;
  duration?: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ count = 50, duration = 3000 }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setParticles(Array.from({ length: count }, (_, i) => generateParticle(i)));

    timeoutRef.current = setTimeout(() => {
      setParticles([]);
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [count, duration]);

  return (
    <Container>
      {particles.map(particle => (
        <ParticleElement
          key={particle.id}
          x={particle.x}
          color={particle.color}
          rotation={particle.rotation}
          scale={particle.scale}
          speed={particle.speed}
        />
      ))}
    </Container>
  );
};
