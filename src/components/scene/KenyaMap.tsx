"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import type { CountyRecord } from "@/lib/population/schema";
import type { CountyGeometry } from "@/lib/population/load";
import type { CountyPulse } from "@/lib/scoring/pulse";
import type { Stance } from "@/lib/engine/schema";
import {
  countyAliasIndex,
  countyIdFromShapeName,
  kenyaProjection,
  projectLngLat,
  projectedRings,
  type KenyaCollection,
} from "@/lib/geo";
import { CameraRig } from "./CameraRig";
import { CountyMesh } from "./CountyMesh";
import { ResidentParticles, type ParticleRecord } from "./ResidentParticles";
import { RippleFX } from "./RippleFX";

export type SceneResident = {
  id: string;
  county: CountyRecord["id"];
  pos: [number, number];
};

export type SceneReaction = {
  residentId: string;
  county: CountyRecord["id"];
  stance: Stance;
  confidence: number;
};

type GeoJSONFile = {
  type: "FeatureCollection";
  features: {
    properties: { shapeName: string };
    geometry: CountyGeometry;
  }[];
};

export function KenyaMap({
  counties,
  residents,
  pulses,
  reactions,
  selected,
  onSelect,
  rippleRadius,
  announceProgress,
}: {
  counties: CountyRecord[];
  residents: SceneResident[];
  pulses: Map<string, CountyPulse>;
  reactions: Map<string, SceneReaction>;
  selected: string | null;
  onSelect: (countyId: string) => void;
  rippleRadius: number;
  announceProgress: number;
}) {
  const [geo, setGeo] = useState<KenyaCollection | null>(null);
  const aliases = useMemo(() => countyAliasIndex(counties), [counties]);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/kenya-counties.geojson")
      .then((response) => response.json() as Promise<GeoJSONFile>)
      .then((file) => {
        if (cancelled) {
          return;
        }
        const features = [];
        for (const feature of file.features) {
          const countyId = countyIdFromShapeName(feature.properties.shapeName, aliases);
          if (!countyId) {
            continue;
          }
          features.push({
            type: "Feature" as const,
            properties: { countyId },
            geometry: feature.geometry,
          });
        }
        setGeo({ type: "FeatureCollection", features });
      });
    return () => {
      cancelled = true;
    };
  }, [aliases]);

  const projection = useMemo(
    () => (geo ? kenyaProjection(geo, 100, 110) : null),
    [geo],
  );

  const projectedCounties = useMemo(() => {
    if (!projection || !geo) {
      return [];
    }
    return geo.features.map((feature) => ({
      countyId: feature.properties.countyId,
      rings: projectedRings(projection, feature.geometry),
    }));
  }, [geo, projection]);

  const nairobi = counties.find((county) => county.id === "nairobi");
  const origin = useMemo<[number, number, number]>(() => {
    if (!projection || !nairobi) {
      return [50, 0.2, 55];
    }
    const [x, y] = projectLngLat(projection, nairobi.centroid);
    return [x, 0.2, y];
  }, [nairobi, projection]);

  const particles = useMemo<ParticleRecord[]>(() => {
    if (!projection) {
      return [];
    }
    return residents.map((resident) => {
      const [x, y] = projectLngLat(projection, resident.pos);
      const reaction = reactions.get(resident.id);
      const dx = x - origin[0];
      const dz = y - origin[2];
      const dist = Math.hypot(dx, dz);
      const colored = announceProgress >= 1 || dist <= rippleRadius;
      return {
        x,
        z: y,
        stance: reaction?.stance ?? null,
        confidence: reaction?.confidence ?? 0.55,
        colored: Boolean(colored && reaction),
      };
    });
  }, [announceProgress, origin, projection, reactions, residents, rippleRadius]);

  const [pulseWave, setPulseWave] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setPulseWave((value) => (value + 1) % 100);
    }, 80);
    return () => window.clearInterval(id);
  }, []);
  const pulse = (Math.sin(pulseWave / 8) + 1) / 2;

  return (
    <Canvas camera={{ position: [50, 90, 130], fov: 40 }} className="h-full w-full">
      <color attach="background" args={["#0b1220"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[40, 80, 20]} intensity={1.1} />
      <CameraRig />
      {projectedCounties.map((county) => {
        const pulseRow = pulses.get(county.countyId);
        const height = (pulseRow?.friction ?? 0.05) * 12 * Math.min(1, announceProgress || 0.15);
        return (
          <CountyMesh
            key={county.countyId}
            countyId={county.countyId}
            rings={county.rings}
            height={height}
            hotspot={Boolean(pulseRow?.hotspot)}
            selected={selected === county.countyId}
            pulse={pulseRow?.hotspot ? pulse : 0}
            onSelect={onSelect}
          />
        );
      })}
      <ResidentParticles particles={particles} />
      <RippleFX origin={origin} radius={rippleRadius} visible={rippleRadius > 0.2 && announceProgress < 1} />
    </Canvas>
  );
}
