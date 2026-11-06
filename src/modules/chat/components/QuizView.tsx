"use client";

import * as React from "react";
import { z } from "zod";

import { Button } from "@/shared/ui";

import { PreviewError } from "./CodePreview";

/**
 * Interactive quiz for ```quiz fenced blocks (see CodePreview's "quiz" kind).
 *
 * Question / option / explanation text goes through `renderText`, which the
 * caller (Markdown.tsx) supplies so formulas render without this file
 * importing Markdown (that would be a circular import).
 */

export interface QuizQuestion {
  question: string;
  options: string[];
  /** Sorted, de-duplicated indices of the correct option(s). */
  answer: number[];
  explanation?: string;
}

export interface Quiz {
  title: string;
  description?: string;
  questions: QuizQuestion[];
}

export type QuizParse =
  | { status: "ok"; quiz: Quiz; pretty: string }
  | { status: "pending" }
  | { status: "error"; message: string };

const MAX_OPTIONS = 8;

const text = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z.string().trim(),
);

const indices = z.preprocess(
  (value) => (Array.isArray(value) ? value : [value]),
  z.array(z.unknown()),
);

const questionSchema = z.object({
  question: text.pipe(z.string().min(1)),
  options: z.array(z.unknown()),
  answer: indices.optional(),
  answers: indices.optional(),
  explanation: text.optional().catch(undefined),
});

const quizSchema = z.object({
  title: text.catch(""),
  description: text.optional().catch(undefined),
  questions: z.array(z.unknown()),
});

function normalizeQuestion(raw: unknown): QuizQuestion | null {
  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { question, options: rawOptions, explanation } = parsed.data;

  // Keep the original index of every usable option so answer indices still
  // point at the right one after blanks are dropped.
  const remap = new Map<number, number>();
  const options: string[] = [];
  rawOptions.forEach((option, index) => {
    const value = text.safeParse(option);
    if (!value.success || !value.data || options.length >= MAX_OPTIONS) return;
    remap.set(index, options.length);
    options.push(value.data);
  });
  if (options.length < 2) return null;

  const answer = [
    ...new Set(
      (parsed.data.answer ?? parsed.data.answers ?? [])
        .map((value) => (typeof value === "string" ? Number(value.trim()) : value))
        .filter((value): value is number => typeof value === "number" && Number.isInteger(value))
        .map((value) => remap.get(value))
        .filter((value): value is number => value !== undefined),
    ),
  ].sort((a, b) => a - b);
  if (answer.length === 0) return null;

  return { question, options, answer, explanation: explanation || undefined };
}

