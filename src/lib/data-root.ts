import { existsSync } from "node:fs";
import path from "node:path";

export function projectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(dir, "data", "briefs"))) {
      return dir;
    }
    const nested = path.join(dir, "rangaza");
    if (existsSync(path.join(nested, "data", "briefs"))) {
      return nested;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return process.cwd();
}

export function dataRoot(): string {
  return path.join(projectRoot(), "data");
}
