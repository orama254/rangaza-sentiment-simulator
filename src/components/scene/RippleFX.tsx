"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function RippleFX({
  origin,
  radius,
  visible,
}: {
  origin: [number, number, number];
  radius: number;
  visible: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.RingGeometry(0.95, 1, 64), []);

  useFrame(() => {
    if (!mesh.current) {
      return;
    }
    mesh.current.visible = visible && radius > 0.1;
    mesh.current.scale.set(radius, radius, 1);
  });

  return (
    <mesh
      ref={mesh}
      geometry={geo}
      position={origin}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshBasicMaterial
        color="#f8fafc"
        transparent
        opacity={0.45}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
