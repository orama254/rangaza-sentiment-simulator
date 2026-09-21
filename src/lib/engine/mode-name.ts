export const RANGAZA_MODES = ["live", "cached", "offline"] as const;
export type RangazaMode = (typeof RANGAZA_MODES)[number];

export function parseRangazaMode(value: string | undefined): RangazaMode {
  if (value === "live" || value === "cached" || value === "offline") {
    return value;
  }
  return "offline";
}
