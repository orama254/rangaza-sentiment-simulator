import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { briefSchema } from "../src/lib/brief/schema";
import { MockEngine } from "../src/lib/engine";
import { residentsFileSchema } from "../src/lib/population/schema";
import { countyPulse, residentFriction } from "../src/lib/scoring";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const brief = briefSchema.parse(
  JSON.parse(readFileSync(path.join(ROOT, "data/briefs/finance-bill-2024.json"), "utf8")),
);
const residents = residentsFileSchema.parse(
  JSON.parse(readFileSync(path.join(ROOT, "data/generated/residents.json"), "utf8")),
);

const kilifiFishers = residents.filter(
  (resident) => resident.county === "kilifi" && resident.livelihood === "fisher",
);
if (kilifiFishers.length === 0) {
  throw new Error("no Kilifi fishers in residents.json");
}

const engine = new MockEngine();
const reactions = kilifiFishers.map((resident) => engine.reactOne(resident, brief));
const driving = reactions.map((reaction) => reaction.driving_provision.choice);
const fuelShare = driving.filter((id) => id === "p1").length / driving.length;
if (fuelShare < 0.8) {
  throw new Error(`expected Kilifi fishers to pick p1 (motor vehicle tax / fuel), share=${fuelShare}`);
}

for (const reaction of reactions) {
  const friction = residentFriction(reaction);
  if (friction < 0 || friction > 1) {
    throw new Error(`friction out of range ${friction}`);
  }
  if (!("mobilization" in reaction)) {
    throw new Error("internal Reaction missing mobilization");
  }
}

const pulse = countyPulse("kilifi", reactions);
if ("mobilization" in pulse) {
  throw new Error("County Pulse leaked mobilization");
}
if (pulse.drivingProvisions[0]?.id !== "p1") {
  throw new Error(`Kilifi top Driving Provision ${pulse.drivingProvisions[0]?.id}`);
}

console.log(
  `OK scoring kilifi-fishers=${kilifiFishers.length} fuelShare=${fuelShare.toFixed(2)} friction=${pulse.friction.toFixed(3)} hotspot=${pulse.hotspot}`,
);
