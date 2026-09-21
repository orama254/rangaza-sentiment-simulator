import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { briefSchema } from "../src/lib/brief/schema";
import { residentsFileSchema } from "../src/lib/population/schema";
import { simulatePulses } from "../src/lib/scoring";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const brief = briefSchema.parse(
    JSON.parse(readFileSync(path.join(ROOT, "data/briefs/finance-bill-2024.json"), "utf8")),
  );
  const residents = residentsFileSchema.parse(
    JSON.parse(readFileSync(path.join(ROOT, "data/generated/residents.json"), "utf8")),
  );

  let counties = 0;
  let batches = 0;
  let last: string | undefined;
  for await (const event of simulatePulses(residents, brief, "offline")) {
    if (event.type === "batch") {
      batches += 1;
      if (event.reactions.some((reaction) => "mobilization" in reaction)) {
        throw new Error("batch leaked mobilization");
      }
    }
    if (event.type === "county") {
      counties += 1;
      last = event.pulse.countyId;
      if ("mobilization" in event.pulse) {
        throw new Error("pulse leaked mobilization");
      }
    }
    if (event.type === "complete") {
      if (event.pulses.length !== 47) {
        throw new Error(`expected 47 County Pulses, got ${event.pulses.length}`);
      }
      const urban = ["nairobi", "kiambu", "nakuru", "mombasa"].map((id) => {
        const pulse = event.pulses.find((row) => row.countyId === id);
        if (!pulse) {
          throw new Error(`missing ${id}`);
        }
        return `${id}:${pulse.friction.toFixed(3)}`;
      });
      const kilifi = event.pulses.find((row) => row.countyId === "kilifi");
      if (!kilifi) {
        throw new Error("missing kilifi");
      }
      console.log(
        `OK simulate counties=${counties} batches=${batches} last=${last} reactionCount=${event.reactionCount} urban ${urban.join(" ")} kilifiFriction=${kilifi.friction.toFixed(3)} kilifiDrive=${kilifi.drivingProvisions[0]?.id}`,
      );
    }
  }

  if (counties !== 47) {
    throw new Error(`county events ${counties}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
