import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { alignChoiceToDistribution, describeJevError, retryDelayMs } from "../src/lib/engine/jev";

const notePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../LIVE_MODE_DATA_ERROR.md",
);
const note = readFileSync(notePath, "utf8").trim();
const noteBody = note.slice(note.indexOf("{"));
const recorded = new Error("Service temporarily unavailable. Please try again shortly.");
recorded.name = "GatewayInternalServerError";
Object.assign(recorded, { statusCode: 503 });
recorded.cause = new Error(noteBody);
const recordedDescription = describeJevError(recorded);
assert.equal(
  recordedDescription,
  "Jev via AI Gateway is temporarily unavailable (503). The run stopped after retries. Lower JEV_CONCURRENCY and try again.",
);

const cause = new Error(
  '{"error":{"message":"Service temporarily unavailable. Please try again shortly.","type":"service_unavailable_error","statusCode":503},"providerMetadata":{"gateway":{"generationId":"gen_test"}}}',
);
const unavailable = new Error("Service temporarily unavailable. Please try again shortly.");
unavailable.name = "GatewayInternalServerError";
Object.assign(unavailable, { statusCode: 503 });
unavailable.cause = cause;

const described = describeJevError(unavailable);
assert.equal(
  described.includes("providerMetadata"),
  false,
  "page error must not include the gateway body",
);
assert.equal(
  described,
  "Jev via AI Gateway is temporarily unavailable (503). The run stopped after retries. Lower JEV_CONCURRENCY and try again.",
);

const delay = retryDelayMs(unavailable, 0);
assert.equal(delay, 750, "503 backs off instead of failing the simulation");

const aligned = alignChoiceToDistribution({
  trusted_channel: {
    type: "choice",
    choice: "whatsapp",
    probabilities: {
      sms: 0.29,
      whatsapp: 0.27999999999999997,
      radio: 0.26,
      tv: 0.09,
      social_media: 0.06,
      baraza: 0.02,
      religious: 0,
      none: 0,
    },
  },
}) as { trusted_channel: { choice: string } };
assert.equal(aligned.trusted_channel.choice, "sms");

console.log("verify-jev-error: ok");
