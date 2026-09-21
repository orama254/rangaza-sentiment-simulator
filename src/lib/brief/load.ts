import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { dataRoot } from "../data-root";
import { briefSchema, type Brief } from "./schema";

function briefsDir(): string {
  return path.join(dataRoot(), "briefs");
}

function briefPath(id: string): string {
  return path.join(briefsDir(), `${id}.json`);
}

function parseBrief(payload: unknown, label: string): Brief {
  const result = briefSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(`${label}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadBrief(id: string): Brief {
  const file = briefPath(id);
  if (!existsSync(file)) {
    throw new Error(`Brief not found: ${id}`);
  }
  return parseBrief(JSON.parse(readFileSync(file, "utf8")) as unknown, `${id}.json`);
}

export function listBriefs(): Brief[] {
  const dir = briefsDir();
  if (!existsSync(dir)) {
    throw new Error("briefs directory not found");
  }
  const ids = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length));
  return ids.map((id) => loadBrief(id));
}

export function saveBrief(brief: Brief): void {
  writeFileSync(briefPath(brief.id), `${JSON.stringify(brief, null, 2)}\n`);
}