/** Parse + validate a quiz block, leniently. */
export function parseQuiz(code: string): QuizParse {
  let value: unknown;
  try {
    value = JSON.parse(code);
  } catch (error) {
    // Mid-stream the JSON is simply not finished yet.
    if (!code.trimEnd().endsWith("}")) return { status: "pending" };
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
  const parsed = quizSchema.safeParse(value);
  if (!parsed.success) {
    return { status: "error", message: "Expected an object with a `questions` array." };
  }
  const questions = parsed.data.questions
    .map(normalizeQuestion)
    .filter((q): q is QuizQuestion => q !== null);
  if (questions.length === 0) {
    return {
      status: "error",
      message: "No valid questions (each needs text, 2+ options and a correct answer index).",
    };
  }
  return {
    status: "ok",
    quiz: {
      title: parsed.data.title || "Quiz",
      description: parsed.data.description || undefined,
      questions,
    },
    pretty: JSON.stringify(value, null, 2),
  };
}

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

export function QuizPreview({
  code,
  renderText,
}: {
  code: string;
  renderText: (text: string) => React.ReactNode;
}) {
  const parsed = React.useMemo(() => parseQuiz(code), [code]);
  if (parsed.status === "pending") {
    return (
      <p role="status" className="p-3 text-xs text-muted-foreground">
        Preparing quiz…
      </p>
    );
  }
  if (parsed.status === "error")
    return <PreviewError title="Invalid quiz" message={parsed.message} />;
  return <QuizView key={parsed.pretty} quiz={parsed.quiz} renderText={renderText} />;
}

export function QuizView({
  quiz,
  renderText,
}: {
  quiz: Quiz;
  renderText: (text: string) => React.ReactNode;
}) {
  const id = React.useId();
  const total = quiz.questions.length;
  const [selected, setSelected] = React.useState<number[][]>(() => quiz.questions.map(() => []));
  /** "checked" = graded; "revealed" = answers shown without grading. */
  const [mode, setMode] = React.useState<"answering" | "checked" | "revealed">("answering");
  const locked = mode !== "answering";

  const correct = quiz.questions.map((q, index) => sameSet(selected[index] ?? [], q.answer));
  const score = correct.filter(Boolean).length;
  const percent = Math.round((score / total) * 100);
  const allAnswered = selected.every((choice) => choice.length > 0);

  const toggle = (question: number, option: number, multiple: boolean) => {
    if (locked) return;
    setSelected((previous) =>
      previous.map((choice, index) => {
        if (index !== question) return choice;
        if (!multiple) return [option];
        return choice.includes(option)
          ? choice.filter((value) => value !== option)
          : [...choice, option].sort((a, b) => a - b);
      }),
    );
  };

  const reset = () => {
    setSelected(quiz.questions.map(() => []));
    setMode("answering");
  };

  const scoreText = `${score} / ${total} (${percent}%)`;

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3 p-3">
      <header className="space-y-1">
        <h3 id={`${id}-title`} className="text-base font-semibold">
          {quiz.title}
        </h3>
        {quiz.description ? (
          <p className="text-sm text-muted-foreground">{quiz.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {total} question{total === 1 ? "" : "s"}
        </p>
        <p role="status" aria-live="polite" className="text-sm font-medium">
          {mode === "checked" ? (
            <>
              Score: <span data-testid="quiz-score">{scoreText}</span>
            </>
          ) : mode === "revealed" ? (
            "Answers shown"
          ) : null}
        </p>
      </header>

      <ol className="space-y-3">
        {quiz.questions.map((q, qIndex) => {
          const multiple = q.answer.length > 1;
          const name = `${id}-q${qIndex}`;
          const choice = selected[qIndex] ?? [];
          return (
            <li
              key={qIndex}
              className="rounded-md border border-border bg-card p-3 text-card-foreground"
            >
              <fieldset disabled={locked} className="min-w-0 space-y-2">
                <legend className="flex w-full items-start gap-2 text-sm font-medium">
                  <span className="shrink-0 text-muted-foreground">{qIndex + 1}.</span>
                  <span className="min-w-0 flex-1">{renderText(q.question)}</span>
                  {mode === "checked" ? (
                    <span
                      className={`shrink-0 text-xs ${correct[qIndex] ? "text-success" : "text-destructive"}`}
                    >
                      {correct[qIndex] ? "Correct" : "Incorrect"}
                    </span>
                  ) : null}
                </legend>
                {multiple ? (
                  <p className="text-xs text-muted-foreground">Select all that apply</p>
                ) : null}
                <div className="space-y-1.5">
                  {q.options.map((option, oIndex) => {
                    const inputId = `${name}-o${oIndex}`;
                    const isSelected = choice.includes(oIndex);
                    const isAnswer = q.answer.includes(oIndex);
                    let tone = "border-border hover:bg-accent/60";
                    let marker: string | null = null;
                    if (locked && isAnswer) {
                      tone = "border-success/40 bg-success/10 text-success";
                      marker = "Correct answer";
                    } else if (mode === "checked" && isSelected) {
                      tone = "border-destructive/40 bg-destructive/10 text-destructive";
                      marker = "Your answer";
                    }
                    return (
                      <label
                        key={oIndex}
                        htmlFor={inputId}
                        className={`flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm ${tone} ${locked ? "cursor-default" : ""}`}
                      >
                        <input
                          id={inputId}
                          type={multiple ? "checkbox" : "radio"}
                          name={name}
                          checked={isSelected}
                          disabled={locked}
                          onChange={() => toggle(qIndex, oIndex, multiple)}
                          className="mt-1 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1">{renderText(option)}</span>
                        {marker ? <span className="shrink-0 text-xs">{marker}</span> : null}
                      </label>
                    );
                  })}
                </div>
                {locked && q.explanation ? (
                  <div className="rounded-md border border-border bg-muted/40 p-2 text-sm">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Explanation</p>
                    {renderText(q.explanation)}
                  </div>
                ) : null}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center gap-2">
        {mode === "answering" ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={!allAnswered}
              onClick={() => setMode("checked")}
            >
              Check answers
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("revealed")}>
              Show answers
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            Try again
          </Button>
        )}
        {mode === "checked" ? (
          <p className="text-sm font-medium" aria-hidden>
            {scoreText}
          </p>
        ) : null}
      </footer>
    </section>
  );
}
