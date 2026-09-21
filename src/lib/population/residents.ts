import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { dataRoot } from "../data-root";
import { residentsFileSchema, type Resident } from "./schema";

export function loadResidents(): Resident[] {
  const file = path.join(dataRoot(), "generated", "residents.json");
  if (!existsSync(file)) {
    throw new Error("residents.json not found");
  }
  const result = residentsFileSchema.safeParse(
    JSON.parse(readFileSync(file, "utf8")) as unknown,
  );
  if (!result.success) {
    throw new Error(`residents.json: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
