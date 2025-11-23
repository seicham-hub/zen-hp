import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Instances, Instance, Cylinder, Box, MeshReflectorMaterial, Float, Extrude, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { HAIKUS, HaikuData } from '../types';

// --- Advanced Texture Generation Utilities (High Fidelity with FBM) ---
const TextureGenerator = {
  perm: new Uint8Array(512),
  init: false,
  setup() {
    if (this.init) return;
    const p = new Uint8Array(256).map((_, i) => i);
    for (let i = 255; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      [p[i], p[r]] = [p[r], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.init = true;
  },
  fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); },
  lerp(t: number, a: number, b: number) { return a + t * (b - a); },
  grad(hash: number, x: number, y: number, z: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y, v = h < 4 ? y : ((h === 12 || h === 14) ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  },
  noise(x: number, y: number, z: number) {
    if (!this.init) this.setup();
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = this.fade(x), v = this.fade(y), w = this.fade(z);
    const A = this.perm[X] + Y, AA = this.perm[A] + Z, AB = this.perm[A + 1] + Z,
      B = this.perm[X + 1] + Y, BA = this.perm[B] + Z, BB = this.perm[B + 1] + Z;
    return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z)),
      this.lerp(u, this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z))),
      this.lerp(v, this.lerp(u, this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1))));
  },
  // Fractal Brownian Motion
  fbm(x: number, y: number, z: number, octaves: number, persistence: number = 0.5, scale: number = 1) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  },

  createOrganicTexture: (width: number, height: number, type: 'granite' | 'bamboo' | 'wood' | 'sand' | 'roughness' | 'moss') => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    TextureGenerator.setup();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const nx = x / width;
        const ny = y / height;

        if (type === 'granite') {
          // Multi-layered noise for realistic stone grain
          const n1 = TextureGenerator.fbm(nx * 15, ny * 15, 0, 4, 0.5);
          const n2 = TextureGenerator.fbm(nx * 50, ny * 50, 10, 3, 0.5); // Fine grit
          const n3 = TextureGenerator.fbm(nx * 100, ny * 100, 20, 2, 0.5); // Micro details
          
          // Mix Greys/Blues/Browns
          // Stone usually has speckles of black (mica), quartz (white), and feldspar (pink/grey)
          const baseVal = 0.4 + n1 * 0.3;
          
          let r = baseVal * 160;
          let g = baseVal * 165;
          let b = baseVal * 170;

          // Dark spots (Mica)
          if (n2 < 0.3) {
             r *= 0.5; g *= 0.5; b *= 0.5;
          }
          // Light spots (Quartz)
          if (n3 > 0.7) {
             r += 40; g += 40; b += 40;
          }

          data[i] = r;     // R
          data[i + 1] = g; // G
          data[i + 2] = b; // B
          data[i + 3] = 255;
        } 
        else if (type === 'bamboo') {
          // Vertical striations
          const fiber = TextureGenerator.fbm(nx * 80, ny * 2, 0, 5, 0.6); 
          const stain = TextureGenerator.fbm(nx * 4, ny * 6, 32, 4, 0.5);
          
          // Base Bamboo Color (Fresh Green to Yellowish)
          // More realistic: less saturated, varying from yellow-green to dark green
          const baseR = 110, baseG = 140, baseB = 80;
          
          const fiberVar = (fiber - 0.5) * 40;
          const stainVar = (stain - 0.5) * 50;

          data[i] = Math.max(0, Math.min(255, baseR + fiberVar - stainVar * 0.5));
          data[i + 1] = Math.max(0, Math.min(255, baseG + fiberVar - stainVar * 0.5));
          data[i + 2] = Math.max(0, Math.min(255, baseB + fiberVar - stainVar * 0.8));
          data[i + 3] = 255;
        }
        else if (type === 'wood') {
           // Wood grain (Sine distortion on noise)
           const grain = TextureGenerator.fbm(nx * 6, ny * 40 + Math.sin(nx * 10)*3, 5, 4);
           // Red Lacquer Base - deep, rich red
           const r = 120 + grain * 30;
           const g = 20 + grain * 10;
           const b = 15 + grain * 10;
           data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255;
        }
        else if (type === 'sand') {
            // Fine sand grains
            const grain = TextureGenerator.fbm(nx * 150, ny * 150, 0, 2);
            // Larger slight color variation
            const patch = TextureGenerator.fbm(nx * 5, ny * 5, 10, 3);
            
            const val = 200 + grain * 40 + patch * 15;
            data[i] = val; data[i+1] = val; data[i+2] = val - 5; data[i+3] = 255;
        }
      }
    }
    
    ctx.putImageData(imgData, 0, 0);

    // Post-process Overlays
    if(type === 'bamboo') {
         // Random scuff marks or dark patches
         ctx.fillStyle = 'rgba(60, 50, 30, 0.1)';
         for(let k=0; k<30; k++) {
             const rx = Math.random() * width;
             const ry = Math.random() * height;
             const w = 2 + Math.random() * 5;
             const h = 10 + Math.random() * 30;
             ctx.fillRect(rx, ry, w, h);
         }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16; // Maximize anisotropy for sharpness at angles
    return tex;
  },

  createRoughnessMap: (width: number, height: number, type: 'stone' | 'bamboo' | 'sand') => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    TextureGenerator.setup();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const nx = x / width;
            const ny = y / height;
            
            let val = 0.5;

            if (type === 'stone') {
                 // Stone roughness: Mica is shiny (low roughness), Matrix is matte (high roughness)
                 const n = TextureGenerator.fbm(nx * 60, ny * 60, 5, 3);
                 // Invert: high noise = matte, low noise = shiny
                 val = 0.4 + n * 0.6; 
            } else if (type === 'bamboo') {
                 // Bamboo is generally smooth/shiny but has micro-grooves
                 const fiber = TextureGenerator.fbm(nx * 100, ny * 2, 0, 2);
                 val = 0.2 + fiber * 0.3;
            } else if (type === 'sand') {
                 // Sand is rough
                 const n = TextureGenerator.fbm(nx * 100, ny * 100, 0, 2);
                 val = 0.8 + n * 0.2;
            }

            data[i] = val * 255;
            data[i+1] = val * 255;
            data[i+2] = val * 255;
            data[i+3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
  },

  createNormalMap: (width: number, height: number, strength: number = 5, type: 'generic' | 'bamboo' | 'stone' = 'generic') => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    
    const buffer = new Float32Array(width * height);
    TextureGenerator.setup();
    
    // Generate Height Map
    for(let y=0; y<height; y++) {
        for(let x=0; x<width; x++) {
            const nx = x/width; 
            const ny = y/height;
            if (type === 'bamboo') {
                 // Vertical fibers
                 buffer[y*width+x] = TextureGenerator.fbm(nx*150, ny*5, 0, 3);
            } else if (type === 'stone') {
                 // Craggy
                 buffer[y*width+x] = TextureGenerator.fbm(nx*20, ny*20, 99, 5);
            } else {
                 buffer[y*width+x] = TextureGenerator.fbm(nx*10, ny*10, 99, 4); 
            }
        }
    }

    // Sobel Filter for Normals
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const x1 = buffer[y * width + ((x - 1 + width) % width)];
        const x2 = buffer[y * width + ((x + 1) % width)];
        const y1 = buffer[((y - 1 + height) % height) * width + x];
        const y2 = buffer[((y + 1) % height) * width + x];

        const dx = (x1 - x2) * strength;
        const dy = (y1 - y2) * strength;
        const dz = 1.0 / strength;

        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        data[i] = ((dx / len) * 0.5 + 0.5) * 255;
        data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
        data[i + 2] = (dz / len) * 255;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
  }
};

