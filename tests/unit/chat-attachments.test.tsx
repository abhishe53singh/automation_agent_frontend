// Vitest globals (no `import from "vitest"`), as in chat-tools.test.tsx.
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import {
  chatAttachmentSchema,
  chatTurnSchema,
  filterAttachmentFiles,
  turnCreateSchema,
  type ChatAttachment,
  type ChatSession,
} from "@/modules/chat/schemas";
import { Composer } from "@/modules/chat/components/Composer";
import { ChatFilesList, FILES_PANEL_HINT } from "@/modules/chat/components/ChatFilesPanel";
import * as chatApi from "@/modules/chat/api";

vi.mock("@/server/upstream", () => ({
  callUpstream: vi.fn(async () => ({ data: [] })),
}));

vi.mock("@/modules/agents/hooks", () => ({
  useAgents: () => ({
    data: [],
    isPending: false,
    isSuccess: true,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/modules/chat/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/chat/api")>();
  return {
    ...actual,
    getAttachmentTypes: vi.fn(async () => ({
      document_extensions: [".pdf", ".csv", ".md"],
      image_extensions: [".png", ".jpg"],
      max_size_bytes: 1024,
    })),
    listAttachments: vi.fn(async () => []),
    listChatTools: vi.fn(async () => []),
    uploadAttachments: vi.fn(),
    createTurn: vi.fn(),
    deleteAttachment: vi.fn(async () => undefined),
  };
});

const SESSION = "11111111-1111-4111-8111-111111111111";
const ATT1 = "44444444-4444-4444-8444-444444444441";
const ATT2 = "44444444-4444-4444-8444-444444444442";
const MODEL = "55555555-5555-4555-8555-555555555555";

const TYPES = {
  document_extensions: [".pdf", ".csv", ".md"],
  image_extensions: [".png", ".jpg"],
  max_size_bytes: 1024,
};

function attachment(overrides: Partial<ChatAttachment> = {}): ChatAttachment {
  return {
    id: ATT1,
    filename: "report.pdf",
    content_type: "application/pdf",
    size_bytes: 2048,
    kind: "document",
    status: "ready",
    error: null,
    chunk_count: 12,
    created_at: "2026-11-06T10:00:00Z",
    ...overrides,
  };
}

function file(name: string, size = 10, type = ""): File {
  return new File([new Uint8Array(size)], name, { type });
}

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("attachment schemas", () => {
  it("parses an attachment row", () => {
    const row = chatAttachmentSchema.parse(attachment({ status: "failed", error: "Bad PDF" }));
    expect(row.status).toBe("failed");
    expect(row.error).toBe("Bad PDF");
    expect(() => chatAttachmentSchema.parse({ ...attachment(), kind: "video" })).toThrow();
  });

  it("defaults attachment_ids on a turn and accepts them on create", () => {
    const turn = chatTurnSchema.parse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      session_id: SESSION,
      parent_turn_id: null,
      user_message_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      created_at: "x",
      user_message: null,
      llm_responses: [],
    });
    expect(turn.attachment_ids).toEqual([]);
    expect(
      turnCreateSchema.parse({ content: "hi", attachment_ids: [ATT1] }).attachment_ids,
    ).toEqual([ATT1]);
  });
});

describe("filterAttachmentFiles", () => {
  it("keeps supported files within the size limit and explains the rest", () => {
    const { accepted, rejected } = filterAttachmentFiles(
      [
        file("a.PDF"),
        file("b.png"),
        file("c.exe"),
        file("d.csv", 4096),
        file("e.md", 0),
        file("noext"),
      ],
      TYPES,
    );
    expect(accepted.map((f) => f.name)).toEqual(["a.PDF", "b.png"]);
    expect(rejected.map((r) => [r.file.name, r.reason])).toEqual([
      ["c.exe", "is not a supported file type"],
      ["d.csv", "is larger than the upload limit"],
      ["e.md", "is empty"],
      ["noext", "is not a supported file type"],
    ]);
  });

  it("lets everything non-empty through before the types load", () => {
    expect(filterAttachmentFiles([file("x.exe")], undefined).accepted).toHaveLength(1);
  });
});

describe("BFF attachments routes", () => {
  /**
   * A minimal Request stand-in: jsdom's File/FormData do not interoperate with
   * the runtime's undici Request, so the form is handed over directly (the
   * route only reads `headers` and `formData()`).
   */
  async function postAttachments(contentType: string, form: FormData | null) {
    const { POST } = await import("@/app/api/chat/sessions/[sessionId]/attachments/route");
    const { callUpstream } = await import("@/server/upstream");
    const mocked = vi.mocked(callUpstream);
    mocked.mockClear();
    const request = {
      headers: new Headers({ "content-type": contentType }),
      formData: async () => form ?? new FormData(),
    } as unknown as Request;
    const response = await POST(request, { params: Promise.resolve({ sessionId: SESSION }) });
    return { response, calls: mocked.mock.calls };
  }

  it("rejects a non-multipart body", async () => {
    const { response, calls } = await postAttachments("application/json", null);
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("forwards every `files` part upstream as multipart", async () => {
    const form = new FormData();
    form.append("files", file("a.pdf", 5), "a.pdf");
    form.append("files", file("b.png", 7), "b.png");
    form.append("other", "ignored");
    const { response, calls } = await postAttachments("multipart/form-data; boundary=x", form);
    expect(response.status).toBe(201);
    const request = calls[0]?.[0] as { path: string; method: string; body: FormData };
    expect(request.path).toBe(`/chat/sessions/${SESSION}/attachments`);
    expect(request.method).toBe("POST");
    expect(request.body).toBeInstanceOf(FormData);
    const parts = request.body.getAll("files") as File[];
    expect(parts.map((part) => part.name)).toEqual(["a.pdf", "b.png"]);
    expect(request.body.has("other")).toBe(false);
  });

  it("rejects a multipart body with no files", async () => {
    const form = new FormData();
    form.append("note", "x");
    const { response, calls } = await postAttachments("multipart/form-data; boundary=x", form);
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe("turns route attachment_ids", () => {
  async function post(body: unknown) {
    const { POST } = await import("@/app/api/chat/sessions/[sessionId]/turns/route");
    const { callUpstream } = await import("@/server/upstream");
    const mocked = vi.mocked(callUpstream);
    mocked.mockClear();
    const response = await POST(
      new Request("http://localhost/api/chat/sessions/x/turns", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ sessionId: SESSION }) },
    );
    return { response, calls: mocked.mock.calls };
  }

  it("forwards attachment_ids", async () => {
    const { response, calls } = await post({ content: "hi", attachment_ids: [ATT1, ATT2] });
    expect(response.status).toBe(201);
    expect(calls[0]?.[0]).toMatchObject({
      body: { content: "hi", attachment_ids: [ATT1, ATT2] },
    });
  });

  it("omits an empty list", async () => {
    const { calls } = await post({ content: "hi", attachment_ids: [] });
    expect((calls[0]?.[0] as { body: Record<string, unknown> }).body).not.toHaveProperty(
      "attachment_ids",
    );
  });

  it("rejects malformed attachment_ids", async () => {
    for (const bad of [[1], ATT1, { a: 1 }, [""]]) {
      const { response, calls } = await post({ content: "hi", attachment_ids: bad });
      expect(response.status).toBe(400);
      expect(calls).toHaveLength(0);
    }
  });
});

const session: ChatSession = {
  id: SESSION,
  user_id: "66666666-6666-4666-8666-666666666666",
  project_id: null,
  title: "Test",
  created_at: "x",
  updated_at: "x",
  archived_at: null,
  models: [
    {
      id: "77777777-7777-4777-8777-777777777777",
      session_id: SESSION,
      model_id: MODEL,
      is_enabled: true,
      created_at: "x",
      model: null,
    },
  ],
};

describe("Composer attachment chips", () => {
  beforeEach(() => window.localStorage.clear());

  it("goes uploading -> ready, sends attachment_ids, then clears", async () => {
    let resolveUpload: (rows: ChatAttachment[]) => void = () => undefined;
    vi.mocked(chatApi.uploadAttachments).mockImplementation(
      () => new Promise((resolve) => (resolveUpload = resolve)),
    );
    vi.mocked(chatApi.createTurn).mockImplementation(async (_sessionId, input) =>
      chatTurnSchema.parse({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        session_id: SESSION,
        parent_turn_id: null,
        user_message_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
        created_at: "x",
        user_message: null,
        llm_responses: [],
        attachment_ids: input.attachment_ids ?? [],
      }),
    );

    wrap(
      <Composer
        session={session}
        branchFrom={null}
        onCancelBranch={() => undefined}
        streamState="idle"
        onStopStream={() => undefined}
      />,
    );

    // Wait for supported types so the file input gets its accept list.
    const input = screen.getByTestId("composer-file-input");
    await waitFor(() => expect(input).toHaveAttribute("accept", ".pdf,.csv,.md,.png,.jpg"));

    fireEvent.change(input, { target: { files: [file("notes.pdf", 100)] } });

    const chips = screen.getByRole("list", { name: "Attached files" });
    const chip = within(chips).getByText("notes.pdf").closest("li") as HTMLElement;
    expect(chip).toHaveAttribute("data-status", "uploading");
    expect(screen.getByLabelText("Uploading notes.pdf")).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(chatApi.uploadAttachments)).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Summarise it" } });
    const sendButton = screen.getByRole("button", { name: /Send/ });
    expect(sendButton).toBeDisabled();

    await act(async () => {
      resolveUpload([attachment({ id: ATT1, filename: "notes.pdf", size_bytes: 100 })]);
    });
    await waitFor(() => expect(chip).toHaveAttribute("data-status", "ready"));
    expect(sendButton).not.toBeDisabled();

    fireEvent.click(sendButton);
    await waitFor(() => expect(vi.mocked(chatApi.createTurn)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(chatApi.createTurn).mock.calls[0]?.[1]).toMatchObject({
      content: "Summarise it",
      attachment_ids: [ATT1],
    });
    await waitFor(() => expect(screen.queryByRole("list", { name: "Attached files" })).toBeNull());
  });

  it("marks a file the server could not parse as failed and keeps it out of the turn", async () => {
    vi.mocked(chatApi.uploadAttachments).mockResolvedValue([
      attachment({ id: ATT2, filename: "broken.pdf", status: "failed", error: "Encrypted PDF" }),
    ]);
    wrap(
      <Composer
        session={session}
        branchFrom={null}
        onCancelBranch={() => undefined}
        streamState="idle"
        onStopStream={() => undefined}
      />,
    );
    const input = screen.getByTestId("composer-file-input");
    await waitFor(() => expect(input).toHaveAttribute("accept"));
    fireEvent.change(input, { target: { files: [file("broken.pdf", 100)] } });

    const label = await screen.findByLabelText("broken.pdf failed: Encrypted PDF");
    expect(label.closest("li")).toHaveAttribute("data-status", "failed");
    fireEvent.click(screen.getByRole("button", { name: "Remove file broken.pdf" }));
    expect(screen.queryByRole("list", { name: "Attached files" })).toBeNull();
  });

  it("rejects unsupported or oversized files client-side without uploading", async () => {
    vi.mocked(chatApi.uploadAttachments).mockClear();
    wrap(
      <Composer
        session={session}
        branchFrom={null}
        onCancelBranch={() => undefined}
        streamState="idle"
        onStopStream={() => undefined}
      />,
    );
    const input = screen.getByTestId("composer-file-input");
    await waitFor(() => expect(input).toHaveAttribute("accept"));
    fireEvent.change(input, { target: { files: [file("tool.exe"), file("big.pdf", 4096)] } });
    expect(vi.mocked(chatApi.uploadAttachments)).not.toHaveBeenCalled();
    expect(screen.queryByRole("list", { name: "Attached files" })).toBeNull();
  });
});

describe("ChatFilesList", () => {
  it("lists the chat's files with details, download and delete", () => {
    wrap(
      <ChatFilesList
        sessionId={SESSION}
        isPending={false}
        error={null}
        attachments={[
          attachment(),
          attachment({
            id: ATT2,
            filename: "photo.png",
            kind: "image",
            content_type: "image/png",
            chunk_count: null,
          }),
          attachment({
            id: "44444444-4444-4444-8444-444444444443",
            filename: "bad.csv",
            status: "failed",
            error: "Could not parse CSV",
            chunk_count: null,
          }),
        ]}
      />,
    );

    expect(screen.getByText(FILES_PANEL_HINT)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Chat files" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("report.pdf")).toBeInTheDocument();
    expect(within(list).getByText(/12 chunks/)).toBeInTheDocument();
    expect(within(list).getByText("Could not parse CSV")).toBeInTheDocument();

    const download = screen.getByRole("link", { name: "Download photo.png" });
    expect(download).toHaveAttribute(
      "href",
      `/api/chat/sessions/${SESSION}/attachments/${ATT2}/content`,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete report.pdf" }));
    expect(screen.getByText("Delete this file?")).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    wrap(<ChatFilesList sessionId={SESSION} isPending={false} error={null} attachments={[]} />);
    expect(screen.getByText("No files yet")).toBeInTheDocument();
  });
});
