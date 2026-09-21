import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { residentsFileSchema, type Resident } from "../src/lib/population/schema";
import {
  JevEngine,
  MockEngine,
  describeJevError,
  hasJevCredentials,
  publicReaction,
  smokeBrief,
} from "../src/lib/engine";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal(): void {
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const splitAt = trimmed.indexOf("=");
    if (splitAt <= 0) {
      continue;
    }
    const key = trimmed.slice(0, splitAt).trim();
    let value = trimmed.slice(splitAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function jevSampleSize(cap: number): number {
  const raw = process.env.JEV_SAMPLE_SIZE?.trim();
  const fallback = 3;
  if (!raw) {
    return Math.min(fallback, cap);
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return Math.min(fallback, cap);
  }
  return Math.min(parsed, cap);
}

function pickSample(residents: Resident[], size: number): Resident[] {
  const byCounty = new Map<string, Resident[]>();
  for (const resident of residents) {
    const list = byCounty.get(resident.county) ?? [];
    list.push(resident);
    byCounty.set(resident.county, list);
  }
  const sample: Resident[] = [];
  for (const group of byCounty.values()) {
    const first = group[0];
    if (first) {
      sample.push(first);
    }
    if (sample.length >= size) {
      return sample.slice(0, size);
    }
  }
  for (const resident of residents) {
    if (sample.some((item) => item.id === resident.id)) {
      continue;
    }
    sample.push(resident);
    if (sample.length >= size) {
      break;
    }
  }
  return sample;
}

function printReaction(label: string, reaction: ReturnType<typeof publicReaction>): void {
  console.log(`\n${label}`);
  console.log(
    JSON.stringify(
      {
        residentId: reaction.residentId,
        county: reaction.county,
        stance: reaction.stance.choice,
        personal_impact: reaction.personal_impact.score,
        clarity: reaction.clarity.score,
        top_concern: reaction.top_concern.choice,
        trusted_channel: reaction.trusted_channel.choice,
        driving_provision: reaction.driving_provision.choice,
        confidence: reaction.confidence,
        engine: reaction.engine,
        model: reaction.model,
        questionsVersion: reaction.questionsVersion,
      },
      null,
      2,
    ),
  );
}

async function collect(engine: MockEngine | JevEngine, residents: Resident[]) {
  const reactions = [];
  for await (const batch of engine.react(residents, smokeBrief)) {
    reactions.push(...batch.reactions);
  }
  return reactions;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const residents = residentsFileSchema.parse(
    JSON.parse(readFileSync(path.join(ROOT, "data/generated/residents.json"), "utf8")),
  );
  const sample = pickSample(residents, 50);
  if (sample.length !== 50) {
    throw new Error(`expected 50 Residents, got ${sample.length}`);
  }

  const mock = await collect(new MockEngine(), sample);
  if (mock.length !== 50) {
    throw new Error(`mock returned ${mock.length}`);
  }
  const fisher = mock.find((reaction) => {
    const resident = sample.find((item) => item.id === reaction.residentId);
    return resident?.livelihood === "fisher";
  });
  printReaction("mock", publicReaction(fisher ?? mock[0]));
  console.log(`mock: ${mock.length} Reactions`);

  if (!hasJevCredentials()) {
    console.log("jev: skipped (no AI_GATEWAY_API_KEY or TYPESAFE_API_KEY)");
    return;
  }

  const jevSize = jevSampleSize(sample.length);
  const jevSample = sample.slice(0, jevSize);

  try {
    const jev = await collect(new JevEngine(), jevSample);
    if (jev.length !== jevSample.length) {
      throw new Error(`jev returned ${jev.length}, expected ${jevSample.length}`);
    }
    printReaction("jev", publicReaction(jev[0]));
    console.log(`jev: ${jev.length} Reactions (JEV_SAMPLE_SIZE=${jevSize})`);
  } catch (error) {
    throw new Error(describeJevError(error));
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
