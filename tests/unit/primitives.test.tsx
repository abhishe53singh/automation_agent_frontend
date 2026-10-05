// NOTE: no `import ... from "vitest"` here — on purpose. With this vitest build
// the imported `describe` is not bound to the worker's suite collector and every
// suite fails at its first `describe` call. `globals: true` in vitest.config.ts
// injects describe/it/expect instead; see the note there.
import { render, screen } from "@testing-library/react";

import { cn } from "@/shared/lib/cn";
import { Badge, Button, Card, EmptyState, Input, Spinner } from "@/shared/ui";

describe("cn", () => {
  it("joins conditional class names", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("lets a caller class win over a conflicting component default", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("shared/ui primitives", () => {
  it("Button defaults to type=button and accepts a variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toContain("bg-destructive");
  });

  it("Input links its label and reports an invalid state", () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("Card and Badge render their content", () => {
    render(
      <Card>
        <Badge variant="success">Ready</Badge>
      </Card>,
    );
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("Spinner is announced as a status", () => {
    render(<Spinner label="Fetching" />);
    expect(screen.getByRole("status", { name: "Fetching" })).toBeInTheDocument();
  });

  it("EmptyState renders the title, description and action", () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Create your first project."
        action={<Button>Create</Button>}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Create your first project.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
