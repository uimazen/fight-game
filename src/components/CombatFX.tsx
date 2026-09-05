import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { LaserBeamData } from '../types';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

const LaserBeamItem: React.FC<{ beam: LaserBeamData }> = ({ beam }) => {
  const start = useMemo(() => new THREE.Vector3(...beam.start), [beam.start]);
  const end = useMemo(() => new THREE.Vector3(...beam.end), [beam.end]);
  const distance = useMemo(() => Math.max(0.1, start.distanceTo(end)), [start, end]);
  const midpoint = useMemo(() => start.clone().add(end).multiplyScalar(0.5), [start, end]);
  const quaternion = useMemo(() => {
    const dir = end.clone().sub(start).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [start, end]);

  const opacity = Math.max(0, 1 - (beam.progress || 0));

  return (
    <group position={midpoint} quaternion={quaternion}>
      {/* Intense White Core */}
      <mesh>
        <cylinderGeometry args={[beam.width * 0.35, beam.width * 0.35, distance, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
      {/* Saturated Colored Plasma Sheath */}
      <mesh>
        <cylinderGeometry args={[beam.width, beam.width, distance, 12]} />
        <meshBasicMaterial color={beam.color} transparent opacity={opacity * 0.8} />
      </mesh>
    </group>
  );
};

export const CombatFX: React.FC = () => {
  const shockwaves = useGameStore((s) => s.shockwaves);
  const floatingTexts = useGameStore((s) => s.floatingTexts);
  const hitFXEvents = useGameStore((s) => s.hitFXEvents);
  const laserBeams = useGameStore((s) => s.laserBeams);

  const SPARK_COUNT = 140;
  const BLOOD_COUNT = 140;

  const sparksRef = useRef<THREE.InstancedMesh>(null);
  const bloodRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Track processed hit FX IDs so we don't re-spawn
  const processedFXIds = useRef<Set<string>>(new Set());

  // Particle pools
  const sparks = useMemo<Particle[]>(() => {
    return Array.from({ length: SPARK_COUNT }, () => ({
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(0, 0, 0),
      life: 0,
      maxLife: 0.35,
      scale: 1,
    }));
  }, []);

  const blood = useMemo<Particle[]>(() => {
    return Array.from({ length: BLOOD_COUNT }, () => ({
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(0, 0, 0),
      life: 0,
      maxLife: 0.5,
      scale: 1,
    }));
  }, []);

  // Process incoming hitFXEvents
  useEffect(() => {
    if (!hitFXEvents.length) return;

    for (const fx of hitFXEvents) {
      if (processedFXIds.current.has(fx.id)) continue;
      processedFXIds.current.add(fx.id);

      const isBlood = fx.type === 'blood';
      const pool = isBlood ? blood : sparks;
      const poolLimit = isBlood ? BLOOD_COUNT : SPARK_COUNT;
      const count = Math.min(fx.count || 14, 28);

      let spawned = 0;
      for (let i = 0; i < poolLimit && spawned < count; i++) {
        const p = pool[i];
        if (p.life <= 0) {
          // Spawn position at hit location with slight jitter
          p.pos.set(
            fx.position[0] + (Math.random() - 0.5) * 0.3,
            fx.position[1] + (Math.random() - 0.5) * 0.3,
            fx.position[2] + (Math.random() - 0.5) * 0.3
          );

          if (isBlood) {
            // Blood droplets spray outward and arc down with gravity
            const speed = 2.5 + Math.random() * 5.0;
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() * 0.6 + 0.3) * speed;
            p.vel.set(
              Math.cos(angle) * speed,
              elevation,
              Math.sin(angle) * speed
            );
            p.life = 0.4 + Math.random() * 0.3;
            p.maxLife = p.life;
            p.scale = 0.09 + Math.random() * 0.08;
          } else {
            // High velocity energetic sparks
            const speed = 4.5 + Math.random() * 7.5;
            p.vel.set(
              (Math.random() - 0.5) * speed,
              (Math.random() * 0.8 + 0.2) * speed,
              (Math.random() - 0.5) * speed
            );
            p.life = 0.25 + Math.random() * 0.25;
            p.maxLife = p.life;
            p.scale = 0.07 + Math.random() * 0.07;
          }
          spawned++;
        }
      }
    }

    // Keep set clean
    if (processedFXIds.current.size > 200) {
      processedFXIds.current.clear();
    }
  }, [hitFXEvents, sparks, blood]);

  // Frame update
  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.05);

    // Update Sparks
    if (sparksRef.current) {
      let idx = 0;
      for (const p of sparks) {
        if (p.life > 0) {
          p.life -= clampedDelta;
          p.pos.addScaledVector(p.vel, clampedDelta);
          p.vel.y -= 11.0 * clampedDelta; // Gravity

          const progress = 1 - p.life / p.maxLife;
          const currentScale = p.scale * (1 - progress);

          dummy.position.copy(p.pos);
          dummy.scale.set(currentScale, currentScale, currentScale);
          dummy.updateMatrix();
          sparksRef.current.setMatrixAt(idx, dummy.matrix);
        } else {
          dummy.position.set(0, -80, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          sparksRef.current.setMatrixAt(idx, dummy.matrix);
        }
        idx++;
      }
      sparksRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update Blood Splatters
    if (bloodRef.current) {
      let idx = 0;
      for (const p of blood) {
        if (p.life > 0) {
          p.life -= clampedDelta;
          p.pos.addScaledVector(p.vel, clampedDelta);
          p.vel.y -= 14.0 * clampedDelta; // Heavy blood gravity

          // Floor splat collision check
          if (p.pos.y <= 0.05) {
            p.pos.y = 0.05;
            p.vel.set(0, 0, 0);
          }

          const progress = 1 - p.life / p.maxLife;
          // Splat flattens as it hits ground
          const isGrounded = p.pos.y <= 0.06;
          const currentScale = p.scale * (1 - progress * 0.5);

          dummy.position.copy(p.pos);
          if (isGrounded) {
            dummy.scale.set(currentScale * 1.5, currentScale * 0.2, currentScale * 1.5);
          } else {
            dummy.scale.set(currentScale, currentScale * 1.3, currentScale);
          }
          dummy.updateMatrix();
          bloodRef.current.setMatrixAt(idx, dummy.matrix);
        } else {
          dummy.position.set(0, -80, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          bloodRef.current.setMatrixAt(idx, dummy.matrix);
        }
        idx++;
      }
      bloodRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 1. INSTANCED IMPACT SPARKS (GOLDEN / CYAN PLASMA) */}
      <instancedMesh
        ref={sparksRef}
        args={[undefined, undefined, SPARK_COUNT]}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#38bdf8" />
      </instancedMesh>

      {/* 2. INSTANCED BLOOD-LIKE CRIMSON SPLATTERS */}
      <instancedMesh
        ref={bloodRef}
        args={[undefined, undefined, BLOOD_COUNT]}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#dc2626" />
      </instancedMesh>

      {/* 3. 3D LASER BEAMS */}
      {laserBeams.map((beam) => (
        <LaserBeamItem key={beam.id} beam={beam} />
      ))}

      {/* 4. SHOCKWAVE EXPANDING RINGS */}
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

      {/* 5. 3D FLOATING DAMAGE & COMBO TEXT */}
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
