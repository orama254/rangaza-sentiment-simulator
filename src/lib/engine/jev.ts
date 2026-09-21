import { APICallError, experimental_evaluate as evaluate } from "ai";
import type { Brief } from "@/lib/brief/schema";
import type { Resident } from "@/lib/population/schema";
import { ReactionCache, reactionCacheKey, residentCacheIdentity } from "./cache";
import { buildQuestions } from "./questions";
import {
  JEV_MODEL_ID,
  QUESTIONS_VERSION,
  reactionAnswersSchema,
  reactionSchema,
  confidenceFromAnswers,
  type Reaction,
  type ReactionBatch,
} from "./schema";

const DEFAULT_CONCURRENCY = 2;
// A 16-wide fan-out returned gateway 503. Two in flight stayed under that.
const MAX_IN_FLIGHT = 2;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 4;
const DEFAULT_RETRY_DELAY_MS = 750;
const MAX_RETRY_DELAY_MS = 30_000;
const PROBABILITY_TOLERANCE = 1e-6;

export function alignChoiceToDistribution(answers: unknown): unknown {
  if (answers === null || typeof answers !== "object" || Array.isArray(answers)) {
    return undefined;
  }
  let changed = false;
  const next: Record<string, unknown> = { ...(answers as Record<string, unknown>) };
  for (const [id, answer] of Object.entries(next)) {
    if (answer === null || typeof answer !== "object" || Array.isArray(answer)) {
      continue;
    }
    const record = answer as {
      type?: unknown;
      choice?: unknown;
      probabilities?: unknown;
    };
    if (record.type !== "choice" || record.probabilities === null || typeof record.probabilities !== "object") {
      continue;
    }
    const probabilities = record.probabilities as Record<string, unknown>;
    let max = Number.NEGATIVE_INFINITY;
    for (const probability of Object.values(probabilities)) {
      if (typeof probability === "number" && probability > max) {
        max = probability;
      }
    }
    if (!Number.isFinite(max)) {
      continue;
    }
    const selected =
      typeof record.choice === "string" ? probabilities[record.choice] : undefined;
    if (typeof selected === "number" && selected + PROBABILITY_TOLERANCE >= max) {
      continue;
    }
    const winner = Object.entries(probabilities).find(
      ([, probability]) => probability === max,
    )?.[0];
    if (!winner) {
      continue;
    }
    next[id] = { ...record, choice: winner };
    changed = true;
  }
  return changed ? next : undefined;
}

function envConcurrency(): number {
  const raw = process.env.JEV_CONCURRENCY;
  if (!raw) {
    return DEFAULT_CONCURRENCY;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_CONCURRENCY;
  }
  return parsed;
}

function jevModelId(): string {
  return process.env.RANGAZA_JEV_MODEL?.trim() || JEV_MODEL_ID;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error("aborted"));
      },
      { once: true },
    );
  });
}

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current = error;
  for (let depth = 0; depth < 5 && current !== undefined; depth += 1) {
    chain.push(current);
    current = current instanceof Error ? current.cause : undefined;
  }
  return chain;
}

function statusCodeOf(error: unknown): number | undefined {
  for (const item of errorChain(error)) {
    if (APICallError.isInstance(item) && item.statusCode !== undefined) {
      return item.statusCode;
    }
    if (
      item instanceof Error &&
      "statusCode" in item &&
      typeof item.statusCode === "number"
    ) {
      return item.statusCode;
    }
  }
  return undefined;
}

function responseHeadersOf(error: unknown): Record<string, string> | undefined {
  for (const item of errorChain(error)) {
    if (APICallError.isInstance(item) && item.responseHeaders) {
      return item.responseHeaders;
    }
  }
  return undefined;
}

