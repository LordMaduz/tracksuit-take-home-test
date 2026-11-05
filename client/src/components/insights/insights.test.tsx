import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Insights } from "./insights.tsx";

const TEST_INSIGHTS = [
  { id: 1, brand: 1, createdAt: new Date(), text: "Test insight" },
  { id: 2, brand: 2, createdAt: new Date(), text: "Another test insight" },
];

describe("insights", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders", () => {
    render(<Insights insights={TEST_INSIGHTS} onChange={() => undefined} />);
    expect(screen.getByText(TEST_INSIGHTS[0].text)).toBeTruthy();
  });

  it("#16 shows the brand name, not its id", () => {
    render(<Insights insights={TEST_INSIGHTS} onChange={() => undefined} />);
    expect(screen.getByText("Brand 2")).toBeTruthy();
  });

  it("#14 deletes through the API, then refreshes", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 204 }))
    );
    vi.stubGlobal("fetch", fetch);
    const onChange = vi.fn();
    render(<Insights insights={TEST_INSIGHTS} onChange={onChange} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Delete insight" })[1],
    );

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith("/api/insights/2", {
      method: "DELETE",
    });
  });
});
