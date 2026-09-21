import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  COUNTY_IDS,
  generateResidents,
  loadPopulationData,
  residentsFileSchema,
  type CountyId,
  type Resident,
} from "../src/lib/population";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(ROOT, "data/generated/residents.json");
const EXPECTED_TOTAL = 3500;

function parseResidentsFile(payload: unknown): Resident[] {
  const result = residentsFileSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(`residents.json: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function pad(value: string, width: number): string {
  return value.padEnd(width, " ");
}

function padNum(value: number, width: number): string {
  return String(value).padStart(width, " ");
}

function main(): void {
  const data = loadPopulationData();
  const residents = generateResidents({
    sampleFrame: data.sampleFrame,
    weights: data.weights,
    archetypes: data.archetypes,
    geometries: data.geometries,
  });

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(residents)}\n`, "utf8");

  const written = parseResidentsFile(
    JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) as unknown,
  );

  const actualByCounty = new Map<CountyId, number>();
  for (const resident of written) {
    actualByCounty.set(
      resident.county,
      (actualByCounty.get(resident.county) ?? 0) + 1,
    );
  }

  const expectedByCounty = new Map(
    data.sampleFrame.map((row) => [row.countyId, row.sampleSize] as const),
  );

  console.log(
    `${pad("county", 18)} ${pad("expected", 8)} ${pad("actual", 8)} ${pad("delta", 8)}`,
  );

  let failed = false;
  for (const countyId of COUNTY_IDS) {
    const expected = expectedByCounty.get(countyId) ?? 0;
    const actual = actualByCounty.get(countyId) ?? 0;
    const delta = actual - expected;
    if (delta !== 0) {
      failed = true;
    }
    console.log(
      `${pad(countyId, 18)} ${padNum(expected, 8)} ${padNum(actual, 8)} ${padNum(delta, 8)}`,
    );
  }

  const actualTotal = written.length;
  const totalDelta = actualTotal - EXPECTED_TOTAL;
  if (actualTotal !== EXPECTED_TOTAL) {
    failed = true;
  }

  console.log(
    `${pad("TOTAL", 18)} ${padNum(EXPECTED_TOTAL, 8)} ${padNum(actualTotal, 8)} ${padNum(totalDelta, 8)}`,
  );

  if (failed) {
    process.exit(1);
  }

  console.log(`ok: ${COUNTY_IDS.length} counties, ${EXPECTED_TOTAL} Residents`);
}

main();
