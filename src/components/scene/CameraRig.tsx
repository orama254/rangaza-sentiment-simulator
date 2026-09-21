"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

export function CameraRig() {
  const { camera } = useThree();
  camera.near = 0.1;
  camera.far = 500;
  return (
    <OrbitControls
      enablePan={false}
      minDistance={40}
      maxDistance={160}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.15}
      target={[50, 0, 55]}
    />
  );
}