// --- Types ---
interface GardenElementProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

// --- Procedural Grass ---
export const GrassField = ({ count = 35000, area = 50 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.08, 0.45, 1, 6);
    geo.translate(0, 0.225, 0);
    const pos = geo.attributes.position;
    const uvs = geo.attributes.uv;
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        let widthMod = 1.0;
        if (y > 0.4) widthMod = 0.1;
        else if (y > 0.3) widthMod = 0.5;
        else if (y > 0.1) widthMod = 0.8;
        const zOffset = Math.pow(y, 2) * 0.2;
        pos.setX(i, pos.getX(i) * widthMod);
        pos.setZ(i, pos.getZ(i) + zOffset);
        if (y < 0.1) colors.push(0.1, 0.2, 0.05);
        else colors.push(0.4, 0.6, 0.2);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => new Array(count).fill(0).map(() => ({
      x: (Math.random() - 0.5) * area,
      z: (Math.random() - 0.5) * area,
      scale: 0.6 + Math.random() * 0.8,
      rotation: Math.random() * Math.PI,
      lean: Math.random() * 0.4
  })), [count, area]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    data.forEach((d, i) => {
        const windX = Math.sin(time * 0.7 + d.x * 0.3) + Math.sin(time * 1.3 + d.x * 0.8) * 0.3;
        const windStrength = 0.15 + Math.max(0, windX) * 0.2;
        dummy.position.set(d.x, -0.15, d.z);
        dummy.rotation.set(Math.sin(time * 0.5 + d.x) * windStrength * 0.6 + d.lean, d.rotation + windX * 0.1, Math.cos(time * 0.5 + d.z) * windStrength * 0.2);
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} receiveShadow castShadow={false}>
      <meshStandardMaterial color="#ffffff" vertexColors roughness={0.6} metalness={0.1} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

// --- Tea Ceremony Platform ---
export const TeaCeremonyPlatform = ({ position, rotation = [0,0,0] }: GardenElementProps) => {
    const woodTex = useMemo(() => TextureGenerator.createOrganicTexture(1024, 1024, 'wood'), []);
    const normalMap = useMemo(() => TextureGenerator.createNormalMap(1024, 1024, 3), []);

    return (
        <group position={position} rotation={new THREE.Euler(...rotation)}>
            <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
                <boxGeometry args={[3, 0.2, 3]} />
                <meshPhysicalMaterial 
                    map={woodTex} 
                    normalMap={normalMap}
                    roughness={0.4} 
                    clearcoat={0.3}
                    clearcoatRoughness={0.2}
                    color="#3e2723"
                />
            </mesh>
            <mesh position={[0, 0.21, 0]} receiveShadow>
                <boxGeometry args={[2.8, 0.02, 2.8]} />
                <meshStandardMaterial color="#e0d5a8" roughness={0.9} bumpScale={0.03} />
            </mesh>
            <group position={[0, 0.22, 0]}>
                 <mesh position={[0, 0.15, 0]} castShadow>
                     <boxGeometry args={[1.2, 0.05, 0.8]} />
                     <meshPhysicalMaterial color="#1a0f0d" roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.05} />
                 </mesh>
                 {/* Legs */}
                 {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map((p, i) => (
                    <mesh key={i} position={[p[0], 0.075, p[1]]} castShadow>
                        <boxGeometry args={[0.05, 0.15, 0.05]} />
                        <meshStandardMaterial color="#1a0f0d" />
                    </mesh>
                 ))}
            </group>
            {/* Tea Bowl */}
            <group position={[-0.2, 0.42, 0.1]}>
                 <mesh castShadow>
                     <cylinderGeometry args={[0.09, 0.06, 0.12, 64]} />
                     <MeshDistortMaterial color="#050505" roughness={0.3} metalness={0.2} clearcoat={0.4} distort={0.1} speed={0} />
                 </mesh>
                 <mesh position={[0, 0.04, 0]} rotation={[-Math.PI/2, 0, 0]}>
                     <circleGeometry args={[0.075, 32]} />
                     <meshStandardMaterial color="#4a7c59" roughness={0.4} />
                 </mesh>
            </group>
        </group>
    );
};

// --- Moss Garden ---
export const MossGarden = ({ position }: GardenElementProps) => {
    const mossNormal = useMemo(() => TextureGenerator.createNormalMap(512, 512, 15), []);
    const rocks = useMemo(() => new Array(6).fill(0).map(() => ({
        pos: [(Math.random()-0.5)*5, 0, (Math.random()-0.5)*5] as [number,number,number],
        scale: 0.4 + Math.random() * 0.6,
        rot: [Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI] as [number,number,number]
    })), []);

    return (
        <group position={position}>
            {rocks.map((rock, i) => (
                <group key={i} position={rock.pos} rotation={new THREE.Euler(...rock.rot)}>
                    <mesh castShadow receiveShadow position={[0, rock.scale/2, 0]}>
                         <dodecahedronGeometry args={[rock.scale, 2]} />
                         <meshStandardMaterial color="#333" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, rock.scale/2 + 0.01, 0]}>
                        <dodecahedronGeometry args={[rock.scale * 1.05, 3]} />
                        <MeshDistortMaterial color="#4f6b35" speed={0.2} factor={0.3} distort={0.2} roughness={1} bumpMap={mossNormal} bumpScale={0.2} />
                    </mesh>
                </group>
            ))}
             <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
                <circleGeometry args={[3.5, 128]} />
                <meshStandardMaterial color="#2d4c1e" roughness={1} normalMap={mossNormal} normalScale={new THREE.Vector2(1,1)} />
            </mesh>
        </group>
    );
};

