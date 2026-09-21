import { anthropic } from "@ai-sdk/anthropic";
import { APICallError, gateway, type GatewayModelId, type LanguageModel } from "ai";

function gatewayModelId(): GatewayModelId {
  const provider = process.env.RANGAZA_LLM_PROVIDER;
  if (provider === "google") {
    return "google/gemini-2.5-flash";
  }
  if (provider === "openai") {
    return "openai/gpt-5.4-nano";
  }
  return "alibaba/qwen3.7-flash";
}

export function llmAvailable(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim(),
  );
}

export function createLlmModel(): LanguageModel {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    return gateway(gatewayModelId());
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    return anthropic("claude-sonnet-4-5");
  }
  throw new Error("No LLM credentials: set AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY");
}

export function isLlmCapacityError(error: unknown): boolean {
  if (APICallError.isInstance(error) && (error.statusCode === 429 || error.statusCode === 402)) {
    return true;
  }
  return error instanceof Error && error.name === "GatewayRateLimitError";
}

export function isMissingLlmCredentialsError(error: unknown): boolean {
  if (error instanceof Error && error.name === "LoadAPIKeyError") {
    return true;
  }
  return error instanceof Error && error.message.includes("No LLM credentials");
}
