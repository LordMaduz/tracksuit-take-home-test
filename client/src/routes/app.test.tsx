import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./app.tsx";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("app", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("#3 #4 #5 renders the list fetched from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        json([{
          id: 1,
          brand: 2,
          createdAt: "2026-11-05T06:06:40.013Z",
          text: "From the server",
        }])
      ),
    );
    render(<App />);

    expect(await screen.findByText("From the server")).toBeTruthy();
    expect(screen.getByText("Brand 2")).toBeTruthy();
  });

  it("#15 refreshes the list after a delete", async () => {
    const insight = {
      id: 1,
      brand: 1,
      createdAt: "2026-11-05T06:06:40.013Z",
      text: "Going away",
    };
    let deleted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          deleted = true;
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return json(deleted ? [] : [insight]);
      }),
    );
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Delete insight" }),
    );

    expect(await screen.findByText("We have no insight!")).toBeTruthy();
  });
});
