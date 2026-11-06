// Vitest globals (no `import from "vitest"`), as in code-preview.test.tsx.
import { fireEvent, render, screen } from "@testing-library/react";

import { fileInfo, previewKind } from "@/modules/chat/components/CodePreview";
import { Composer } from "@/modules/chat/components/Composer";
import { Markdown } from "@/modules/chat/components/Markdown";
import { parseQuiz } from "@/modules/chat/components/QuizView";
import { matchSlashCommands } from "@/modules/chat/components/SlashCommandHint";
import type { ChatSession } from "@/modules/chat/schemas";

vi.mock("@/modules/chat/hooks", () => ({
  useChatTools: () => ({ data: [], isPending: false, error: null, refetch: vi.fn() }),
  useSubmitTurn: () => ({ mutate: vi.fn(), isPending: false }),
  useAttachmentTypes: () => ({ data: undefined }),
  useUploadAttachments: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/modules/agents/hooks", () => ({
  useAgents: () => ({ data: [], isPending: false, error: null, refetch: vi.fn() }),
}));

const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body}\n\`\`\``;

const QUIZ = {
  title: "Basics",
  description: "Warm-up",
  questions: [
    {
      question: "What is $2+2$?",
      options: ["3", "4", "5"],
      answer: [1],
      explanation: "Two plus two is four.",
    },
    {
      question: "Which are primes?",
      options: ["2", "7", "9"],
      answer: [0, 1],
    },
  ],
};

function renderQuiz(quiz: unknown = QUIZ) {
  return render(<Markdown content={fence("quiz", JSON.stringify(quiz))} />);
}

describe("quiz preview kind", () => {
  it("maps quiz languages and downloads as JSON", () => {
    expect(previewKind("quiz", "{}")).toBe("quiz");
    expect(previewKind("Quiz-JSON", "{}")).toBe("quiz");
    expect(fileInfo("quiz").ext).toBe("json");
    expect(fileInfo("quiz").mime).toContain("application/json");
  });

  it("parses leniently", () => {
    const parsed = parseQuiz(
      JSON.stringify({
        title: "  T  ",
        questions: [
          { question: " Q1 ", options: ["a", "", "b"], answer: 2 },
          { question: "bad", options: ["only one"], answer: [0] },
          { question: "bad", options: ["a", "b"], answer: [9] },
        ],
      }),
    );
    expect(parsed.status).toBe("ok");
    if (parsed.status !== "ok") return;
    expect(parsed.quiz.title).toBe("T");
    expect(parsed.quiz.questions).toEqual([
      { question: "Q1", options: ["a", "b"], answer: [1], explanation: undefined },
    ]);
    expect(parseQuiz('{"title": "x", "questions": [').status).toBe("pending");
  });
});

describe("QuizView", () => {
  it("renders interactively by default with a Quiz toolbar", () => {
    const { container } = renderQuiz();
    expect(screen.getByRole("button", { name: "Preview" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByText("Quiz")).toBeTruthy();
    expect(screen.getByText("Basics")).toBeTruthy();
    expect(screen.getByText("2 questions")).toBeTruthy();
    expect(screen.getByText("Select all that apply")).toBeTruthy();
    expect(container.querySelectorAll('input[type="radio"]').length).toBe(3);
    expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(3);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(
      (screen.getByRole("button", { name: "Check answers" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(container.querySelector("pre")?.textContent).toContain('"title": "Basics"');
  });

  it("scores answers, shows explanations, and resets", () => {
    renderQuiz();
    fireEvent.click(screen.getByLabelText("4"));
    fireEvent.click(screen.getByLabelText("2")); // only one of the two primes
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(screen.getByTestId("quiz-score").textContent).toBe("1 / 2 (50%)");
    expect(screen.getByText("Two plus two is four.")).toBeTruthy();
    expect(screen.getAllByText("Incorrect").length).toBe(1);
    expect((screen.getByLabelText("3") as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.queryByTestId("quiz-score")).toBeNull();
    expect((screen.getByLabelText("4") as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByLabelText("4"));
    fireEvent.click(screen.getByLabelText("2"));
    fireEvent.click(screen.getByLabelText("7"));
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));
    expect(screen.getByTestId("quiz-score").textContent).toBe("2 / 2 (100%)");
  });

  it("explains an invalid quiz and keeps the raw JSON in Code view", () => {
    const { container } = render(<Markdown content={fence("quiz", '{"title": "x", "q": }')} />);
    expect(container.querySelector('[role="note"]')?.textContent).toContain("Invalid quiz");
    fireEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(container.querySelector("pre")?.textContent).toContain('"q": }');

    render(<Markdown content={fence("quiz", JSON.stringify({ title: "x", questions: [] }))} />);
    expect(screen.getByText("Invalid quiz")).toBeTruthy();
    expect(screen.getByText(/No valid questions/)).toBeTruthy();
  });

  it("shows a quiet placeholder while the JSON is still streaming", () => {
    render(<Markdown content={'```quiz\n{"title": "Basics", "questions": [{"quest'} />);
    expect(screen.getByText("Preparing quiz…")).toBeTruthy();
    expect(screen.queryByText("Invalid quiz")).toBeNull();
  });
});

describe("slash command hint", () => {
  it("matches only while typing the command word", () => {
    expect(matchSlashCommands("/").map((c) => c.name)).toEqual(["/quiz"]);
    expect(matchSlashCommands("/qu").length).toBe(1);
    expect(matchSlashCommands("/quiz ").length).toBe(0);
    expect(matchSlashCommands("/x").length).toBe(0);
    expect(matchSlashCommands("hello").length).toBe(0);
  });

  it("completes /quiz from the composer by click or Tab", () => {
    const session = { id: "s1", models: [] } as unknown as ChatSession;
    render(
      <Composer
        session={session}
        branchFrom={null}
        onCancelBranch={() => {}}
        streamState="idle"
        onStopStream={() => {}}
      />,
    );
    const box = screen.getByLabelText("Message") as HTMLTextAreaElement;

    fireEvent.change(box, { target: { value: "/" } });
    fireEvent.click(screen.getByRole("button", { name: /\/quiz <prompt>/ }));
    expect(box.value).toBe("/quiz ");
    expect(screen.queryByRole("button", { name: /\/quiz <prompt>/ })).toBeNull();

    fireEvent.change(box, { target: { value: "/q" } });
    fireEvent.keyDown(box, { key: "Tab" });
    expect(box.value).toBe("/quiz ");
  });
});
