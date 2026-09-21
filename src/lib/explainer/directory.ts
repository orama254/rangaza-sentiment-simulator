import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { dataRoot } from "../data-root";
import { directoryFileSchema, type DirectoryEntry } from "./schema";

export function loadDirectory(presetId: string): DirectoryEntry[] {
  const file = path.join(dataRoot(), "directory", `${presetId}.json`);
  if (!existsSync(file)) {
    throw new Error(`directory not found: ${presetId}`);
  }
  const result = directoryFileSchema.safeParse(
    JSON.parse(readFileSync(file, "utf8")) as unknown,
  );
  if (!result.success) {
    throw new Error(`${presetId}.json: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
