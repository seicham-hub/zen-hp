import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Stars, Sky, Cloud, SoftShadows, useScroll, SpotLight } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Season, TimeOfDay, HaikuData } from '../types';
import { SeasonalEffects } from './SeasonalEffects';
import { BambooGrove, ZenStone, ZenPond, ToriiGate, SandGarden, Lantern, ShishiOdoshi, Tsukubai, GrassField, TeaCeremonyPlatform, MossGarden } from './GardenElements';

interface ZenSceneProps {
  season: Season;
  timeOfDay: TimeOfDay;
  onInteract: (data: HaikuData) => void;
}

// Extended Camera Rig for 6-page scroll
const CameraRig = () => {
  const scroll = useScroll();
  const { camera } = useThree();

  // Camera waypoints
  const points = {
    start: { pos: new THREE.Vector3(0, 7, 18), look: new THREE.Vector3(0, 0, 0) },
    pond: { pos: new THREE.Vector3(0, 2.5, 9), look: new THREE.Vector3(0, 0.5, 0) },
    stone: { pos: new THREE.Vector3(-6, 1.8, 5), look: new THREE.Vector3(-4, 0.2, 2) },
    tea: { pos: new THREE.Vector3(6, 1.5, -2), look: new THREE.Vector3(6, 0.5, -5) },
    moss: { pos: new THREE.Vector3(-5, 0.8, -6), look: new THREE.Vector3(-5, 0.2, -8) },
    sky: { pos: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(0, 8, -12) }
  };

  useFrame(() => {
    const r1 = scroll.range(0, 0.2);
    const r2 = scroll.range(0.2, 0.2);
    const r3 = scroll.range(0.4, 0.2);
    const r4 = scroll.range(0.6, 0.2);
    const r5 = scroll.range(0.8, 0.2);

    let targetPos = points.start.pos.clone();
    let targetLook = points.start.look.clone();

    if (scroll.offset < 0.2) {
        targetPos.lerp(points.pond.pos, r1); 
        targetLook.lerp(points.pond.look, r1);
    } 
    else if (scroll.offset < 0.4) {
        targetPos.copy(points.pond.pos).lerp(points.stone.pos, r2);
        targetLook.copy(points.pond.look).lerp(points.stone.look, r2);
    }
    else if (scroll.offset < 0.6) {
        targetPos.copy(points.stone.pos).lerp(points.tea.pos, r3);
        targetLook.copy(points.stone.look).lerp(points.tea.look, r3);
    }
    else if (scroll.offset < 0.8) {
        targetPos.copy(points.tea.pos).lerp(points.moss.pos, r4);
        targetLook.copy(points.tea.look).lerp(points.moss.look, r4);
    }
    else {
        targetPos.copy(points.moss.pos).lerp(points.sky.pos, r5);
        targetLook.copy(points.moss.look).lerp(points.sky.look, r5);
    }

    camera.position.lerp(targetPos, 0.05);
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    const lerpedLook = currentLook.add(camera.position).lerp(targetLook, 0.05);
    camera.lookAt(lerpedLook);
  });
  return null;
};

const Lighting = ({ timeOfDay }: { timeOfDay: TimeOfDay }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const isNight = timeOfDay === TimeOfDay.Night;
  const isSunset = timeOfDay === TimeOfDay.Sunset;

  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.elapsedTime * 0.05;
      lightRef.current.position.x = 20 * Math.cos(t + 0.5);
      lightRef.current.position.z = 15 * Math.sin(t + 0.5);
    }
  });

  return (
    <>
      <ambientLight intensity={isNight ? 0.05 : 0.6} />
      <directionalLight
        ref={lightRef}
        position={isSunset ? [-25, 8, -10] : [15, 25, 15]}
        intensity={isNight ? 0.2 : isSunset ? 1.5 : 2.2}
        color={isNight ? "#b0c4de" : isSunset ? "#fdba74" : "#fffaf0"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00005}
      >
        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40]} />
      </directionalLight>
      
      <SpotLight 
        position={[8, 5, -3]} 
        angle={0.5} 
        penumbra={0.4} 
        intensity={3} 
        castShadow 
        color="#fff"
        target-position={[6, 0, -5]}
        shadow-bias={-0.0001}
      />
    </>
  );
};

export const ZenScene: React.FC<ZenSceneProps> = ({ season, timeOfDay, onInteract }) => {
  const isNight = timeOfDay === TimeOfDay.Night;
  const isSunset = timeOfDay === TimeOfDay.Sunset;

  return (
    <>
      <CameraRig />
      <Lighting timeOfDay={timeOfDay} />
      
      <fog attach="fog" args={[isNight ? '#050510' : isSunset ? '#331111' : '#e6f0ff', 5, 45]} />
      <Environment preset={isNight ? "city" : isSunset ? "sunset" : "park"} background={false} blur={0.8} />
      
      {!isNight && (
        <Sky 
           sunPosition={isSunset ? [-10, 0, -10] : [100, 40, 100]} 
           turbidity={isSunset ? 8 : 0.5}
           rayleigh={isSunset ? 4 : 1}
           mieCoefficient={0.005}
           mieDirectionalG={0.8}
        />
      )}
      {isNight && <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={0.5} />}
      
      {season !== Season.Winter && (
         <Cloud opacity={isSunset ? 0.6 : 0.4} speed={0.05} bounds={[25, 4, 5]} segments={10} position={[0, 15, -15]} color={isSunset ? "#ffaa88" : "#ffffff"} />
      )}

      <SeasonalEffects season={season} />

      <group position={[0, -1, 0]}>
        <SandGarden />
        <ZenPond />
        <GrassField count={40000} area={55} />
        
        <ToriiGate position={[0, 0.2, -15]} />
        
        <Lantern position={[-2.5, 0, 5]} scale={0.8} />
        <Lantern position={[3.5, 0, -4]} scale={0.9} />
        <Lantern position={[-5, 0, -8]} scale={0.9} />
        <Lantern position={[6, 0, -6.5]} scale={0.8} />

        <ShishiOdoshi position={[5, 0, 3]} rotation={[0, -Math.PI/4, 0]} />
        <Tsukubai position={[4.5, 0, 3.5]} />
        
        <BambooGrove count={80} area={60} />
        
        <ZenStone position={[-4, 0.3, 2]} scale={1.2} rotation={[0, Math.PI/4, 0]} onInteract={onInteract} />
        <ZenStone position={[4, 0.2, 0]} scale={0.9} rotation={[Math.PI/8, 0, 0]} onInteract={onInteract} />
        <ZenStone position={[0, 0.1, 5]} scale={0.6} onInteract={onInteract} />

        <TeaCeremonyPlatform position={[6, 0, -5]} rotation={[0, -0.5, 0]} />
        <MossGarden position={[-5, 0, -8]} />
      </group>

      <SoftShadows size={15} samples={16} focus={1.0} />
      
      <EffectComposer enableNormalPass={false}>
        {/* Much subtler DoF to ensure things look sharp when zoomed */}
        <DepthOfField focusDistance={0.025} focalLength={0.02} bokehScale={2} height={480} />
        <Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.3} radius={0.3} />
        <Noise opacity={0.04} />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>
    </>
  );
};
