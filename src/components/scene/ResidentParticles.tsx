"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Stance } from "@/lib/engine/schema";

export type ParticleRecord = {
  x: number;
  z: number;
  stance: Stance | null;
  confidence: number;
  colored: boolean;
};

const STANCE_COLOR: Record<Stance, THREE.Color> = {
  supportive: new THREE.Color("#16a34a"),
  opposed: new THREE.Color("#dc2626"),
  confused: new THREE.Color("#ca8a04"),
  indifferent: new THREE.Color("#94a3b8"),
  anxious: new THREE.Color("#ea580c"),
};

const PENDING = new THREE.Color("#1e293b");

export function ResidentParticles({ particles }: { particles: ParticleRecord[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const count = particles.length;

  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) {
      return;
    }
    for (let i = 0; i < count; i += 1) {
      const particle = particles[i];
      if (!particle) {
        continue;
      }
      dummy.position.set(particle.x, 0.4, particle.z);
      dummy.scale.setScalar(0.35);
      dummy.updateMatrix();
      instance.setMatrixAt(i, dummy.matrix);
      if (particle.colored && particle.stance) {
        color.copy(STANCE_COLOR[particle.stance]);
        color.multiplyScalar(0.45 + particle.confidence * 0.55);
      } else {
        color.copy(PENDING);
      }
      instance.setColorAt(i, color);
    }
    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) {
      instance.instanceColor.needsUpdate = true;
    }
  }, [color, count, dummy, particles]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, Math.max(count, 1)]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}