export function retryDelayMs(error: unknown, attempt: number): number | undefined {
  const status = statusCodeOf(error);
  if (status !== 429 && status !== 502 && status !== 503 && status !== 504) {
    return undefined;
  }
  if (status === 429) {
    const headers = responseHeadersOf(error) ?? {};
    const retryAfterMs = headers["retry-after-ms"] ?? headers["Retry-After-Ms"];
    if (retryAfterMs) {
      const parsed = Number.parseInt(retryAfterMs, 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.min(parsed, MAX_RETRY_DELAY_MS);
      }
    }
    const retryAfter = headers["retry-after"] ?? headers["Retry-After"];
    if (retryAfter) {
      const seconds = Number.parseFloat(retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) {
        // retry-after is the Gateway's own directive, so it is used as given
        // rather than multiplied by the backoff factor.
        return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
      }
    }
  }
  return Math.min(DEFAULT_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

/**
 * Shared 429 cooldown for one fan-out. Without this every concurrent worker
 * retries on its own schedule and spends the request budget on rejections.
 */
export class RateLimitGate {
  private until = 0;

  async wait(signal?: AbortSignal): Promise<void> {
    const remaining = this.until - Date.now();
    if (remaining > 0) {
      await sleep(remaining, signal);
    }
  }

  pause(ms: number): void {
    this.until = Math.max(this.until, Date.now() + ms);
  }
}

async function evaluateResident(
  resident: Resident,
  brief: Brief,
  gate: RateLimitGate,
  signal?: AbortSignal,
) {
  const questions = buildQuestions(brief);
  const state = {
    resident: residentCacheIdentity(resident),
    brief: {
      title: brief.title,
      jurisdiction: brief.jurisdiction,
      effectiveDate: brief.provisions[0]?.effectiveDate ?? null,
      provisions: brief.provisions.map((provision) => ({
        id: provision.id,
        summary: provision.summary,
        whoPays: provision.whoPays,
        whoBenefits: provision.whoBenefits,
      })),
    },
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    await gate.wait(signal);
    // A fresh timeout per attempt. One deadline shared across attempts cannot
    // outlast a retry-after longer than the timeout itself.
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combined =
      signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const result = await evaluate({
        model: jevModelId(),
        state,
        questions,
        maxRetries: 0,
        abortSignal: combined,
      });
      return { answers: result.answers, response: { modelId: result.response.modelId } };
    } catch (error) {
      const aligned = alignChoiceToDistribution(
        error instanceof Error && "data" in error ? error.data : undefined,
      );
      if (aligned && reactionAnswersSchema.safeParse(aligned).success) {
        return { answers: aligned, response: { modelId: jevModelId() } };
      }
      lastError = error;
      if (signal?.aborted) {
        throw error;
      }
      const delay = retryDelayMs(error, attempt);
      if (delay === undefined || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }
      gate.pause(delay);
      // Jitter keeps the workers from resuming in lockstep.
      await sleep(delay + Math.random() * 250, signal);
    }
  }
  throw lastError;
}

async function runBatch<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function loop(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index] as T);
    }
  }
  const width = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: width }, () => loop()));
  return results;
}

export class JevEngine {
  readonly id = "jev" as const;

  constructor(
    private readonly cache = new ReactionCache(),
    private readonly concurrency = envConcurrency(),
  ) {}

  async *react(
    residents: Resident[],
    brief: Brief,
    opts?: { abortSignal?: AbortSignal; batchSize?: number },
  ): AsyncIterable<ReactionBatch> {
    const batchSize = opts?.batchSize ?? 10;
    const inFlight = Math.min(Math.max(this.concurrency, 1), MAX_IN_FLIGHT);
    const gate = new RateLimitGate();
    const abort = new AbortController();
    const signal =
      opts?.abortSignal !== undefined
        ? AbortSignal.any([opts.abortSignal, abort.signal])
        : abort.signal;

    try {
      for (let start = 0; start < residents.length; start += batchSize) {
        const slice = residents.slice(start, start + batchSize);
        const reactions = await runBatch(slice, inFlight, (resident) =>
          this.reactOne(resident, brief, gate, signal),
        );
        yield { reactions };
      }
    } finally {
      abort.abort(new Error("reaction batch ended"));
    }
  }

  async reactOne(
    resident: Resident,
    brief: Brief,
    gate: RateLimitGate = new RateLimitGate(),
    signal?: AbortSignal,
  ): Promise<Reaction> {
    const key = reactionCacheKey(resident, brief, "jev");
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }
    const result = await evaluateResident(resident, brief, gate, signal);
    const answers = reactionAnswersSchema.parse(result.answers);
    if (!brief.provisions.some((provision) => provision.id === answers.driving_provision.choice)) {
      throw new Error(
        `driving_provision ${answers.driving_provision.choice} is not in the Brief`,
      );
    }
    const reaction = reactionSchema.parse({
      ...answers,
      residentId: resident.id,
      county: resident.county,
      confidence: confidenceFromAnswers(answers),
      engine: "jev",
      questionsVersion: QUESTIONS_VERSION,
      model: result.response.modelId,
    });
    this.cache.set(key, reaction);
    return reaction;
  }
}

export function hasJevCredentials(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.TYPESAFE_API_KEY?.trim(),
  );
}

export function describeJevError(error: unknown): string {
  const status = statusCodeOf(error);
  if (status === 402) {
    return "Jev via AI Gateway returned 402. The key was accepted. The Gateway account needs a positive credit balance.";
  }
  if (status === 429) {
    const headers = responseHeadersOf(error) ?? {};
    const retryAfter = headers["retry-after"] ?? headers["Retry-After"];
    const wait = retryAfter ? ` Retry after ${retryAfter}s.` : "";
    return `Jev via AI Gateway is rate limited (429).${wait} Run in cached or offline mode, or lower JEV_CONCURRENCY.`;
  }
  if (status === 502 || status === 503 || status === 504) {
    return `Jev via AI Gateway is temporarily unavailable (${status}). The run stopped after retries. Lower JEV_CONCURRENCY and try again.`;
  }
  if (error instanceof Error) {
    if (
      error.message.includes("insufficient_funds") ||
      error.message.includes("positive credit balance")
    ) {
      return "Jev via AI Gateway returned 402. The key was accepted. The Gateway account needs a positive credit balance.";
    }
    if (error.message.trim().startsWith("{") && error.cause) {
      return describeJevError(error.cause);
    }
    return error.message;
  }
  return String(error);
}

