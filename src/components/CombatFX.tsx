import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';

export const CombatFX: React.FC = () => {
  const shockwaves = useGameStore((s) => s.shockwaves);
  const floatingTexts = useGameStore((s) => s.floatingTexts);
  const feedback = useGameStore((s) => s.feedback);

  // Sparks particle system using instanced mesh or points
  const PARTICLE_COUNT = 80;
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Particle pool state
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(0, 0, 0),
      life: 0,
      maxLife: 0.4,
      color: new THREE.Color('#38bdf8'),
      scale: 1,
    }));
  }, []);

  // Trigger spark bursts on hit
  React.useEffect(() => {
    if (feedback.hitstopRemaining > 0) {
      // Spawn 12 particles
      let spawned = 0;
      for (let i = 0; i < PARTICLE_COUNT && spawned < 14; i++) {
        if (particles[i].life <= 0) {
          const p = particles[i];
          // Spawn near arena center / current action
          p.pos.set(
            (Math.random() - 0.5) * 0.4,
            1.1 + (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
          );
          const speed = 4 + Math.random() * 6;
          p.vel.set(
            (Math.random() - 0.5) * speed,
            (Math.random() * 0.8 + 0.2) * speed,
            (Math.random() - 0.5) * speed
          );
          p.life = 0.35 + Math.random() * 0.25;
          p.maxLife = p.life;
          p.scale = 0.08 + Math.random() * 0.08;
          spawned++;
        }
      }
    }
  }, [feedback.hitstopRemaining, particles]);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const clampedDelta = Math.min(delta, 0.05);

    let idx = 0;
    for (const p of particles) {
      if (p.life > 0) {
        p.life -= clampedDelta;
        p.pos.addScaledVector(p.vel, clampedDelta);
        p.vel.y -= 9.8 * clampedDelta; // Gravity

        const progress = 1 - p.life / p.maxLife;
        const currentScale = p.scale * (1 - progress);

        dummy.position.copy(p.pos);
        dummy.scale.set(currentScale, currentScale, currentScale);
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(idx, dummy.matrix);
      } else {
        dummy.position.set(0, -50, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(idx, dummy.matrix);
      }
      idx++;
    }
    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* 1. INSTANCED IMPACT SPARKS */}
      <instancedMesh
        ref={particlesRef}
        args={[undefined, undefined, PARTICLE_COUNT]}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#38bdf8" />
      </instancedMesh>

      {/* 2. SHOCKWAVE EXPANDING RINGS */}
      {shockwaves.map((sw) => {
        const radius = Math.max(0.1, sw.maxRadius * sw.progress);
        const opacity = Math.max(0, 1 - sw.progress);
        return (
          <group key={sw.id} position={[sw.position[0], 0.05, sw.position[2]]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius * 0.85, radius, 32]} />
              <meshBasicMaterial 
                color={sw.color} 
                transparent 
                opacity={opacity * 0.8} 
                side={THREE.DoubleSide} 
              />
            </mesh>
          </group>
        );
      })}

      {/* 3. 3D FLOATING DAMAGE & COMBO TEXT */}
      {floatingTexts.map((ft) => {
        const age = (performance.now() - ft.createdAt) / 1000;
        const yOffset = age * 1.8;
        const opacity = Math.max(0, 1 - age / (ft.duration / 1000));

        return (
          <Html
            key={ft.id}
            position={[ft.position[0], ft.position[1] + yOffset, ft.position[2]]}
            center
            distanceFactor={12}
            style={{
              pointerEvents: 'none',
              transform: `scale(${ft.scale})`,
              transition: 'opacity 0.1s linear',
              opacity,
            }}
          >
            <div 
              className="font-extrabold tracking-widest text-center whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              style={{
                color: ft.color,
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: ft.scale > 1.2 ? '22px' : '16px',
                textShadow: `0 0 10px ${ft.color}`,
              }}
            >
              {ft.text}
            </div>
          </Html>
        );
      })}
    </group>
  );
};
