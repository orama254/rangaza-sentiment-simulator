import { createHash } from "node:crypto";
import type { Brief } from "@/lib/brief/schema";
import type { Resident } from "@/lib/population/schema";
import type { EngineId, Reaction } from "./schema";
import { QUESTIONS_VERSION } from "./schema";

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

export function residentCacheIdentity(resident: Resident) {
  return {
    county: resident.county,
    setting: resident.setting,
    livelihood: resident.livelihood,
    ageBand: resident.ageBand,
    gender: resident.gender,
    incomeBand: resident.incomeBand,
    dependents: resident.dependents,
    language: resident.language,
    connectivity: resident.connectivity,
    disability: resident.disability,
  };
}

export function briefHash(brief: Brief): string {
  return createHash("sha256").update(stableJson(brief)).digest("hex");
}

export function reactionCacheKey(
  resident: Resident,
  brief: Brief,
  engine: EngineId,
): string {
  return createHash("sha256")
    .update(
      stableJson({
        resident: residentCacheIdentity(resident),
        brief: briefHash(brief),
        questionsVersion: QUESTIONS_VERSION,
        engine,
      }),
    )
    .digest("hex");
}

export class ReactionCache {
  private readonly store = new Map<string, Reaction>();

  get(key: string): Reaction | undefined {
    return this.store.get(key);
  }

  set(key: string, reaction: Reaction): void {
    this.store.set(key, reaction);
  }
}
