import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AddInsight } from "./add-insight.tsx";

const renderForm = () => {
  const onClose = vi.fn();
  const onAdded = vi.fn();
  render(<AddInsight open onClose={onClose} onAdded={onAdded} />);
  return { onClose, onAdded };
};

const submit = () =>
  screen.getByRole("button", { name: "Add insight" }) as HTMLButtonElement;

describe("add insight", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("#13 posts the chosen brand and text, then closes and refreshes", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response("{}", { status: 201 }))
    );
    vi.stubGlobal("fetch", fetch);
    const { onClose, onAdded } = renderForm();

    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Insight"), {
      target: { value: "Men's suits are back" },
    });
    fireEvent.click(submit());

    await vi.waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith("/api/insights", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brand: 3, text: "Men's suits are back" }),
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("#13 disables submit while the text is empty", () => {
    renderForm();
    expect(submit().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Insight"), {
      target: { value: "   " },
    });
    expect(submit().disabled).toBe(true);
  });

  it("#13 shows the server's error and stays open", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "text: Too long" }), {
            status: 400,
          }),
        )
      ),
    );
    const { onClose, onAdded } = renderForm();

    fireEvent.change(screen.getByLabelText("Insight"), {
      target: { value: "hi" },
    });
    fireEvent.click(submit());

    expect((await screen.findByRole("alert")).textContent).toBe(
      "text: Too long",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it("#13 sends one request when submitted twice quickly", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response("{}", { status: 201 }))
    );
    vi.stubGlobal("fetch", fetch);
    const { onAdded } = renderForm();

    fireEvent.change(screen.getByLabelText("Insight"), {
      target: { value: "once" },
    });
    fireEvent.click(submit());
    fireEvent.click(submit());

    await vi.waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