// --- Shishi-odoshi ---
export const ShishiOdoshi = ({ position, rotation = [0,0,0] }: GardenElementProps) => {
  const tubeRef = useRef<THREE.Group>(null);
  const [state, setState] = useState<'filling' | 'tipping' | 'returning'>('filling');
  const fillLevel = useRef(0);
  const bambooTex = useMemo(() => TextureGenerator.createOrganicTexture(512, 512, 'bamboo'), []);
  const bambooRough = useMemo(() => TextureGenerator.createRoughnessMap(512, 512, 'bamboo'), []);
  
  useFrame((_, delta) => {
    if (!tubeRef.current) return;
    if (state === 'filling') {
      fillLevel.current += delta * 0.5;
      if (fillLevel.current > 1) setState('tipping');
      tubeRef.current.rotation.z = THREE.MathUtils.lerp(tubeRef.current.rotation.z, 0.1 * fillLevel.current, 0.1);
    } else if (state === 'tipping') {
      tubeRef.current.rotation.z = THREE.MathUtils.lerp(tubeRef.current.rotation.z, -0.8, 0.15);
      if (tubeRef.current.rotation.z < -0.7) { fillLevel.current = 0; setState('returning'); }
    } else if (state === 'returning') {
      tubeRef.current.rotation.z = THREE.MathUtils.lerp(tubeRef.current.rotation.z, 0, 0.2);
      if (Math.abs(tubeRef.current.rotation.z) < 0.05) setState('filling');
    }
  });

  return (
    <group position={position} rotation={new THREE.Euler(...rotation)}>
      <Cylinder args={[0.04, 0.04, 0.8]} position={[-0.3, 0.4, 0]} material-color="#4A7C59" />
      <Cylinder args={[0.04, 0.04, 0.8]} position={[0.3, 0.4, 0]} material-color="#4A7C59" />
      <Cylinder args={[0.02, 0.02, 0.7]} position={[0, 0.6, 0]} rotation={[0, 0, Math.PI/2]} material-color="#4A7C59" />

      <group ref={tubeRef} position={[0, 0.6, 0]}>
         <mesh position={[0.4, 0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 1.2, 64]} />
            <meshPhysicalMaterial 
              map={bambooTex} 
              roughnessMap={bambooRough}
              roughness={0.5} 
              clearcoat={0.3} 
              color="#8DAF7E" 
            />
         </mesh>
      </group>
    </group>
  )
}

