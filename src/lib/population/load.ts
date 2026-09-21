import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  COUNTY_IDS,
  LIVELIHOODS,
  archetypesFileSchema,
  countiesFileSchema,
  countyWeightsFileSchema,
  lngLatSchema,
  sampleFrameRowSchema,
  type Archetype,
  type CountyId,
  type CountyRecord,
  type CountyWeights,
  type SampleFrameRow,
} from "./schema";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const linearRingSchema = z.array(lngLatSchema).min(4);
const polygonCoordinatesSchema = z.array(linearRingSchema).min(1);
const multiPolygonCoordinatesSchema = z.array(polygonCoordinatesSchema).min(1);

const countyGeometrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Polygon"),
    coordinates: polygonCoordinatesSchema,
  }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: multiPolygonCoordinatesSchema,
  }),
]);

const countyFeatureSchema = z.looseObject({
  type: z.literal("Feature"),
  properties: z.looseObject({
    shapeName: z.string().min(1),
  }),
  geometry: countyGeometrySchema,
});

const kenyaCountiesGeojsonSchema = z.looseObject({
  type: z.literal("FeatureCollection"),
  features: z.array(countyFeatureSchema).length(COUNTY_IDS.length),
});

export type CountyGeometry = z.infer<typeof countyGeometrySchema>;

export type PopulationData = {
  counties: CountyRecord[];
  archetypes: Archetype[];
  weights: CountyWeights[];
  sampleFrame: SampleFrameRow[];
  geometries: Record<CountyId, CountyGeometry>;
};

type CountyAliasIndex = Map<string, CountyId>;

function parsePayload<S extends z.ZodType>(
  schema: S,
  payload: unknown,
  label: string,
): z.output<S> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(`${label}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function readText(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readText(relativePath)) as unknown;
}

function aliasKey(name: string): string {
  return name.trim().toLowerCase();
}

function buildAliasIndex(counties: readonly CountyRecord[]): CountyAliasIndex {
  const aliases: CountyAliasIndex = new Map();
  const register = (raw: string, countyId: CountyId, label: string) => {
    const key = aliasKey(raw);
    const existing = aliases.get(key);
    if (existing !== undefined && existing !== countyId) {
      throw new Error(`${label}: alias "${raw}" maps to both ${existing} and ${countyId}`);
    }
    aliases.set(key, countyId);
  };

  for (const county of counties) {
    register(county.id, county.id, "counties.json");
    register(county.name, county.id, "counties.json");
    for (const alias of county.aliases) {
      register(alias, county.id, "counties.json");
    }
  }

  return aliases;
}

function resolveCountyName(
  name: string,
  aliases: CountyAliasIndex,
  label: string,
): CountyId {
  const countyId = aliases.get(aliasKey(name));
  if (countyId === undefined) {
    throw new Error(`${label}: unmatched County name: ${name}`);
  }
  return countyId;
}

function assertCompleteCounties(ids: Iterable<CountyId>, label: string): void {
  const seen = new Set<CountyId>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`${label}: duplicate County ${id}`);
    }
    seen.add(id);
  }
  const missing = COUNTY_IDS.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(`${label}: missing County ${missing.join(", ")}`);
  }
}

export function loadCounties(): CountyRecord[] {
  const counties = parsePayload(
    countiesFileSchema,
    readJson("data/counties.json"),
    "counties.json",
  );
  assertCompleteCounties(
    counties.map((county) => county.id),
    "counties.json",
  );
  return counties;
}

export function loadArchetypes(): Archetype[] {
  const archetypes = parsePayload(
    archetypesFileSchema,
    readJson("data/archetypes.json"),
    "archetypes.json",
  );
  const seen = new Set<string>();
  for (const archetype of archetypes) {
    if (seen.has(archetype.livelihood)) {
      throw new Error(`archetypes.json: duplicate livelihood ${archetype.livelihood}`);
    }
    seen.add(archetype.livelihood);
  }
  const missing = LIVELIHOODS.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(`archetypes.json: missing livelihood ${missing.join(", ")}`);
  }
  return archetypes;
}

export function loadCountyWeights(): CountyWeights[] {
  const weights = parsePayload(
    countyWeightsFileSchema,
    readJson("data/county-weights.json"),
    "county-weights.json",
  );
  assertCompleteCounties(
    weights.map((row) => row.countyId),
    "county-weights.json",
  );
  return weights;
}

export function loadSampleFrame(
  counties: readonly CountyRecord[] = loadCounties(),
): SampleFrameRow[] {
  const aliases = buildAliasIndex(counties);
  const lines = readText("data/sample-frame.csv")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const header = lines[0];
  if (header !== "County,Sample_Size") {
    throw new Error(`sample-frame.csv: unexpected header ${header ?? "(empty)"}`);
  }

  const rows: SampleFrameRow[] = [];
  const seen: CountyId[] = [];

  for (const line of lines.slice(1)) {
    const splitAt = line.lastIndexOf(",");
    if (splitAt <= 0) {
      throw new Error(`sample-frame.csv: malformed row ${line}`);
    }
    const name = line.slice(0, splitAt).trim();
    const sizeRaw = line.slice(splitAt + 1).trim();
    if (name.toUpperCase() === "TOTAL") {
      continue;
    }
    const countyId = resolveCountyName(name, aliases, "sample-frame.csv");
    rows.push(
      parsePayload(
        sampleFrameRowSchema,
        { countyId, sampleSize: Number(sizeRaw) },
        `sample-frame.csv:${name}`,
      ),
    );
    seen.push(countyId);
  }

  assertCompleteCounties(seen, "sample-frame.csv");
  return rows;
}

export function loadCountyGeometries(
  counties: readonly CountyRecord[] = loadCounties(),
): Record<CountyId, CountyGeometry> {
  const aliases = buildAliasIndex(counties);
  const geojson = parsePayload(
    kenyaCountiesGeojsonSchema,
    readJson("public/geo/kenya-counties.geojson"),
    "kenya-counties.geojson",
  );

  const geometries = {} as Record<CountyId, CountyGeometry>;
  const seen: CountyId[] = [];

  for (const feature of geojson.features) {
    const countyId = resolveCountyName(
      feature.properties.shapeName,
      aliases,
      "kenya-counties.geojson",
    );
    if (seen.includes(countyId)) {
      throw new Error(`kenya-counties.geojson: duplicate County ${countyId}`);
    }
    seen.push(countyId);
    geometries[countyId] = feature.geometry;
  }

  assertCompleteCounties(seen, "kenya-counties.geojson");
  return geometries;
}

export function loadPopulationData(): PopulationData {
  const counties = loadCounties();
  return {
    counties,
    archetypes: loadArchetypes(),
    weights: loadCountyWeights(),
    sampleFrame: loadSampleFrame(counties),
    geometries: loadCountyGeometries(counties),
  };
}
