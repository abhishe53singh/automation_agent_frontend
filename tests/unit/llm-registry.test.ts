// NOTE: no `import ... from "vitest"` here — on purpose. With this vitest build
// the imported `describe` is not bound to the worker's suite collector and every
// suite fails at its first `describe` call. `globals: true` in vitest.config.ts
// injects describe/it/expect instead; see the note there.
import {
  buildStoredModelChatRequest,
  chatCompletionRequestSchema,
  chatCompletionResponseSchema,
  llmProviderSchema,
  modelCreateSchema,
  providerCreateSchema,
} from "@/modules/llm";

/**
 * Unit coverage for the LLM registry contract refresh:
 *
 *  - `LlmProviderResponse` now carries `has_api_key` and NEVER `api_key`;
 *  - provider names are free text (no env-var casing pattern) and the create
 *    body accepts `api_key` (stored in the DB) alongside legacy `api_key_env`;
 *  - model names are free text up to 255 chars — slashes, colons and dots ok;
 *  - the unified chat endpoint requires `provider` + `model` even when a
 *    stored `model_id` is supplied (`buildStoredModelChatRequest` enforces it).
 */

const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";
const MODEL_ID = "22222222-2222-4222-8222-222222222222";

/** The response shape of every provider endpoint, per the updated contract. */
const providerResponse = {
  id: PROVIDER_ID,
  name: "openrouter",
  display_name: "OpenRouter",
  base_url: "https://openrouter.ai/api/v1",
  api_key_env: null,
  has_api_key: true,
  is_active: true,
  created_at: "2026-10-09T00:00:00Z",
  updated_at: "2026-10-09T00:00:00Z",
};

describe("llmProviderSchema (LlmProviderResponse)", () => {
  it("accepts the new shape with has_api_key", () => {
    expect(llmProviderSchema.parse(providerResponse)).toMatchObject({
      has_api_key: true,
      api_key_env: null,
    });
  });

  it("accepts has_api_key: false (no key stored)", () => {
    expect(llmProviderSchema.parse({ ...providerResponse, has_api_key: false })).toMatchObject({
      has_api_key: false,
    });
  });

  it("fails the parse when has_api_key is missing (schema drift alarm)", () => {
    const { has_api_key, ...withoutFlag } = providerResponse;
    expect(has_api_key).toBe(true);
    expect(llmProviderSchema.safeParse(withoutFlag).success).toBe(false);
  });

  it("never expects api_key back from the API", () => {
    // The response shape must not depend on a secret — only the safe flag.
    expect("api_key" in llmProviderSchema.shape).toBe(false);
    expect("has_api_key" in llmProviderSchema.shape).toBe(true);
  });
});