// --- Zen Stone (Photorealistic) ---
export const ZenStone = ({ position, scale, rotation, onInteract }: GardenElementProps & { onInteract: (h: HaikuData) => void }) => {
  const [hovered, setHover] = useState(false);
  const haiku = useMemo(() => HAIKUS[Math.floor(Math.random() * HAIKUS.length)], []);
  const scaleVal = typeof scale === 'number' ? [scale, scale, scale] : scale;
  
  // High res textures for zoom
  const graniteTex = useMemo(() => TextureGenerator.createOrganicTexture(1024, 1024, 'granite'), []);
  const normalMap = useMemo(() => TextureGenerator.createNormalMap(1024, 1024, 15, 'stone'), []);
  const roughMap = useMemo(() => TextureGenerator.createRoughnessMap(1024, 1024, 'stone'), []);

  useEffect(() => { document.body.style.cursor = hovered ? 'pointer' : 'auto'; }, [hovered]);

  return (
    <group position={position} rotation={rotation ? new THREE.Euler(...rotation) : new THREE.Euler(0,0,0)}>
        <mesh
          scale={scaleVal as any}
          onClick={(e) => { e.stopPropagation(); onInteract(haiku); }}
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
          castShadow
          receiveShadow
        >
          {/* Increased geometry detail for displacement */}
          <dodecahedronGeometry args={[1, 12]} /> 
          <meshPhysicalMaterial
            map={graniteTex}
            normalMap={normalMap}
            roughnessMap={roughMap}
            normalScale={new THREE.Vector2(1.2, 1.2)}
            roughness={0.8}
            metalness={0.1}
            displacementMap={normalMap}
            displacementScale={0.12}
            clearcoat={0.05} // Slight sheen for polished areas
            clearcoatRoughness={0.1}
          />
        </mesh>
        {/* Soft AO Shadow */}
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI/2, 0, 0]}>
           <planeGeometry args={[2.8, 2.8]} />
           <meshBasicMaterial color="#000" transparent opacity={0.6} depthWrite={false} toneMapped={false}>
              <canvasTexture attach="alphaMap" args={[(() => {
                  const c = document.createElement('canvas'); c.width=128; c.height=128;
                  const ctx = c.getContext('2d')!;
                  const grad = ctx.createRadialGradient(64,64,0,64,64,64);
                  grad.addColorStop(0, 'white'); grad.addColorStop(1, 'black');
                  ctx.fillStyle = grad; ctx.fillRect(0,0,128,128);
                  return c;
              })()]} />
           </meshBasicMaterial>
        </mesh>
    </group>
  );
};

