import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Season } from '../types';

interface SeasonalEffectsProps {
  season: Season;
}

const GenerateParticles = ({ count, color, size, speedY, speedX, area, opacity = 0.8, shape = 'circle' }: any) => {
  const ref = useRef<THREE.Points>(null);
  
  // Create initial positions with more spread
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * area;     // x
      pos[i * 3 + 1] = Math.random() * area * 0.8 + 2;   // y (start higher)
      pos[i * 3 + 2] = (Math.random() - 0.5) * area; // z
    }
    return pos;
  }, [count, area]);

  // Random offsets for individual movement feel
  const seeds = useMemo(() => {
    return new Float32Array(count).map(() => Math.random() * Math.PI * 2);
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const t = state.clock.elapsedTime;
        const seed = seeds[i];

        // Gravity / Movement
        positions[i * 3 + 1] -= speedY * delta * (1 + Math.sin(seed + t) * 0.2); // Varied fall speed
        
        // Wind / Sway
        positions[i * 3] += Math.sin(t * 0.5 + seed) * speedX * delta; 
        positions[i * 3 + 2] += Math.cos(t * 0.3 + seed) * speedX * delta;

        // Reset if below ground or out of bounds
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = area * 0.6;
          positions[i * 3] = (Math.random() - 0.5) * area;
          positions[i * 3 + 2] = (Math.random() - 0.5) * area;
        }
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={opacity}
        alphaTest={0.001}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

export const SeasonalEffects: React.FC<SeasonalEffectsProps> = ({ season }) => {
  switch (season) {
    case Season.Spring:
      // Sakura Petals: Pink, gentle fall
      return <GenerateParticles count={400} color="#FFE4E1" size={0.12} speedY={0.8} speedX={0.5} area={40} />;
    case Season.Summer:
      // Fireflies: Yellow/Green, floating up slightly or hovering
      return <GenerateParticles count={150} color="#ccff00" size={0.15} speedY={-0.1} speedX={0.2} area={40} opacity={0.6} />;
    case Season.Autumn:
      // Red Leaves: Red/Orange, faster fall
      return <GenerateParticles count={300} color="#D2691E" size={0.15} speedY={1.0} speedX={0.8} area={40} />;
    case Season.Winter:
      // Snow: White, fast fall
      return <GenerateParticles count={1000} color="#FFFFFF" size={0.08} speedY={1.5} speedX={0.3} area={40} />;
    default:
      return null;
  }
};