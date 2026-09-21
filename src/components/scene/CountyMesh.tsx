"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { ProjectedPoint } from "@/lib/geo";

export function CountyMesh({
  countyId,
  rings,
  height,
  hotspot,
  selected,
  pulse,
  onSelect,
}: {
  countyId: string;
  rings: ProjectedPoint[][][];
  height: number;
  hotspot: boolean;
  selected: boolean;
  pulse: number;
  onSelect: (countyId: string) => void;
}) {
  const geometry = useMemo(() => {
    const shapes = rings.map((polygon) => {
      const shape = new THREE.Shape();
      const [outer, ...holes] = polygon;
      if (!outer || outer.length < 2) {
        return shape;
      }
      outer.forEach((point, index) => {
        if (index === 0) {
          shape.moveTo(point[0], -point[1]);
        } else {
          shape.lineTo(point[0], -point[1]);
        }
      });
      for (const hole of holes) {
        const path = new THREE.Path();
        hole.forEach((point, index) => {
          if (index === 0) {
            path.moveTo(point[0], -point[1]);
          } else {
            path.lineTo(point[0], -point[1]);
          }
        });
        shape.holes.push(path);
      }
      return shape;
    });
    return new THREE.ExtrudeGeometry(shapes, {
      depth: 1,
      bevelEnabled: false,
    });
  }, [rings]);

  const color = hotspot
    ? new THREE.Color("#b45309")
    : selected
      ? new THREE.Color("#1d4ed8")
      : new THREE.Color("#64748b");
  const scaleY = Math.max(0.15, height) * (hotspot ? 1 + pulse * 0.15 : 1);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[1, 1, scaleY]}
      position={[0, 0, 0]}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(countyId);
      }}
    >
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
    </mesh>
  );
}