// --- Bamboo Grove ---
export const BambooGrove = ({ count = 50, area = 25 }) => {
  const bambooData = useMemo(() => new Array(count).fill(0).map(() => ({
      position: [(Math.random() - 0.5) * area, 0, (Math.random() - 0.5) * area * 0.6 - 8] as [number, number, number],
      scale: 0.8 + Math.random() * 0.5,
      rotation: Math.random() * Math.PI,
      lean: (Math.random() - 0.5) * 0.2
  })), [count, area]);
  
  const bambooTex = useMemo(() => TextureGenerator.createOrganicTexture(1024, 2048, 'bamboo'), []);
  const bambooNormal = useMemo(() => TextureGenerator.createNormalMap(1024, 2048, 8, 'bamboo'), []);
  const bambooRough = useMemo(() => TextureGenerator.createRoughnessMap(1024, 2048, 'bamboo'), []);

  return (
    <group>
        {bambooData.map((data, i) => <RealisticBambooStalk key={i} {...data} texture={bambooTex} normal={bambooNormal} rough={bambooRough} />)}
    </group>
  );
};

const RealisticBambooStalk = ({ position, scale, lean, texture, normal, rough }: any) => {
    const segments = 6;
    const height = 1.8 * scale;
    const radius = 0.08 * scale;
    return (
        <group position={[position[0], 0, position[2]]} rotation={[lean, 0, lean]}>
            {Array.from({length: segments}).map((_, i) => (
                <group key={i} position={[0, i * height, 0]}>
                    <mesh position={[0, height/2, 0]} castShadow receiveShadow>
                        {/* Slight tapering for realism */}
                        <cylinderGeometry args={[radius * 0.97, radius, height, 32]} />
                        <meshPhysicalMaterial 
                            map={texture} 
                            normalMap={normal} 
                            roughnessMap={rough}
                            normalScale={new THREE.Vector2(0.5, 1.5)}
                            color="#9bbd88" 
                            roughness={0.4} 
                            clearcoat={0.2} 
                            clearcoatRoughness={0.2}
                        />
                    </mesh>
                    {/* Node ring - physical geometry instead of alpha texture to fix sorting/blending issues */}
                    <mesh position={[0, height, 0]}>
                        <torusGeometry args={[radius * 0.99, 0.008, 8, 32]} />
                        <meshStandardMaterial color="#6a7d5a" roughness={0.8} />
                    </mesh>
                    {/* Shadow indent - Standard material with transparency instead of Multiply to avoid WebGL errors */}
                    <mesh position={[0, height - 0.02, 0]}>
                        <cylinderGeometry args={[radius * 1.01, radius * 1.01, 0.05, 32]} />
                        <meshStandardMaterial 
                            color="#000000" 
                            transparent 
                            opacity={0.2} 
                            depthWrite={false} 
                            side={THREE.FrontSide}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    )
}

// --- Torii Gate ---
export const ToriiGate = ({ position }: { position: [number, number, number] }) => {
  const lacquerTex = useMemo(() => TextureGenerator.createOrganicTexture(512, 512, 'wood'), []);
  const kasagiCurve = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.5, 7.5, 0), new THREE.Vector3(-2.5, 7.1, 0), new THREE.Vector3(0, 7.0, 0),
        new THREE.Vector3(2.5, 7.1, 0), new THREE.Vector3(4.5, 7.5, 0)]), []);
   const shimakiCurve = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.2, 6.8, 0), new THREE.Vector3(-2.2, 6.4, 0), new THREE.Vector3(0, 6.3, 0),
        new THREE.Vector3(2.2, 6.4, 0), new THREE.Vector3(4.2, 6.8, 0)]), []);
  
  const WoodMaterial = <meshPhysicalMaterial map={lacquerTex} color="#b02e2e" roughness={0.35} clearcoat={0.3} clearcoatRoughness={0.2} />;
  const BlackBaseMaterial = <meshPhysicalMaterial color="#1a1a1a" roughness={0.6} />;

  return (
    <group position={position}>
      <mesh position={[-3, 3.5, 0]} castShadow receiveShadow><cylinderGeometry args={[0.38, 0.42, 7.5, 64]} />{WoodMaterial}</mesh>
      <mesh position={[-3, 0.5, 0]}><cylinderGeometry args={[0.43, 0.45, 1.0, 64]} />{BlackBaseMaterial}</mesh>
      <mesh position={[3, 3.5, 0]} castShadow receiveShadow><cylinderGeometry args={[0.38, 0.42, 7.5, 64]} />{WoodMaterial}</mesh>
      <mesh position={[3, 0.5, 0]}><cylinderGeometry args={[0.43, 0.45, 1.0, 64]} />{BlackBaseMaterial}</mesh>
      <mesh position={[0, 5.5, 0]} castShadow><boxGeometry args={[8.2, 0.4, 0.25]} />{WoodMaterial}</mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <extrudeGeometry args={[new THREE.Shape().absellipse(0, 0, 0.3, 0.4, 0, Math.PI * 2, false, 0), { extrudePath: kasagiCurve, steps: 60, bevelEnabled: false }]} />
        {WoodMaterial}
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
         <extrudeGeometry args={[new THREE.Shape().absellipse(0, 0, 0.25, 0.3, 0, Math.PI * 2, false, 0), { extrudePath: shimakiCurve, steps: 60, bevelEnabled: false }]} />
        {WoodMaterial}
      </mesh>
      <mesh position={[0, 6.1, 0]} castShadow><boxGeometry args={[0.3, 0.8, 0.2]} />{WoodMaterial}</mesh>
    </group>
  );
};

