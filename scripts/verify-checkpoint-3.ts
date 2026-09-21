import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrief } from "../src/lib/brief/load";
import { composeExplainer } from "../src/lib/explainer/compose";
import { loadDirectory } from "../src/lib/explainer/directory";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal(): void {
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const splitAt = trimmed.indexOf("=");
    if (splitAt <= 0) {
      continue;
    }
    const key = trimmed.slice(0, splitAt).trim();
    let value = trimmed.slice(splitAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function assertExplainerAgainstBriefAndDirectory(
  explainer: Awaited<ReturnType<typeof composeExplainer>>,
  brief: ReturnType<typeof loadBrief>,
  directory: ReturnType<typeof loadDirectory>,
): void {
  assert.ok(explainer.formats.sms.length <= 160);
  const urls = new Set(directory.map((entry) => entry.sourceUrl));
  for (const step of explainer.nextSteps) {
    assert.ok(urls.has(step.sourceUrl));
  }
  const provisionIds = new Set(brief.provisions.map((provision) => provision.id));
  for (const claim of explainer.claims) {
    assert.ok(provisionIds.has(claim.provisionId));
  }
}

async function main(): Promise<void> {
  process.chdir(ROOT);
  loadEnvLocal();

  const brief = loadBrief("finance-bill-2024");
  assert.equal(brief.id, "finance-bill-2024");
  assert.ok(brief.provisions.some((provision) => provision.tags.includes("fuel")));

  const directory = loadDirectory("finance-bill-2024");
  assert.ok(directory.length >= 1);
  assert.ok(directory.some((entry) => entry.sourceUrl.length > 0));

  const shared = {
    brief,
    presetId: "finance-bill-2024",
    hotspotId: "kilifi-fisher",
    countyId: "kilifi" as const,
    livelihood: "fisher" as const,
    directory,
  };

  const enSms = await composeExplainer({
    ...shared,
    language: "en",
    channel: "sms",
  });
  assertExplainerAgainstBriefAndDirectory(enSms, brief, directory);

  const swPlain = await composeExplainer({
    ...shared,
    language: "sw",
    channel: "baraza",
  });
  assertExplainerAgainstBriefAndDirectory(swPlain, brief, directory);
  assert.ok(swPlain.formats.plain.length > 0);

  console.log("checkpoint 3 OK");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
