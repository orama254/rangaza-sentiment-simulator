import { geoBounds, geoContains } from "d3-geo";
import type { CountyGeometry } from "./load";
import {
  AGE_BANDS,
  CONNECTIVITY,
  DISABILITIES,
  GENDERS,
  INCOME_BANDS,
  LANGUAGES,
  LIVELIHOODS,
  type AgeBand,
  type Archetype,
  type Connectivity,
  type CountyId,
  type CountyWeights,
  type Disability,
  type Gender,
  type IncomeBand,
  type Language,
  type Livelihood,
  type Resident,
  type SampleFrameRow,
  type Setting,
} from "./schema";

export const POPULATION_SEED = 20260921;
const MAX_POSITION_ATTEMPTS = 4000;
const DEPENDENT_KEYS = ["0", "1", "2", "3", "4", "5", "6", "7", "8"] as const;

export type GenerateResidentsInput = {
  sampleFrame: readonly SampleFrameRow[];
  weights: readonly CountyWeights[];
  archetypes: readonly Archetype[];
  geometries: Readonly<Record<CountyId, CountyGeometry>>;
};

type Mix<K extends string> = Record<K, number>;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleKeyed<K extends string>(
  rng: () => number,
  keys: readonly K[],
  mix: Mix<K>,
): K {
  const draw = rng();
  let cumulative = 0;
  for (const key of keys) {
    cumulative += mix[key];
    if (draw < cumulative) {
      return key;
    }
  }
  const fallback = keys.at(-1);
  if (fallback === undefined) {
    throw new Error("cannot sample from an empty mix");
  }
  return fallback;
}

function round5(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

function ringArea(ring: readonly (readonly [number, number])[]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const current = ring[i];
    const next = ring[i + 1];
    if (!current || !next) {
      continue;
    }
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area);
}

function firstVertexOfLargestOuterRing(
  geometry: CountyGeometry,
): [number, number] {
  const rings =
    geometry.type === "Polygon"
      ? [geometry.coordinates[0]]
      : geometry.coordinates.map((polygon) => polygon[0]);

  let bestRing = rings[0];
  if (!bestRing || bestRing.length === 0) {
    throw new Error("County geometry has no outer ring");
  }

  let bestArea = ringArea(bestRing);
  for (const ring of rings.slice(1)) {
    if (!ring || ring.length === 0) {
      continue;
    }
    const area = ringArea(ring);
    if (area > bestArea) {
      bestArea = area;
      bestRing = ring;
    }
  }

  const vertex = bestRing[0];
  if (!vertex) {
    throw new Error("County outer ring has no vertices");
  }
  return [vertex[0], vertex[1]];
}

function samplePosition(
  geometry: CountyGeometry,
  rng: () => number,
): [number, number] {
  const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(geometry);
  const spanLng = maxLng - minLng;
  const spanLat = maxLat - minLat;

  for (let attempt = 0; attempt < MAX_POSITION_ATTEMPTS; attempt += 1) {
    const lng = minLng + rng() * spanLng;
    const lat = minLat + rng() * spanLat;
    if (geoContains(geometry, [lng, lat])) {
      return [round5(lng), round5(lat)];
    }
  }

  const fallback = firstVertexOfLargestOuterRing(geometry);
  return [round5(fallback[0]), round5(fallback[1])];
}

function requireLookup<K, V>(
  table: ReadonlyMap<K, V>,
  key: K,
  label: string,
): V {
  const value = table.get(key);
  if (value === undefined) {
    throw new Error(`${label}: ${String(key)}`);
  }
  return value;
}

export function generateResidents(
  input: GenerateResidentsInput,
  seed = POPULATION_SEED,
): Resident[] {
  const rng = mulberry32(seed);
  const weightsByCounty = new Map(
    input.weights.map((row) => [row.countyId, row] as const),
  );
  const archetypeByLivelihood = new Map(
    input.archetypes.map((row) => [row.livelihood, row] as const),
  );

  const residents: Resident[] = [];

  for (const row of input.sampleFrame) {
    const weights = requireLookup(
      weightsByCounty,
      row.countyId,
      "missing County weights",
    );
    const geometry = input.geometries[row.countyId];
    if (!geometry) {
      throw new Error(`missing County geometry: ${row.countyId}`);
    }

    for (let index = 1; index <= row.sampleSize; index += 1) {
      const setting: Setting = rng() < weights.urbanShare ? "urban" : "rural";
      const livelihood = sampleKeyed<Livelihood>(
        rng,
        LIVELIHOODS,
        weights.livelihood,
      );
      const archetype = requireLookup(
        archetypeByLivelihood,
        livelihood,
        "missing livelihood archetype",
      );
      const connectivity = sampleKeyed<Connectivity>(
        rng,
        CONNECTIVITY,
        weights.connectivity,
      );
      const language = sampleKeyed<Language>(rng, LANGUAGES, weights.language);
      const ageBand = sampleKeyed<AgeBand>(rng, AGE_BANDS, archetype.ageBand);
      const gender = sampleKeyed<Gender>(rng, GENDERS, archetype.gender);
      const incomeBand = sampleKeyed<IncomeBand>(
        rng,
        INCOME_BANDS,
        archetype.incomeBand,
      );
      const dependentsKey = sampleKeyed(rng, DEPENDENT_KEYS, archetype.dependents);
      const disability = sampleKeyed<Disability>(
        rng,
        DISABILITIES,
        archetype.disability,
      );

      residents.push({
        id: `${row.countyId}-${index}`,
        county: row.countyId,
        setting,
        livelihood,
        ageBand,
        gender,
        incomeBand,
        dependents: Number.parseInt(dependentsKey, 10),
        language,
        connectivity,
        disability,
        pos: samplePosition(geometry, rng),
      });
    }
  }

  return residents;
}