// --- Lantern ---
export const Lantern = ({ position, scale = 1 }: GardenElementProps) => {
  const stoneTex = useMemo(() => TextureGenerator.createOrganicTexture(256, 256, 'granite'), []);
  const mat = <meshPhysicalMaterial map={stoneTex} roughness={0.9} />;
  return (
    <group position={position} scale={scale}>
       <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.3, 0.4, 0.4, 8]} />{mat}</mesh>
       <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.2, 0.25, 1.2, 8]} />{mat}</mesh>
       <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.55, 0.4, 0.2, 8]} />{mat}</mesh>
       <mesh position={[0, 1.9, 0]} castShadow><boxGeometry args={[0.45, 0.6, 0.45]} /><meshStandardMaterial color="#333" roughness={0.8} /></mesh>
       <mesh position={[0, 1.9, 0]}><boxGeometry args={[0.4, 0.5, 0.4]} /><meshBasicMaterial color="#ffaa00" /></mesh>
       <mesh position={[0, 2.4, 0]} castShadow><cylinderGeometry args={[0.1, 0.9, 0.7, 8]} />{mat}</mesh>
       <pointLight position={[0, 1.9, 0]} intensity={2} distance={8} color="#ff9900" decay={2} />
    </group>
  )
}

// --- Reflective Pond ---
export const ZenPond = () => {
    const stoneTex = useMemo(() => TextureGenerator.createOrganicTexture(256, 256, 'granite'), []);
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
            <circleGeometry args={[6, 64]} />
            <MeshReflectorMaterial
                blur={[400, 100]} // Reduced vertical blur for clarity
                resolution={1024}
                mixBlur={1}
                mixStrength={50} // Reduced mix strength
                roughness={0.05} // Smoother
                depthScale={1.2}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                color="#0a1a20"
                metalness={0.9}
                mirror={0.95}
            />
        </mesh>
        <RingOfStones radius={6.1} count={40} texture={stoneTex} />
        <Koi startPos={[0, 0, 0]} speed={0.5} color="#ff4400" />
        <Koi startPos={[2, 0, 1]} speed={0.4} color="#ffffff" />
        <Koi startPos={[-1.5, 0, -1.5]} speed={0.6} color="#ffd700" />
      </group>
    );
};

