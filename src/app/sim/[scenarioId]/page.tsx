import { readFileSync } from "node:fs";
import path from "node:path";
import { briefSchema } from "@/lib/brief/schema";
import { parseRangazaMode } from "@/lib/engine/mode-name";
import { loadCounties } from "@/lib/population/load";
import { residentsFileSchema } from "@/lib/population/schema";
import { SimView } from "@/components/scene/SimView";

export default async function SimPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const briefId = scenarioId === "finance-bill-2024-b" ? "finance-bill-2024-b" : "finance-bill-2024";
  const root = process.cwd();
  const briefA = briefSchema.parse(
    JSON.parse(readFileSync(path.join(root, "data/briefs/finance-bill-2024.json"), "utf8")),
  );
  const briefB = briefSchema.parse(
    JSON.parse(readFileSync(path.join(root, "data/briefs/finance-bill-2024-b.json"), "utf8")),
  );
  const residents = residentsFileSchema.parse(
    JSON.parse(readFileSync(path.join(root, "data/generated/residents.json"), "utf8")),
  );
  const counties = loadCounties();
  const mode = parseRangazaMode(process.env.RANGAZA_MODE);

  return (
    <SimView
      title={briefId === "finance-bill-2024-b" ? briefB.title : briefA.title}
      briefA={briefA}
      briefB={briefB}
      counties={counties}
      residents={residents.map((resident) => ({
        id: resident.id,
        county: resident.county,
        pos: resident.pos,
      }))}
      mode={mode}
    />
  );
}