describe("providerCreateSchema (POST /llm/providers)", () => {
  it("accepts free-text names — no env-var casing pattern", () => {
    for (const name of ["openrouter", "my-claude", "company-gpt4", "MY_GPT4"]) {
      expect(providerCreateSchema.safeParse({ name }).success).toBe(true);
    }
  });

  it("accepts api_key (stored in the DB) with no env var", () => {
    const parsed = providerCreateSchema.safeParse({
      name: "openrouter",
      base_url: "https://openrouter.ai/api/v1",
      api_key: "sk-or-v1-xxxx",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.api_key).toBe("sk-or-v1-xxxx");
  });

  it("accepts the legacy api_key_env fallback", () => {
    expect(
      providerCreateSchema.safeParse({ name: "openai", api_key_env: "OPENAI_API_KEY" }).success,
    ).toBe(true);
  });

  it("rejects an empty name but nothing else about its format", () => {
    expect(providerCreateSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(providerCreateSchema.safeParse({ name: "some long Free Text Name!" }).success).toBe(
      true,
    );
  });
});

describe("modelCreateSchema (POST /llm/models)", () => {
  const costs = {
    provider_id: PROVIDER_ID,
    input_cost_per_million: 0,
    output_cost_per_million: 0,
  };

  it("accepts model IDs with slashes, colons and dots", () => {
    for (const name of [
      "gpt-4o",
      "gpt-4o-mini",
      "claude-3-5-sonnet-20241022",
      "gemini-2.0-flash",
      "meta/llama-3.1-8b-instruct:free",
      "meta/llama-3.1-70b-instruct",
      "mistralai/mistral-7b-instruct:free",
    ]) {
      expect(modelCreateSchema.safeParse({ ...costs, name }).success).toBe(true);
    }
  });

  it("allows zero costs", () => {
    expect(
      modelCreateSchema.safeParse({ ...costs, name: "meta/llama-3.1-8b-instruct:free" }).success,
    ).toBe(true);
  });

  it("caps the name at 255 characters", () => {
    expect(modelCreateSchema.safeParse({ ...costs, name: "m".repeat(255) }).success).toBe(true);
    expect(modelCreateSchema.safeParse({ ...costs, name: "m".repeat(256) }).success).toBe(false);
  });

  it("still requires a name and a provider", () => {
    expect(modelCreateSchema.safeParse({ ...costs, name: "" }).success).toBe(false);
    expect(
      modelCreateSchema.safeParse({ ...costs, name: "gpt-4o", provider_id: "nope" }).success,
    ).toBe(false);
  });
});

describe("chat completions (POST /llm/chat/completions)", () => {
  const storedProvider = { id: PROVIDER_ID, name: "openrouter" };
  const storedModel = { id: MODEL_ID, name: "meta/llama-3.1-8b-instruct:free" };
  const messages = [{ role: "user", content: "Hello!" } as const];

  it("buildStoredModelChatRequest pulls provider/model names from the stored objects", () => {
    const body = buildStoredModelChatRequest({
      provider: storedProvider,
      model: storedModel,
      messages,
    });
    // provider + model are REQUIRED by the schema even with model_id present.
    expect(body).toMatchObject({
      provider_id: PROVIDER_ID,
      model_id: MODEL_ID,
      provider: "openrouter",
      model: "meta/llama-3.1-8b-instruct:free",
      messages,
    });
    expect(chatCompletionRequestSchema.safeParse(body).success).toBe(true);
  });

  it("requires provider and model even when model_id is supplied", () => {
    const full = buildStoredModelChatRequest({
      provider: storedProvider,
      model: storedModel,
      messages,
    });
    const { provider, model, ...withoutNames } = full;
    // The builder always fills the required names from the stored objects…
    expect(provider).toBe(storedProvider.name);
    expect(model).toBe(storedModel.name);
    // …but without them the body is invalid, even alongside a model_id.
    expect(chatCompletionRequestSchema.safeParse(withoutNames).success).toBe(false);
    expect(
      chatCompletionRequestSchema.safeParse({ ...withoutNames, model_id: MODEL_ID }).success,
    ).toBe(false);
  });

  it("accepts an ad-hoc body (provider + model names, no stored IDs)", () => {
    expect(
      chatCompletionRequestSchema.safeParse({
        provider: "openai",
        model: "gpt-4o-mini",
        api_key: "sk-...",
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Hello!" },
        ],
      }).success,
    ).toBe(true);
  });

  it("parses the documented response shape", () => {
    const response = {
      content: "Hi!",
      model: "meta/llama-3.1-8b-instruct:free",
      provider: "openrouter",
      finish_reason: "stop",
      input_tokens: 5,
      output_tokens: 2,
      total_tokens: 7,
    };
    expect(chatCompletionResponseSchema.parse(response)).toMatchObject({
      finish_reason: "stop",
      total_tokens: 7,
    });
  });

  it("tolerates the optional usage fields being absent", () => {
    expect(
      chatCompletionResponseSchema.safeParse({
        content: "Hi!",
        model: "gpt-4o",
        provider: "openai",
      }).success,
    ).toBe(true);
  });
});