const RingOfStones = ({radius, count, texture}: {radius: number, count: number, texture: THREE.Texture}) => {
   const stones = useMemo(() => new Array(count).fill(0).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return {
           pos: [Math.cos(angle) * radius + (Math.random()-0.5)*0.5, 0.1, Math.sin(angle) * radius + (Math.random()-0.5)*0.5] as [number,number,number],
           scale: 0.3 + Math.random() * 0.3,
           rot: [Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI] as [number, number, number]
      }
   }), [radius, count]);

   return (
     <group>
        {stones.map((s, i) => (
          <mesh key={i} position={s.pos} rotation={new THREE.Euler(...s.rot)} castShadow receiveShadow>
             <dodecahedronGeometry args={[s.scale, 1]} />
             <meshStandardMaterial map={texture} roughness={0.8} color="#777" />
          </mesh>
        ))}
     </group>
   )
}

const Koi = ({ startPos, speed, color }: { startPos: [number, number, number], speed: number, color: string }) => {
  const ref = useRef<THREE.Group>(null);
  const offset = useRef(Math.random() * 100);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + offset.current;
    const x = Math.sin(t) * 2.5 + startPos[0];
    const z = Math.cos(t * 0.7) * 2 + startPos[2];
    ref.current.position.set(x, -0.3, z);
    ref.current.lookAt(x + Math.cos(t) * 2.5, -0.3, z - Math.sin(t * 0.7) * 1.4);
    ref.current.rotation.y += Math.sin(t * 10) * 0.1; 
  });

  return (
    <group ref={ref}>
      <mesh castShadow>
        <capsuleGeometry args={[0.08, 0.4, 4, 16]} />
        <meshPhysicalMaterial color={color} roughness={0.2} metalness={0.1} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
    </group>
  );
};

