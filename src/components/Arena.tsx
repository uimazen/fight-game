import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const ARENA_RADIUS = 15;

export const Arena: React.FC = () => {
  const forcefieldRef = useRef<THREE.Mesh>(null);
  const gridPillarsRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const monolithsGroupRef = useRef<THREE.Group>(null);

  // Generate 120 atmospheric floating cyber embers
  const particleData = useMemo(() => {
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = Math.random() * (ARENA_RADIUS + 4);
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.2 + Math.random() * 8.0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
  }, []);

  // Generate 16 perimeter pylons
  const pylons = useMemo(() => {
    const arr = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * ARENA_RADIUS;
      const z = Math.sin(angle) * ARENA_RADIUS;
      arr.push({ id: i, position: [x, 1.6, z] as [number, number, number], angle });
    }
    return arr;
  }, []);

  // Frame animations for forcefield, drifting embers, and floating monoliths
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Pulse forcefield barrier
    if (forcefieldRef.current) {
      const mat = forcefieldRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + Math.sin(t * 3) * 0.08;
    }

    // Gentle drift for atmospheric embers
    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < 120; i++) {
        arr[i * 3 + 1] += 0.012; // slowly float upward
        if (arr[i * 3 + 1] > 8.0) arr[i * 3 + 1] = 0.2; // wrap back to floor
      }
      posAttr.needsUpdate = true;
    }

    // Slow majestic float for background monoliths
    if (monolithsGroupRef.current) {
      monolithsGroupRef.current.position.y = Math.sin(t * 0.8) * 0.4;
    }
  });

  return (
    <group>
      {/* 1. MAIN COMBAT DOJO PLATFORM */}
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS + 0.8, 0.4, 64]} />
        <meshStandardMaterial
          color="#080c16"
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Raised Center Combat Dais */}
      <mesh receiveShadow position={[0, 0.01, 0]}>
        <cylinderGeometry args={[6.5, 6.7, 0.05, 48]} />
        <meshStandardMaterial
          color="#0d1424"
          roughness={0.3}
          metalness={0.85}
        />
      </mesh>

      {/* Cyber Grid Overlay on Floor */}
      <gridHelper
        args={[ARENA_RADIUS * 2, 32, '#0ea5e9', '#1e293b']}
        position={[0, 0.04, 0]}
      />

      {/* Center Combat Circle Emblem */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[3.2, 3.35, 64]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[6.4, 6.55, 64]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* Outer Forcefield Perimeter Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 0.7, ARENA_RADIUS - 0.45, 64]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* 2. FORCEFIELD BOUNDARY CYLINDER (Glowing energy barrier) */}
      <mesh ref={forcefieldRef} position={[0, 2.5, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS, 5, 48, 1, true]} />
        <meshBasicMaterial
          color="#0284c7"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary wireframe hexagonal cyber barrier */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS, 5, 24, 6, true]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.14}
          wireframe
        />
      </mesh>

      {/* 3. PERIMETER PYLONS & NEON EMITTERS */}
      <group ref={gridPillarsRef}>
        {pylons.map((p) => (
          <group key={p.id} position={p.position} rotation={[0, -p.angle, 0]}>
            {/* Pylon post */}
            <mesh castShadow receiveShadow position={[0, 0, 0]}>
              <boxGeometry args={[0.42, 3.4, 0.42]} />
              <meshStandardMaterial color="#0b1120" roughness={0.25} metalness={0.92} />
            </mesh>
            {/* Emissive light strip */}
            <mesh position={[0, 0, 0.22]}>
              <boxGeometry args={[0.08, 3.0, 0.02]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            {/* Top Crystal Beacon */}
            <mesh position={[0, 1.8, 0]}>
              <octahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial
                emissive="#38bdf8"
                emissiveIntensity={3.0}
                color="#38bdf8"
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4. FLOATING CYBER EMBERS (ATMOSPHERIC PARTICLES) */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particleData, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#38bdf8"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 5. FLOATING MONOLITHS & BACKGROUND CYBER TORII */}
      <group ref={monolithsGroupRef}>
        {[-24, 24].map((x, idx) => (
          <group key={idx} position={[x, 0, -22]}>
            {/* Left post */}
            <mesh position={[-4.5, 7, 0]} castShadow>
              <boxGeometry args={[0.9, 15, 0.9]} />
              <meshStandardMaterial color="#080c16" metalness={0.9} roughness={0.3} />
            </mesh>
            {/* Right post */}
            <mesh position={[4.5, 7, 0]} castShadow>
              <boxGeometry args={[0.9, 15, 0.9]} />
              <meshStandardMaterial color="#080c16" metalness={0.9} roughness={0.3} />
            </mesh>
            {/* Top arch beam */}
            <mesh position={[0, 14, 0]} castShadow>
              <boxGeometry args={[12, 0.9, 1.4]} />
              <meshStandardMaterial color="#080c16" metalness={0.9} roughness={0.3} />
            </mesh>
            {/* Glowing neon lintel */}
            <mesh position={[0, 14, 0.72]}>
              <boxGeometry args={[11, 0.16, 0.05]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        ))}

        {/* Distant floating cyber obelisks */}
        {[
          [-22, 14, 18],
          [24, 16, 15],
          [0, 20, -34],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation={[0.2, i * 1.2, 0.3]}>
            <boxGeometry args={[1.6, 9, 1.6]} />
            <meshStandardMaterial color="#060911" metalness={0.95} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Dynamic Lighting Setup */}
      <ambientLight intensity={0.45} color="#60a5fa" />
      <directionalLight
        position={[16, 28, 14]}
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0005}
      />
      {/* Contrasting blue rim light */}
      <directionalLight
        position={[-18, 12, -18]}
        intensity={1.2}
        color="#0284c7"
      />
      {/* Ground arena central glow */}
      <pointLight position={[0, 1.8, 0]} intensity={1.8} distance={22} color="#38bdf8" />
    </group>
  );
};
