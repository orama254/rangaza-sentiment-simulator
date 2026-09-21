import type { CountyId, CountyRecord } from "@/lib/population/schema";

function aliasKey(name: string): string {
  return name.trim().toLowerCase();
}

export function countyAliasIndex(
  counties: readonly CountyRecord[],
): Map<string, CountyId> {
  const aliases = new Map<string, CountyId>();
  for (const county of counties) {
    aliases.set(aliasKey(county.id), county.id);
    aliases.set(aliasKey(county.name), county.id);
    for (const alias of county.aliases) {
      aliases.set(aliasKey(alias), county.id);
    }
  }
  return aliases;
}

export function countyIdFromShapeName(
  name: string,
  aliases: ReadonlyMap<string, CountyId>,
): CountyId | undefined {
  return aliases.get(aliasKey(name));
}