// --- Raked Sand (High Res) ---
export const SandGarden = () => {
    const sandTex = useMemo(() => TextureGenerator.createOrganicTexture(1024, 1024, 'sand'), []);
    const sandRough = useMemo(() => TextureGenerator.createRoughnessMap(1024, 1024, 'sand'), []);
    const rakeNormal = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext('2d')!;
        
        // Clear blue normal background
        ctx.fillStyle = '#8080ff'; ctx.fillRect(0,0,1024,1024);
        
        // Add subtle noise to the base normal
        const nData = ctx.getImageData(0,0,1024,1024);
        for(let i=0; i<nData.data.length; i+=4) {
            const n = (Math.random()-0.5) * 10;
            nData.data[i] += n; nData.data[i+1] += n;
        }
        ctx.putImageData(nData, 0, 0);

        for(let i=0; i<25; i++) {
            const r = 150 + i * 35;
            ctx.beginPath(); ctx.arc(300, 900, r, 0, Math.PI*2); ctx.lineWidth = 15;
            // Steep ridge
            ctx.strokeStyle = `rgba(${128 + 60}, ${128}, ${255}, 1)`; ctx.stroke();
            
            ctx.beginPath(); ctx.arc(300, 900, r - 4, 0, Math.PI*2); ctx.lineWidth = 8;
            // Shadow side
            ctx.strokeStyle = `rgba(${128 - 60}, ${128}, ${255}, 1)`; ctx.stroke();
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        return tex;
    }, []);

    return (
        <group position={[0, -0.2, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[60, 60, 512, 512]} />
                <meshPhysicalMaterial 
                    map={sandTex}
                    roughnessMap={sandRough}
                    color="#E8E8E8" 
                    roughness={0.9} 
                    normalMap={rakeNormal}
                    normalScale={new THREE.Vector2(2, 2)}
                />
            </mesh>
             <group position={[-4, 0, 2]}>
                 {[1.2, 1.4, 1.6, 1.8, 2.0, 2.2].map((r, i) => (
                    <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                        <torusGeometry args={[r, 0.04, 16, 128]} />
                        <meshStandardMaterial color="#dcdcdc" roughness={1} map={sandTex}/>
                    </mesh>
                 ))}
            </group>
        </group>
    );
}

// --- Tsukubai ---
export const Tsukubai = ({ position }: GardenElementProps) => {
   const stoneTex = useMemo(() => TextureGenerator.createOrganicTexture(512, 512, 'granite'), []);
   const normalMap = useMemo(() => TextureGenerator.createNormalMap(512, 512, 10), []);

   return (
     <group position={position}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
           <cylinderGeometry args={[0.4, 0.35, 0.45, 64]} />
           <meshPhysicalMaterial map={stoneTex} normalMap={normalMap} roughness={0.8} displacementMap={normalMap} displacementScale={0.05} />
        </mesh>
        <mesh position={[0, 0.38, 0]} rotation={[-Math.PI/2, 0, 0]}>
           <circleGeometry args={[0.3, 32]} />
           <meshPhysicalMaterial color="#112233" transmission={0.8} roughness={0.1} thickness={0.2} ior={1.33} />
        </mesh>
        <group position={[0.3, 0.45, 0]} rotation={[0, 0, -Math.PI/6]}>
           <Cylinder args={[0.02, 0.02, 0.6]} material-color="#d2b48c" />
        </group>
     </group>
   )
}
