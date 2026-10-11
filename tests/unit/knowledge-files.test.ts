// NOTE: no `import ... from "vitest"` here — on purpose. With this vitest build
// the imported `describe` is not bound to the worker's suite collector and every
// suite fails at its first `describe` call. `globals: true` in vitest.config.ts
// injects describe/it/expect instead; see the note there.
import {
  hasSupportedExtension,
  ingestionJobCreateSchema,
  isJobFinal,
  knowledgeFileSchema,
} from "@/modules/knowledge/schemas";

/**
 * Unit coverage for the knowledge files slice (phase 5 items 39-41):
 * response schema vs the API.md shape, the xor-free create guard,
 * the job-final helper driving poll intervals, and the upload guard.
 */

const fileFixture = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  project_id: null,
  filename: "notes.md",
  content_type: "text/markdown",
  size_bytes: 1234,
  storage_path: "abc123",
  sha256: "deadbeef",
  status: "uploaded",
  metadata_json: null,
  created_at: "2026-10-10T00:00:00Z",
  updated_at: "2026-10-10T00:00:00Z",
};

describe("knowledgeFileSchema", () => {
  it("parses the API.md FileResponse shape", () => {
    expect(knowledgeFileSchema.parse(fileFixture)).toBeTruthy();
  });

  it("fails when a required key is missing (drift alarm)", () => {
    const { filename, ...rest } = fileFixture;
    void filename;
    expect(() => knowledgeFileSchema.parse(rest)).toThrow();
  });
});

describe("ingestionJobCreateSchema", () => {
  it("requires a file id", () => {
    expect(() =>
      ingestionJobCreateSchema.parse({ file_id: "not-a-uuid" }),
    ).toThrow();
    expect(
      ingestionJobCreateSchema.parse({
        file_id: "11111111-1111-4111-8111-111111111111",
        run_inline: false,
      }).file_id,
    ).toBe("11111111-1111-4111-8111-111111111111");
  });
});

describe("isJobFinal", () => {
  it("stops polling on succeeded/failed/cancelled only", () => {
    expect(isJobFinal("succeeded")).toBe(true);
    expect(isJobFinal("failed")).toBe(true);
    expect(isJobFinal("cancelled")).toBe(true);
    expect(isJobFinal("pending")).toBe(false);
    expect(isJobFinal("running")).toBe(false);
  });
});

describe("hasSupportedExtension", () => {
  it("matches case-insensitively and rejects missing extensions", () => {
    expect(hasSupportedExtension("notes.MD", [".md", ".csv"])).toBe(true);
    expect(hasSupportedExtension("archive.zip", [".md", ".csv"])).toBe(false);
    expect(hasSupportedExtension("noextension", [".md"])).toBe(false);
  });
});
